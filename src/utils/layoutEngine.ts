/**
 * Song layout engine: analytical font scaling, column balancing and section
 * filling used to fit songs optimally on printed pages.
 */
import { PrintSettings, Song, SongFitDebugInfo, ColumnBalancePlan, SectionBalancePlan } from '../types';
import { getPageMargins, getPageDimensionsPx } from './pageGeometry';
import { MIN_READABLE_LYRICS_FONT_SIZE, MIN_READABLE_CHORDS_FONT_SIZE, MM_TO_PX } from './constants';
import { parseSongContent, SongSection, ParsedLine } from './songParser';

/**
 * Internal helper to calculate the estimated height of a single song line.
 * KISS: Keep it simple by grouping related height logic.
 */
function estimateLineHeight(
  lineData: ParsedLine, 
  s: number, 
  lSize: number, 
  cSize: number, 
  charsPerCol: number, 
  showChords: boolean
): number {
  if (lineData.isEmpty) {
    return Math.max(10, Math.round(12 * Math.min(1.4, s)));
  }

  const isRep = lineData.isRepetitionLine ||
    (!lineData.chunks || !lineData.chunks.some((c: any) => c.text && c.text.trim().length > 0 && !c.isSectionRef));

  const textLen = lineData.raw.replace(/\[[^\]]*\]|\{[^\}]*\}/g, '').length;
  let chordsLen = 0;
  const hasChords = lineData.hasChords && showChords;
  
  if (hasChords && lineData.chunks) {
    for (const c of lineData.chunks) {
      if (c.chord) chordsLen += c.chord.length + 2;
    }
  }
  
  const visualLines = estimateVisualLineCount(lineData, charsPerCol, showChords, textLen, chordsLen);
  
  if (isRep) return Math.round((cSize + 4) * 1.05) * visualLines;
  if (hasChords) return Math.round((cSize + lSize + 4) * 1.05 + 5) * visualLines;
  return Math.round((lSize + 4) * 1.05 + 5) * visualLines;
}

/** Estimates rows using the same non-shrinking chunk layout as SongDisplay. */
function estimateVisualLineCount(
  lineData: ParsedLine,
  charsPerCol: number,
  showChords: boolean,
  textLen = lineData.raw.replace(/\[[^\]]*\]|\{[^\}]*\}/g, '').length,
  chordsLen = 0,
): number {
  const chunks = lineData.chunks || [];
  if (lineData.hasChords && showChords && chordsLen === 0) {
    chordsLen = chunks.reduce((total, chunk) => total + (chunk.chord ? chunk.chord.length + 2 : 0), 0);
  }

  if (chunks.length === 0) {
    return Math.max(1, Math.ceil(Math.max(textLen, chordsLen) / charsPerCol));
  }

  const renderedWidth = lineData.isRepetitionLine
    ? chunks.reduce((total, chunk) => total + chunk.text.length + (showChords && chunk.chord ? chunk.chord.length + 2 : 0), 0)
    : chunks.reduce((total, chunk) => {
        const textWidth = chunk.text.length;
        const chordWidth = showChords && chunk.chord ? chunk.chord.length + 2 : 0;
        return total + Math.max(textWidth, chordWidth);
      }, 0);

  return Math.max(1, Math.ceil(Math.max(renderedWidth, textLen, chordsLen) / charsPerCol));
}

export function getOptimalColumnCount(
  sections: SongSection[],
  settings: {
    orientation?: 'portrait' | 'landscape';
  }
): number {
  const isLandscape = settings.orientation === 'landscape';
  const baseCols = 2;

  let maxLineLen = 0;
  let totalLineLen = 0;
  let nonEmptyLineCount = 0;
  for (const s of sections) {
    if (s.parsedLines) {
      for (const pl of s.parsedLines) {
        if (pl.raw && !pl.isEmpty) {
          // Measure visible lyric text, not chord markup such as [C] or {G}.
          const visibleLength = pl.raw.replace(/\[[^\]]*\]|\{[^\}]*\}/g, '').length;
          maxLineLen = Math.max(maxLineLen, visibleLength);
          totalLineLen += visibleLength;
          nonEmptyLineCount++;
        }
      }
    }
    if (s.marker) {
      maxLineLen = Math.max(maxLineLen, s.marker.length);
    }
  }

  const averageLineLen = nonEmptyLineCount > 0 ? totalLineLen / nonEmptyLineCount : 0;

  // We keep 2 columns as the default, but for dense landscape songs with
  // moderate line lengths it is better to let the content spread into 3 columns.
  const canUseThreeColumns = isLandscape &&
    nonEmptyLineCount >= 45 &&
    averageLineLen <= 32 &&
    maxLineLen <= 66;

  if (maxLineLen > 66) {
    return 2;
  }
  return canUseThreeColumns ? 3 : baseCols;
}

