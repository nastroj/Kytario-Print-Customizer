import { PDFDocument, rgb, RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { SongbookData, PrintSettings, Song } from '../types';
import { parseSongContent, computeSmartFitScale, computeSmartColumnBalance, computeSmartFitLineMargin, computeSmartFitSectionMargin, SongSection, resolveCoverUrl, getPageMargins, getOptimalColumnCount } from '../utils';

export interface GeneratePdfPayload {
  songbookData: SongbookData;
  settings: PrintSettings;
  fontRegularUrl: string;
  fontBoldUrl: string;
  fontItalicUrl?: string;
  fontBoldItalicUrl?: string;
}

export type WorkerInMessage = {
  type: 'GENERATE_PDF';
  payload: GeneratePdfPayload;
};

export type WorkerProgressMessage = {
  type: 'PROGRESS';
  payload: {
    percent: number;
    phase: 'fonts' | 'cover' | 'toc' | 'songs' | 'finalizing';
    message: string;
    currentSongIndex?: number;
    totalSongs?: number;
    currentSongTitle?: string;
  };
};

export type WorkerCompleteMessage = {
  type: 'COMPLETE';
  payload: {
    pdfBytes: Uint8Array;
    filename: string;
    pageCount: number;
    sizeBytes: number;
  };
};

export type WorkerErrorMessage = {
  type: 'ERROR';
  payload: {
    message: string;
  };
};

export type WorkerOutMessage = WorkerProgressMessage | WorkerCompleteMessage | WorkerErrorMessage;

// Helper: Convert hex color (e.g. "#1c1917" or "#f59e0b") to pdf-lib RGB
function hexToPdfRgb(hex: string | undefined, defaultHex = '#18181b'): RGB {
  let clean = (hex || defaultHex).trim();
  if (clean.startsWith('var(')) {
    clean = defaultHex;
  }
  clean = clean.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  } else {
    return hexToPdfRgb(defaultHex);
  }
  return rgb((isNaN(r) ? 0 : r) / 255, (isNaN(g) ? 0 : g) / 255, (isNaN(b) ? 0 : b) / 255);
}

// Helper: Page physical dimensions in standard PDF points (72 pt = 1 inch, 25.4 mm)
function getPageDimensions(format = 'A4', orientation = 'portrait'): { width: number; height: number } {
  const isLandscape = orientation === 'landscape';
  let w = 595.28; // A4 pt: 210mm * 72 / 25.4
  let h = 841.89; // A4 pt: 297mm * 72 / 25.4

  switch (format) {
    case 'A5':
      w = 419.53; // 148mm
      h = 595.28; // 210mm
      break;
    case 'Letter':
      w = 612.0;  // 8.5in
      h = 792.0;  // 11in
      break;
    case 'A4':
    default:
      w = 595.28;
      h = 841.89;
      break;
  }

  return isLandscape ? { width: h, height: w } : { width: w, height: h };
}

interface TocItemBase {
  originalIndex: number;
  title: string;
  artist?: string;
  groupLetter?: string;
}

function balanceColumns<T extends { groupLetter?: string }>(items: T[], numCols: number): T[][] {
  if (numCols <= 1 || items.length <= 1) {
    return [items];
  }

  const total = items.length;
  const base = Math.floor(total / numCols);
  const remainder = total % numCols;

  const counts = Array.from({ length: numCols }, (_, c) => base + (c < remainder ? 1 : 0));

  for (let c = 0; c < numCols - 1; c++) {
    if (counts[c] > 1) {
      let colStartIndex = 0;
      for (let i = 0; i < c; i++) {
        colStartIndex += counts[i];
      }
      const lastItemIndex = colStartIndex + counts[c] - 1;
      const lastItem = items[lastItemIndex];
      
      if (lastItem && lastItem.groupLetter && lastItemIndex + 1 < items.length) {
        counts[c]--;
        counts[c + 1]++;
      }
    }
  }

  const columns: T[][] = [];
  let offset = 0;
  for (let c = 0; c < numCols; c++) {
    const colCount = counts[c];
    columns.push(items.slice(offset, offset + colCount));
    offset += colCount;
  }

  return columns;
}

function getColumnHeight<T extends { groupLetter?: string }>(
  colItems: T[],
  showDividers: boolean,
  singleItemHeight: number,
  dividerTotalHeight: number
): number {
  let h = 0;
  for (let i = 0; i < colItems.length; i++) {
    const item = colItems[i];
    if (showDividers && item.groupLetter && i > 0) {
      h += dividerTotalHeight;
    }
    h += singleItemHeight;
  }
  return h;
}

// Fetch helper with fallback and validation to ensure valid font binary (not HTML 404)
async function fetchFontBytes(primaryUrl: string, fallbackUrl?: string): Promise<ArrayBuffer> {
  const tryFetch = async (url: string): Promise<ArrayBuffer | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 100) return null;
      const header = new Uint8Array(buf.slice(0, 10));
      const headerStr = String.fromCharCode(...header).trim();
      if (headerStr.startsWith('<') || headerStr.startsWith('<!') || headerStr.includes('html')) {
        return null;
      }
      return buf;
    } catch {
      return null;
    }
  };

  let buf = await tryFetch(primaryUrl);
  if (!buf && fallbackUrl) {
    buf = await tryFetch(fallbackUrl);
  }
  if (!buf) {
    throw new Error(`Failed to fetch valid font from ${primaryUrl}`);
  }
  return buf;
}

