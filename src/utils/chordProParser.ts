export const sectionRefRegex = /^(?:(?:\d+[\.\:]?|\(\d+\))(?:\s*(?:VERSE|SLOKA))?|(?:REFR[EÉ]N|REFRAIN|REF|CHORUS|BRIDGE|BRD|PREF|PRE-REF|PRE-CHORUS|OUTRO|OUT|SPC|VERSE|SLOKA|INTRO|SOLO|CODA|MEZIHRA|MEDZIHRA|PŘEDEHRA|PREDOHRA|DOHRA|INTERLUDE|RIFF)(?:\s*\d+)?[\.\:]?|R\d*[\.\:]?|BRD\d*[\.\:]?|PREF\d*[\.\:]?|OUT\d*[\.\:]?|SPC\d*[\.\:]?|B[\.\:]|M[\.\:])$/i;

/**
 * Checks if a trimmed line represents a section header or directive.
 */
export function isSectionHeaderLine(trimmedLine: string): boolean {
  if (!trimmedLine) return false;
  if (trimmedLine.startsWith('- ')) return true;
  if (/^\{(?:(?:c|comment):\s*([^}]+)|(start_of_chorus|soc|start_of_bridge|sob|start_of_verse|sov|start_of_tab|sot))\}/i.test(trimmedLine)) return true;
  if (/^(?:#{1,4}|\*{1,2}|-{2,4}|={2,4})\s*([A-Za-z0-9\u00C0-\u024F\s\.:]+?)\s*(?:#{1,4}|\*{1,2}|-{2,4}|={2,4})?$/.test(trimmedLine)) return true;
  const bracketMatch = trimmedLine.match(/^\[([^\]]+)\](?:\s*(.*)|$)/);
  if (bracketMatch && sectionRefRegex.test(bracketMatch[1].trim())) return true;
  const parenMatch = trimmedLine.match(/^\(([^\)]+)\)(?:\s*(.*)|$)/);
  if (parenMatch && sectionRefRegex.test(parenMatch[1].trim())) return true;
  const markerPattern = /^((?:(?:\d+[\.\:]|\(\d+\))(?:\s*(?:VERSE|SLOKA))?[\.\:]?|(?:REFR[EÉ]N|REFRAIN|REF|CHORUS|BRIDGE|BRD|PREF|PRE-REF|PRE-CHORUS|OUTRO|OUT|SPC|VERSE|SLOKA|INTRO|SOLO|CODA|MEZIHRA|MEDZIHRA|PŘEDEHRA|PREDOHRA|DOHRA|INTERLUDE|RIFF)(?:\s*\d+)?[\.\:]?|R\d*[\.\:]?|BRD\d*[\.\:]?|PREF\d*[\.\:]?|OUT\d*[\.\:]?|SPC\d*[\.\:]?|B[\.\:]|M[\.\:]))(?:\s+|(?=\[)|(?=\{)|$)/i;
  return markerPattern.test(trimmedLine);
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

  // Find all [bracketed] occurrences
  const regex = /\[([^\]]+)\]/g;
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

  // Extract all bracketed/braced contents
  const matches = line.match(/\{[^\}]+\}|\[[^\]]+\]/g);
  if (!matches) return false;

  // Check if at least one match is an actual chord (not a section reference)
  const hasActualChords = matches.some((m) => {
    const inner = m.slice(1, -1).trim();
    return !sectionRefRegex.test(inner);
  });
  if (!hasActualChords) return false;

  // Strip all chord and section ref brackets
  const withoutChords = line.replace(/\{[^\}]+\}|\[[^\]]+\]/g, '').trim();
  if (!withoutChords) return true; // Only chords and whitespace

  // Check if what remains outside chords consists strictly of repetition / bar / tempo / count notation
  // e.g. |: :| | || //: :// 1. 2. (4x) 2x %
  const stripped = withoutChords.replace(/[|:\\/!.\(\)\[\]\{\}\s0-9xX%*\-+~]/g, '');
  if (stripped.length === 0) return true;

  // Also check if what remains is a musical label prefix or note
  // e.g. Intro:, Solo:, Riff:, Mezihra:, Předehra:, Dohra:, Bridge:, BRD:, SPC:, OUT:, PREF:, Interlude:, Sloka:, Verse:, Chorus:
  const strippedNoLabels = stripped.replace(/^(?:Intro|Outro|OUT|Solo|SPC|Mezihra|Bridge|BRD|Coda|R|Ref|PREF|Pre-Ref|Pre-Chorus|Refrén|Refrain|Chorus|Verse|Sloka|Riff|Interlude|Předehra|Dohra|Kytara|Guitar|Instr|Instrumental|Theme|Lead|Break|Takt|Bar|Akordy|Chords)[0-9]*[\.:]?$/i, '');
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
    processedLine = line.replace(/\{-{1,3}\}|\[-{1,3}\]/g, (m) => ' '.repeat(m.length - 2));
  }

  // Handle repetition / chords-only lines where chords and repetition marks are inline
  if (isRepetitionOrChordsOnlyLine(processedLine)) {
    const parts = processedLine.split(/(\{[^\}]+\}|\[[^\]]+\])/g);
    const chunks: ChordChunk[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if ((part.startsWith('{') && part.endsWith('}')) || (part.startsWith('[') && part.endsWith(']'))) {
        const inner = part.slice(1, -1).trim();
        if (sectionRefRegex.test(inner)) {
          chunks.push({ chord: null, text: inner, isSectionRef: true });
        } else if (inner.length > 0) {
          chunks.push({ chord: inner, text: '' });
        }
      } else {
        const normalized = part.replace(/:\|\|:/g, ':| |:').replace(/:\|\s*\|:/g, ':| |:').trim();
        if (normalized.length > 0) {
          chunks.push({ chord: null, text: normalized });
        }
      }
    }
    return chunks;
  }

  const parts = processedLine.split(/(\{[^\}]+\}|\[[^\]]+\])/g);
  const chunks: ChordChunk[] = [];
  
  let currentChord: string | null = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if ((part.startsWith('[') && part.endsWith(']')) || (part.startsWith('{') && part.endsWith('}'))) {
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
        const match = part.match(/^(\s*)(.*)$/);
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
 * Traverses sections and links standalone section references to their target sections
 * by matching markers.
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