export function computeSmartFitScale(
  sections: SongSection[],
  settings: {
    pageFormat?: 'A4' | 'A5' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    columns?: number;
    titleFontSize?: number;
    artistFontSize?: number;
    lyricsFontSize?: number;
    chordsFontSize?: number;
    showChords?: boolean;
    smartFit?: boolean;
    pageMargin?: number;
    pageMarginTopBottom?: number;
    pageMarginLeftRight?: number;
    maxFontSizePx?: number;
    maxLineHeight?: number;
    sectionMarginCap?: number;
    showSectionLines?: boolean;
  },
  hasTitle: boolean = true,
  hasArtist: boolean = false
): number {
  if (!sections?.length) return 1.0;

  const margins = getPageMargins(settings);
  const page = getPageDimensionsPx(settings.pageFormat, settings.orientation, margins);

  const usableW = Math.max(200, page.width);
  const usableH = Math.max(200, page.height);

  const baseLyricsSize = Number(settings.lyricsFontSize) || 12;
  const baseChordsSize = Number(settings.chordsFontSize) || 12;

  const titleBlockH = (hasTitle ? (Number(settings.titleFontSize) || 16) * 1.25 : 0) + 
                     (hasArtist ? (Number(settings.artistFontSize) || 16) * 1.25 : 0) + 
                     18;
  const availColH = Math.max(100, usableH - titleBlockH - 24);

  const colCount = getOptimalColumnCount(sections, settings);
  const colGap = colCount > 1 ? 24 : 0;
  const colWidth = (usableW - colGap * (colCount - 1)) / colCount;

  const hasMarkers = sections.some(s => !!s.marker?.trim());
  let maxMarkerLen = 0;
  if (hasMarkers) {
    sections.forEach(s => {
      if (s.marker) maxMarkerLen = Math.max(maxMarkerLen, s.marker.replace(/[\[\]]/g, '').trim().length);
    });
  }
  
  const markerColEm = maxMarkerLen <= 2 ? 1.85 : maxMarkerLen <= 4 ? 2.2 : Math.max(2.2, maxMarkerLen * 0.6 + 0.4);
  const sectionLineIndentEm = settings.showSectionLines !== false ? 0.6 : 0;
  const effectiveColW = Math.max(80, colWidth - (baseLyricsSize * ((hasMarkers ? markerColEm : 0) + sectionLineIndentEm)));
  const showChords = settings.showChords ?? true;

  // Measure the maximum rendered width in character units across all non-empty lines
  let maxRenderedWidth = 0;
  sections.forEach(sec => {
    sec.parsedLines?.forEach(line => {
      if (line.isEmpty) return;
      const chunks = line.chunks || [];
      const textLen = line.raw ? line.raw.replace(/\[[^\]]*\]|\{[^\}]*\}/g, '').length : 0;
      let chordsLen = 0;
      if (line.hasChords && showChords && chunks.length > 0) {
        chordsLen = chunks.reduce((total, chunk) => total + (chunk.chord ? chunk.chord.length + 2 : 0), 0);
      }
      const renderedWidth = chunks.length === 0
        ? Math.max(textLen, chordsLen)
        : line.isRepetitionLine
        ? chunks.reduce((total, chunk) => total + chunk.text.length + (showChords && chunk.chord ? chunk.chord.length + 2 : 0), 0)
        : chunks.reduce((total, chunk) => {
            const textWidth = chunk.text.length;
            const chordWidth = showChords && chunk.chord ? chunk.chord.length + 2 : 0;
            return total + Math.max(textWidth, chordWidth);
          }, 0);
      maxRenderedWidth = Math.max(maxRenderedWidth, renderedWidth);
    });
  });

  const calcHeightAtScale = (s: number): { height: number; maxWrapLines: number } => {
    const lSize = baseLyricsSize * s;
    const cSize = baseChordsSize * s;
    const charsPerCol = Math.max(16, Math.floor(effectiveColW / (lSize * 0.48)));

    let maxWrapLines = 1;
    const sectionHeights = sections.map((sec) => {
      let secH = 0;

      if (sec.marker && (!sec.parsedLines?.length || sec.parsedLines.every(l => l.isEmpty))) {
        secH += Math.round(lSize + 6);
      }
      sec.parsedLines.forEach(line => {
        if (!line.isEmpty) {
          const vLines = estimateVisualLineCount(line, charsPerCol, showChords);
          if (vLines > maxWrapLines) {
            maxWrapLines = vLines;
          }
        }
        secH += estimateLineHeight(line, s, lSize, cSize, charsPerCol, showChords);
      });
      return secH + Math.max(12, Math.round(baseLyricsSize * s * 1.0));
    });

    const total = sectionHeights.reduce((a, b) => a + b, 0);
    if (colCount <= 1 || (sections.length === 1 && sections[0].parsedLines.filter(l => !l.isEmpty).length <= 3)) {
      return { height: total, maxWrapLines };
    }

    // Balanced columns binary search
    let low = Math.max(Math.ceil(total / colCount), Math.min(Math.max(...sectionHeights), Math.ceil(availColH * 0.95)));
    let high = total;
    let best = total;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      let colsNeeded = 1, currentH = 0;
      sectionHeights.forEach(h => {
        if (currentH + h > mid) { colsNeeded++; currentH = h; }
        else { currentH += h; }
      });
      if (colsNeeded <= colCount) { best = mid; high = mid - 1; }
      else { low = mid + 1; }
    }
    return { height: best, maxWrapLines };
  };

  const linesPerCol = sections.reduce((acc, sec) => acc + sec.parsedLines.filter(l => !l.isEmpty).length, 0) / colCount;

  const minReadableSize = MIN_READABLE_LYRICS_FONT_SIZE;
  const minScale = Math.max(0.48, minReadableSize / baseLyricsSize);

  // Maximum scale where long lines fit horizontally within the column without excessive wrapping
  const maxScaleWithoutWrap = maxRenderedWidth > 0
    ? (effectiveColW / (maxRenderedWidth * baseLyricsSize * 0.48))
    : 3.5;

  const { height: baseHeight } = calcHeightAtScale(1.0);

  // 1. Check vertical overflow downscale
  let verticalScale = 1.0;
  if (baseHeight > availColH) {
    const targetUtil = 0.96;
    verticalScale = Math.max(minScale, Math.min(0.98, (availColH * targetUtil) / baseHeight));
  }

  // 2. Check horizontal long line wrapping downscale:
  // If long lines wrap at 1.0, scale down to fit them cleanly without splitting
  let horizontalFitScale = 1.0;
  if (maxScaleWithoutWrap < 1.0) {
    horizontalFitScale = Math.max(minScale, Math.min(1.0, Math.floor(maxScaleWithoutWrap * 100) / 100));
  }

  // If the song needs downscaling either vertically or horizontally:
  if (verticalScale < 1.0 || horizontalFitScale < 1.0) {
    const downScale = Math.min(verticalScale, horizontalFitScale);
    return Math.round(Math.max(minScale, downScale) * 100) / 100;
  }

  if (!settings.smartFit) return 1.0;

  const maxPx = settings.maxFontSizePx || 16;
  const upscaleLimit = Math.max(1.0, Math.min(3.5, maxPx / baseLyricsSize));
  if (upscaleLimit <= 1.0) return 1.0;

  const targetMaxH = availColH * 0.95;
  const allowedWrapLines = linesPerCol <= 16 ? 2 : 1;
  let bestScale = 1.0, low = 1.0, high = upscaleLimit;
  
  for (let i = 0; i < 10; i++) {
    const mid = (low + high) / 2;
    const { height, maxWrapLines } = calcHeightAtScale(mid);
    if (height <= targetMaxH && maxWrapLines <= allowedWrapLines) { 
      bestScale = mid; 
      low = mid; 
    } else { 
      high = mid; 
    }
  }

  return Math.round(bestScale * 100) / 100;
}