// ----------------------------------------------------------------------
// FRONT COVER / TITLE PAGE RENDERING (PAGE 1)
// ----------------------------------------------------------------------
async function renderFrontCoverPage(
  doc: PDFDocument,
  songbookData: SongbookData,
  settings: PrintSettings,
  boldFont: any,
  regularFont: any,
  pageWidth: number,
  pageHeight: number,
  marginPtLeft: number,
  marginPtRight: number,
  marginPtTop: number,
  marginPtBottom: number,
  colTitle: RGB,
  colArtist: RGB,
  colSectionLine: RGB,
  ptPerPx: number
) {
  const isCustom = settings.frontCoverType === 'custom';
  const isLandscape = settings.orientation === 'landscape';

  const bTitle = (isCustom && settings.frontCoverTitle?.trim())
    ? settings.frontCoverTitle.trim()
    : (settings.frontCoverTitle?.trim() || songbookData.title || (songbookData as any).name || 'ZPĚVNÍK');

  const { displayUrl, qrTarget } = resolveCoverUrl({
    isCustom,
    customUrl: settings.frontCoverUrl,
    customQrUrl: settings.frontCoverQrUrl,
    songbookUrl: songbookData.url,
    songbookShortUrl: songbookData.shortUrl,
    songbookSlug: songbookData.slug,
  });

  const subtitle = settings.frontCoverSubtitle?.trim();
  const dedicationText = settings.frontCoverShowDedication !== false ? settings.frontCoverDedication?.trim() : undefined;

  const showQr = settings.frontCoverShowQr !== false;

  const showNotation = settings.frontCoverShowNotation !== false;
  const notationText = (isCustom && settings.frontCoverNotationText !== undefined)
    ? settings.frontCoverNotationText
    : "Tento zpěvník používá německou notaci - tóny C-C#-D-D#-E-F-F#-G-G#-A-B-H.\nTón B odpovídá tónu A# nebo Hb.";

  const showFooter = settings.frontCoverShowFooter !== false;
  const footerText = (isCustom && settings.frontCoverFooterText !== undefined)
    ? settings.frontCoverFooterText
    : "Vytvořeno s ♥ pomocí kytario.com | Vytvoř si zpěvník, sdílej ho a hraj.\nPosouvejte text živě společně, transponuj do libovolné tóniny nebo exportuj do PDF - zdarma pro tebe i tvé přátele. :)";

  const customImage = settings.frontCoverCustomImage;
  const imagePosition = settings.frontCoverImagePosition || 'replace-qr';
  const alignment = settings.frontCoverAlignment || 'center';

  const page = doc.addPage([pageWidth, pageHeight]);

  // Embed custom image if available
  let embeddedImage: any = null;
  if (customImage) {
    try {
      const commaIdx = customImage.indexOf(',');
      const base64Str = commaIdx >= 0 ? customImage.slice(commaIdx + 1) : customImage;
      const binaryStr = atob(base64Str);
      const imgBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        imgBytes[i] = binaryStr.charCodeAt(i);
      }
      if (customImage.startsWith('data:image/png')) {
        embeddedImage = await doc.embedPng(imgBytes);
      } else {
        embeddedImage = await doc.embedJpg(imgBytes);
      }
    } catch (e) {
      console.error('Failed to embed custom cover image in PDF:', e);
    }
  }

  // 1. Bottom Section (Notation, Divider, Footer)
  let bottomReservedH = 0;
  const footerLines = (showFooter && footerText) ? footerText.split('\n') : [];
  const notationLines = (showNotation && notationText) ? notationText.split('\n') : [];

  const footerPt = isLandscape ? 7.5 : 8.5;
  const notPt = isLandscape ? 8.5 : 9.5;

  let footY = Math.max(marginPtBottom + (isLandscape ? 8 : 12), isLandscape ? 28 : 36);
  if (showFooter && footerLines.length > 0) {
    for (let i = footerLines.length - 1; i >= 0; i--) {
      const line = footerLines[i].trim().replace(/❤️/g, '♥');
      if (!line) continue;
      const lineW = regularFont.widthOfTextAtSize(line, footerPt);
      const x = alignment === 'center' ? (pageWidth - lineW) / 2 : marginPtLeft;
      page.drawText(line, {
        x: Math.max(marginPtLeft, x),
        y: footY,
        size: footerPt,
        font: regularFont,
        color: colArtist,
      });
      footY += (footerPt + 3);
    }
  }

  const dividerY = footY + (isLandscape ? 6 : 10);
  if ((showNotation && notationLines.length > 0) || (showFooter && footerLines.length > 0)) {
    const divWidth = Math.min(pageWidth - marginPtLeft - marginPtRight, isLandscape ? 480 : 420);
    const divStartX = alignment === 'center' ? (pageWidth - divWidth) / 2 : marginPtLeft;
    page.drawLine({
      start: { x: divStartX, y: dividerY },
      end: { x: divStartX + divWidth, y: dividerY },
      thickness: 0.5,
      color: colSectionLine,
      opacity: 0.4,
    });
  }

  let notY = dividerY + (isLandscape ? 8 : 12);
  if (showNotation && notationLines.length > 0) {
    for (let i = notationLines.length - 1; i >= 0; i--) {
      const line = notationLines[i].trim().replace(/❤️/g, '♥');
      if (!line) continue;
      const lineW = regularFont.widthOfTextAtSize(line, notPt);
      const x = alignment === 'center' ? (pageWidth - lineW) / 2 : marginPtLeft;
      page.drawText(line, {
        x: Math.max(marginPtLeft, x),
        y: notY,
        size: notPt,
        font: regularFont,
        color: colTitle,
      });
      notY += (notPt + 3.5);
    }
  }

  bottomReservedH = notY + 12;

  // 2. Top Section (Title, Subtitle, URL, Header Image)
  let topY = pageHeight - Math.max(marginPtTop + (isLandscape ? 15 : 25), isLandscape ? 60 : 100);

  // If custom image above title
  if (embeddedImage && imagePosition === 'above-title') {
    const maxLogoH = isLandscape ? 50 : 70;
    const maxLogoW = 180;
    const scale = Math.min(maxLogoW / embeddedImage.width, maxLogoH / embeddedImage.height, 1);
    const imgW = embeddedImage.width * scale;
    const imgH = embeddedImage.height * scale;
    const imgX = alignment === 'center' ? (pageWidth - imgW) / 2 : marginPtLeft;
    page.drawImage(embeddedImage, {
      x: imgX,
      y: topY - imgH,
      width: imgW,
      height: imgH,
    });
    topY -= (imgH + (isLandscape ? 12 : 18));
  }

  // Title
  const titleUpper = bTitle.toUpperCase();
  const maxTitleW = pageWidth - marginPtLeft - marginPtRight;
  let titlePt = isLandscape ? 36 : 44;
  let titleW = boldFont.widthOfTextAtSize(titleUpper, titlePt);
  while (titleW > maxTitleW && titlePt > 14) {
    titlePt -= 2;
    titleW = boldFont.widthOfTextAtSize(titleUpper, titlePt);
  }

  const titleX = alignment === 'center' ? (pageWidth - titleW) / 2 : marginPtLeft;
  page.drawText(titleUpper, {
    x: Math.max(marginPtLeft, titleX),
    y: topY - titlePt,
    size: titlePt,
    font: boldFont,
    color: colTitle,
  });
  topY -= (titlePt + (isLandscape ? 10 : 14));

  // Subtitle
  if (subtitle) {
    const subPt = isLandscape ? 11 : 13;
    const subW = regularFont.widthOfTextAtSize(subtitle, subPt);
    const subX = alignment === 'center' ? (pageWidth - subW) / 2 : marginPtLeft;
    page.drawText(subtitle, {
      x: Math.max(marginPtLeft, subX),
      y: topY - subPt,
      size: subPt,
      font: regularFont,
      color: colArtist,
    });
    topY -= (subPt + (isLandscape ? 8 : 10));
  }

  // Dedication
  if (dedicationText) {
    const dedPt = isLandscape ? 10 : 12;
    const dedStr = `"${dedicationText}"`;
    const dedW = regularFont.widthOfTextAtSize(dedStr, dedPt);
    const dedX = alignment === 'center' ? (pageWidth - dedW) / 2 : marginPtLeft;
    page.drawText(dedStr, {
      x: Math.max(marginPtLeft, dedX),
      y: topY - dedPt,
      size: dedPt,
      font: regularFont,
      color: colArtist,
    });
    topY -= (dedPt + (isLandscape ? 10 : 14));
  }

  // URL
  if (displayUrl) {
    const urlPt = isLandscape ? 13 : 15;
    const urlW = regularFont.widthOfTextAtSize(displayUrl, urlPt);
    const urlX = alignment === 'center' ? (pageWidth - urlW) / 2 : marginPtLeft;
    page.drawText(displayUrl, {
      x: Math.max(marginPtLeft, urlX),
      y: topY - urlPt,
      size: urlPt,
      font: regularFont,
      color: colArtist,
    });
    topY -= (urlPt + (isLandscape ? 16 : 24));
  }

  // 3. Middle Section: QR Code or Custom Image
  const availableH = Math.max(80, topY - bottomReservedH);
  const targetCenterY = bottomReservedH + availableH / 2;

  if (embeddedImage && (imagePosition === 'replace-qr' || !showQr)) {
    const maxImgH = Math.min(isLandscape ? 140 : 200, availableH * 0.85);
    const maxImgW = Math.min(isLandscape ? 220 : 300, pageWidth - marginPtLeft - marginPtRight);
    const scale = Math.min(maxImgW / embeddedImage.width, maxImgH / embeddedImage.height, 1);
    const imgW = embeddedImage.width * scale;
    const imgH = embeddedImage.height * scale;
    const imgX = (pageWidth - imgW) / 2;
    const imgY = targetCenterY - imgH / 2;

    page.drawImage(embeddedImage, {
      x: imgX,
      y: imgY,
      width: imgW,
      height: imgH,
    });
  } else if (showQr && qrTarget) {
    try {
      const qrData = QRCode.create(qrTarget, { errorCorrectionLevel: 'M' });
      const qrModuleCount = qrData.modules.size;
      const qrMatrix = qrData.modules.data;

      const qrPrintSize = Math.min(isLandscape ? 135 : 175, availableH * 0.78);
      const moduleSize = qrPrintSize / qrModuleCount;
      const qrX = (pageWidth - qrPrintSize) / 2;
      const qrY = targetCenterY - qrPrintSize / 2;

      for (let r = 0; r < qrModuleCount; r++) {
        for (let c = 0; c < qrModuleCount; c++) {
          if (qrMatrix[r * qrModuleCount + c]) {
            page.drawRectangle({
              x: qrX + c * moduleSize,
              y: qrY + (qrModuleCount - 1 - r) * moduleSize,
              width: moduleSize,
              height: moduleSize,
              color: colTitle,
            });
          }
        }
      }

      // If user uploaded an image and wants it below QR
      if (embeddedImage && imagePosition === 'below-qr') {
        const logoH = isLandscape ? 30 : 40;
        const scale = Math.min(100 / embeddedImage.width, logoH / embeddedImage.height, 1);
        const w = embeddedImage.width * scale;
        const h = embeddedImage.height * scale;
        page.drawImage(embeddedImage, {
          x: (pageWidth - w) / 2,
          y: qrY - h - 10,
          width: w,
          height: h,
        });
      }
    } catch (e) {
      console.error('Failed to draw QR code in PDF cover:', e);
    }
  }
}

