import { Song, PrintSettings } from '../types';
import { 
  parseSongContent, 
  computeSmartFitScale, 
  computeSmartColumnBalance, 
  ChordChunk,
  ParsedLine,
  SongSection 
} from '../utils';

export interface TocPageItem {
  song: Song;
  originalIndex: number;
  title: string;
  artist: string;
}

export interface StandaloneTocPage {
  pageIndex: number;
  totalPages: number;
  items: TocPageItem[];
  isFirstPage: boolean;
  columns: number;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Computes TOC pages if not provided
 */
export function computeStandaloneTocPages(songs: Song[], settings: PrintSettings): StandaloneTocPage[] {
  const items = songs.map((song, i) => ({
    song,
    originalIndex: i,
    title: song.title || song.name || 'Unknown Title',
    artist: song.artist || song.author || song.interpreter || ''
  }));

  if (settings.indexSortOrder === 'alphabetical') {
    items.sort((a, b) => a.title.localeCompare(b.title));
  }

  const mmToPx = 3.779528;
  const isLandscape = settings.orientation === 'landscape';
  const tocColumns = isLandscape ? 3 : 2;
  const tocMarginMmX = settings.pageMargin ?? 5;
  const tocMarginMmYTop = Math.round((settings.pageMargin ?? 5) * 1.1);
  const tocMarginMmYBottom = Math.max(3, Math.round((settings.pageMargin ?? 5) * 0.75));
  const paddingTotalY = (tocMarginMmYTop + tocMarginMmYBottom) * mmToPx;

  let basePxHeight = 297 * mmToPx;
  if (settings.pageFormat === 'A5') {
    basePxHeight = (isLandscape ? 148 : 210) * mmToPx;
  } else if (settings.pageFormat === 'Letter') {
    basePxHeight = (isLandscape ? 8.5 : 11) * 96;
  } else {
    basePxHeight = (isLandscape ? 210 : 297) * mmToPx;
  }
  
  const safeTocSize = Number(settings.tocFontSize) || (Number(settings.lyricsFontSize) * 0.95) || 12;
  const safeTitleSize = Number(settings.titleFontSize) || 16;
  const itemLineHeight = Math.ceil(safeTocSize * 1.28) + 5;
  const bottomBuffer = 4;

  const headerHeightP1 = Math.ceil(safeTitleSize * 1.15 * 1.2) + 30;
  const availableContentHeightP1 = Math.max(80, basePxHeight - paddingTotalY - headerHeightP1 - bottomBuffer);
  const rowsPerColP1 = Math.max(3, Math.floor(availableContentHeightP1 / itemLineHeight));
  const itemsPerPage1 = Math.max(1, rowsPerColP1 * tocColumns);

  const headerHeightSubsequent = Math.ceil(safeTitleSize * 0.85 * 1.2) + 33;
  const availableContentHeightSubsequent = Math.max(80, basePxHeight - paddingTotalY - headerHeightSubsequent - bottomBuffer);
  const rowsPerColSubsequent = Math.max(3, Math.floor(availableContentHeightSubsequent / itemLineHeight));
  const itemsPerPageSubsequent = Math.max(1, rowsPerColSubsequent * tocColumns);

  const pages: StandaloneTocPage[] = [];
  const totalItems = items.length;

  if (totalItems > 0) {
    const count1 = Math.max(1, itemsPerPage1);
    pages.push({
      pageIndex: 1,
      totalPages: 1,
      items: items.slice(0, count1),
      isFirstPage: true,
      columns: tocColumns,
    });

    let offset = count1;
    let pageNum = 2;
    const countSub = Math.max(1, itemsPerPageSubsequent);

    while (offset < totalItems) {
      pages.push({
        pageIndex: pageNum,
        totalPages: 1,
        items: items.slice(offset, offset + countSub),
        isFirstPage: false,
        columns: tocColumns,
      });
      offset += countSub;
      pageNum++;
    }

    const totalPages = pages.length;
    for (let i = 0; i < totalPages; i++) {
      pages[i].totalPages = totalPages;
    }
  }

  return pages;
}

/**
 * Generates an entirely self-contained HTML document ready for printing or offline saving.
 */
export function generateStandaloneSongbookHtml(
  title: string,
  songs: Song[],
  settings: PrintSettings,
  precalculatedTocPages?: StandaloneTocPage[]
): string {
  const isLand = settings.orientation === 'landscape';
  let cssWidth = '210mm';
  let cssHeight = '297mm';

  switch (settings.pageFormat) {
    case 'A4':
      cssWidth = isLand ? '297mm' : '210mm';
      cssHeight = isLand ? '210mm' : '297mm';
      break;
    case 'A5':
      cssWidth = isLand ? '210mm' : '148mm';
      cssHeight = isLand ? '148mm' : '210mm';
      break;
    case 'Letter':
      cssWidth = isLand ? '11in' : '8.5in';
      cssHeight = isLand ? '8.5in' : '11in';
      break;
  }

  const marginMmX = settings.pageMargin ?? 5;
  const marginMmY = Math.round((settings.pageMargin ?? 5) * 1.2);
  const tocMarginMmX = settings.pageMargin ?? 5;
  const tocMarginMmYTop = Math.round((settings.pageMargin ?? 5) * 1.1);
  const tocMarginMmYBottom = Math.max(3, Math.round((settings.pageMargin ?? 5) * 0.75));

  const titleColor = settings.titleColor || '#18181b';
  const artistColor = settings.artistColor || '#52525b';
  const lyricsColor = settings.lyricsColor || '#09090b';
  const chordsColor = settings.chordsColor || '#2563eb';
  const markerColor = settings.markerColor || '#4b5563';
  const tocColor = settings.tocColor || settings.lyricsColor || '#18181b';
  const sectionLineColor = settings.sectionLineColor || '#e4e4e7';
  const refrainLineColor = settings.refrainLineColor || settings.chordsColor || '#93c5fd';

  const formatName = settings.pageFormat === 'Letter' ? 'letter' : settings.pageFormat;
  const tocPages = precalculatedTocPages || computeStandaloneTocPages(songs, settings);
  const totalPages = tocPages.length + songs.length;
  const documentTitle = escapeHtml(title || 'Kytario_Songbook');

  // Compute available column height for smart balancing
  const mmToPx = 3.779528;
  let totalPxHeight = 297 * mmToPx;
  switch (settings.pageFormat) {
    case 'A4':
      totalPxHeight = (isLand ? 210 : 297) * mmToPx;
      break;
    case 'A5':
      totalPxHeight = (isLand ? 148 : 210) * mmToPx;
      break;
    case 'Letter':
      totalPxHeight = (isLand ? 8.5 : 11) * 96;
      break;
  }
  const paddingY = (marginMmY * 2) * mmToPx;

  // Render Table of Contents HTML
  const numColWidth = songs.length >= 100 ? '2.8em' : songs.length >= 10 ? '2.1em' : '1.5em';
  const safeTocSize = Number(settings.tocFontSize) || (Number(settings.lyricsFontSize) * 0.95) || 12;
  const safeTitleSize = Number(settings.titleFontSize) || 16;

  let tocHtml = '';
  tocPages.forEach((tocPage) => {
    const itemsPerCol = Math.max(1, Math.ceil(tocPage.items.length / tocPage.columns));
    const columnsData = Array.from({ length: tocPage.columns }, (_, c) => {
      const start = c * itemsPerCol;
      return tocPage.items.slice(start, start + itemsPerCol);
    });

    let columnsHtml = '';
    columnsData.forEach((colItems) => {
      let itemsListHtml = '';
      colItems.forEach((item) => {
        const itemTitle = escapeHtml(item.title);
        const itemArtist = item.artist ? escapeHtml(item.artist) : '';
        itemsListHtml += `
          <div class="toc-item-row">
            <a href="#song-${item.originalIndex}" class="toc-link" title="${item.originalIndex + 1}. ${itemTitle}${itemArtist ? ` - ${itemArtist}` : ''}">
              <span class="toc-number" style="width: ${numColWidth};">${item.originalIndex + 1}.</span>
              <span class="toc-title-wrapper">
                <span class="toc-song-title">${itemTitle}</span>
                ${itemArtist ? `<span class="toc-song-artist"> - ${itemArtist}</span>` : ''}
              </span>
            </a>
          </div>
        `;
      });

      columnsHtml += `
        <div class="toc-column" style="max-width: ${100 / tocPage.columns}%;">
          ${itemsListHtml}
        </div>
      `;
    });

    const headerHtml = tocPage.isFirstPage
      ? `
        <div class="toc-header first-page">
          <h1 class="toc-main-title">${documentTitle}</h1>
          <p class="toc-subtitle">
            <span>Obsah${tocPages.length > 1 ? ` • Strana 1 z ${tocPages.length}` : ''}</span>
          </p>
        </div>
      `
      : `
        <div class="toc-header subsequent-page">
          <h2 class="toc-subsequent-title">
            ${documentTitle} <span class="toc-cont-label">(pokračování)</span>
          </h2>
          <p class="toc-subtitle">
            <span>Obsah • Strana ${tocPage.pageIndex} z ${tocPages.length}</span>
          </p>
        </div>
      `;

    tocHtml += `
      <div class="page-outer-wrapper" id="${tocPage.isFirstPage ? 'toc-page' : `toc-page-${tocPage.pageIndex}`}">
        <div class="page-container toc-container" style="padding: ${tocMarginMmYTop}mm ${tocMarginMmX}mm ${tocMarginMmYBottom}mm ${tocMarginMmX}mm;">
          ${headerHtml}
          <div class="toc-columns-body" style="gap: ${tocPage.columns === 3 ? '1.75rem' : '2.5rem'}; font-size: ${safeTocSize}px;">
            ${columnsHtml}
          </div>
        </div>
      </div>
    `;
  });

  // Render Songs HTML
  let songsHtml = '';
  songs.forEach((song, i) => {
    const sTitle = escapeHtml(song.title || song.name || 'Unknown Title');
    const sArtist = escapeHtml(song.artist || song.author || song.interpreter || '');
    const sText = song.text || song.content || song.lyrics || '';
    const hasTitle = Boolean(sTitle);
    const hasArtist = Boolean(sArtist);

    const sections = parseSongContent(sText);
    const scale = computeSmartFitScale(sections, settings, hasTitle, hasArtist);

    const titleBlockH = (hasTitle ? (Number(settings.titleFontSize) || 16) * 1.25 : 0) + 
                        (hasArtist ? (Number(settings.artistFontSize) || 16) * 1.25 : 0) + 18;
    const availColH = Math.max(100, totalPxHeight - paddingY - titleBlockH - 24);
    const columnPlan = computeSmartColumnBalance(sections, settings, availColH, scale);

    const baseLyricsSize = Number(settings.lyricsFontSize) || 12;
    const baseChordsSize = Number(settings.chordsFontSize) || 12;
    const chosenLyricsSize = Math.round(baseLyricsSize * scale * 10) / 10;
    const chosenChordsSize = Math.round(baseChordsSize * scale * 10) / 10;
    const colCount = Math.max(1, Math.min(3, settings.columns || 2));

    const songStyles = `
      --song-scale: ${scale};
      --lyrics-size: ${baseLyricsSize}px;
      --chords-size: ${baseChordsSize}px;
      --chosen-lyrics-size: ${chosenLyricsSize}px;
      --chosen-chords-size: ${chosenChordsSize}px;
      --title-size: ${Number(settings.titleFontSize) || 16}px;
      --artist-size: ${Number(settings.artistFontSize) || 16}px;
      --title-color: ${titleColor};
      --artist-color: ${artistColor};
      --lyrics-color: ${lyricsColor};
      --chords-color: ${chordsColor};
      --marker-color: ${markerColor};
    `;

    let sectionsHtml = '';
    sections.forEach((sec, vIndex) => {
      const plan = columnPlan?.sections?.[vIndex];
      const shouldAvoidBreak = plan ? plan.avoidBreakInside : (sections.length > 1 || sec.parsedLines.length < 4);
      const breakBeforeColumn = plan?.breakBeforeColumn ?? false;
      const firstNonEmptyIndex = sec.parsedLines.findIndex((l) => !l.isEmpty);

      const showSectionLines = settings.showSectionLines !== false;
      const currentLineColor = sec.isRefrain ? refrainLineColor : sectionLineColor;
      const hasSectionLine = showSectionLines && Boolean(sec.marker);

      let secClass = 'song-section';
      if (shouldAvoidBreak) secClass += ' avoid-break-inside';
      if (breakBeforeColumn) secClass += ' break-before-column';
      if (hasSectionLine) secClass += ' section-with-border';

      let secStyle = '';
      if (hasSectionLine) {
        secStyle = `border-left: 2.5px solid ${currentLineColor}; padding-left: 0.5rem; margin-left: 0.1rem;`;
      }

      let linesHtml = '';
      sec.parsedLines.forEach((line, lIndex) => {
        if (line.isEmpty) {
          linesHtml += `<div class="song-line-empty" style="height: calc(var(--chosen-lyrics-size) * 0.75);"></div>`;
          return;
        }

        const isRep = Boolean(line.isRepetitionLine);
        let chunksHtml = '';

        line.chunks.forEach((chunk) => {
          const isSectionRef = Boolean(chunk.isSectionRef);
          const hasChord = settings.showChords && Boolean(chunk.chord);
          const hasActualText = Boolean(chunk.text && chunk.text.trim().length > 0);
          const isWhitespaceOnly = Boolean(chunk.text && chunk.text.length > 0 && chunk.text.trim().length === 0);

          let chordEl = '';
          if (hasChord) {
            chordEl = `
              <div class="song-chord font-mono" style="color: var(--chords-color); font-size: var(--chosen-chords-size); min-height: var(--chosen-chords-size); margin-bottom: 0.15em;">
                ${escapeHtml(chunk.chord || '')}
              </div>
            `;
          }

          let textContent = '';
          if (isSectionRef) {
            textContent = `<span class="song-marker" style="color: var(--marker-color); font-weight: 600;">${escapeHtml(chunk.text)}</span>`;
          } else if (hasActualText && !isWhitespaceOnly) {
            textContent = escapeHtml(chunk.text);
          } else if (isWhitespaceOnly) {
            textContent = chunk.text.replace(/ /g, '&nbsp;') + `<span class="invisible-strut" aria-hidden="true">Ág</span>`;
          } else {
            // Strut for chord without lyrics underneath
            textContent = `<span class="invisible-strut" aria-hidden="true">Ág</span>`;
          }

          chunksHtml += `
            <div class="chunk-container">
              ${chordEl}
              <div class="song-lyric ${isRep ? 'font-semibold' : ''}" style="color: var(--lyrics-color); font-size: var(--chosen-lyrics-size); font-style: ${settings.lyricsItalic ? 'italic' : 'normal'}; min-height: ${isRep ? 'auto' : 'var(--chosen-lyrics-size)'}; line-height: 1;">
                ${textContent}
              </div>
            </div>
          `;
        });

        const showMarker = Boolean(sec.marker && lIndex === firstNonEmptyIndex && !hasSectionLine);
        const markerEl = showMarker 
          ? `<span class="sec-inline-marker" style="color: var(--marker-color); font-size: calc(var(--chosen-lyrics-size) * 0.85);">${escapeHtml(sec.marker)}</span>` 
          : '';

        linesHtml += `
          <div class="song-line-row">
            ${markerEl}
            <div class="song-chunks-row">
              ${chunksHtml}
            </div>
          </div>
        `;
      });

      sectionsHtml += `
        <div class="${secClass}" style="${secStyle}">
          ${linesHtml}
        </div>
      `;
    });

    songsHtml += `
      <div class="page-outer-wrapper" id="song-${i}">
        <div class="page-container song-container" style="${songStyles} padding: ${marginMmY}mm ${marginMmX}mm;">
          <div class="song-badge">${i + 1}</div>
          <div class="song-title-block">
            <h2 class="song-title-heading" style="color: var(--title-color); font-size: var(--title-size);">
              ${sTitle}
              ${sArtist ? `<span class="song-artist-heading" style="color: var(--artist-color); font-size: var(--artist-size);"> - ${sArtist}</span>` : ''}
            </h2>
          </div>
          <div class="song-columns-area" style="column-count: ${colCount}; column-gap: ${colCount > 1 ? '1.5rem' : '0'};">
            ${sectionsHtml}
          </div>
        </div>
      </div>
    `;
  });

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${documentTitle} - Kytario Songbook</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">

  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      scroll-behavior: smooth;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #3f3f46;
      color: #18181b;
    }

