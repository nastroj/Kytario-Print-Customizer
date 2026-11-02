import { describe, expect, it } from 'vitest';
import { safeParseSongbookJson } from './safeParseSongbook';

const VALID = JSON.stringify({
  name: 'Skupinový velký táborák',
  slug: 'skupinovy',
  songs: [
    { title: 'Ať žije život', interpreter: 'Škwor', content: '[Am]text' },
    { title: 'Bla bla', interpreter: 'X', content: '[D]more' },
  ],
});

describe('safeParseSongbookJson', () => {
  it('throws on empty input', () => {
    expect(() => safeParseSongbookJson('')).toThrow(/empty/i);
    expect(() => safeParseSongbookJson('   ')).toThrow(/empty/i);
  });

  it('parses valid JSON without marking it as repaired', () => {
    const { data, isRepaired, recoveredCount } = safeParseSongbookJson(VALID);
    expect(isRepaired).toBe(false);
    expect(recoveredCount).toBe(2);
    expect(data.title).toBe('Skupinový velký táborák');
    expect(data.songs.map((s) => s.title)).toEqual(['Ať žije život', 'Bla bla']);
  });

  it('repairs markdown-fenced JSON (Attempt 1 after preprocessing)', () => {
    const fenced = '```json\n' + VALID + '\n```';
    const { data, isRepaired } = safeParseSongbookJson(fenced);
    expect(data.songs).toHaveLength(2);
    expect(isRepaired).toBe(false); // fence stripping happens in preprocess, parse itself succeeds
  });

  it('repairs unescaped newlines inside lyrics (Attempt 2)', () => {
    const broken = '{"name":"N","songs":[{"title":"T","content":"line1\nline2"}]}';
    const { data, isRepaired } = safeParseSongbookJson(broken);
    expect(isRepaired).toBe(true);
    expect(data.songs[0].content).toContain('line1');
  });

  it('repairs trailing commas (Attempt 2)', () => {
    const broken = '{"name":"N","songs":[{"title":"T","content":"c",},],}';
    const { data, isRepaired } = safeParseSongbookJson(broken);
    expect(isRepaired).toBe(true);
    expect(data.songs).toHaveLength(1);
  });

  it('recovers truncated files by balancing brackets (Attempt 3)', () => {
    const truncated = '{"name":"Cut off book","songs":[{"title":"One","content":"aaa"},{"title":"Two","cont';
    const { data, isRepaired } = safeParseSongbookJson(truncated);
    expect(isRepaired).toBe(true);
    expect(data.songs.length).toBeGreaterThanOrEqual(1);
  });

  it('parses NDJSON sequences of song objects (Attempt 4)', () => {
    const ndjson = '{"title":"First","content":"a"}\n{"title":"Second","content":"b"}';
    const { data, isRepaired } = safeParseSongbookJson(ndjson);
    expect(isRepaired).toBe(true);
    expect(data.songs.map((s) => s.title)).toEqual(['First', 'Second']);
  });

  it('falls back to corrupted-text scanning with a "Recovered" title (Attempt 5)', () => {
    const garbage = 'NETWORK ERROR {{{ bad json ... {"title":"Survivor","content":"lyric"} ... totally broken ]]]';
    const { data, isRepaired, recoveredCount } = safeParseSongbookJson(garbage);
    expect(isRepaired).toBe(true);
    expect(recoveredCount).toBe(1);
    expect(data.songs[0].title).toBe('Survivor');
  });

  it('throws a helpful error when nothing can be recovered', () => {
    expect(() => safeParseSongbookJson('this is not json at all')).toThrow(/Unable to parse/);
  });
});