// ----------------------------------------------------------------------
// BACK COVER PAGE RENDERING
// ----------------------------------------------------------------------
async function renderBackCoverPage(
  doc: PDFDocument,
  songbookData: SongbookData,
  settings: PrintSettings,
  boldFont: any,
  regularFont: any,
  pageWidth: number,
  pageHeight: number,
  marginPtLeft: number,
  marginPtRight: number,
  marginPtTop: number,
  marginPtBottom: number,
  colTitle: RGB,
  colArtist: RGB,
  colSectionLine: RGB,
  ptPerPx: number
) {
  const isCustom = settings.backCoverType === 'custom';
  const isLandscape = settings.orientation === 'landscape';

  const bTitle = (isCustom && settings.backCoverTitle?.trim())
    ? settings.backCoverTitle.trim()
    : (settings.backCoverTitle?.trim() || 'ZADNÍ STRANA');

  const { displayUrl, qrTarget } = resolveCoverUrl({
    isCustom,
    customUrl: settings.backCoverUrl,
    customQrUrl: settings.backCoverQrUrl,
    songbookUrl: songbookData.url,
    songbookShortUrl: songbookData.shortUrl,
    songbookSlug: songbookData.slug,
  });

  const subtitle = settings.backCoverSubtitle?.trim();
  const dedicationText = settings.backCoverShowDedication !== false ? settings.backCoverDedication?.trim() : undefined;

  const showQr = settings.backCoverShowQr !== false;

  const showNotation = settings.backCoverShowNotation !== false;
  const notationText = (isCustom && settings.backCoverNotationText !== undefined)
    ? settings.backCoverNotationText
    : "Tento zpěvník používá německou notaci - tóny C-C#-D-D#-E-F-F#-G-G#-A-B-H.\nTón B odpovídá tónu A# nebo Hb.";

  const showFooter = settings.backCoverShowFooter !== false;
  const footerText = (isCustom && settings.backCoverFooterText !== undefined)
    ? settings.backCoverFooterText
    : "Vytvořeno s ♥ pomocí kytario.com | Vytvoř si zpěvník, sdílej ho a hraj.\nPosouvejte text živě společně, transponuj do libovolné tóniny nebo exportuj do PDF - zdarma pro tebe i tvé přátele. :)";

  const customImage = settings.backCoverCustomImage;
  const imagePosition = settings.backCoverImagePosition || 'replace-qr';
  const alignment = settings.backCoverAlignment || 'center';

  const page = doc.addPage([pageWidth, pageHeight]);

  let embeddedImage: any = null;
  if (customImage) {
    try {
      const commaIdx = customImage.indexOf(',');
      const base64Str = commaIdx >= 0 ? customImage.slice(commaIdx + 1) : customImage;
      const binaryStr = atob(base64Str);
      const imgBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        imgBytes[i] = binaryStr.charCodeAt(i);
      }
      if (customImage.startsWith('data:image/png')) {
        embeddedImage = await doc.embedPng(imgBytes);
      } else {
        embeddedImage = await doc.embedJpg(imgBytes);
      }
    } catch (e) {
      console.error('Failed to embed custom back cover image in PDF:', e);
    }
  }

  // 1. Bottom Section (Notation, Divider, Footer)
  let bottomReservedH = 0;
  const footerLines = (showFooter && footerText) ? footerText.split('\n') : [];
  const notationLines = (showNotation && notationText) ? notationText.split('\n') : [];

  const footerPt = isLandscape ? 7.5 : 8.5;
  const notPt = isLandscape ? 8.5 : 9.5;

  let footY = Math.max(marginPtBottom + (isLandscape ? 8 : 12), isLandscape ? 28 : 36);
  if (showFooter && footerLines.length > 0) {
    for (let i = footerLines.length - 1; i >= 0; i--) {
      const line = footerLines[i].trim().replace(/❤️/g, '♥');
      if (!line) continue;
      const lineW = regularFont.widthOfTextAtSize(line, footerPt);
      const x = alignment === 'center' ? (pageWidth - lineW) / 2 : marginPtLeft;
      page.drawText(line, {
        x: Math.max(marginPtLeft, x),
        y: footY,
        size: footerPt,
        font: regularFont,
        color: colArtist,
      });
      footY += (footerPt + 3);
    }
  }

  const dividerY = footY + (isLandscape ? 6 : 10);
  if ((showNotation && notationLines.length > 0) || (showFooter && footerLines.length > 0)) {
    const divWidth = Math.min(pageWidth - marginPtLeft - marginPtRight, isLandscape ? 480 : 420);
    const divStartX = alignment === 'center' ? (pageWidth - divWidth) / 2 : marginPtLeft;
    page.drawLine({
      start: { x: divStartX, y: dividerY },
      end: { x: divStartX + divWidth, y: dividerY },
      thickness: 0.5,
      color: colSectionLine,
      opacity: 0.4,
    });
  }

  let notY = dividerY + (isLandscape ? 8 : 12);
  if (showNotation && notationLines.length > 0) {
    for (let i = notationLines.length - 1; i >= 0; i--) {
      const line = notationLines[i].trim().replace(/❤️/g, '♥');
      if (!line) continue;
      const lineW = regularFont.widthOfTextAtSize(line, notPt);
      const x = alignment === 'center' ? (pageWidth - lineW) / 2 : marginPtLeft;
      page.drawText(line, {
        x: Math.max(marginPtLeft, x),
        y: notY,
        size: notPt,
        font: regularFont,
        color: colTitle,
      });
      notY += (notPt + 3.5);
    }
  }

  bottomReservedH = notY + 12;

  // 2. Top Section (Title, Subtitle, URL, Header Image)
  let topY = pageHeight - Math.max(marginPtTop + (isLandscape ? 15 : 25), isLandscape ? 60 : 100);

  if (embeddedImage && imagePosition === 'above-title') {
    const maxLogoH = isLandscape ? 50 : 70;
    const maxLogoW = 180;
    const scale = Math.min(maxLogoW / embeddedImage.width, maxLogoH / embeddedImage.height, 1);
    const imgW = embeddedImage.width * scale;
    const imgH = embeddedImage.height * scale;
    const imgX = alignment === 'center' ? (pageWidth - imgW) / 2 : marginPtLeft;
    page.drawImage(embeddedImage, {
      x: imgX,
      y: topY - imgH,
      width: imgW,
      height: imgH,
    });
    topY -= (imgH + (isLandscape ? 12 : 18));
  }

  const titleUpper = bTitle.toUpperCase();
  const maxTitleW = pageWidth - marginPtLeft - marginPtRight;
  let titlePt = isLandscape ? 36 : 44;
  let titleW = boldFont.widthOfTextAtSize(titleUpper, titlePt);
  while (titleW > maxTitleW && titlePt > 14) {
    titlePt -= 2;
    titleW = boldFont.widthOfTextAtSize(titleUpper, titlePt);
  }

  const titleX = alignment === 'center' ? (pageWidth - titleW) / 2 : marginPtLeft;
  page.drawText(titleUpper, {
    x: Math.max(marginPtLeft, titleX),
    y: topY - titlePt,
    size: titlePt,
    font: boldFont,
    color: colTitle,
  });
  topY -= (titlePt + (isLandscape ? 10 : 14));

  if (subtitle) {
    const subPt = isLandscape ? 11 : 13;
    const subW = regularFont.widthOfTextAtSize(subtitle, subPt);
    const subX = alignment === 'center' ? (pageWidth - subW) / 2 : marginPtLeft;
    page.drawText(subtitle, {
      x: Math.max(marginPtLeft, subX),
      y: topY - subPt,
      size: subPt,
      font: regularFont,
      color: colArtist,
    });
    topY -= (subPt + (isLandscape ? 8 : 10));
  }

  if (dedicationText) {
    const dedPt = isLandscape ? 10 : 12;
    const dedStr = `"${dedicationText}"`;
    const dedW = regularFont.widthOfTextAtSize(dedStr, dedPt);
    const dedX = alignment === 'center' ? (pageWidth - dedW) / 2 : marginPtLeft;
    page.drawText(dedStr, {
      x: Math.max(marginPtLeft, dedX),
      y: topY - dedPt,
      size: dedPt,
      font: regularFont,
      color: colArtist,
    });
    topY -= (dedPt + (isLandscape ? 10 : 14));
  }

  if (displayUrl) {
    const urlPt = isLandscape ? 13 : 15;
    const urlW = regularFont.widthOfTextAtSize(displayUrl, urlPt);
    const urlX = alignment === 'center' ? (pageWidth - urlW) / 2 : marginPtLeft;
    page.drawText(displayUrl, {
      x: Math.max(marginPtLeft, urlX),
      y: topY - urlPt,
      size: urlPt,
      font: regularFont,
      color: colArtist,
    });
    topY -= (urlPt + (isLandscape ? 16 : 24));
  }

  // 3. Middle Section: QR Code or Custom Image
  const availableH = Math.max(80, topY - bottomReservedH);
  const targetCenterY = bottomReservedH + availableH / 2;

  if (embeddedImage && (imagePosition === 'replace-qr' || !showQr)) {
    const maxImgH = Math.min(isLandscape ? 140 : 200, availableH * 0.78);
    const maxImgW = Math.min(isLandscape ? 220 : 300, pageWidth - marginPtLeft - marginPtRight);
    const scale = Math.min(maxImgW / embeddedImage.width, maxImgH / embeddedImage.height, 1);
    const imgW = embeddedImage.width * scale;
    const imgH = embeddedImage.height * scale;
    const imgX = alignment === 'center' ? (pageWidth - imgW) / 2 : marginPtLeft;
    const imgY = targetCenterY - imgH / 2;

    page.drawImage(embeddedImage, {
      x: imgX,
      y: imgY,
      width: imgW,
      height: imgH,
    });
  } else if (showQr && qrTarget) {
    try {
      const qrData = QRCode.create(qrTarget, { errorCorrectionLevel: 'M' });
      const qrModuleCount = qrData.modules.size;
      const qrMatrix = qrData.modules.data;

      const qrPrintSize = Math.min(isLandscape ? 135 : 175, availableH * 0.78);
      const moduleSize = qrPrintSize / qrModuleCount;
      const qrX = alignment === 'center' ? (pageWidth - qrPrintSize) / 2 : marginPtLeft;
      const qrY = targetCenterY - qrPrintSize / 2;

      for (let r = 0; r < qrModuleCount; r++) {
        for (let c = 0; c < qrModuleCount; c++) {
          if (qrMatrix[r * qrModuleCount + c]) {
            page.drawRectangle({
              x: qrX + c * moduleSize,
              y: qrY + (qrModuleCount - 1 - r) * moduleSize,
              width: moduleSize,
              height: moduleSize,
              color: colTitle,
            });
          }
        }
      }

      if (embeddedImage && imagePosition === 'below-qr') {
        const logoH = isLandscape ? 30 : 40;
        const scale = Math.min(100 / embeddedImage.width, logoH / embeddedImage.height, 1);
        const w = embeddedImage.width * scale;
        const h = embeddedImage.height * scale;
        page.drawImage(embeddedImage, {
          x: (pageWidth - w) / 2,
          y: qrY - h - 10,
          width: w,
          height: h,
        });
      }
    } catch (e) {
      console.error('Failed to draw QR code in PDF back cover:', e);
    }
  }
}

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const { type, payload } = e.data;
  if (type !== 'GENERATE_PDF') return;

  const postProgress = (progress: WorkerProgressMessage['payload']) => {
    self.postMessage({ type: 'PROGRESS', payload: progress } as WorkerOutMessage);
  };

  try {
    const { songbookData, settings, fontRegularUrl, fontBoldUrl, fontItalicUrl, fontBoldItalicUrl } = payload;
    const rawSongs = songbookData.songs || (songbookData as any).items || (songbookData as any).songbookSongs?.map((i: any) => i.song) || [];
    const songs: Song[] = rawSongs.map((s: any, idx: number) => ({
      id: s.id || idx + 1,
      title: s.title || s.name || `Song ${idx + 1}`,
      name: s.title || s.name || `Song ${idx + 1}`,
      author: s.author || s.artist || '',
      artist: s.artist || s.author || '',
      content: s.content || s.lyrics || s.text || '',
      rating: s.rating,
      key: s.key,
      capo: s.capo,
      tempo: s.tempo,
    }));

    const bookTitle = songbookData.title || songbookData.name || 'Zpěvník';
    const totalSongs = songs.length;

    postProgress({
      percent: 3,
      phase: 'fonts',
      message: 'Loading embedded Unicode typography...',
      totalSongs,
    });

    // 1. Create PDF Document and register fontkit
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    // 2. Fetch TrueType font files (Inter Regular, Bold, Italic & Bold Italic)
    const [regularBytes, boldBytes, italicBytes, boldItalicBytes] = await Promise.all([
      fetchFontBytes(
        fontRegularUrl,
        'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf'
      ),
      fetchFontBytes(
        fontBoldUrl,
        'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf'
      ),
      fontItalicUrl
        ? fetchFontBytes(
            fontItalicUrl,
            'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-italic.ttf'
          ).catch(() => null)
        : Promise.resolve(null),
      fontBoldItalicUrl
        ? fetchFontBytes(
            fontBoldItalicUrl,
            'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-italic.ttf'
          ).catch(() => null)
        : Promise.resolve(null),
    ]);

    const regularFont = await doc.embedFont(regularBytes);
    const boldFont = await doc.embedFont(boldBytes);
    const italicFont = italicBytes ? await doc.embedFont(italicBytes) : regularFont;
    const boldItalicFont = boldItalicBytes 
      ? await doc.embedFont(boldItalicBytes) 
      : (italicBytes ? await doc.embedFont(italicBytes) : boldFont);

    postProgress({
      percent: 10,
      phase: 'toc',
      message: 'Calculating pagination & Table of Contents...',
      totalSongs,
    });

    // Ratio between CSS pixels (96 DPI) and PDF points (72 DPI)
    // In preview, 1px on screen corresponds to 0.75 pt in PDF document space.
    // Applying this mathematical scale ensures 100% optical consistency with the CSS preview!
    const ptPerPx = 72 / 96; // 0.75
    const mmToPt = 72 / 25.4; // 2.83464567

    // Page physical setup
    const { width: pageWidth, height: pageHeight } = getPageDimensions(settings.pageFormat, settings.orientation);
    const isLandscape = settings.orientation === 'landscape';

    // Palette (matching preview styles exactly)
    const colTitle = hexToPdfRgb(settings.titleColor, '#18181b');
    const colArtist = hexToPdfRgb(settings.artistColor, '#52525b');
    const colLyrics = hexToPdfRgb(settings.lyricsColor, '#18181b');
    const colChords = hexToPdfRgb(settings.chordsColor, '#d97706');
    const colMarker = hexToPdfRgb(settings.markerColor, '#71717a');
    const colSectionLine = hexToPdfRgb(settings.sectionLineColor, '#a1a1aa');
    const colRefrainLine = hexToPdfRgb(settings.refrainLineColor || settings.chordsColor, '#2563eb');
    const colToc = hexToPdfRgb(settings.tocColor || settings.lyricsColor, '#18181b');
    const colSubtle = hexToPdfRgb('#71717a');
    const colBadgeBg = hexToPdfRgb('#27272a');
    const colWhite = rgb(1, 1, 1);

    // ----------------------------------------------------
    // 2.5 FRONT COVER / TITLE PAGE (PAGE 1)
    // ----------------------------------------------------
    if (settings.showFrontCover !== false && songs.length > 0) {
      postProgress({
        percent: 8,
        phase: 'cover',
        message: 'Generuji titulní stranu zpěvníku...',
        totalSongs,
      });

      const frontMargins = getPageMargins(settings, 0);
      const frontPtLeft = frontMargins.left * mmToPt;
      const frontPtRight = frontMargins.right * mmToPt;
      const frontPtTop = frontMargins.top * mmToPt;
      const frontPtBottom = frontMargins.bottom * mmToPt;

      await renderFrontCoverPage(
        doc,
        songbookData,
        settings,
        boldFont,
        regularFont,
        pageWidth,
        pageHeight,
        frontPtLeft,
        frontPtRight,
        frontPtTop,
        frontPtBottom,
        colTitle,
        colArtist,
        colSectionLine,
        ptPerPx
      );
    }

    // ----------------------------------------------------
    // 3. Table of Contents (Matching SongbookPreview.tsx TOC)
    // ----------------------------------------------------
    if (settings.showTableOfContents !== false && settings.showToc !== false && settings.showIndex !== false && songs.length > 0) {
      let tocItems: Array<{
        song?: Song;
        originalIndex: number;
        title: string;
        artist?: string;
        groupLetter?: string;
      }> = songs.map((s, idx) => ({
        song: s,
        originalIndex: idx,
        title: s.title || `Song ${idx + 1}`,
        artist: s.artist || s.author || ''
      }));

    if (settings.indexSortOrder === 'alphabetical') {
      const getSortKey = (t: string) => t.trim().replace(/^["'„“\(\[\{]+/, '');
      tocItems.sort((a, b) => getSortKey(a.title).localeCompare(getSortKey(b.title), 'cs'));
      
      if (settings.tocAlphabeticalGrouping) {
        let currentLetter = '';
        for (const item of tocItems) {
          const cleanTitle = getSortKey(item.title);
          const upper = cleanTitle.toUpperCase();
          const isCh = upper.startsWith('CH');
          const firstChar = upper.charAt(0) || '#';
          const map: Record<string, string> = {
            'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ý': 'Y', 'Ů': 'U',
            'Ä': 'A', 'Ö': 'O', 'Ü': 'U', 'Ë': 'E'
          };
          let letter = isCh ? 'CH' : (map[firstChar] || firstChar);
          letter = isCh ? 'CH' : (/^[A-Z0-9ČĎŇŘŠŤŽ]$/i.test(letter) ? letter : '#');
          if (letter !== currentLetter) {
            currentLetter = letter;
            item.groupLetter = currentLetter;
          }
        }
      }
    }

    const hasFrontCover = settings.showFrontCover !== false && songs.length > 0;
    const tocStartPageIndex = hasFrontCover ? 1 : 0;
    const tocBaseMargins = getPageMargins(settings, tocStartPageIndex);
    const tocMarginPtLeft = tocBaseMargins.left * mmToPt;
    const tocMarginPtRight = tocBaseMargins.right * mmToPt;
    const tocMarginPtTop = tocBaseMargins.top * mmToPt;
    const tocMarginPtBottom = tocBaseMargins.bottom * mmToPt;
    const tocPrintableWidth = pageWidth - tocMarginPtLeft - tocMarginPtRight;
    const tocPrintableHeight = pageHeight - tocMarginPtTop - tocMarginPtBottom;

    const safeTitleSize = Number(settings.titleFontSize) || 16;
    const safeTocSize = Number(settings.tocFontSize) || (Number(settings.lyricsFontSize) * 0.95) || 12;

    const tocTitlePt = Math.round(safeTitleSize * 1.15) * ptPerPx;
    const tocTitleSubPt = Math.round(safeTitleSize * 0.85) * ptPerPx;
    const tocItemPt = safeTocSize * ptPerPx;

    const rowLineHeight = 1.35;
    const rowLineHeightPx = Math.ceil(safeTocSize * rowLineHeight);
    const singleItemHeightPx = rowLineHeightPx + 3 + 1;
    const singleItemHeightPt = singleItemHeightPx * ptPerPx;
    const dividerTotalHeightPt = 7 * ptPerPx;
    const tocLineHeight = singleItemHeightPt;

    const tocCols = isLandscape ? 3 : 2;
    const tocColGap = (tocCols >= 3 ? 28 : 36) * ptPerPx;
    const tocColWidth = (tocPrintableWidth - (tocCols - 1) * tocColGap) / tocCols;

    const hasLetterGrouping = settings.indexSortOrder === 'alphabetical' && !!settings.tocAlphabeticalGrouping;
    const showDividers = hasLetterGrouping && (settings.tocGroupDividers !== false);

    const headerH1Pt = (Math.ceil(Math.round(safeTitleSize * 1.15) * 1.2) + 36) * ptPerPx;
    const headerHSubPt = (Math.ceil(Math.round(safeTitleSize * 0.85) * 1.2) + 37) * ptPerPx;
    const bottomSafetyBufferPt = 2 * ptPerPx;

    const availableHeightP1Pt = Math.max(80 * ptPerPx, tocPrintableHeight - headerH1Pt - bottomSafetyBufferPt);
    const availableHeightSubPt = Math.max(80 * ptPerPx, tocPrintableHeight - headerHSubPt - bottomSafetyBufferPt);

    const tocPagesData: Array<{
      items: typeof tocItems;
      columnsData: typeof tocItems[];
      isFirst: boolean;
      pageIndex: number;
    }> = [];

    let offset = 0;
    let tocPageNum = 1;
    const totalItems = tocItems.length;

    while (offset < totalItems) {
      const isFirst = tocPageNum === 1;
      const availH = isFirst ? availableHeightP1Pt : availableHeightSubPt;
      const remaining = totalItems - offset;

      const maxPossible = Math.min(remaining, Math.ceil(availH / singleItemHeightPt) * tocCols);
      let K = maxPossible;

      while (K > 1) {
        const candidateItems = tocItems.slice(offset, offset + K);
        const cols = balanceColumns(candidateItems, tocCols);
        const maxColH = Math.max(...cols.map(c => getColumnHeight(c, showDividers, singleItemHeightPt, dividerTotalHeightPt)));

        if (maxColH <= availH) {
          if (offset + K < totalItems && candidateItems[candidateItems.length - 1].groupLetter && K > 1) {
            K--;
            continue;
          }
          break;
        }
        K--;
      }

      const pageItems = tocItems.slice(offset, offset + K);
      const cols = balanceColumns(pageItems, tocCols);

      tocPagesData.push({
        items: pageItems,
        columnsData: cols,
        isFirst,
        pageIndex: tocPageNum,
      });

      offset += K;
      tocPageNum++;
    }

    const tocPagesCount = tocPagesData.length;

    // Render TOC Pages
    for (let p = 0; p < tocPagesData.length; p++) {
      const tocPageInfo = tocPagesData[p];
      const isFirst = tocPageInfo.isFirst;
      const pageIndex = tocPageInfo.pageIndex;
      const currentTocPageIndex = tocStartPageIndex + p;
      const tocPageMargins = getPageMargins(settings, currentTocPageIndex);
      const pMarginPtLeft = tocPageMargins.left * mmToPt;
      const pMarginPtRight = tocPageMargins.right * mmToPt;
      const pMarginPtTop = tocPageMargins.top * mmToPt;
      const pMarginPtBottom = tocPageMargins.bottom * mmToPt;
      const pPrintableWidth = pageWidth - pMarginPtLeft - pMarginPtRight;
      const pColWidth = (pPrintableWidth - (tocCols - 1) * tocColGap) / tocCols;

      const page = doc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - pMarginPtTop;

      // Header Centered (matching preview)
      if (isFirst) {
        const titleUpper = bookTitle.toUpperCase();
        const titleW = boldFont.widthOfTextAtSize(titleUpper, tocTitlePt);
        page.drawText(titleUpper, {
          x: pMarginPtLeft + (pPrintableWidth - Math.min(pPrintableWidth, titleW)) / 2,
          y: currentY - tocTitlePt,
          size: tocTitlePt,
          font: boldFont,
          color: colTitle,
        });

        const subText = `Obsah${tocPagesCount > 1 ? ` • Strana 1 z ${tocPagesCount}` : ''}`;
        const subPt = 9 * ptPerPx;
        const subW = regularFont.widthOfTextAtSize(subText, subPt);
        page.drawText(subText, {
          x: pMarginPtLeft + (pPrintableWidth - subW) / 2,
          y: currentY - tocTitlePt - (12 * ptPerPx) - subPt,
          size: subPt,
          font: regularFont,
          color: colSubtle,
        });

        currentY -= headerH1Pt;
      } else {
        const titleUpper = `${bookTitle.toUpperCase()} (POKRAČOVÁNÍ)`;
        const titleW = boldFont.widthOfTextAtSize(titleUpper, tocTitleSubPt);
        page.drawText(titleUpper, {
          x: pMarginPtLeft + (pPrintableWidth - Math.min(pPrintableWidth, titleW)) / 2,
          y: currentY - tocTitleSubPt,
          size: tocTitleSubPt,
          font: boldFont,
          color: colTitle,
        });

        const subText = `Obsah • Strana ${pageIndex} z ${tocPagesCount}`;
        const subPt = 9 * ptPerPx;
        const subW = regularFont.widthOfTextAtSize(subText, subPt);
        page.drawText(subText, {
          x: pMarginPtLeft + (pPrintableWidth - subW) / 2,
          y: currentY - tocTitleSubPt - (10 * ptPerPx) - subPt,
          size: subPt,
          font: regularFont,
          color: colSubtle,
        });

        currentY -= headerHSubPt;
      }

      // Distribute pageItems across tocCols with proper column balancing
      const columnsData = tocPageInfo.columnsData || balanceColumns(tocPageInfo.items, tocCols);
      const hasLetterGrouping = settings.indexSortOrder === 'alphabetical' && !!settings.tocAlphabeticalGrouping;
      const letterColPt = hasLetterGrouping ? 1.85 * tocItemPt : 0;
      const numColWidth = (songs.length >= 100 ? 2.8 : songs.length >= 10 ? 2.1 : 1.5) * tocItemPt;
      const colPadLeft = 2 * ptPerPx;

      for (let c = 0; c < tocCols; c++) {
        const colItems = columnsData[c] || [];
        const colX = pMarginPtLeft + c * (pColWidth + tocColGap);
        let rowY = currentY;
        for (let itemIdx = 0; itemIdx < colItems.length; itemIdx++) {
          const item = colItems[itemIdx];

          if (showDividers && item.groupLetter && itemIdx > 0) {
            const divPad = 3.5 * ptPerPx;
            rowY -= divPad;
            page.drawLine({
              start: { x: colX + colPadLeft, y: rowY },
              end: { x: colX + pColWidth - (2 * ptPerPx), y: rowY },
              thickness: 0.5,
              color: colSectionLine,
              opacity: 0.35,
            });
            rowY -= divPad;
          }

          if (hasLetterGrouping && item.groupLetter) {
            // Draw group letter in its dedicated letter slot with safe left clearance
            page.drawText(item.groupLetter, {
              x: colX + colPadLeft,
              y: rowY - tocItemPt,
              size: tocItemPt * 1.05,
              font: boldFont,
              color: colTitle,
            });
          }

          // Song Number right aligned within its column block (after letter slot)
          const numStartX = colX + colPadLeft + letterColPt;
          const numStr = `${item.originalIndex + 1}.`;
          const numW = boldFont.widthOfTextAtSize(numStr, tocItemPt);
          page.drawText(numStr, {
            x: numStartX + numColWidth - numW - (3 * ptPerPx),
            y: rowY - tocItemPt,
            size: tocItemPt,
            font: boldFont,
            color: colTitle,
          });

          // Song Title & Artist (after number block)
          const titleStartX = numStartX + numColWidth;
          const titleStr = item.title;
          const artistStr = item.artist ? ` - ${item.artist}` : '';
          const maxTextW = pColWidth - (titleStartX - colX) - (4 * ptPerPx);

          let displayTitle = titleStr;
          let titleW = boldFont.widthOfTextAtSize(displayTitle, tocItemPt);
          const artistPt = tocItemPt * 0.92;
          let displayArtist = artistStr;
          let artistW = displayArtist ? regularFont.widthOfTextAtSize(displayArtist, artistPt) : 0;

          // If combined text overflows column width, smoothly truncate
          if (titleW + artistW > maxTextW) {
            if (displayArtist) {
              while (displayArtist.length > 3 && titleW + regularFont.widthOfTextAtSize(displayArtist + '...', artistPt) > maxTextW) {
                displayArtist = displayArtist.slice(0, -1);
              }
              displayArtist += '...';
              artistW = regularFont.widthOfTextAtSize(displayArtist, artistPt);
            }
            if (titleW + artistW > maxTextW) {
              displayArtist = '';
              artistW = 0;
              while (displayTitle.length > 3 && boldFont.widthOfTextAtSize(displayTitle + '...', tocItemPt) > maxTextW) {
                displayTitle = displayTitle.slice(0, -1);
              }
              displayTitle += '...';
              titleW = boldFont.widthOfTextAtSize(displayTitle, tocItemPt);
            }
          }

          // Draw Title
          page.drawText(displayTitle, {
            x: titleStartX,
            y: rowY - tocItemPt,
            size: tocItemPt,
            font: boldFont,
            color: colToc,
          });

          // Draw Artist
          if (displayArtist) {
            page.drawText(displayArtist, {
              x: titleStartX + titleW,
              y: rowY - tocItemPt,
              size: artistPt,
              font: regularFont,
              color: colArtist,
            });
          }

          rowY -= tocLineHeight;
        }
      }
    }
    }

    // ----------------------------------------------------
    // 4. Song Pages (Exact parity with SongDisplay.tsx)
    // ----------------------------------------------------
    for (let sIdx = 0; sIdx < songs.length; sIdx++) {
      const song = songs[sIdx];
      const songNum = sIdx + 1;

      postProgress({
        percent: Math.round(15 + ((sIdx + 1) / totalSongs) * 78),
        phase: 'songs',
        message: `Rendering song ${songNum}/${totalSongs}: ${song.title}`,
        currentSongIndex: songNum,
        totalSongs,
        currentSongTitle: song.title,
      });

      const songText = song.text || song.content || song.lyrics || '';
      const sections: SongSection[] = parseSongContent(songText);

      // Compute Smart Fit scale (vertical height budget, chords summing, max font bounds)
      const scale = computeSmartFitScale(sections, settings, Boolean(song.title), Boolean(song.artist));

      // Font sizes matching CSS preview variables exactly:
      // --title-size: settings.titleFontSize px
      // --artist-size: settings.artistFontSize px
      // --lyrics-size: (settings.lyricsFontSize * scale) px
      // --chords-size: (settings.chordsFontSize * scale) px
      const titlePt = (Number(settings.titleFontSize) || 16) * ptPerPx;
      const artistPt = (Number(settings.artistFontSize) || 16) * ptPerPx;
      const lyricsPt = (Number(settings.lyricsFontSize) || 12) * scale * ptPerPx;
      const chordsPt = (Number(settings.chordsFontSize) || 12) * scale * ptPerPx;

      const lyricsFontToUse = settings.lyricsItalic && italicFont ? italicFont : regularFont;
      const chordsFontToUse = settings.chordsItalic && boldItalicFont ? boldItalicFont : boldFont;

      // Standard song page margins for this song index
      const songMargins = getPageMargins(settings, sIdx);
      const songMarginPtLeft = songMargins.left * mmToPt;
      const songMarginPtRight = songMargins.right * mmToPt;
      const songMarginPtTop = songMargins.top * mmToPt;
      const songMarginPtBottom = songMargins.bottom * mmToPt;
      const printableWidth = pageWidth - songMarginPtLeft - songMarginPtRight;
      const printableHeight = pageHeight - songMarginPtTop - songMarginPtBottom;

      // Add fresh page
      const page = doc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - songMarginPtTop;

      // 4A. Song Number Badge (26px x 26px dark rounded box)
      const numPos = settings.pageNumberPosition || 'outer';
      if (numPos !== 'none') {
        const badgeSize = 26 * ptPerPx;
        let badgeX = songMarginPtLeft;
        if (numPos === 'left') {
          badgeX = songMarginPtLeft;
        } else if (numPos === 'right') {
          badgeX = pageWidth - songMarginPtRight - badgeSize;
        } else {
          // 'outer': first left (sIdx 0), second right (sIdx 1), third left (sIdx 2)...
          const isRight = sIdx % 2 !== 0;
          badgeX = isRight ? (pageWidth - songMarginPtRight - badgeSize) : songMarginPtLeft;
        }

        const badgeY = currentY - badgeSize;
        const badgeR = 5 * ptPerPx; // rounded-lg radius matching preview
        const badgePath = `M ${badgeX + badgeR} ${badgeY} ` +
          `L ${badgeX + badgeSize - badgeR} ${badgeY} ` +
          `A ${badgeR} ${badgeR} 0 0 1 ${badgeX + badgeSize} ${badgeY + badgeR} ` +
          `L ${badgeX + badgeSize} ${badgeY + badgeSize - badgeR} ` +
          `A ${badgeR} ${badgeR} 0 0 1 ${badgeX + badgeSize - badgeR} ${badgeY + badgeSize} ` +
          `L ${badgeX + badgeR} ${badgeY + badgeSize} ` +
          `A ${badgeR} ${badgeR} 0 0 1 ${badgeX} ${badgeY + badgeSize - badgeR} ` +
          `L ${badgeX} ${badgeY + badgeR} ` +
          `A ${badgeR} ${badgeR} 0 0 1 ${badgeX + badgeR} ${badgeY} Z`;
        page.drawSvgPath(badgePath, {
          color: colBadgeBg,
        });

        const numStr = String(songNum);
        const numPt = 12 * ptPerPx;
        const numW = boldFont.widthOfTextAtSize(numStr, numPt);
        const numH = numPt * 0.72;
        page.drawText(numStr, {
          x: badgeX + (badgeSize - numW) / 2,
          y: badgeY + (badgeSize - numH) / 2,
          size: numPt,
          font: boldFont,
          color: colWhite,
        });
      }

      // 4B. Centered Song Title & Artist Block (no extra lines, exactly matching preview)
      const titleStr = song.title || `Song ${songNum}`;
      const artistStr = song.artist || song.author || '';
      const artistSuffix = artistStr ? ` - ${artistStr}` : '';

      const wTitle = boldFont.widthOfTextAtSize(titleStr, titlePt);
      const wArtist = artistStr ? boldFont.widthOfTextAtSize(artistSuffix, artistPt) : 0;
      const totalHeaderW = wTitle + wArtist;
      const headerMaxW = printableWidth - (64 * ptPerPx); // padding px-8 on both sides

      if (totalHeaderW <= headerMaxW) {
        // Fits comfortably on a single centered line
        const headerStartX = songMarginPtLeft + (printableWidth - totalHeaderW) / 2;
        page.drawText(titleStr, {
          x: headerStartX,
          y: currentY - titlePt,
          size: titlePt,
          font: boldFont,
          color: colTitle,
        });

        if (artistStr) {
          page.drawText(artistSuffix, {
            x: headerStartX + wTitle,
            y: currentY - titlePt,
            size: artistPt,
            font: boldFont,
            color: colArtist,
          });
        }

        currentY -= Math.max(titlePt, artistPt) + (22 * ptPerPx); // mb-5 sm:mb-6 in preview
      } else {
        // Wrap title and artist on two centered lines
        const titleX = songMarginPtLeft + (printableWidth - Math.min(printableWidth - 20, wTitle)) / 2;
        page.drawText(titleStr, {
          x: titleX,
          y: currentY - titlePt,
          size: titlePt,
          font: boldFont,
          color: colTitle,
        });
        currentY -= titlePt + (4 * ptPerPx);

        if (artistStr) {
          const artistX = songMarginPtLeft + (printableWidth - Math.min(printableWidth - 20, wArtist)) / 2;
          page.drawText(artistStr, {
            x: artistX,
            y: currentY - artistPt,
            size: artistPt,
            font: boldFont,
            color: colArtist,
          });
          currentY -= artistPt + (20 * ptPerPx);
        } else {
          currentY -= (20 * ptPerPx);
        }
      }

      // 4C. Columns and Smart Column Balancing
      const colCount = getOptimalColumnCount(sections, settings);
      const colGap = colCount > 1 ? (24 * ptPerPx) : 0; // 1.5rem = 24px in CSS
      const colWidth = (printableWidth - (colCount - 1) * colGap) / colCount;

      const availColHeightPt = currentY - songMarginPtBottom;
      const availColHeightPx = availColHeightPt / ptPerPx;

      // Smart column balance plan (determines inter-section breaks & orphan guards)
      const columnPlan = computeSmartColumnBalance(sections, settings, availColHeightPx, scale);

      // Section markers column width calculation
      const hasAnyMarkers = sections.some((s) => Boolean(s.marker && s.marker.trim()));
      // Exactly matches .song-marker in SongbookPreview.tsx (font-size: calc(...) * 0.833)
      const markerPt = lyricsPt * 0.833;
      let maxMarkerW = 0;
      if (hasAnyMarkers) {
        for (const s of sections) {
          if (s.marker) {
            const clean = s.marker.replace(/^\[(.*)\]$/, '$1').trim();
            const w = boldFont.widthOfTextAtSize(clean, markerPt);
            if (w > maxMarkerW) maxMarkerW = w;
          }
        }
      }
      // Guaranteed column width accommodating the widest marker plus spacing before lyrics
      const markerWidthPt = hasAnyMarkers ? Math.max(maxMarkerW + (8 * ptPerPx), 1.85 * lyricsPt) : 0;

      // Section lines setup (0.22em border, 0.20rem padding-left)
      const showSectionLines = settings.showSectionLines !== false;
      const sectionBorderW = Math.max(1.2, 0.22 * lyricsPt);
      const sectionPaddingLeft = (0.20 * 16) * ptPerPx; // ~2.4 pt
      const sectionLeftInset = showSectionLines ? (sectionBorderW + sectionPaddingLeft + (2 * ptPerPx)) : 0;

      // Vertical line dimensions
      const chordHeightPt = chordsPt;
      const lyricHeightPt = lyricsPt;
      const chordSpacingPt = 2 * ptPerPx;
      const pdfLineMarginPx = computeSmartFitLineMargin(sections, settings, Boolean(song.title), Boolean(song.artist), scale);
      const lineMarginBottomPt = pdfLineMarginPx * ptPerPx;
      const sectionBottomMarginPt = computeSmartFitSectionMargin(sections, settings, Boolean(song.title), Boolean(song.artist), scale) * ptPerPx;

      const colStartY = currentY;
      let currentCol = 0;
      let lastCol = -1;
      let colY = colStartY;

      // 4D. Render Sections Across Columns
      for (let secIdx = 0; secIdx < sections.length; secIdx++) {
        const section = sections[secIdx];
        const plan = columnPlan?.sections?.[secIdx];
        const isRefrain = section.isRefrain;
        const currentLineColor = isRefrain ? colRefrainLine : colSectionLine;

        // Break before column if requested by balancing plan
        let didBreakColumn = false;
        if (plan?.breakBeforeColumn && currentCol < colCount - 1) {
          currentCol++;
          colY = colStartY;
          didBreakColumn = true;
        }

        // Calculate approximate section height
        let secEstimatedH = 0;
        for (const line of section.parsedLines) {
          if (line.isEmpty) {
            secEstimatedH += 9 * ptPerPx;
          } else if (line.isRepetitionLine) {
            secEstimatedH += chordHeightPt + (4 * ptPerPx);
          } else if (line.hasChords && settings.showChords) {
            secEstimatedH += chordHeightPt + chordSpacingPt + lyricHeightPt + lineMarginBottomPt;
          } else {
            secEstimatedH += lyricHeightPt + lineMarginBottomPt;
          }
        }
        secEstimatedH += sectionBottomMarginPt;

        // If plan says avoidBreakInside and section doesn't fit in current column, advance
        if (plan?.avoidBreakInside && (colY - secEstimatedH < songMarginPtBottom) && currentCol < colCount - 1) {
          currentCol++;
          colY = colStartY;
          didBreakColumn = true;
        }

        const isFirstInThisCol = (currentCol !== lastCol) || Math.abs(colY - colStartY) <= 2;

        // --- ADD SEPARATOR ---
        lastCol = currentCol;

        const firstNonEmptyIndex = section.parsedLines.findIndex((l) => !l.isEmpty);
        let secSegmentStartY = colY;

        // Render each line in section
        for (let lIdx = 0; lIdx < section.parsedLines.length; lIdx++) {
          const lineData = section.parsedLines[lIdx];
          const isFirstNonEmpty = lIdx === firstNonEmptyIndex;

          const reqLineH = lineData.isEmpty
            ? 9 * ptPerPx
            : lineData.isRepetitionLine
            ? chordHeightPt + (4 * ptPerPx)
            : lineData.hasChords && settings.showChords
            ? chordHeightPt + chordSpacingPt + lyricHeightPt + lineMarginBottomPt
            : lyricHeightPt + lineMarginBottomPt;

          // If line overflows column, advance to next column
          if (colY - reqLineH < songMarginPtBottom && currentCol < colCount - 1) {
            // Finish section border line on current column before moving
            if (showSectionLines && secSegmentStartY > colY) {
              const borderColX = songMarginPtLeft + currentCol * (colWidth + colGap) + (sectionBorderW / 2);
              page.drawLine({
                start: { x: borderColX, y: secSegmentStartY },
                end: { x: borderColX, y: colY },
                thickness: sectionBorderW,
                color: currentLineColor,
              });
            }

            currentCol++;
            colY = colStartY;
            secSegmentStartY = colY;
          }

          const colBaseX = songMarginPtLeft + currentCol * (colWidth + colGap);
          const lineStartX = colBaseX + sectionLeftInset;

          // Case 1: Empty line spacer
          if (lineData.isEmpty) {
            colY -= 9 * ptPerPx;
            continue;
          }

          // Draw Section Marker on the first non-empty line (positioned to the left of lyrics in marker column)
          if (isFirstNonEmpty && section.marker && hasAnyMarkers) {
            const cleanMarker = section.marker.replace(/^\[(.*)\]$/, '$1').trim();
            const markerW = regularFont.widthOfTextAtSize(cleanMarker, markerPt);
            // Right-align marker with clean margin before lyrics
            const markerDrawX = lineStartX + markerWidthPt - markerW - (4 * ptPerPx);
            const lyricBaseY = (lineData.hasChords && settings.showChords && !lineData.isRepetitionLine)
              ? (colY - chordHeightPt - chordSpacingPt - lyricsPt)
              : (colY - lyricsPt);

            page.drawText(cleanMarker, {
              x: Math.max(lineStartX, markerDrawX),
              y: lyricBaseY,
              size: markerPt,
              font: regularFont,
              color: colMarker,
            });
          }

          const chunksOriginX = lineStartX + markerWidthPt;

          // Case 2: Repetition line or chords-only line (e.g. Intro, Outro, Solo, [R:], etc.)
          if (lineData.isRepetitionLine || !lineData.chunks.some((c) => c.text && c.text.trim().length > 0 && !c.isSectionRef)) {
            let curX = chunksOriginX;
            for (const chunk of lineData.chunks) {
              if (chunk.isSectionRef) {
                const cleanRef = (chunk.text || '').replace(/^\[(.*)\]$/, '$1').trim();
                if (cleanRef) {
                  page.drawText(cleanRef, {
                    x: curX,
                    y: colY - lyricsPt,
                    size: lyricsPt,
                    font: regularFont,
                    color: colMarker,
                  });
                  curX += regularFont.widthOfTextAtSize(cleanRef, lyricsPt) + (6 * ptPerPx);
                }
              } else if (chunk.chord && settings.showChords) {
                // Chords rendered directly WITHOUT square brackets!
                const chordText = chunk.chord;
                page.drawText(chordText, {
                  x: curX,
                  y: colY - chordsPt,
                  size: chordsPt,
                  font: chordsFontToUse,
                  color: colChords,
                });
                curX += chordsFontToUse.widthOfTextAtSize(chordText, chordsPt) + (6 * ptPerPx);
              } else if (chunk.text && chunk.text.trim()) {
                page.drawText(chunk.text, {
                  x: curX,
                  y: colY - lyricsPt,
                  size: lyricsPt,
                  font: regularFont,
                  color: colLyrics,
                });
                curX += regularFont.widthOfTextAtSize(chunk.text, lyricsPt) + (4 * ptPerPx);
              }
            }
            colY -= (Math.max(chordsPt, lyricsPt) + (5 * ptPerPx));
            continue;
          }

          // Case 3: Standard lyric line with chords placed directly above lyrics
          if (lineData.hasChords && settings.showChords) {
            const chordBaseY = colY - chordsPt;
            const lyricBaseY = colY - chordHeightPt - chordSpacingPt - lyricsPt;
            let curX = chunksOriginX;

            for (let j = 0; j < lineData.chunks.length; j++) {
              const chunk = lineData.chunks[j];
              const isLastChunk = j === lineData.chunks.length - 1;
              const hasChord = Boolean(chunk.chord);
              const chordStr = chunk.chord || '';
              const textStr = chunk.text || '';
              const isSectionRef = chunk.isSectionRef;

              // Compute widths: chords receive a small right padding unless it is the last chunk
              const chordW = hasChord
                ? chordsFontToUse.widthOfTextAtSize(chordStr, chordsPt) + (isLastChunk ? 0 : (2.5 * ptPerPx))
                : 0;
              const textW = textStr
                ? lyricsFontToUse.widthOfTextAtSize(textStr, lyricsPt)
                : 0;

              // Chunk width is max(chordW, textW) so chords and lyrics never collide horizontally!
              const chunkW = Math.max(chordW, textW);

              if (hasChord) {
                page.drawText(chordStr, {
                  x: curX,
                  y: chordBaseY,
                  size: chordsPt,
                  font: chordsFontToUse,
                  color: colChords,
                });
              }

              if (textStr) {
                page.drawText(textStr, {
                  x: curX,
                  y: lyricBaseY,
                  size: lyricsPt,
                  font: lyricsFontToUse,
                  color: isSectionRef ? colMarker : colLyrics,
                });
              }

              curX += chunkW;
            }

            colY -= (chordHeightPt + chordSpacingPt + lyricHeightPt + lineMarginBottomPt);
          } else {
            // Case 4: Lyrics only (no chords on line or chords hidden)
            const lyricBaseY = colY - lyricsPt;
            let curX = chunksOriginX;

            for (const chunk of lineData.chunks) {
              const textStr = chunk.text || '';
              const isSectionRef = chunk.isSectionRef;
              if (textStr) {
                page.drawText(textStr, {
                  x: curX,
                  y: lyricBaseY,
                  size: lyricsPt,
                  font: lyricsFontToUse,
                  color: isSectionRef ? colMarker : colLyrics,
                });
                curX += lyricsFontToUse.widthOfTextAtSize(textStr, lyricsPt);
              }
            }

            colY -= (lyricHeightPt + lineMarginBottomPt);
          }
        }

        // Finish vertical section accent line for this column
        if (showSectionLines && secSegmentStartY > colY) {
          const borderColX = songMarginPtLeft + currentCol * (colWidth + colGap) + (sectionBorderW / 2);
          page.drawLine({
            start: { x: borderColX, y: secSegmentStartY },
            end: { x: borderColX, y: colY + lineMarginBottomPt },
            thickness: sectionBorderW,
            color: currentLineColor,
          });
        }

        // Section separation spacing
        colY -= sectionBottomMarginPt;
      }
    }

    
      // ----------------------------------------------------------------------
      // BACK COVER PAGE (OPTIONAL)
      // ----------------------------------------------------------------------
      if (settings.showBackCover !== false && songs.length > 0) {
        postProgress({
          percent: 95,
          phase: 'finalizing',
          message: 'Generuji zadní stranu...',
          totalSongs
        });
        const backCoverPageIndex = doc.getPageCount();
        const backMargins = getPageMargins(settings, backCoverPageIndex);
        const backPtLeft = backMargins.left * mmToPt;
        const backPtRight = backMargins.right * mmToPt;
        const backPtTop = backMargins.top * mmToPt;
        const backPtBottom = backMargins.bottom * mmToPt;

        await renderBackCoverPage(
          doc,
          songbookData,
          settings,
          boldFont,
          regularFont,
          pageWidth,
          pageHeight,
          backPtLeft,
          backPtRight,
          backPtTop,
          backPtBottom,
          colTitle,
          colArtist,
          colSectionLine,
          ptPerPx
        );
      }

    postProgress({
      percent: 95,
      phase: 'finalizing',
      message: 'Compiling PDF binary and compressing streams...',
      totalSongs,
    });

    // 5. Save and return PDF bytes

    const pdfBytes = await doc.save();
    const cleanBookTitle = bookTitle.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
    const filename = `${cleanBookTitle || 'Kytario_Songbook'}.pdf`;

    postProgress({
      percent: 100,
      phase: 'finalizing',
      message: 'PDF completed!',
      totalSongs,
    });

    const totalPages = doc.getPageCount();

    // Post complete message with zero-copy transferable Uint8Array buffer
    (self as any).postMessage(
      {
        type: 'COMPLETE',
        payload: {
          pdfBytes,
          filename,
          pageCount: totalPages,
          sizeBytes: pdfBytes.byteLength,
        },
      } as WorkerOutMessage,
      [pdfBytes.buffer]
    );
  } catch (err: any) {
    console.error('PDF Worker generation error:', err);
    self.postMessage({
      type: 'ERROR',
      payload: {
        message: err.message || 'An unexpected error occurred in the PDF generation worker.',
      },
    } as WorkerOutMessage);
  }
};
