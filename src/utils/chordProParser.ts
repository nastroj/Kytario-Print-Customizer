import { sectionRefRegex } from './constants';
import { ChordChunk } from './parserTypes';

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
