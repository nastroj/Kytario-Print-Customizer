/**
 * ChordPro song parser: turns raw song content (plain text or ChordPro) into
 * structured sections with pre-parsed chord lines. Results are memoized in a
 * bounded cache because the same song content is parsed repeatedly during
 * layout, preview and PDF generation.
 */
import { SongSection } from '../types';
import { sectionRefRegex } from './constants';
import {
  isSectionHeaderLine,
  splitLineOnSectionRefs,
  parseChordLine,
} from './chordProParser';

const songContentCache = new Map<string, SongSection[]>();
const MAX_CACHE_SIZE = 1000;

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
  if (cached) return cached;

  const sections: SongSection[] = [];
  const initialLines = strContent.split('\n');
  const rawLines: string[] = [];
  for (const l of initialLines) {
    const split = splitLineOnSectionRefs(l);
    rawLines.push(...split);
  }

  let currentSection: SongSection | null = null;
  const markerRegex = /^((?:\d+[\.\:]|\(\d+\))|(?:REFR[EÉ]N|REFRAIN|REF|CHORUS|BRIDGE|BRD|PREF|PRE-REF|PRE-CHORUS|OUTRO|OUT|SPC|VERSE|SLOKA|INTRO|SOLO|CODA|MEZIHRA|MEDZIHRA|PŘEDEHRA|PREDOHRA|DOHRA|INTERLUDE|RIFF)(?:\s*\d+)?[\.\:]?|R\d*[\.\:]|\(R\d*\)|BRD\d*[\.\:]?|\(BRD\d*\)|PREF\d*[\.\:]?|\(PREF\d*\)|OUT\d*[\.\:]?|\(OUT\d*\)|SPC\d*[\.\:]?|\(SPC\d*\))(?:\s+|(?=\[)|(?=\{)|$)/i;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    // 1. Empty line indicates end of previous section/verse
    if (trimmed === '') {
      if (currentSection && (currentSection.lines.some(l => l.trim() !== '') || currentSection.marker !== '')) {
        currentSection = null;
      }
      continue;
    }

    // 2. ChordPro closing directives
    if (/^\{(?:end_of_chorus|eoc|end_of_bridge|eob|end_of_verse|eov|end_of_tab|eot)\}/i.test(trimmed)) {
      currentSection = null;
      continue;
    }

    // 2b. Standalone section reference link in [] brackets (e.g. "[REF]", "[R]", "[1.]")
    // When followed by another section header or end of song, it represents a link to section
    // and must be placed on its own line rather than defining a new section header.
    const isStandaloneBracketedRef = /^\[([^\]]+)\]$/.test(trimmed) && sectionRefRegex.test(trimmed.slice(1, -1).trim());
    if (isStandaloneBracketedRef) {
      let nextLineTrimmed = '';
      for (let k = i + 1; k < rawLines.length; k++) {
        if (rawLines[k].trim() !== '') {
          nextLineTrimmed = rawLines[k].trim();
          break;
        }
      }
      const isEndOfBlock = rawLines[i + 1] === undefined || rawLines[i + 1].trim() === '';
      const nextIsSectionHeader = nextLineTrimmed === '' || isSectionHeaderLine(nextLineTrimmed) || isEndOfBlock;
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
      const cpMatch = trimmed.match(/^\{(?:(?:c|comment):\s*([^}]+)|(start_of_chorus|soc|start_of_bridge|sob|start_of_verse|sov|start_of_tab|sot))\}(?:\s*(.*)|$)/i);
      if (cpMatch) {
        const raw = (cpMatch[1] || cpMatch[2] || '').trim();
        let marker = raw;
        if (/^(?:soc|start_of_chorus)$/i.test(raw)) marker = 'Chorus';
        else if (/^(?:sob|start_of_bridge)$/i.test(raw)) marker = 'Bridge';
        else if (/^(?:sov|start_of_verse)$/i.test(raw)) marker = 'Verse';
        header = { marker, textAfter: (cpMatch[3] || '').trim() };
      } else {
        // 3c. Markdown headers or decorators (e.g. "### Bridge", "**Bridge**", "--- Bridge ---", "=== Bridge ===")
        const mdMatch = trimmed.match(/^(?:#{1,4}|\*{1,2}|-{2,4}|={2,4})\s*([A-Za-z0-9\u00C0-\u024F\s\.:]+?)\s*(?:#{1,4}|\*{1,2}|-{2,4}|={2,4})?$/);
        if (mdMatch) {
          const candidate = mdMatch[1].trim();
          if (sectionRefRegex.test(candidate)) {
            header = { marker: candidate, textAfter: '' };
          }
        }
      }

      // 3d. Bracketed section marker at line start (e.g. "[1.]", "[Bridge]", "[REF]", "[1. verse]", "[B:]")
      if (!header) {
        const bracketMatch = trimmed.match(/^\[([^\]]+)\](?:\s*(.*)|$)/);
        if (bracketMatch && sectionRefRegex.test(bracketMatch[1].trim())) {
          header = { marker: bracketMatch[1].trim(), textAfter: bracketMatch[2] || '' };
        }
      }

      // 3e. Parenthesized section marker at line start (e.g. "(1.)", "(Bridge)", "(REF)", "(1. verse)", "(B)", "(M)")
      if (!header) {
        const parenMatch = trimmed.match(/^\(([^\)]+)\)(?:\s*(.*)|$)/);
        if (parenMatch && sectionRefRegex.test(parenMatch[1].trim())) {
          header = { marker: parenMatch[1].trim(), textAfter: parenMatch[2] || '' };
        }
      }

      // 3f. Standard prefix markers (e.g. "1. ", "1. verse", "Bridge: ", "Bridge", "B: ", "B. ", "Mezihra: ", "R: ", "Chorus:", "BRD", "BRD1", "PREF", "OUT", "SPC")
      if (!header) {
        const markerPattern = /^((?:(?:\d+[\.\:]|\(\d+\))(?:\s*(?:VERSE|SLOKA))?[\.\:]?|(?:REFR[EÉ]N|REFRAIN|REF|CHORUS|BRIDGE|BRD|PREF|PRE-REF|PRE-CHORUS|OUTRO|OUT|SPC|VERSE|SLOKA|INTRO|SOLO|CODA|MEZIHRA|MEDZIHRA|PŘEDEHRA|PREDOHRA|DOHRA|INTERLUDE|RIFF)(?:\s*\d+)?[\.\:]?|R\d*[\.\:]?|BRD\d*[\.\:]?|PREF\d*[\.\:]?|OUT\d*[\.\:]?|SPC\d*[\.\:]?|B[\.\:]|M[\.\:]))(?:\s+|(?=\[)|(?=\{)|$)/i;
        const match = trimmed.match(markerPattern);
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
    if (header && (!currentSection || currentSection.lines.some(l => l.trim() !== '') || currentSection.marker !== '')) {
      const upper = header.marker.toUpperCase();
      const isRefrain = upper.includes('REF') || upper.includes('CHORUS') || /^R\d*[\.\:]?$/.test(upper);
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
      const hasActualLyricText = chunks.some((c) => c.text && c.text.trim().length > 0 && !c.isSectionRef);
      const isRep = !isEmpty && (isRepetitionOrChordsOnlyLine(line) || (hasChords && !hasActualLyricText));
      return { raw: line, isEmpty, chunks, hasChords, isRepetitionLine: isRep };
    });
  }

  const result = sections.filter(s => s.lines.length > 0 || s.marker !== '');
  
  linkSectionReferences(result);

  if (songContentCache.size >= MAX_CACHE_SIZE) {
    songContentCache.clear();
  }
  songContentCache.set(strContent, result);

  return result;
}

/**
 * Traverses sections and links standalone section references to their target
 * sections by matching markers.
 */
export function linkSectionReferences(sections: SongSection[]) {
  // Map markers to their section index
  const markerToIndex = new Map<string, number>();
  
  const normalize = (s: string) => 
    s.replace(/[\.\:\s]/g, '')
     .replace(/^REFR[EÉ]N$|^REFRAIN$|^CHORUS$|^R$/i, 'REF')
     .replace(/^SLOKA$|^VERSE$|^V$/i, 'VERSE')
     .replace(/^BRIDGE$|^BRD$|^B$/i, 'BRIDGE')
     .replace(/^PRE-CHORUS$|^PRE-REF$|^PREF$/i, 'PREF')
     .replace(/^MEZIHRA$|^INTERLUDE$|^M$/i, 'INTERLUDE')
     .trim().toUpperCase();

  sections.forEach((sec, idx) => {
    if (sec.marker) {
      const cleanMarker = normalize(sec.marker);
      if (!markerToIndex.has(cleanMarker)) {
        markerToIndex.set(cleanMarker, idx);
      }
    }
  });

  // Traverse all sections and their chunks to link references
  sections.forEach((sec) => {
    sec.parsedLines.forEach((line) => {
      line.chunks.forEach((chunk) => {
        if (chunk.isSectionRef) {
          const refText = chunk.text.replace(/^\[(.*)\]$/, '$1');
          const normalizedRef = normalize(refText);
          const targetIdx = markerToIndex.get(normalizedRef);
          
          if (targetIdx !== undefined) {
            chunk.targetSectionIndex = targetIdx;
          } else {
            // Try matching without numbers if specific match fails (e.g. [REF] -> REF1)
            const baseMatch = Array.from(markerToIndex.keys()).find(k => k.startsWith(normalizedRef) || normalizedRef.startsWith(k));
            if (baseMatch) {
              chunk.targetSectionIndex = markerToIndex.get(baseMatch);
            }
          }
        }
      });
    });
  });
}
