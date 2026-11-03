/**
 * Parsing of raw lyric/chord text into sections and precomputed per-line layout
 * aggregates. Entry point for both the on-screen preview (SongDisplay) and the
 * background PDF worker. Regexes and shared types live in layoutConstants.ts.
 */
import {
  type ChordChunk,
  type ParsedLine,
  type SongSection,
  chordSplitRegex,
  repBarRegex,
  leadingWhitespaceRegex,
  cpCloseDirectiveRegex,
  cpOpenDirectiveRegex,
  mdHeaderRegex,
  bracketHeaderRegex,
  parenHeaderRegex,
  standaloneBracketRefRegex,
  markerPatternRegex,
  refrainMarkerRegex,
  sectionRefRegex,
  chordMarkupRegex,
  chordTokensGlobalRegex,
  hasChordTokenRegex,
  cpOpenDirectiveNoTailRegex,
  repNotationCharsRegex,
  musicLabelRegex,
  spacingTagRegex,
  bracketTokenScanRegex,
  wrappedMarkerRegex,
  CHORD_WIDTH_PADDING,
} from './layoutConstants';

export type { ChordChunk, ParsedLine, SongSection };

/**
 * LRU cache of parsed song content. Insertion order in a Map doubles as the
 * recency order: on a hit we delete + re-insert so the entry moves to the
 * "most recently used" end, and on overflow we evict only the least-recently
 * used entries (one quarter of the cache) instead of clearing everything,
 * which previously forced a full re-parse of every remaining song.
 */
const songContentCache = new Map<string, SongSection[]>();
const MAX_CACHE_SIZE = 1000;

function cachePut(key: string, value: SongSection[]): void {
  if (songContentCache.size >= MAX_CACHE_SIZE && !songContentCache.has(key)) {
    const evictCount = Math.max(1, Math.floor(MAX_CACHE_SIZE / 4));
    let evicted = 0;
    for (const oldKey of songContentCache.keys()) {
      songContentCache.delete(oldKey);
      if (++evicted >= evictCount) break;
    }
  }
  songContentCache.set(key, value);
}
/** Fast, allocation-free length of visible text with chord markup removed. */
export function measureLyricsLength(raw: string): number {
  if (!raw) return 0;
  // Fast path: nothing that could be markup at all
  if (raw.indexOf('[') === -1 && raw.indexOf('{') === -1) return raw.length;
  return raw.replace(chordMarkupRegex, '').length;
}

/**
 * Returns the length of a line's visible lyric text (chord/section markup like
 * "[C]" or "{G}" removed). Uses the value precomputed during parsing instead of
 * re-running a global regex over the raw line on every layout/scale iteration.
 * Falls back to measuring the raw text so ad-hoc line objects keep working.
 */
export function getLyricsTextLength(line: { raw: string; textLen: number }): number {
  if (typeof line.textLen === 'number') return line.textLen;
  return measureLyricsLength(line.raw);
}

/**
 * Computes the per-line width aggregates (`chordsWidth`, `renderedWidth`) in
 * character units from already-parsed chunks, so height/wrap estimation during
 * scale search never needs to re-scan chunk text or run regexes.
 * - Normal lines: rendered width is the sum of per-chunk max(text, chord+padding),
 *   mirroring how chords float above their lyric syllables.
 * - Repetition/chords-only lines: chords and notation occupy their own horizontal
 *   space, so widths are summed instead of maxed.
 */
export function computeLineWidthAggregates(
  chunks: ChordChunk[],
  isRep: boolean,
): { chordsWidth: number; renderedWidth: number } {
  let chordsWidth = 0;
  let renderedWidth = 0;
  for (const c of chunks) {
    const textWidth = c.text ? c.text.length : 0;
    const chordWidth = c.chord ? c.chord.length + CHORD_WIDTH_PADDING : 0;
    if (chordWidth > 0) chordsWidth += chordWidth;
    if (isRep || c.isSectionRef) {
      renderedWidth += textWidth + chordWidth;
    } else {
      renderedWidth += Math.max(textWidth, chordWidth);
    }
  }
  return { chordsWidth, renderedWidth };
}

/**
 * Checks if a trimmed line represents a section header or directive.
 */
