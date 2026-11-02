import { describe, expect, it } from 'vitest';
import {
  normalizeUrlAndShortUrl,
  extractSongbookUrlAndSlug,
  formatCoverDisplayUrl,
  formatCoverQrUrl,
  resolveCoverUrl,
} from './urlSlug';

describe('normalizeUrlAndShortUrl', () => {
  it('returns domain defaults when no value or slug is given', () => {
    expect(normalizeUrlAndShortUrl(null, null)).toEqual({
      url: 'https://kytario.com',
      shortUrl: 'kytario.com',
    });
  });

  it('builds a full URL from a bare slug', () => {
    const r = normalizeUrlAndShortUrl(null, 'muj-zpevnik');
    expect(r.url).toBe('https://kytario.com/muj-zpevnik');
    expect(r.shortUrl).toBe('kytario.com/muj-zpevnik');
    expect(r.slug).toBe('muj-zpevnik');
  });

  it('attaches a slug when foundVal is just the root domain', () => {
    const r = normalizeUrlAndShortUrl('https://kytario.com', 'pisky');
    expect(r.url).toBe('https://kytario.com/pisky');
    expect(r.slug).toBe('pisky');
  });

  it('upgrades http:// to https:// and strips www in shortUrl', () => {
    const r = normalizeUrlAndShortUrl('http://www.kytario.com/song-book');
    expect(r.url).toBe('https://www.kytario.com/song-book');
    expect(r.shortUrl).toBe('kytario.com/song-book');
    expect(r.slug).toBe('song-book');
  });

  it('handles bare domain paths without protocol', () => {
    const r = normalizeUrlAndShortUrl('kytario.com/abc');
    expect(r.url).toBe('https://kytario.com/abc');
    expect(r.shortUrl).toBe('kytario.com/abc');
  });

  it('treats unknown values as relative slugs against the default domain', () => {
    const r = normalizeUrlAndShortUrl('/zpevnik/nazev', null, 'example.org');
    expect(r.url).toBe('https://example.org/zpevnik/nazev');
    expect(r.slug).toBe('zpevnik/nazev');
  });
});

describe('extractSongbookUrlAndSlug', () => {
  it('finds slug from known keys on the object', () => {
    const r = extractSongbookUrlAndSlug({ urlToken: 'taseni' });
    expect(r.slug).toBe('taseni');
    expect(r.url).toBe('https://kytario.com/taseni');
  });

  it('searches nested songbook/data/payload/meta candidates', () => {
    const r = extractSongbookUrlAndSlug({ data: { songbook: { shareCode: 'XY123' } }, songs: [] });
    expect(r.slug).toBe('XY123');
  });

  it('falls back to scanning raw JSON text when the object has nothing', () => {
    const rawText = '{"songs":[],"meta":{"slug":"z-p-textu"}}';
    const r = extractSongbookUrlAndSlug({}, rawText);
    expect(r.slug).toBe('z-p-textu');
  });

  it('accepts non-numeric string ids as slugs', () => {
    const r = extractSongbookUrlAndSlug({ id: 'my-book-id' });
    expect(r.slug).toBe('my-book-id');
  });

  it('ignores numeric ids', () => {
    const r = extractSongbookUrlAndSlug({ id: '12345' });
    expect(r.slug).toBeUndefined();
    expect(r.url).toBe('https://kytario.com');
  });

  it('handles null input with no text gracefully', () => {
    const r = extractSongbookUrlAndSlug(null);
    expect(r.url).toBe('https://kytario.com');
  });
});

describe('formatCoverDisplayUrl', () => {
  it('returns the fallback domain for empty input', () => {
    expect(formatCoverDisplayUrl('')).toBe('kytario.com');
    expect(formatCoverDisplayUrl(null, 'jiny.cz')).toBe('jiny.cz');
  });

  it('strips protocol and www for display', () => {
    expect(formatCoverDisplayUrl('https://www.kytario.com/book/')).toBe('kytario.com/book');
  });

  it('prefixes bare slugs with the fallback domain', () => {
    expect(formatCoverDisplayUrl('muj-book')).toBe('kytario.com/muj-book');
  });
});

describe('formatCoverQrUrl', () => {
  it('returns the fallback URL for empty input', () => {
    expect(formatCoverQrUrl(null)).toBe('https://kytario.com');
  });

  it('upgrades http to https', () => {
    expect(formatCoverQrUrl('http://kytario.com/x')).toBe('https://kytario.com/x');
  });

  it('prepends https to bare domains', () => {
    expect(formatCoverQrUrl('www.kytario.com/x')).toBe('https://kytario.com/x');
  });

  it('treats plain slugs as kytario.com paths', () => {
    expect(formatCoverQrUrl('pisky')).toBe('https://kytario.com/pisky');
  });
});

describe('resolveCoverUrl', () => {
  it('prefers custom URL on custom covers', () => {
    const r = resolveCoverUrl({
      isCustom: true,
      customUrl: 'https://moje.cz/xxx',
      songbookSlug: 'ignored',
    });
    expect(r.displayUrl).toBe('moje.cz/xxx');
    expect(r.qrTarget).toBe('https://moje.cz/xxx');
  });

  it('allows a separate custom QR target override', () => {
    const r = resolveCoverUrl({
      isCustom: true,
      customUrl: 'moje.cz/page',
      customQrUrl: 'https://qr.example/1',
    });
    expect(r.qrTarget).toBe('https://qr.example/1');
    expect(r.displayUrl).toBe('moje.cz/page');
  });

  it('uses songbook shortUrl > url > slug priority for auto covers', () => {
    const r = resolveCoverUrl({
      songbookShortUrl: 'kytario.com/a',
      songbookUrl: 'https://kytario.com/b',
      songbookSlug: 'c',
    });
    expect(r.displayUrl).toBe('kytario.com/a');
    expect(r.qrTarget).toBe('https://kytario.com/a');
  });

  it('falls back to kytario.com when nothing is provided', () => {
    const r = resolveCoverUrl({});
    expect(r.displayUrl).toBe('kytario.com');
    expect(r.qrTarget).toBe('https://kytario.com');
  });
});
