import { describe, expect, it } from 'vitest';
import {
  preprocessJsonText,
  fixUnescapedControlCharsInJson,
  removeTrailingCommas,
  balanceJsonBrackets,
  tryParseSequenceOrNdjson,
} from './jsonRepair';

describe('preprocessJsonText', () => {
  it('returns empty string for falsy input', () => {
    expect(preprocessJsonText('')).toBe('');
  });

  it('strips UTF-8 BOM and invisible whitespace', () => {
    expect(preprocessJsonText('\uFEFF\u200B {"a":1}  ')).toBe('{"a":1}');
  });

  it('removes markdown code fences (```json ... ```)', () => {
    const fenced = '```json\n{"title": "Song"}\n```';
    expect(preprocessJsonText(fenced)).toBe('{"title": "Song"}');
  });

  it('extracts a JSON object surrounded by conversational text', () => {
    const noisy = 'Here is your data: {"songs":[1,2]} hope it helps!';
    expect(preprocessJsonText(noisy)).toBe('{"songs":[1,2]}');
  });

  it('extracts arrays when they start before braces', () => {
    const noisy = 'Result -> [{"a":1},{"b":2}] <- done';
    expect(preprocessJsonText(noisy)).toBe('[{"a":1},{"b":2}]');
  });
});

describe('fixUnescapedControlCharsInJson', () => {
  it('escapes raw newlines inside string literals', () => {
    const broken = '{"lyrics":"line1\nline2"}';
    const fixed = fixUnescapedControlCharsInJson(broken);
    expect(() => JSON.parse(fixed)).not.toThrow();
    expect(JSON.parse(fixed).lyrics).toBe('line1\nline2');
  });

  it('escapes tabs inside strings but leaves structure untouched', () => {
    const broken = '{"a":"x\ty"}';
    expect(JSON.parse(fixUnescapedControlCharsInJson(broken))).toEqual({ a: 'x\ty' });
  });

  it('does not double-escape already escaped sequences', () => {
    const ok = '{"a":"line1\\nline2"}';
    expect(fixUnescapedControlCharsInJson(ok)).toBe(ok);
  });

  it('handles CRLF inside strings as a single \\n escape', () => {
    const broken = '{"a":"x\r\ny"}';
    const parsed = JSON.parse(fixUnescapedControlCharsInJson(broken));
    expect(parsed.a).toBe('x\ny');
  });
});

describe('removeTrailingCommas', () => {
  it('removes trailing commas in objects and arrays', () => {
    expect(removeTrailingCommas('{"a":1,}')).toBe('{"a":1}');
    expect(removeTrailingCommas('[1,2,]')).toBe('[1,2]');
    expect(removeTrailingCommas('{"arr":[1,2,],}')).toBe('{"arr":[1,2]}');
  });

  it('leaves valid JSON unchanged', () => {
    const src = '{"a":1,"b":[1,2]}';
    expect(removeTrailingCommas(src)).toBe(src);
  });
});

describe('balanceJsonBrackets', () => {
  it('closes unclosed braces and brackets of truncated JSON', () => {
    const truncated = '{"songs":[{"title":"A","content":"lyric"';
    const balanced = balanceJsonBrackets(truncated);
    expect(() => JSON.parse(balanced)).not.toThrow();
    expect(JSON.parse(balanced).songs[0].title).toBe('A');
  });

  it('strips a dangling comma before closing', () => {
    const balanced = balanceJsonBrackets('{"a":1,');
    expect(JSON.parse(balanced)).toEqual({ a: 1 });
  });

  it('closes an unterminated string literal', () => {
    const balanced = balanceJsonBrackets('{"a":"unclosed');
    expect(() => JSON.parse(balanced)).not.toThrow();
  });

  it('ignores brackets that appear inside strings', () => {
    const src = '{"a":"{{{"}';
    expect(balanceJsonBrackets(src)).toBe(src);
  });
});

describe('tryParseSequenceOrNdjson', () => {
  it('parses a bare comma-separated sequence of objects', () => {
    const result = tryParseSequenceOrNdjson(
      '{"title":"A","content":"x"},{"title":"B","content":"y"}',
    );
    expect(result).toHaveLength(2);
    expect((result?.[1] as { title?: string })?.title).toBe('B');
  });

  it('parses newline-delimited JSON when wrapping fails', () => {
    const ndjson =
      '{"title":"A","content":"line with unescaped \n break"}\n{"title":"B","content":"y"}';
    const result = tryParseSequenceOrNdjson(ndjson);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(1);
  });

  it('returns null for input that does not start with "{"', () => {
    expect(tryParseSequenceOrNdjson('[{"a":1}]')).toBeNull();
    expect(tryParseSequenceOrNdjson('')).toBeNull();
  });
});
