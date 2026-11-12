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
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            title: 'Canonical book',
            urlToken: 'resolved-book',
            slug: 'resolved-book',
            songbookSongs: [{ song: { title: 'A song', content: 'Lyrics' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const data = await fetchSongbookFromKytario('https://kytario.com/project-route');

    expect(data.title).toBe('Canonical book');
    expect(data.urlToken).toBe('resolved-book');
    expect(data.url).toBe('https://kytario.com/resolved-book');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('races fallback relays in parallel when the local proxy times out or fails', async () => {
    const stageUpdates: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.startsWith('/api/proxy/kytario')) {
        return new Response(JSON.stringify({ error: 'Gateway timeout' }), { status: 504 });
      }
      if (url.startsWith('https://api.codetabs.com/')) {
        return new Response(
          JSON.stringify({
            title: 'Fallback Book',
            songbookSongs: [{ song: { title: 'Song One', content: 'Lyrics' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('Unavailable', { status: 503 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const data = await fetchSongbookFromKytario('https://kytario.com/cs/bodg', (stage) => {
      stageUpdates.push(stage.title);
    });

    expect(data.title).toBe('Fallback Book');
    expect(data.urlToken).toBe('bodg');
    expect(stageUpdates.length).toBeGreaterThan(0);
  });
});

