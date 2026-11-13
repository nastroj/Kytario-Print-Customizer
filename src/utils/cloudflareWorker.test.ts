import { afterEach, describe, expect, it, vi } from 'vitest';
import kytarioWorker from '../../cloudflare-worker.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Kytario Cloudflare Worker', () => {
  it('resolves project URLs and returns canonical songbook metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/projekty/project-one')) {
          return new Response(
            '<script>"{\\"songbooks\\":[{\\"urlToken\\":\\"bodg\\",\\"name\\":\\"Project title\\"}]}"</script>',
          );
        }
        if (url.endsWith('/api/songbooks/bodg/sections')) {
          return new Response(JSON.stringify({ songbookSongs: [{ song: { name: 'Song' } }] }));
        }
        if (url.endsWith('/api/songbooks/bodg/pdf') && init?.method === 'HEAD') {
          return new Response(null, {
            headers: { 'Content-Disposition': "attachment; filename*=UTF-8''PRO%20RADOST.pdf" },
          });
        }
        return new Response('Not found', { status: 404 });
      }),
    );

    const request = new Request(
      'https://worker.example/api/proxy/kytario/project-one?url=https%3A%2F%2Fkytario.com%2Fcs%2Fprojekty%2Fproject-one&token=project-one',
      { headers: { Origin: 'https://nastroj.github.io' } },
    );
    const response = await kytarioWorker.fetch(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('PRO RADOST');
    expect(data.urlToken).toBe('bodg');
    expect(data.url).toBe('https://kytario.com/bodg');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://nastroj.github.io');
  });

  it('rejects origins not configured for the Worker', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const request = new Request('https://worker.example/bodg', {
      headers: { Origin: 'https://untrusted.example' },
    });

    const response = await kytarioWorker.fetch(request);

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('extracts and merges playlist songs with order, capo, transposition, and combined title', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('playlist=taborak')) {
          return new Response(
            `<html><h1>PRO RADOST | Kytario</h1><script>"{\\"playlists\\":[{\\"id\\":42,\\"urlToken\\":\\"taborak\\",\\"name\\":\\"Táborák\\",\\"songs\\":[{\\"orderIndex\\":1,\\"capo\\":2,\\"transposition\\":-1,\\"song\\":{\\"id\\":102,\\"name\\":\\"Second Song\\"}},{\\"orderIndex\\":0,\\"song\\":{\\"id\\":101,\\"name\\":\\"First Song\\"}}]}]}"</script></html>`,
          );
        }
        if (url.endsWith('/api/songbooks/bodg/sections')) {
          return new Response(
            JSON.stringify({
              songbookSongs: [
                { song: { id: 101, name: 'First Song', content: '[C]One', author: 'A' } },
                { song: { id: 102, name: 'Second Song', content: '[G]Two', author: 'B' } },
                { song: { id: 103, name: 'Unused Song', content: '[D]Three', author: 'C' } },
              ],
            }),
          );
        }
        return new Response('Not found', { status: 404 });
      }),
    );

    const request = new Request(
      'https://worker.example/api/proxy/kytario/bodg?url=https%3A%2F%2Fkytario.com%2Fbodg%2Findex-1%3Fplaylist%3Dtaborak&token=bodg&playlist=taborak',
      { headers: { Origin: 'https://nastroj.github.io' } },
    );
    const response = await kytarioWorker.fetch(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('PRO RADOST - Táborák');
    expect(data.playlistName).toBe('Táborák');
    expect(data.urlToken).toBe('bodg');
    expect(data.songs).toHaveLength(2);
    expect(data.songs[0].name).toBe('First Song');
    expect(data.songs[1].name).toBe('Second Song');
    expect(data.songs[1].capo).toBe(2);
    expect(data.songs[1].transposition).toBe(-1);
  });

  it('resolves standalone /playlists/<token> URLs via the Kytario playlists directory', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url === 'https://kytario.com/playlists') {
          return new Response('<a href="/bodg/index-1?playlist=vecerni">Večerní</a>');
        }
        if (url.includes('/bodg') && url.includes('playlist=vecerni')) {
          return new Response(
            `<html><h1>PRO RADOST</h1><script>{"playlists":[{"id":7,"urlToken":"vecerni","name":"Večerní","songs":[{"orderIndex":0,"song":{"id":101,"name":"First Song"}}]}]}</script></html>`,
          );
        }
        if (url.endsWith('/api/songbooks/bodg/sections')) {
          return new Response(
            JSON.stringify({
              songbookSongs: [{ song: { id: 101, name: 'First Song', content: '[C]One' } }],
            }),
          );
        }
        return new Response('Not found', { status: 404 });
      }),
    );

    const request = new Request(
      'https://worker.example/api/proxy/kytario/playlists?url=https%3A%2F%2Fkytario.com%2Fplaylists%2Fvecerni&token=playlists&playlist=vecerni',
      { headers: { Origin: 'https://nastroj.github.io' } },
    );
    const response = await kytarioWorker.fetch(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.urlToken).toBe('bodg');
    expect(data.title).toBe('PRO RADOST - Večerní');
    expect(data.songs).toHaveLength(1);
  });

  it('extracts title from locale-redirected HTML metadata when HEAD /pdf fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/api/songbooks/bodg/sections')) {
          return new Response(JSON.stringify({ songbookSongs: [{ song: { name: 'Song' } }] }));
        }
        if (url.endsWith('/api/songbooks/bodg/pdf') && init?.method === 'HEAD') {
          return new Response('Forbidden', { status: 403 });
        }
        if (url === 'https://kytario.com/cs/bodg') {
          const res = new Response(
            '<html><head><title>Zpěvník PRO RADOST | Kytario</title><meta name="twitter:title" content="Zpěvník PRO RADOST | Kytario"/></head><body></body></html>',
            { status: 200 },
          );
          Object.defineProperty(res, 'url', { value: 'https://kytario.com/cs/bodg' });
          return res;
        }
        return new Response('Not found', { status: 404 });
      }),
    );

    const request = new Request(
      'https://worker.example/api/proxy/kytario/bodg?url=https%3A%2F%2Fkytario.com%2Fcs%2Fbodg&token=bodg',
      { headers: { Origin: 'https://nastroj.github.io' } },
    );
    const response = await kytarioWorker.fetch(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('PRO RADOST');
    expect(response.headers.get('Cache-Control')).not.toBe('no-store');
  });
});
