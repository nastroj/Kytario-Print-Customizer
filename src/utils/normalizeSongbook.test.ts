import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSongbookFromKytario,
  extractTitleFromHtml,
  extractSongbookTokensFromProjectHtml,
  isProjectSongbookSelection,
} from './api';
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

  it('does not duplicate API songs when a cached songbook is normalized again', () => {
    const firstLoad = normalizeSongbookData({
      title: 'Cached book',
      songbookSongs: [
        { song: { id: 1, title: 'First song', content: 'First lyrics' } },
        { song: { id: 2, title: 'Second song', content: 'Second lyrics' } },
      ],
    });

    const reopened = normalizeSongbookData(firstLoad);

    expect(firstLoad.songs).toHaveLength(2);
    expect(reopened.songs).toHaveLength(2);
    expect(reopened.songs?.map((song) => song.title)).toEqual(['First song', 'Second song']);
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

  it('extracts songbook anchor links from project HTML while ignoring site navigation', () => {
    const html = `
      <html>
        <header><nav><a href="/login">Login</a><a href="/cs/projekty">Projekty</a></nav></header>
        <main>
          <a href="/cs/bodg"><h3>PRO RADOST</h3></a>
          <a href="/songbooks/druhy/index-1">Druhý zpěvník</a>
          <a href="/cs/projekty/muj-projekt">Self</a>
        </main>
        <footer><a href="/privacy">Privacy</a></footer>
      </html>
    `;

    const songbooks = extractSongbookTokensFromProjectHtml(html, 'muj-projekt');
    expect(songbooks).toEqual([
      { token: 'bodg', name: 'PRO RADOST', url: 'https://kytario.com/cs/bodg' },
      { token: 'druhy', name: 'Druhý zpěvník', url: 'https://kytario.com/songbooks/druhy/index-1' },
    ]);
  });

  it('passes through multi-songbook selection responses from the proxy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              requiresSelection: true,
              projectSlug: 'my-band',
              projectTitle: 'My Band',
              songbooks: [
                { token: 'bodg', name: 'PRO RADOST', url: 'https://kytario.com/bodg' },
                { token: 'tabor', name: 'Táborák', url: 'https://kytario.com/tabor' },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );

    const result = await fetchSongbookFromKytario('my-band');
    expect(isProjectSongbookSelection(result)).toBe(true);
    if (isProjectSongbookSelection(result)) {
      expect(result.songbooks).toHaveLength(2);
    }
  });
});
