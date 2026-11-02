/**
 * Helpers for converting Kytario AST token sections into ChordPro-style text.
 */
import {
  asRecord,
  firstRawString,
  rawNumber,
  type JsonValue,
  type RawLike,
  type RawSectionLike,
} from '../types/rawSongbook';

/**
 * Converts Kytario AST token sections into ChordPro formatted text.
 * Accepts the untrusted section array shape found in imported payloads;
 * non-object sections and tokens are skipped defensively.
 */
export function convertKytarioSectionsToChordpro(sections: readonly unknown[]): string {
  if (!Array.isArray(sections) || sections.length === 0) return '';
  let fullText = '';
  for (const rawSec of sections) {
    const sec = asRecord(rawSec);
    if (!sec) continue;
    // Always add a section title line to distinguish from inline references, even if empty
    const title = firstRawString(sec, ['title']).trim();
    fullText += `- ${title}`.trim() + '\n';

    const tokens = Array.isArray(sec.tokens) ? (sec.tokens as JsonValue[]) : undefined;
    if (tokens) {
      for (const rawTok of tokens) {
        const t = asRecord(rawTok);
        if (!t) continue;
        const type = rawNumber(t, 'type');
        const content = t.content;
        if (type === 0) {
          fullText += content !== undefined ? String(content) : '';
        } else if (type === 1 || type === 2) {
          const chord = content !== undefined ? String(content).trim() : '';
          if (chord) {
            fullText += `[${chord}]`;
          }
        } else if (type === 3) {
          const count = Number(content) || 1;
          fullText += ' '.repeat(Math.max(1, count));
        } else if (type === 4) {
          fullText += '|: ';
        } else if (type === 5) {
          const count = content !== undefined ? String(content) : '2';
          fullText += ` :| (${count}x)`;
        } else if (type === 6) {
          fullText += '\n';
        } else if (content !== undefined) {
          fullText += String(content);
        }
      }
    } else {
      const contentStr = firstRawString(sec, ['content']);
      const textStr = firstRawString(sec, ['text']);
      if (typeof sec.content === 'string') fullText += contentStr;
      else if (typeof sec.text === 'string') fullText += textStr;
    }
    fullText += '\n\n';
  }
  return fullText.trim();
}

/** True when the value is a non-null, non-array plain object. */
function isPlainObject(val: JsonValue): val is RawLike {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Internal helper to find string content from a potential song object field.
 * Handles strings, arrays of line objects/strings, and single wrapper objects.
 */
export function getStringContent(val: JsonValue | undefined): string {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'string') return val;
  if (typeof val !== 'object') return String(val);
  if (Array.isArray(val)) {
    return val
      .map((l) => {
        if (typeof l === 'string') return l;
        if (isPlainObject(l)) {
          return firstRawString(l, [
            'text',
            'content',
            'val',
            'line',
            'text_original',
            'lyrics',
          ]);
        }
        return '';
      })
      .join('\n');
  }
  // Wrapper object with one of the known content keys
  return firstRawString(val, [
    'text',
    'content',
    'lyrics',
    'body',
    'val',
    'raw',
    'text_original',
    'original_text',
    'chordpro',
  ]);
}
