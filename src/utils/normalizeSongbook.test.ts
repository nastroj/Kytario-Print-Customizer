import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSongbookFromKytario, extractTitleFromHtml } from './api';
import { normalizeSongbookData } from './normalizeSongbook';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('songbook metadata normalization', () => {
  it('preserves canonical songbook metadata supplied by the fetcher', () => {
    const data = normalizeSongbookData({
      title: 'The correct book',
      name: 'The correct book',
      urlToken: 'resolved-book',
      slug: 'resolved-book',
      url: 'https://kytario.com/resolved-book',
      shortUrl: 'kytario.com/resolved-book',
      songbookSongs: [{ song: { title: 'A song from another project' } }],
    });

    expect(data.title).toBe('The correct book');
    expect(data.urlToken).toBe('resolved-book');
    expect(data.slug).toBe('resolved-book');
    expect(data.url).toBe('https://kytario.com/resolved-book');
    expect(data.shortUrl).toBe('kytario.com/resolved-book');
  });

  it('prefers the requested book heading over song metadata in the page', () => {
    const html = `
      <meta property="og:title" content="Unrelated song | Kytario">
      <h1>Requested songbook</h1>
    `;

    expect(extractTitleFromHtml(html, 'book-token')).toBe('Requested songbook');
  });

  it('preserves legitimate songbook names ending in "Songbook"', () => {
    const data = normalizeSongbookData({ title: 'The Requested Songbook' });

    expect(data.title).toBe('The Requested Songbook');
  });
});

describe('resolved songbook URL import metadata', () => {
  it('keeps the canonical token and name returned by the proxy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            title: 'Canonical book',
            urlToken: 'resolved-book',
            slug: 'resolved-book',
            songbookSongs: [{ song: { title: 'A song', content: 'Lyrics' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const data = await fetchSongbookFromKytario('https://kytario.com/project-route');

    expect(data.title).toBe('Canonical book');
    expect(data.urlToken).toBe('resolved-book');
    expect(data.url).toBe('https://kytario.com/resolved-book');
  });
});