/**
 * Smart Column Balancing Algorithm
 *
 * Prevents lone lines / orphans at the top of a new column and lone lines / widows
 * at the bottom of a preceding column when songs are rendered in multi-column layouts.
 *
 * Key rules & features:
 * 1. Evaluates total visual height per section and per line at the active scale.
 * 2. Checks for clean inter-section break points between stanzas that balance column heights
 *    without breaking any stanza.
 * 3. When a long section must span across columns, enforces strict orphan & widow prevention:
 *    - Never allows a break that leaves only 1 lone line at the top of the next column.
 *    - Never allows a break that leaves only 1 lone line at the bottom of the previous column.
 *    - Groups the first 2 lines (+ marker) and the last 2 lines into atomic unbreakable sub-blocks
 *      (`break-inside: avoid`), ensuring at least 2 lines always carry over together.
 * 4. Stanzas with <= 3 lines are always kept intact (`avoidBreakInside: true`).
 */
export function computeSmartColumnBalance(
  sections: SongSection[],
  settings: {
    pageFormat?: 'A4' | 'A5' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    columns?: number;
    titleFontSize?: number;
    artistFontSize?: number;
    lyricsFontSize?: number;
    chordsFontSize?: number;
    showChords?: boolean;
    pageMargin?: number;
    pageMarginTopBottom?: number;
    pageMarginLeftRight?: number;
  },
  availColH: number,
  scale: number
): ColumnBalancePlan {
  const colCount = getOptimalColumnCount(sections, settings);
  const showChords = settings.showChords ?? true;
  const lSize = (Number(settings.lyricsFontSize) || 12) * scale;
  const cSize = (Number(settings.chordsFontSize) || 12) * scale;

  const margins = getPageMargins(settings);
  const usableWidth = Math.max(200, getPageDimensionsPx(settings.pageFormat, settings.orientation).width - (margins.left + margins.right) * MM_TO_PX);
  const colGap = colCount > 1 ? 24 : 0;
  const colWidth = (usableWidth - colGap * (colCount - 1)) / colCount;
  const maxMarkerLen = sections.reduce((max, section) => {
    const markerLength = section.marker?.replace(/[\[\]]/g, '').trim().length || 0;
    return Math.max(max, markerLength);
  }, 0);
  const markerColEm = maxMarkerLen <= 2 ? 1.85 : maxMarkerLen <= 4 ? 2.2 : Math.max(2.2, maxMarkerLen * 0.6 + 0.4);
  const effectiveColWidth = Math.max(80, colWidth - lSize * (maxMarkerLen > 0 ? markerColEm : 0.6));
  const charsPerCol = Math.max(16, Math.floor(effectiveColWidth / (lSize * 0.54)));

  const defaultPlan = (strategy: ColumnBalancePlan['strategy'] = 'single-column'): ColumnBalancePlan => ({
    colCount: colCount > 1 ? colCount : 1,
    isMultiColumn: colCount > 1,
    cuts: [],
    orphanPrevented: true,
    strategy,
    sections: sections.map((sec, idx) => ({
      sectionIndex: idx,
      breakBeforeColumn: false,
      avoidBreakInside: sec.parsedLines.filter(l => !l.isEmpty).length <= 3,
      orphanProtection: { hasHeadGroup: false, headGroupCount: 0, hasTailGroup: false, tailGroupStartIndex: -1 },
    })),
  });

  if (colCount <= 1 || !sections?.length) return defaultPlan();

  // 1. Calculate section heights
  const sectionHeights = sections.map((sec) => {
    let secH = 0;
    if (sec.marker && (!sec.parsedLines?.length || sec.parsedLines.every(l => l.isEmpty))) {
      secH += Math.round(lSize + 6);
    }
    sec.parsedLines.forEach(line => {
      secH += estimateLineHeight(line, scale, lSize, cSize, charsPerCol, showChords);
    });
    return secH + Math.max(14, Math.round(16 * Math.min(1.3, scale)));
  });

  const totalHeight = sectionHeights.reduce((a, b) => a + b, 0);
  const targetColHeight = totalHeight / colCount;

  // 2. Compute clean inter-section column break points
  const cuts: number[] = [];
  if (sections.length >= 2 && colCount >= 2) {
    if (colCount === 2) {
      let bestK = 1;
      let bestScore = Infinity;
      for (let k = 1; k < sections.length; k++) {
        const h0 = sectionHeights.slice(0, k).reduce((a, b) => a + b, 0);
        const h1 = sectionHeights.slice(k).reduce((a, b) => a + b, 0);
        const overflow = Math.max(0, h0 - availColH) + Math.max(0, h1 - availColH);
        const diff = Math.abs(h0 - h1);
        const score = diff + overflow * 10;
        if (score < bestScore) {
          bestScore = score;
          bestK = k;
        }
      }
      cuts.push(bestK);
    } else {
      let currentCut = 0;
      const targetPerCol = totalHeight / colCount;
      for (let c = 0; c < colCount - 1; c++) {
        let bestNext = currentCut + 1;
        let minScore = Infinity;
        let running = 0;
        for (let i = currentCut; i < sections.length - (colCount - 1 - c); i++) {
          running += sectionHeights[i];
          const overflow = Math.max(0, running - availColH);
          const diff = Math.abs(running - targetPerCol);
          const score = diff + overflow * 10;
          if (score < minScore) {
            minScore = score;
            bestNext = i + 1;
          }
        }
        cuts.push(bestNext);
        currentCut = bestNext;
      }
    }
  }

  const plan = defaultPlan('inter-section-clean');
  plan.cuts = cuts;
  cuts.forEach((cutIdx) => {
    if (cutIdx >= 1 && cutIdx < plan.sections.length) {
      plan.sections[cutIdx].breakBeforeColumn = true;
    }
  });

  plan.sections.forEach((s, idx) => {
    const secH = sectionHeights[idx];
    if (secH > availColH * 1.05) {
      // Very tall section that must span columns
      const nonEmpty = sections[idx].parsedLines.map((l, i) => ({ l, i })).filter(x => !x.l.isEmpty);
      if (nonEmpty.length >= 4) {
        s.avoidBreakInside = false;
        s.orphanProtection = {
          hasHeadGroup: true,
          headGroupCount: 2,
          hasTailGroup: true,
          tailGroupStartIndex: nonEmpty[nonEmpty.length - 2].i
        };
      }
    } else {
      // Fits in column - keep intact
      s.avoidBreakInside = true;
    }
  });

  return plan;
}

