/**
 * Helpers for converting Kytario AST token sections into ChordPro-style text.
 */

/**
 * Converts Kytario AST token sections into ChordPro formatted text.
 */
export function convertKytarioSectionsToChordpro(sections: any[]): string {
  if (!Array.isArray(sections) || sections.length === 0) return '';
  let fullText = '';
  for (const sec of sections) {
    if (!sec) continue;
    // Always add a section title line to distinguish from inline references, even if empty
    const title = (sec.title && String(sec.title).trim()) || '';
    fullText += `- ${title}`.trim() + '\n';
    
    if (Array.isArray(sec.tokens)) {
      for (const t of sec.tokens) {
        if (!t) continue;
        if (t.type === 0) {
          fullText += t.content !== undefined ? String(t.content) : '';
        } else if (t.type === 1 || t.type === 2) {
          const chord = t.content !== undefined ? String(t.content).trim() : '';
          if (chord) {
            fullText += `[${chord}]`;
          }
        } else if (t.type === 3) {
          const count = Number(t.content) || 1;
          fullText += ' '.repeat(Math.max(1, count));
        } else if (t.type === 4) {
          fullText += '|: ';
        } else if (t.type === 5) {
          const count = t.content !== undefined ? String(t.content) : '2';
          fullText += ` :| (${count}x)`;
        } else if (t.type === 6) {
          fullText += '\n';
        } else if (t.content !== undefined) {
          fullText += String(t.content);
        }
      }
    } else if (typeof sec.content === 'string') {
      fullText += sec.content;
    } else if (typeof sec.text === 'string') {
      fullText += sec.text;
    }
    fullText += '\n\n';
  }
  return fullText.trim();
}

/**
 * Internal helper to find string content from a potential song object field.
 */
export function getStringContent(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val.map((l: any) => (typeof l === 'string' ? l : l?.text || l?.content || l?.val || l?.line || l?.text_original || l?.lyrics || '')).join('\n');
  }
  if (typeof val === 'object') {
    return val.text || val.content || val.lyrics || val.body || val.val || val.raw || val.text_original || val.original_text || val.chordpro || '';
  }
  return String(val);
}