export function isSectionHeaderLine(trimmedLine: string): boolean {
  if (!trimmedLine) return false;
  if (trimmedLine.startsWith('- ')) return true;
  if (cpOpenDirectiveNoTailRegex.test(trimmedLine)) return true;
  if (mdHeaderRegex.test(trimmedLine)) return true;
  const bracketMatch = trimmedLine.match(bracketHeaderRegex);
  if (bracketMatch && sectionRefRegex.test(bracketMatch[1].trim())) return true;
  const parenMatch = trimmedLine.match(parenHeaderRegex);
  if (parenMatch && sectionRefRegex.test(parenMatch[1].trim())) return true;
  return markerPatternRegex.test(trimmedLine);
}

/**
 * Splits a line that contains section references in [] brackets (e.g. "[REF]", "[R]", "[1.]")
 * into multiple lines so that the section reference and any following section or lyrics
 * are placed on their own lines.
 */
export function splitLineOnSectionRefs(line: string): string[] {
  if (!line || !line.includes('[') || !line.includes(']')) {
    return [line];
  }

  // Find all [bracketed] occurrences (hoisted regex; reset lastIndex for reentrancy)
  const regex = bracketTokenScanRegex;
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  const splitIndices: { start: number; end: number; text: string }[] = [];

  while ((match = regex.exec(line)) !== null) {
    const inner = match[1].trim();
    if (sectionRefRegex.test(inner)) {
      splitIndices.push({
        start: match.index,
        end: regex.lastIndex,
        text: `[${inner}]`,
      });
    }
  }

  if (splitIndices.length === 0) {
    return [line];
  }

  // If the line consists ONLY of a single section reference (e.g. "[R]"), no splitting needed
  if (splitIndices.length === 1 && line.trim() === splitIndices[0].text) {
    return [line.trim()];
  }

  const result: string[] = [];
  let lastIndex = 0;

  for (const item of splitIndices) {
    const before = line.slice(lastIndex, item.start).trim();
    if (before.length > 0) {
      result.push(before);
    }
    result.push(item.text);
    lastIndex = item.end;
  }

  const after = line.slice(lastIndex).trim();
  if (after.length > 0) {
    result.push(after);
  }

  return result;
}

/**
 * Checks if a line is a repetition notation line or chords-only line
 * (e.g. "|:{Am}{Asus2}{Am}{Asus2}:|", "|: [C] [G] :| (4x)", "{C} {G} {Am}", "Intro: [C] [D] [Am]").
 * On these lines, chords and repetition marks are rendered on the SAME line without an empty lyrics row.
 */
export function isRepetitionOrChordsOnlyLine(line: string): boolean {
  if (!line || !line.trim()) return false;

  // Fast path: no bracket/brace characters at all -> cannot be a chords-only line
  if (!hasChordTokenRegex.test(line)) return false;

  // Extract all bracketed/braced contents
  const matches = line.match(chordTokensGlobalRegex);
  if (!matches) return false;

  // Check if at least one match is an actual chord (not a section reference)
  const hasActualChords = matches.some((m) => {
    const inner = m.slice(1, -1).trim();
    return !sectionRefRegex.test(inner);
  });
  if (!hasActualChords) return false;

  // Strip all chord and section ref brackets
  const withoutChords = line.replace(chordTokensGlobalRegex, '').trim();
  if (!withoutChords) return true; // Only chords and whitespace

  // Check if what remains outside chords consists strictly of repetition / bar / tempo / count notation
  // e.g. |: :| | || //: :// 1. 2. (4x) 2x %
  const stripped = withoutChords.replace(repNotationCharsRegex, '');
  if (stripped.length === 0) return true;

  // Also check if what remains is a musical label prefix or note
  // e.g. Intro:, Solo:, Riff:, Mezihra:, Předehra:, Dohra:, Bridge:, BRD:, SPC:, OUT:, PREF:, Interlude:, Sloka:, Verse:, Chorus:
  const strippedNoLabels = stripped.replace(musicLabelRegex, '');
  return strippedNoLabels.length === 0;
}