export function partitionSectionsIntoColumns(
  sections: SongSection[],
  plan?: ColumnBalancePlan,
  colCount: number = 1
): { columnSections: SongSection[]; startIndex: number }[] {
  if (!sections || sections.length === 0) return [];
  const count = Math.max(1, colCount);
  if (count <= 1) {
    return [{ columnSections: sections, startIndex: 0 }];
  }

  // A song without explicit section markers is parsed as one section. Split
  // that section across columns so a long unmarked song cannot overflow one
  // page column regardless of its selected column count.
  if (sections.length === 1 && sections[0].parsedLines.length > count) {
    const source = sections[0];
    const chunkSize = Math.ceil(source.parsedLines.length / count);
    const splitColumns: { columnSections: SongSection[]; startIndex: number }[] = [];
    for (let offset = 0; offset < source.parsedLines.length; offset += chunkSize) {
      const parsedLines = source.parsedLines.slice(offset, offset + chunkSize);
      splitColumns.push({
        columnSections: [{
          ...source,
          marker: offset === 0 ? source.marker : '',
          lines: parsedLines.map((line) => line.raw),
          parsedLines,
        }],
        startIndex: 0,
      });
    }
    return splitColumns;
  }

  const cuts = (plan?.cuts && plan.cuts.length > 0)
    ? plan.cuts
    : (() => {
        const derived: number[] = [];
        plan?.sections?.forEach((s, idx) => {
          if (idx > 0 && s.breakBeforeColumn) {
            derived.push(idx);
          }
        });
        if (derived.length > 0) return derived;
        const perCol = Math.ceil(sections.length / count);
        const res: number[] = [];
        for (let c = 1; c < count; c++) {
          const idx = Math.min(sections.length - (count - c), c * perCol);
          if (idx > 0 && !res.includes(idx)) res.push(idx);
        }
        return res;
      })();

  const result: { columnSections: SongSection[]; startIndex: number }[] = [];
  let prev = 0;
  for (let i = 0; i < cuts.length; i++) {
    const cut = cuts[i];
    if (cut > prev && cut <= sections.length) {
      result.push({
        columnSections: sections.slice(prev, cut),
        startIndex: prev,
      });
      prev = cut;
    }
  }
  if (prev < sections.length) {
    result.push({
      columnSections: sections.slice(prev),
      startIndex: prev,
    });
  }

  return result.length > 0 ? result : [{ columnSections: sections, startIndex: 0 }];
}

