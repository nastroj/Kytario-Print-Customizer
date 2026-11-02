import { describe, expect, it } from 'vitest';
import { convertKytarioSectionsToChordpro, getStringContent } from './chordpro';

describe('convertKytarioSectionsToChordpro', () => {
  it('returns empty string for non-arrays or empty arrays', () => {
    expect(convertKytarioSectionsToChordpro([])).toBe('');
    expect(convertKytarioSectionsToChordpro(null as any)).toBe('');
    expect(convertKytarioSectionsToChordpro(undefined as any)).toBe('');
  });

  it('renders section titles and token types into ChordPro lines', () => {
    const sections = [
      {
        title: 'Refrén',
        tokens: [
          { type: 1, content: 'Am' }, // chord
          { type: 0, content: 'Dnes už' }, // lyric text
          { type: 6 }, // newline
          { type: 2, content: 'D' }, // chord variant
          { type: 0, content: 'poslední' },
        ],
      },
    ];
    const out = convertKytarioSectionsToChordpro(sections);
    expect(out).toContain('- Refrén');
    expect(out).toContain('[Am]Dnes už');
    expect(out).toContain('[D]poslední');
  });

  it('handles repeat markers (type 4 / 5) with counts', () => {
    const sections = [
      { title: '', tokens: [{ type: 4 }, { type: 0, content: 'x' }, { type: 5, content: 3 }] },
    ];
    const out = convertKytarioSectionsToChordpro(sections);
    expect(out).toContain('|: x :| (3x)');
  });

  it('expands spacing tokens (type 3)', () => {
    const sections = [
      {
        title: 'S',
        tokens: [
          { type: 3, content: 4 },
          { type: 0, content: 'x' },
        ],
      },
    ];
    const out = convertKytarioSectionsToChordpro(sections);
    // Full output is trimmed, so anchor the spaces to the following lyric token.
    expect(out).toMatch(/ {4}x/);
  });

  it('falls back to plain content/text when no tokens exist', () => {
    expect(convertKytarioSectionsToChordpro([{ title: 'A', content: 'plain lyrics' }])).toContain(
      'plain lyrics',
    );
    expect(convertKytarioSectionsToChordpro([{ title: 'B', text: 'text lyrics' }])).toContain(
      'text lyrics',
    );
  });

  it('skips null/undefined sections gracefully', () => {
    const sections = [null, { title: 'Ok', tokens: [{ type: 0, content: 'hi' }] }] as any;
    expect(convertKytarioSectionsToChordpro(sections)).toContain('hi');
  });
});

describe('getStringContent', () => {
  it('returns "" for falsy values', () => {
    expect(getStringContent(null)).toBe('');
    expect(getStringContent(undefined)).toBe('');
    expect(getStringContent('')).toBe('');
  });

  it('passes through plain strings', () => {
    expect(getStringContent('hello')).toBe('hello');
  });

  it('joins array items using common lyric keys', () => {
    const arr = ['line1', { text: 'line2' }, { content: 'line3' }, { lyrics: 'line4' }];
    expect(getStringContent(arr)).toBe('line1\nline2\nline3\nline4');
  });

  it('extracts the first known field from objects', () => {
    expect(getStringContent({ chordpro: '[Am] song' })).toBe('[Am] song');
    expect(getStringContent({ body: 'body text' })).toBe('body text');
  });

  it('returns "" for objects without recognized fields', () => {
    expect(getStringContent({ unknown: 1 })).toBe('');
  });
});
