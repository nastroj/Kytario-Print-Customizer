import { describe, expect, it } from 'vitest';
import {
  normalizeSingleSong,
  extractSongsFromAny,
  recoverSongsFromCorruptedText,
} from './normalizeSong';

describe('normalizeSingleSong', () => {
  it('maps title from the first present alias (title > name > songName)', () => {
    expect(normalizeSingleSong({ name: 'Second' }).title).toBe('Second');
    expect(normalizeSingleSong({ title: 'First', name: 'Ignored' }).title).toBe('First');
  });

  it('falls back to generated titles when no name exists', () => {
    expect(normalizeSingleSong({}, 2).title).toBe('Song 3');
    expect(normalizeSingleSong({ id: 42 }, 0).title).toBe('Song 42');
  });

  it('treats interpreter as artist and author as composer (Kytario semantics)', () => {
    const song = normalizeSingleSong({
      title: 'Píseň',
      interpreter: 'Nirvana',
      author: 'Cobain',
      content: 'lyrics',
    });
    expect(song.artist).toBe('Nirvana');
    expect(song.author).toBe('Cobain');
  });

  it('converts token sections to ChordPro content when available', () => {
    const song = normalizeSingleSong({
      title: 'S',
      sections: [
        {
          title: 'Refrén',
          tokens: [
            { type: 1, content: 'Am' },
            { type: 0, content: 'hei' },
          ],
        },
      ],
    });
    expect(song.content).toContain('[Am]hei');
  });

  it('derives id deterministically when provided, random otherwise', () => {
    expect(normalizeSingleSong({ id: 'abc', title: 'T' }).id).toBe('abc');
    expect(normalizeSingleSong({ title: 'T' }).id).toMatch(/^song-\d+-[a-z0-9]+$/);
  });

  it('detects private visibility', () => {
    expect(normalizeSingleSong({ title: 'T', visibility: 'private' }).isPrivate).toBe(true);
    expect(normalizeSingleSong({ title: 'T' }).isPrivate).toBe(false);
  });

  it('prefers tonalKey over key but keeps both populated', () => {
    const song = normalizeSingleSong({ title: 'T', key: 'G', tonalKey: 'Am' });
    expect(song.key).toBe('Am');
    expect(song.tonalKey).toBe('Am');
  });
});

describe('extractSongsFromAny', () => {
  it('returns [] for null/primitives', () => {
    expect(extractSongsFromAny(null)).toEqual([]);
    expect(extractSongsFromAny('string')).toEqual([]);
  });

  it('extracts a flat array of song objects', () => {
    const songs = extractSongsFromAny([
      { title: 'A', content: 'aaa' },
      { title: 'B', content: 'bbb' },
    ]);
    expect(songs.map((s) => s.title)).toEqual(['A', 'B']);
  });

  it('unwraps item.song / item.item envelopes', () => {
    const songs = extractSongsFromAny([{ song: { title: 'Wrapped', content: 'x' } }]);
    expect(songs[0].title).toBe('Wrapped');
  });

  it('finds songs nested under common container props', () => {
    const data = { name: 'Book', songs: [{ title: 'Nested', lyrics: 'l' }] };
    const songs = extractSongsFromAny(data);
    expect(songs.some((s) => s.title === 'Nested')).toBe(true);
  });

  it('handles deeply wrapped payload.result structures', () => {
    const data = {
      payload: { result: { songbookSongs: [{ song: { title: 'Deep', content: 'c' } }] } },
    };
    const songs = extractSongsFromAny(data);
    expect(songs.map((s) => s.title)).toContain('Deep');
  });

  it('imports title-only metadata objects as empty songs', () => {
    const songs = extractSongsFromAny({ title: 'MetaOnly' });
    expect(songs).toHaveLength(1);
    expect(songs[0].content).toBe('');
  });

  it('does not duplicate shared references (cycle guard)', () => {
    const shared = { title: 'S', content: 'c' };
    const data = { a: shared, b: shared };
    const songs = extractSongsFromAny(data);
    expect(songs.length).toBeLessThanOrEqual(2);
  });
});

describe('recoverSongsFromCorruptedText', () => {
  it('recovers complete objects from truncated garbage text', () => {
    const raw = '{"songs":[{"title":"Good","content":"lyric here"},{"title":"Bad","cont';
    const songs = recoverSongsFromCorruptedText(raw);
    expect(songs.map((s) => s.title)).toContain('Good');
  });

  it('returns [] when nothing song-like is present', () => {
    expect(recoverSongsFromCorruptedText('not json at all')).toEqual([]);
  });

  it('respects escaped quotes inside strings', () => {
    const raw = 'prefix {"title":"He said \\"hi\\"","content":"c"} suffix {';
    const songs = recoverSongsFromCorruptedText(raw);
    expect(songs).toHaveLength(1);
    expect(songs[0].title).toBe('He said "hi"');
  });
});