export interface ColumnFillingInfo {
  columnIndex: number;
  sectionCount: number;
  lineCount: number;
  estimatedHeight: number;
  extraLineSpacing: number; // in px between lines of lyrics
  lineMargin: number;       // total effective line margin in px for this column
  extraSectionGap: number;  // in px added between sections
  sectionGap: number;       // total effective section gap in px for this column
  extraWhitespacePerGap: number; // backward compatibility
  showDecorativeSpacer: boolean;
}

export interface SmartSectionFillingPlan {
  isSongShort: boolean;
  hasUnevenColumns: boolean;
  maxColHeight: number;
  minColHeight: number;
  targetColHeight: number;
  availColH: number;
  heightUtilization: number;
  baseSectionGap: number;
  columns: ColumnFillingInfo[];
}

/**
 * Smart Section Filling Algorithm
 * Detects if a song is short or has uneven column heights.
 * Keeps space between sections strictly capped at a clean, uniform value (preventing sections from drifting far apart),
 * completely removes dividers between sections, and allocates extra height to spacing between lines of lyrics.
 */
export function computeSmartSectionFilling(
  columns: { columnSections: SongSection[]; startIndex: number }[],
  settings: {
    smartSectionFilling?: boolean;
    maxLineHeight?: number;
    sectionMarginCap?: number;
    maxFontSizePx?: number;
    lineHeight?: number;
    sectionMargin?: number;
    lyricsFontSize?: number;
    chordsFontSize?: number;
    showChords?: boolean;
  },
  availColH: number,
  scale: number
): SmartSectionFillingPlan {
  const baseLyricsSize = (Number(settings.lyricsFontSize) || 12) * scale;
  const lHeightMult = settings.lineHeight ?? 1.3;
  const baseLineMargin = Math.max(3, Math.round(baseLyricsSize * (lHeightMult - 1) * 10) / 10);
  const baseSectionGap = settings.sectionMargin ?? Math.max(12, Math.round(baseLyricsSize * 1.0));

  if (!columns || columns.length === 0) {
    return {
      isSongShort: false,
      hasUnevenColumns: false,
      maxColHeight: 0,
      minColHeight: 0,
      targetColHeight: 0,
      availColH,
      heightUtilization: 0,
      baseSectionGap,
      columns: [],
    };
  }

  const isEnabled = settings.smartSectionFilling !== false;
  const baseChordsSize = (Number(settings.chordsFontSize) || 12) * scale;
  const showChords = settings.showChords ?? true;

  // Caps for smart auto-scaling
  const maxLineHeightMult = typeof settings.maxLineHeight === 'number' ? settings.maxLineHeight : 1.6;
  const sectionMarginCap = typeof settings.sectionMarginCap === 'number' ? settings.sectionMarginCap : 28;

  // Maximum allowed line margin derived from maxLineHeight cap
  const maxLineMargin = Math.max(baseLineMargin, Math.round(baseLyricsSize * (maxLineHeightMult - 1) * 10) / 10);
  const maxExtraLine = Math.max(0, maxLineMargin - baseLineMargin);

  // Maximum allowed extra section gap derived from sectionMarginCap
  const maxExtraSectionGap = Math.max(0, sectionMarginCap - baseSectionGap);

  // 1. Calculate visual height and line count of each column
  const colLineCounts = columns.map((col) => {
    return col.columnSections.reduce((acc, sec) => {
      const nonEmpties = sec.parsedLines ? sec.parsedLines.filter((l) => !l.isEmpty).length : 0;
      return acc + (nonEmpties > 0 ? nonEmpties : 1);
    }, 0);
  });

  const colHeights = columns.map((col) => {
    let colH = 0;
    col.columnSections.forEach((sec, sIdx) => {
      let secH = 0;
      if (sec.marker && (!sec.parsedLines?.length || sec.parsedLines.every((l) => l.isEmpty))) {
        secH += Math.round(baseLyricsSize + 6);
      }
      sec.parsedLines.forEach((line) => {
        if (line.isEmpty) {
          secH += 9;
        } else if (line.isRepetitionLine) {
          secH += baseChordsSize + 4;
        } else if (line.hasChords && showChords) {
          secH += baseChordsSize + 2 + baseLyricsSize + baseLineMargin;
        } else {
          secH += baseLyricsSize + baseLineMargin;
        }
      });
      colH += secH;
      if (sIdx < col.columnSections.length - 1) {
        colH += baseSectionGap;
      }
    });
    return colH;
  });

  const maxColH = Math.max(...colHeights, 1);
  const minColH = Math.min(...colHeights, 1);
  const heightUtilization = Math.round((maxColH / Math.max(1, availColH)) * 100);

  // Detect if song has remaining vertical space (from Max Font Cap or naturally short song)
  const isSongShort = heightUtilization < 90 || (availColH - maxColH > 24);
  // Detect if columns have uneven heights (difference > 15px in multi-column layout)
  const hasUnevenColumns = columns.length > 1 && (maxColH - minColH > 15);

  // If disabled, return plan with default base line margin and base section gap
  if (!isEnabled) {
    return {
      isSongShort,
      hasUnevenColumns,
      maxColHeight: Math.round(maxColH),
      minColHeight: Math.round(minColH),
      targetColHeight: Math.round(maxColH),
      availColH: Math.round(availColH),
      heightUtilization,
      baseSectionGap,
      columns: columns.map((col, idx) => ({
        columnIndex: idx,
        sectionCount: col.columnSections.length,
        lineCount: colLineCounts[idx],
        estimatedHeight: Math.round(colHeights[idx]),
        extraLineSpacing: 0,
        lineMargin: baseLineMargin,
        extraSectionGap: 0,
        sectionGap: baseSectionGap,
        extraWhitespacePerGap: 0,
        showDecorativeSpacer: false,
      })),
    };
  }

  // Determine target fill height
  const spare = Math.max(0, availColH - maxColH);
  const targetColHeight = Math.min(availColH * 0.95, maxColH + spare * 0.85);

  // Allocate extra height intelligently:
  // When font size is capped, distribute space across section padding (capped by sectionMarginCap)
  // and line height (capped by maxLineHeight), ensuring uniform column baselines.
  const columnInfos: ColumnFillingInfo[] = columns.map((col, idx) => {
    const colH = colHeights[idx];
    const lineCount = colLineCounts[idx];
    const sectionCount = col.columnSections.length;
    const deficit = Math.max(0, targetColHeight - colH);

    let extraLineSpacing = 0;
    let extraSectionGap = 0;

    if (deficit > 2) {
      if (sectionCount > 1) {
        // Multi-section: allocate to section padding up to sectionMarginCap
        const gapCount = sectionCount - 1;
        extraSectionGap = Math.min(maxExtraSectionGap, Math.round(((deficit * 0.65) / gapCount) * 10) / 10);
        
        const usedByGaps = extraSectionGap * gapCount;
        const remainingDeficit = Math.max(0, deficit - usedByGaps);
        extraLineSpacing = lineCount > 1
          ? Math.min(maxExtraLine, Math.round((remainingDeficit / Math.max(1, lineCount - 1)) * 10) / 10)
          : 0;
      } else {
        // Single section: allocate to line height up to maxLineHeight
        extraLineSpacing = lineCount > 1
          ? Math.min(maxExtraLine, Math.round((deficit / Math.max(1, lineCount - 1)) * 10) / 10)
          : 0;
      }
    }

    const effectiveLineMargin = Math.min(maxLineMargin, Math.round((baseLineMargin + extraLineSpacing) * 10) / 10);
    const effectiveSectionGap = Math.min(sectionMarginCap, Math.round((baseSectionGap + extraSectionGap) * 10) / 10);

    return {
      columnIndex: idx,
      sectionCount,
      lineCount,
      estimatedHeight: Math.round(colH),
      extraLineSpacing,
      lineMargin: effectiveLineMargin,
      extraSectionGap,
      sectionGap: effectiveSectionGap,
      extraWhitespacePerGap: extraSectionGap,
      showDecorativeSpacer: false,
    };
  });

  return {
    isSongShort,
    hasUnevenColumns,
    maxColHeight: Math.round(maxColH),
    minColHeight: Math.round(minColH),
    targetColHeight: Math.round(targetColHeight),
    availColH: Math.round(availColH),
    heightUtilization,
    baseSectionGap,
    columns: columnInfos,
  };
}