    body {
      margin: 0;
      padding: 60px 0 30px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      background-color: #3f3f46;
    }

    /* ROOT PAGE ORIENTATION & PAPER SIZE RULES */
    @page {
      size: ${cssWidth} ${cssHeight};
      size: ${settings.orientation};
      size: ${formatName} ${settings.orientation};
      margin: 0mm !important;
    }
    @page :first {
      size: ${cssWidth} ${cssHeight};
      size: ${settings.orientation};
      size: ${formatName} ${settings.orientation};
      margin: 0mm !important;
    }
    @page :left {
      size: ${cssWidth} ${cssHeight};
      size: ${settings.orientation};
      size: ${formatName} ${settings.orientation};
      margin: 0mm !important;
    }
    @page :right {
      size: ${cssWidth} ${cssHeight};
      size: ${settings.orientation};
      size: ${formatName} ${settings.orientation};
      margin: 0mm !important;
    }

    /* FLOATING RESPONSIVE TOOLBAR (SCREEN ONLY) */
    .screen-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      height: 48px;
      background: rgba(24, 24, 27, 0.94);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      color: #fff;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      overflow: hidden;
    }

    .toolbar-title {
      font-size: 13px;
      font-weight: 700;
      color: #fafafa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 240px;
    }

    .toolbar-badge {
      font-size: 11px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.14);
      color: #e4e4e7;
      padding: 2px 8px;
      border-radius: 9999px;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      border: 1px solid #3b82f6;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
      white-space: nowrap;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #f4f4f5;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
      white-space: nowrap;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* PAGE CONTAINERS */
    .page-outer-wrapper {
      width: ${cssWidth};
      height: ${cssHeight};
      min-height: ${cssHeight};
      max-height: ${cssHeight};
      background: #ffffff;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
      border-radius: 2px;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    .page-container {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background: #ffffff;
      color: #000000;
      display: flex;
      flex-direction: column;
    }

    /* TOC STYLES */
    .toc-header {
      text-align: center;
      flex-shrink: 0;
    }
    .toc-header.first-page {
      margin-bottom: 14px;
    }
    .toc-header.subsequent-page {
      margin-bottom: 10px;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 4px;
    }
    .toc-main-title {
      font-size: ${safeTitleSize * 1.15}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: ${titleColor};
      line-height: 1.2;
    }
    .toc-subsequent-title {
      font-size: ${safeTitleSize * 0.85}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: ${titleColor};
      line-height: 1.2;
    }
    .toc-cont-label {
      color: #71717a;
      font-weight: 400;
      font-size: 11px;
      text-transform: none;
    }
    .toc-subtitle {
      font-size: 11px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }
    .toc-columns-body {
      flex: 1;
      display: flex;
      overflow: hidden;
      min-height: 0;
    }
    .toc-column {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .toc-item-row {
      margin-bottom: 2px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .toc-link {
      display: flex;
      align-items: baseline;
      width: 100%;
      color: ${tocColor};
      text-decoration: none;
      line-height: 1.28;
      padding: 2px 0;
    }
    .toc-link:hover .toc-song-title {
      text-decoration: underline;
    }
    .toc-number {
      flex-shrink: 0;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      padding-right: 8px;
      color: ${titleColor};
      opacity: 0.8;
      user-select: none;
    }
    .toc-title-wrapper {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }
    .toc-song-title {
      font-weight: 500;
    }
    .toc-song-artist {
      color: ${artistColor};
      opacity: 0.8;
      font-size: 0.92em;
      margin-left: 4px;
    }

    /* SONG PAGE STYLES */
    .song-badge {
      position: absolute;
      top: 0;
      left: 0;
      width: 26px;
      height: 26px;
      background: #27272a;
      color: #ffffff;
      font-weight: 700;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      border-bottom-right-radius: 4px;
    }
    .song-title-block {
      text-align: center;
      margin-bottom: 16px;
      padding: 0 32px;
      flex-shrink: 0;
    }
    .song-title-heading {
      font-weight: 700;
      line-height: 1.2;
    }
    .song-artist-heading {
      font-weight: 700;
    }
    .song-columns-area {
      flex: 1;
      min-height: 0;
      white-space: pre-wrap;
      column-fill: balance;
      -webkit-column-fill: balance;
      orphans: 2;
      widows: 2;
    }
    .song-section {
      margin-bottom: 0.6em;
      orphans: 2;
      widows: 2;
    }
    .song-section.avoid-break-inside {
      break-inside: avoid;
      page-break-inside: avoid;
      -webkit-column-break-inside: avoid;
    }
    .song-section.break-before-column {
      break-before: column;
      -webkit-column-break-before: always;
      page-break-before: always;
    }
    .song-section.section-with-border {
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    .song-line-row {
      display: flex;
      align-items: baseline;
      margin-bottom: 0.1em;
    }
    .song-line-empty {
      width: 100%;
    }
    .sec-inline-marker {
      font-weight: 600;
      margin-right: 0.5em;
      flex-shrink: 0;
      user-select: none;
    }
    .song-chunks-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .chunk-container {
      display: inline-flex;
      flex-direction: column;
      vertical-align: bottom;
    }
    .song-chord {
      user-select: none;
    }
    .invisible-strut {
      visibility: hidden;
      user-select: none;
      display: inline-block;
      width: 0;
      height: 0;
      overflow: hidden;
    }

    /* PRINT STYLES */
    @media print {
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        transition: none !important;
        animation: none !important;
      }

      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        height: auto !important;
      }

      .screen-toolbar {
        display: none !important;
      }

      .page-outer-wrapper {
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-before: auto !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        width: ${cssWidth} !important;
        height: ${cssHeight} !important;
        min-height: ${cssHeight} !important;
        max-height: ${cssHeight} !important;
        display: block !important;
        float: none !important;
      }

      .page-outer-wrapper:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }

      .song-badge {
        border: 1px solid #000 !important;
      }
    }
  </style>
</head>
<body>
  <!-- FLOATING SCREEN TOOLBAR -->
  <header class="screen-toolbar">
    <div class="toolbar-left">
      <div class="toolbar-title" title="${documentTitle}">${documentTitle}</div>
      <div class="toolbar-badge">
        <span>${settings.pageFormat}</span>
        <span>•</span>
        <span style="text-transform: capitalize;">${settings.orientation}</span>
        <span>•</span>
        <span>${songs.length} písní (${totalPages} str.)</span>
      </div>
    </div>

    <div class="toolbar-actions">
      <button type="button" class="btn-primary" id="btn-print-pdf">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9V2h12v7"></path>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <path d="M6 14h12v8H6z"></path>
        </svg>
        <span>Print / Save as PDF</span>
      </button>

      <button type="button" class="btn-secondary" id="btn-save-html" title="Save this document as a standalone .html file">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Save HTML</span>
      </button>

      <button type="button" class="btn-secondary" id="btn-close-tab" title="Close this tab">
        ✕
      </button>
    </div>
  </header>

  <!-- CONTENT PAGES -->
  ${tocHtml}
  ${songsHtml}

  <script>
    document.getElementById('btn-print-pdf')?.addEventListener('click', function() {
      window.print();
    });

    document.getElementById('btn-close-tab')?.addEventListener('click', function() {
      window.close();
    });

    document.getElementById('btn-save-html')?.addEventListener('click', function() {
      try {
        const fullHtml = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '${documentTitle}_songbook.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to save HTML:', err);
      }
    });

    // Keyboard shortcut: Ctrl+P / Cmd+P
    window.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Helper to open the standalone songbook HTML in a new tab
 */
export function openStandaloneSongbookInNewTab(
  title: string,
  songs: Song[],
  settings: PrintSettings,
  tocPages?: StandaloneTocPage[]
): boolean {
  try {
    const html = generateStandaloneSongbookHtml(title, songs, settings, tocPages);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');

    if (!win) {
      // If popup blocker intervened, trigger direct download
      downloadStandaloneSongbookHtml(title, songs, settings, tocPages);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error opening standalone HTML:', err);
    return false;
  }
}

/**
 * Helper to trigger browser download of the standalone HTML file
 */
export function downloadStandaloneSongbookHtml(
  title: string,
  songs: Song[],
  settings: PrintSettings,
  tocPages?: StandaloneTocPage[]
): void {
  try {
    const html = generateStandaloneSongbookHtml(title, songs, settings, tocPages);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const cleanTitle = (title || 'Kytario_Songbook').trim().replace(/[/\\\\?%*:|"<>]/g, '-').replace(/\\s+/g, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanTitle}_${settings.pageFormat}_${settings.orientation}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Error downloading standalone HTML:', err);
  }
}
