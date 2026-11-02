import { describe, expect, it } from 'vitest';
import { cleanSongbookTitle, normalizeSongbookData } from './normalizeSongbook';

describe('cleanSongbookTitle', () => {
  it('returns "" for empty/non-string input', () => {
    expect(cleanSongbookTitle('')).toBe('');
    expect(cleanSongbookTitle(null as any)).toBe('');
  });

  it('strips trailing brand suffixes after pipe/dash', () => {
    expect(cleanSongbookTitle('Naše písně | Kytario')).toBe('Naše písně');
    expect(cleanSongbookTitle('Hitparáda – Digitální zpěvník')).toBe('Hitparáda');
  });

  it('strips parenthesized/bracketed generic terms', () => {
    expect(cleanSongbookTitle('Táborníci (Songbook)')).toBe('Táborníci');
    expect(cleanSongbookTitle('Chorál [Zpěvník]')).toBe('Chorál');
  });

  it('strips leading prefixes when a real title follows', () => {
    expect(cleanSongbookTitle('Songbook: Písničky')).toBe('Písničky');
    expect(cleanSongbookTitle('Zpěvník - Pisnicky')).toBe('Pisnicky');
  });

  it('strips trailing generic words', () => {
    expect(cleanSongbookTitle('Skupiny FNP – Songbook')).toBe('Skupiny FNP');
  });

  it('falls back to the trimmed original if cleaning would empty it', () => {
    expect(cleanSongbookTitle('Songbook')).toBe('Songbook');
  });
});

describe('normalizeSongbookData', () => {
  it('returns an untitled empty book for falsy raw input', () => {
    const data = normalizeSongbookData(null);
    expect(data.title).toBe('Untitled Songbook');
    expect(data.songs).toEqual([]);
  });

  it('extracts songs and picks the first available title alias', () => {
    const raw = { songbookTitle: 'Můj velký táborák', songs: [{ title: 'A', content: 'x' }] };
    const data = normalizeSongbookData(raw);
    expect(data.title).toBe('Můj velký táborák');
    expect(data.name).toBe('Můj velký táborák');
    expect(data.songs.map((s) => s.title)).toEqual(['A']);
  });

  it('finds titles nested under data.songbook / payload / songbookSongs[0].song.project', () => {
    expect(
      normalizeSongbookData({ data: { songbook: { name: 'Deep Book' } }, songs: [] }).title,
    ).toBe('Deep Book');
    const viaProject = normalizeSongbookData({
      songbookSongs: [{ song: { project: { name: 'Project Book' }, title: 'S', content: 'c' } }],
    });
    expect(viaProject.title).toBe('Project Book');
  });

  it('cleans brand noise out of the resolved title', () => {
    const data = normalizeSongbookData({ title: 'Rockové hity | Kytario', songs: [] });
    expect(data.title).toBe('Rockové hity');
  });

  it('defaults to "Songbook" when no title is discoverable', () => {
    expect(normalizeSongbookData({ songs: [{ title: 'X', content: 'y' }] }).title).toBe('Songbook');
  });

  it('propagates url/slug info discovered from the payload', () => {
    const raw = { name: 'N', slug: 'muj-zpevnik', songs: [] };
    const data = normalizeSongbookData(raw);
    expect(data.slug).toBe('muj-zpevnik');
    expect(data.url).toBe('https://kytario.com/muj-zpevnik');
    expect(data.shortUrl).toBe('kytario.com/muj-zpevnik');
  });

  it('spreads non-conflicting original fields onto the result', () => {
    const raw = { title: 'T', customField: 7, songs: [] };
    const data = normalizeSongbookData(raw) as any;
    expect(data.customField).toBe(7);
  });
});