export function computeSongFitDebug(
  song: Song,
  index: number,
  settings: PrintSettings
): SongFitDebugInfo {
  const title = song.title || song.name || `Song #${index + 1}`;
  const artist = song.artist || song.author || song.interpreter || '';
  const text = song.text || song.content || song.lyrics || '';
  const sections = parseSongContent(text);
  const rawLines = text ? text.split('\n') : [];
  const rawLinesCount = rawLines.length;
  const nonEmptyLinesCount = rawLines.filter((l) => l.trim().length > 0).length;
  const sectionLinesCount = sections.reduce((acc, s) => acc + s.lines.length, 0);

  const page = getPageDimensionsPx(settings.pageFormat, settings.orientation);

  // The debug HUD mirrors the legacy uniform-margin model (pageMargin only).
  const marginMmX = settings.pageMargin ?? 5;
  const marginMmY = Math.round((settings.pageMargin ?? 5) * 1.2);

  const usableW = Math.max(200, page.width - (marginMmX * 2) * MM_TO_PX);
  const usableH = Math.max(200, page.height - (marginMmY * 2) * MM_TO_PX);

  const titleSize = Number(settings.titleFontSize) || 16;
  const artistSize = Number(settings.artistFontSize) || 16;
  const baseLyricsSize = Number(settings.lyricsFontSize) || 12;
  const baseChordsSize = Number(settings.chordsFontSize) || 12;

  const titleBlockH = (title ? titleSize * 1.25 : 0) + (artist ? artistSize * 1.25 : 0) + 18;
  const availColH = Math.max(100, usableH - titleBlockH - 24);

  const colCount = getOptimalColumnCount(sections, settings);
  const colGap = colCount > 1 ? 24 : 0;
  const colWidth = (usableW - (colCount - 1) * colGap) / colCount;

  const hasMarkers = sections.some((s) => Boolean(s.marker && s.marker.trim()));
  let maxMarkerLen = 0;
  if (hasMarkers) {
    for (const s of sections) {
      if (s.marker) {
        const cleanMarker = s.marker.replace(/^\[(.*)\]$/, '$1').trim();
        maxMarkerLen = Math.max(maxMarkerLen, cleanMarker.length);
      }
    }
  }
  const markerColEm = maxMarkerLen <= 2 ? 1.85 : maxMarkerLen <= 4 ? 2.2 : Math.max(2.2, maxMarkerLen * 0.6 + 0.4);
  const effectiveColW = hasMarkers ? Math.max(80, colWidth - baseLyricsSize * markerColEm) : colWidth;
  const showChords = settings.showChords ?? true;

  // Strict minimum readable font constraint (9.0px)
  const minLyricsScale = MIN_READABLE_LYRICS_FONT_SIZE / baseLyricsSize;
  const minChordsScale = MIN_READABLE_CHORDS_FONT_SIZE / baseChordsSize;
  const minScaleFloor = Math.max(0.55, Math.min(minLyricsScale, minChordsScale));

  const calcHeightAtScale = (s: number) => {
    const lSize = baseLyricsSize * s;
    const cSize = baseChordsSize * s;
    const avgCharW = lSize * 0.54;
    const charsPerCol = Math.max(16, Math.floor(effectiveColW / avgCharW));

    let maxWrapLines = 1;
    let totalVisualLines = 0;
    const sectionHeights: number[] = [];
    const secDetails: Array<{ marker: string; lineCount: number; estimatedHeight: number }> = [];

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      let secH = 0;
      const pLines = sec.parsedLines;
      const hasLines = pLines && pLines.length > 0;

      if (sec.marker && (!hasLines || pLines.every(l => l.isEmpty))) {
        secH += Math.round(lSize + 6);
      }

      for (let j = 0; j < pLines.length; j++) {
        const lineData = pLines[j];
        if (lineData.isEmpty) {
          const emptyBufferH = Math.max(10, Math.round(12 * Math.min(1.4, s)));
          secH += emptyBufferH;
          totalVisualLines += 1;
          continue;
        }

        const isChordsOnly =
          lineData.isRepetitionLine ||
          (!lineData.chunks || !lineData.chunks.some((c: any) => c.text && c.text.trim().length > 0 && !c.isSectionRef));

        const textLen = lineData.raw.replace(/\[[^\]]*\]|\{[^\}]*\}/g, '').length;
        let chordsLen = 0;
        const hasChords = lineData.hasChords && showChords;
        if (hasChords && lineData.chunks) {
          for (const c of lineData.chunks) {
            if (c.chord) chordsLen += c.chord.length + 2;
          }
        }
        const visualLines = estimateVisualLineCount(lineData, charsPerCol, showChords, textLen, chordsLen);
        maxWrapLines = Math.max(maxWrapLines, visualLines);
        totalVisualLines += visualLines;

        if (isChordsOnly) {
          const lineH = Math.round((cSize + 4) * 1.05 + 2);
          secH += lineH * visualLines;
        } else if (hasChords) {
          const chordLyricLineH = Math.round((cSize + lSize + 4) * 1.05 + 2);
          secH += chordLyricLineH * visualLines;
        } else {
          const lyricLineH = Math.round((lSize + 4) * 1.05 + 2);
          secH += lyricLineH * visualLines;
        }
      }
      const sectionBufferH = Math.max(14, Math.round(16 * Math.min(1.3, s)));
      secH += sectionBufferH;
      sectionHeights.push(secH);
      secDetails.push({
        marker: sec.marker || `[Part ${i + 1}]`,
        lineCount: sec.lines.length,
        estimatedHeight: Math.round(secH),
      });
    }

    const total = sectionHeights.reduce((a, b) => a + b, 0);
    if (colCount <= 1 || sections.length <= 1) {
      return { height: total, maxWrapLines, totalVisualLines, secDetails };
    }

    const maxSec = Math.max(...sectionHeights);
    let low = Math.max(Math.ceil(total / colCount), Math.min(maxSec, Math.ceil(availColH * 0.95)));
    let high = total;
    let best = total;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      let colsNeeded = 1;
      let currentH = 0;
      for (const h of sectionHeights) {
        if (currentH + h > mid) {
          colsNeeded++;
          currentH = h;
        } else {
          currentH += h;
        }
      }
      if (colsNeeded <= colCount) {
        best = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return { height: best, maxWrapLines, totalVisualLines, secDetails };
  };

  const computedScale = computeSmartFitScale(sections, settings, Boolean(title), Boolean(artist));
  const resultAtScale = calcHeightAtScale(computedScale);
  const chosenLyricsFontSize = Math.round(baseLyricsSize * computedScale * 10) / 10;
  const chosenChordsFontSize = Math.round(baseChordsSize * computedScale * 10) / 10;
  const heightUtilization = Math.round((resultAtScale.height / availColH) * 100);

  // Check if minimum readability constraint was active
  const baseEval = calcHeightAtScale(1.0);
  const isMinConstraintActive = baseEval.height > availColH && computedScale <= (minScaleFloor + 0.01);
  const colPlan = computeSmartColumnBalance(sections, settings, availColH, computedScale);
  const colsData = partitionSectionsIntoColumns(sections, colPlan, colCount);
  const fillingPlan = computeSmartSectionFilling(colsData, settings, availColH, computedScale);

  return {
    songIndex: index,
    title,
    artist,
    totalLines: nonEmptyLinesCount,
    rawLinesCount,
    nonEmptyLinesCount,
    sectionLinesCount,
    sectionsCount: sections.length,
    visualLinesAtScale: resultAtScale.totalVisualLines,
    baseLyricsFontSize: baseLyricsSize,
    baseChordsFontSize: baseChordsSize,
    baseTitleFontSize: titleSize,
    computedScale,
    chosenLyricsFontSize,
    chosenChordsFontSize,
    minFontSizeConstraint: MIN_READABLE_LYRICS_FONT_SIZE,
    isMinConstraintActive,
    calculatedHeight: Math.round(resultAtScale.height),
    availColHeight: Math.round(availColH),
    heightUtilization,
    columns: colCount,
    maxWrapLines: resultAtScale.maxWrapLines,
    pageFormat: settings.pageFormat,
    orientation: settings.orientation,
    smartFitEnabled: Boolean(settings.smartFit),
    smartSectionFilling: {
      isSongShort: fillingPlan.isSongShort,
      hasUnevenColumns: fillingPlan.hasUnevenColumns,
      heightUtilization: fillingPlan.heightUtilization,
      extraLineSpacing: fillingPlan.columns[0]?.extraLineSpacing || 0,
      extraSectionGap: fillingPlan.columns[0]?.extraSectionGap || 0,
      extraWhitespacePerGap: fillingPlan.columns[0]?.extraSectionGap || 0,
    },
    sectionsDetail: resultAtScale.secDetails,
    columnBalancing: {
      isBalanced: true,
      orphanPrevented: colPlan.orphanPrevented,
      strategy: colPlan.strategy,
    },
  };
}