export function parseChordLine(line: string): ChordChunk[] {
  if (!line) return [];

  // Fast path: if no brackets, braces, or spacing tags, return whole line as plain text
  if (line.indexOf('[') === -1 && line.indexOf('{') === -1) {
    return [{ chord: null, text: line }];
  }

  // Pre-process Kytario spacing tags into physical spaces only if present
  let processedLine = line;
  if (line.includes('{-') || line.includes('[-')) {
    processedLine = line.replace(spacingTagRegex, (m) => ' '.repeat(m.length - 2));
  }

  // Handle repetition / chords-only lines where chords and repetition marks are inline
  if (isRepetitionOrChordsOnlyLine(processedLine)) {
    const parts = processedLine.split(chordSplitRegex);
    const chunks: ChordChunk[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (
        (part.startsWith('{') && part.endsWith('}')) ||
        (part.startsWith('[') && part.endsWith(']'))
      ) {
        const inner = part.slice(1, -1).trim();
        if (sectionRefRegex.test(inner)) {
          chunks.push({ chord: null, text: inner, isSectionRef: true });
        } else if (inner.length > 0) {
          chunks.push({ chord: inner, text: '' });
        }
      } else {
        const normalized = part.replace(repBarRegex, ':| |:').trim();
        if (normalized.length > 0) {
          chunks.push({ chord: null, text: normalized });
        }
      }
    }
    return chunks;
  }

  const parts = processedLine.split(chordSplitRegex);
  const chunks: ChordChunk[] = [];

  let currentChord: string | null = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (
      (part.startsWith('[') && part.endsWith(']')) ||
      (part.startsWith('{') && part.endsWith('}'))
    ) {
      const inner = part.slice(1, -1).trim();

      // If it's a section reference (e.g. [REF] or [1.]), render it without brackets as an inline marker
      if (sectionRefRegex.test(inner)) {
        if (currentChord !== null) {
          chunks.push({ chord: currentChord, text: '' });
          currentChord = null;
        }
        chunks.push({ chord: null, text: inner, isSectionRef: true });
        continue;
      }

      if (currentChord !== null) {
        chunks.push({ chord: currentChord, text: '' });
      }
      currentChord = inner;
    } else {
      if (currentChord !== null || part.length > 0) {
        // Extract leading spaces to ensure text following a spaced chord starts *after* the chord's visual width
        const match = part.match(leadingWhitespaceRegex);
        const leadingSpaces = match ? match[1] : '';
        const restText = match ? match[2] : '';

        if (leadingSpaces.length > 0) {
          chunks.push({ chord: currentChord, text: leadingSpaces });
          if (restText.length > 0) {
            chunks.push({ chord: null, text: restText });
          }
        } else {
          chunks.push({ chord: currentChord, text: part });
        }

        currentChord = null;
      }
    }
  }

  if (currentChord !== null) {
    chunks.push({ chord: currentChord, text: '' });
  }

  return chunks;
}

export function parseSongContent(content: string): SongSection[] {
  if (!content) return [];
  const strContent =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? (content as any[]).join('\n')
        : String(content);
  if (!strContent.trim()) return [];

  const cached = songContentCache.get(strContent);
  if (cached) {
    // LRU recency handling: Map iteration order is insertion order, so delete +
    // re-insert moves the hit entry to the "most recently used" end.
    songContentCache.delete(strContent);
    songContentCache.set(strContent, cached);
    return cached;
  }

  const sections: SongSection[] = [];
  const initialLines = strContent.split('\n');
  const rawLines: string[] = [];
  for (const l of initialLines) {
    const split = splitLineOnSectionRefs(l);
    rawLines.push(...split);
  }

  let currentSection: SongSection | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    // 1. Empty line indicates end of previous section/verse
    if (trimmed === '') {
      if (
        currentSection &&
        (currentSection.lines.some((l) => l.trim() !== '') || currentSection.marker !== '')
      ) {
        currentSection = null;
      }
      continue;
    }

    // 2. ChordPro closing directives
    if (cpCloseDirectiveRegex.test(trimmed)) {
      currentSection = null;
      continue;
    }

    // 2b. Standalone section reference link in [] brackets (e.g. "[REF]", "[R]", "[1.]")
    // When followed by another section header or end of song, it represents a link to section
    // and must be placed on its own line rather than defining a new section header.
    const isStandaloneBracketedRef =
      standaloneBracketRefRegex.test(trimmed) && sectionRefRegex.test(trimmed.slice(1, -1).trim());
    if (isStandaloneBracketedRef) {
      let nextLineTrimmed = '';
      for (let k = i + 1; k < rawLines.length; k++) {
        if (rawLines[k].trim() !== '') {
          nextLineTrimmed = rawLines[k].trim();
          break;
        }
      }
      const isEndOfBlock = rawLines[i + 1] === undefined || rawLines[i + 1].trim() === '';
      const nextIsSectionHeader =
        nextLineTrimmed === '' || isSectionHeaderLine(nextLineTrimmed) || isEndOfBlock;
      if (nextIsSectionHeader) {
        if (!currentSection) {
          currentSection = { marker: '', isRefrain: false, lines: [], parsedLines: [] };
          sections.push(currentSection);
        }
        currentSection.lines.push(trimmed);
        continue;
      }
    }

    // 3. Detect Section Header
    let header: { marker: string; textAfter: string } | null = null;

    // 3a. Explicit dash marker (e.g. "- REF", "- [REF]", "- 1.", "- [Bridge]", "-")
    if (trimmed === '-' || trimmed.startsWith('- ')) {
      let marker = trimmed === '-' ? '' : trimmed.substring(2).trim();
      if (marker.startsWith('[') && marker.endsWith(']')) marker = marker.slice(1, -1).trim();
      if (marker.startsWith('(') && marker.endsWith(')')) marker = marker.slice(1, -1).trim();
      header = { marker, textAfter: '' };
    } else {
      // 3b. ChordPro opening directives (e.g. "{c: Bridge}", "{comment: 1. Verse}", "{start_of_chorus}", "{soc}", "{sob}")
      const cpMatch = trimmed.match(cpOpenDirectiveRegex);
      if (cpMatch) {
        const raw = (cpMatch[1] || cpMatch[2] || '').trim();
        let marker = raw;
        if (/^(?:soc|start_of_chorus)$/i.test(raw)) marker = 'Chorus';
        else if (/^(?:sob|start_of_bridge)$/i.test(raw)) marker = 'Bridge';
        else if (/^(?:sov|start_of_verse)$/i.test(raw)) marker = 'Verse';
        header = { marker, textAfter: (cpMatch[3] || '').trim() };
      } else {
        // 3c. Markdown headers or decorators (e.g. "### Bridge", "**Bridge**", "--- Bridge ---", "=== Bridge ===")
        const mdMatch = trimmed.match(mdHeaderRegex);
        if (mdMatch) {
          const candidate = mdMatch[1].trim();
          if (sectionRefRegex.test(candidate)) {
            header = { marker: candidate, textAfter: '' };
          }
        }
      }

      // 3d. Bracketed section marker at line start (e.g. "[1.]", "[Bridge]", "[REF]", "[1. verse]", "[B:]")
      if (!header) {
        const bracketMatch = trimmed.match(bracketHeaderRegex);
        if (bracketMatch && sectionRefRegex.test(bracketMatch[1].trim())) {
          header = { marker: bracketMatch[1].trim(), textAfter: bracketMatch[2] || '' };
        }
      }

      // 3e. Parenthesized section marker at line start (e.g. "(1.)", "(Bridge)", "(REF)", "(1. verse)", "(B)", "(M)")
      if (!header) {
        const parenMatch = trimmed.match(parenHeaderRegex);
        if (parenMatch && sectionRefRegex.test(parenMatch[1].trim())) {
          header = { marker: parenMatch[1].trim(), textAfter: parenMatch[2] || '' };
        }
      }

      // 3f. Standard prefix markers (e.g. "1. ", "1. verse", "Bridge: ", "Bridge", "B: ", "B. ", "Mezihra: ", "R: ", "Chorus:", "BRD", "BRD1", "PREF", "OUT", "SPC")
      if (!header) {
        const match = trimmed.match(markerPatternRegex);
        if (match) {
          let marker = (match[1] || match[0] || '').trim();
          if (marker.startsWith('[') && marker.endsWith(']')) marker = marker.slice(1, -1).trim();
          if (marker.startsWith('(') && marker.endsWith(')')) marker = marker.slice(1, -1).trim();
          const textAfter = trimmed.substring(match[0].length).trim();
          header = { marker, textAfter };
        }
      }
    }

    // Apply detected section header
    if (
      header &&
      (!currentSection ||
        currentSection.lines.some((l) => l.trim() !== '') ||
        currentSection.marker !== '')
    ) {
      const upper = header.marker.toUpperCase();
      const isRefrain =
        upper.includes('REF') || upper.includes('CHORUS') || refrainMarkerRegex.test(upper);
      currentSection = { marker: header.marker, isRefrain, lines: [], parsedLines: [] };
      sections.push(currentSection);
      if (header.textAfter && header.textAfter.trim() !== '') {
        currentSection.lines.push(header.textAfter);
      }
      continue;
    }

    // 4. Regular line
    if (!currentSection) {
      currentSection = { marker: '', isRefrain: false, lines: [], parsedLines: [] };
      sections.push(currentSection);
    }

    currentSection.lines.push(rawLine.trimEnd());
  }

  for (const sec of sections) {
    while (sec.lines.length > 0 && sec.lines[sec.lines.length - 1].trim() === '') {
      sec.lines.pop();
    }
    // Pre-calculate parsedLines for fast zero-cost rendering
    sec.parsedLines = sec.lines.map((line) => {
      const isEmpty = line.trim() === '';
      const chunks = isEmpty ? [] : parseChordLine(line);
      const hasChords = chunks.some((c) => c.chord !== null);
      const hasActualLyricText = chunks.some(
        (c) => c.text && c.text.trim().length > 0 && !c.isSectionRef,
      );
      const isRep =
        !isEmpty && (isRepetitionOrChordsOnlyLine(line) || (hasChords && !hasActualLyricText));
      const { chordsWidth, renderedWidth } = isEmpty
        ? { chordsWidth: 0, renderedWidth: 0 }
        : computeLineWidthAggregates(chunks, isRep);
      return {
        raw: line,
        isEmpty,
        chunks,
        hasChords,
        isRepetitionLine: isRep,
        textLen: isEmpty ? 0 : measureLyricsLength(line),
        chordsWidth,
        renderedWidth,
      };
    });
  }

  const result = sections.filter((s) => s.lines.length > 0 || s.marker !== '');

  linkSectionReferences(result);

  cachePut(strContent, result);

  return result;
}