/**
 * Computes enhanced line margin / vertical spacing when smartFit auto-scale is enabled
 * and the song easily fits on the page (leaving spare vertical space).
 */
export function computeSmartFitLineMargin(
  sections: SongSection[],
  settings: {
    pageFormat?: 'A4' | 'A5' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    columns?: number;
    titleFontSize?: number;
    artistFontSize?: number;
    lyricsFontSize?: number;
    chordsFontSize?: number;
    showChords?: boolean;
    smartFit?: boolean;
    pageMargin?: number;
    pageMarginTopBottom?: number;
    pageMarginLeftRight?: number;
    maxFontSizePx?: number;
    maxLineHeight?: number;
    sectionMarginCap?: number;
    showSectionLines?: boolean;
  },
  hasTitle: boolean = true,
  hasArtist: boolean = false,
  scale: number = 1.0
): number {
  if (!settings.smartFit || !sections?.length) return 5;

  const margins = getPageMargins(settings);
  const page = getPageDimensionsPx(settings.pageFormat, settings.orientation, margins);

  const usableW = Math.max(200, page.width);
  const usableH = Math.max(200, page.height);

  const baseLyricsSize = Number(settings.lyricsFontSize) || 12;
  const baseChordsSize = Number(settings.chordsFontSize) || 12;

  const titleBlockH = (hasTitle ? (Number(settings.titleFontSize) || 16) * 1.25 : 0) + 
                     (hasArtist ? (Number(settings.artistFontSize) || 16) * 1.25 : 0) + 
                     18;
  const availColH = Math.max(100, usableH - titleBlockH - 24);

  const colCount = getOptimalColumnCount(sections, settings);
  const colGap = colCount > 1 ? 24 : 0;
  const colWidth = (usableW - colGap * (colCount - 1)) / colCount;

  const hasMarkers = sections.some(s => !!s.marker?.trim());
  let maxMarkerLen = 0;
  if (hasMarkers) {
    sections.forEach(s => {
      if (s.marker) maxMarkerLen = Math.max(maxMarkerLen, s.marker.replace(/[\[\]]/g, '').trim().length);
    });
  }
  
  const markerColEm = maxMarkerLen <= 2 ? 1.85 : maxMarkerLen <= 4 ? 2.2 : Math.max(2.2, maxMarkerLen * 0.6 + 0.4);
  const sectionLineIndentEm = settings.showSectionLines !== false ? 0.6 : 0;
  const effectiveColW = Math.max(80, colWidth - (baseLyricsSize * ((hasMarkers ? markerColEm : 0) + sectionLineIndentEm)));
  const showChords = settings.showChords ?? true;

  const lSize = baseLyricsSize * scale;
  const cSize = baseChordsSize * scale;
  const charsPerCol = Math.max(16, Math.floor(effectiveColW / (lSize * 0.54)));

  const sectionHeights = sections.map((sec) => {
    let secH = 0;
    if (sec.marker && (!sec.parsedLines?.length || sec.parsedLines.every(l => l.isEmpty))) {
      secH += Math.round(lSize + 6);
    }
    sec.parsedLines.forEach(line => {
      secH += estimateLineHeight(line, scale, lSize, cSize, charsPerCol, showChords);
    });
    return secH + Math.max(14, Math.round(16 * Math.min(1.3, scale)));
  });

  const total = sectionHeights.reduce((a, b) => a + b, 0);
  const spareRatio = Math.max(0, (availColH - total) / availColH);

  if (spareRatio > 0.04) {
    const bonus = Math.min(10, Math.round(spareRatio * 18));
    return 5 + bonus;
  }
  return 5;
}