/**
 * Traverses sections and links standalone section references to their target sections
 * by matching markers.
 */
export function linkSectionReferences(sections: SongSection[]) {
  // Map markers to their section index
  const markerToIndex = new Map<string, number>();

  const normalize = (s: string) =>
    s
      .replace(/[\.\:\s]/g, '')
      .replace(/^REFR[EÉ]N$|^REFRAIN$|^CHORUS$|^R$/i, 'REF')
      .replace(/^SLOKA$|^VERSE$|^V$/i, 'VERSE')
      .replace(/^BRIDGE$|^BRD$|^B$/i, 'BRIDGE')
      .replace(/^PRE-CHORUS$|^PRE-REF$|^PREF$/i, 'PREF')
      .replace(/^MEZIHRA$|^INTERLUDE$|^M$/i, 'INTERLUDE')
      .trim()
      .toUpperCase();

  sections.forEach((sec, idx) => {
    if (sec.marker) {
      const cleanMarker = normalize(sec.marker);
      if (!markerToIndex.has(cleanMarker)) {
        markerToIndex.set(cleanMarker, idx);
      }
    }
  });

  // Precompute the list of normalized marker keys once so the fuzzy fallback
  // below does not re-allocate and rescan the key array for every section-ref
  // chunk (avoids O(sections × chunks) repeated work).
  const markerKeys = Array.from(markerToIndex.keys());

  // Traverse all sections and their chunks to link references
  sections.forEach((sec) => {
    sec.parsedLines.forEach((line) => {
      line.chunks.forEach((chunk) => {
        if (chunk.isSectionRef) {
          const refText = chunk.text.replace(wrappedMarkerRegex, '$1');
          const normalizedRef = normalize(refText);
          const targetIdx = markerToIndex.get(normalizedRef);

          if (targetIdx !== undefined) {
            chunk.targetSectionIndex = targetIdx;
          } else {
            // Try matching without numbers if specific match fails (e.g. [REF] -> REF1)
            const baseMatch = markerKeys.find(
              (k) => k.startsWith(normalizedRef) || normalizedRef.startsWith(k),
            );
            if (baseMatch) {
              chunk.targetSectionIndex = markerToIndex.get(baseMatch);
            }
          }
        }
      });
    });
  });
}
