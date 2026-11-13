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
    expect(response.headers.get('Access-Control-Expose-Headers')).toContain(
      'X-Kytario-Title-Source',
    );
    expect(response.headers.get('X-Kytario-Title-Source')).toBe('html-meta');
  });

  it('includes _titleDebug probe breakdown when debug=1 is requested and title falls back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith('/api/songbooks/bodg/sections')) {
          return new Response(JSON.stringify({ songbookSongs: [{ song: { name: 'Song' } }] }));
        }
        return new Response('Forbidden', { status: 403 });
      }),
    );

    const request = new Request(
      'https://worker.example/api/proxy/kytario/bodg?token=bodg&debug=1',
      { headers: { Origin: 'https://nastroj.github.io' } },
    );
    const response = await kytarioWorker.fetch(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Songbook');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Kytario-Title-Source')).toBe('fallback');
    expect(response.headers.get('X-Kytario-Title-Debug')).toContain('403');
    expect(data._titleDebug.titleSource).toBe('fallback');
    expect(data._titleDebug.probes.length).toBeGreaterThan(0);
  });

  it('accepts /projects/, /cs/projekty/, /song/, /cs/skladba/, and /cs/zpevniky/ redirected URLs for title extraction', async () => {
    const sampleRoutes = [
      'https://kytario.com/projects/bodg',
      'https://kytario.com/cs/projekty/bodg',
      'https://kytario.com/song/bodg',
      'https://kytario.com/cs/skladba/bodg',
      'https://kytario.com/cs/zpevniky/bodg',
    ];

    for (const targetRoute of sampleRoutes) {
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
          if (url === targetRoute) {
            const res = new Response('<html><h1>PRO RADOST</h1></html>', { status: 200 });
            Object.defineProperty(res, 'url', { value: targetRoute });
            return res;
          }
          return new Response('Not found', { status: 404 });
        }),
      );

      const request = new Request(
        `https://worker.example/api/proxy/kytario/bodg?url=${encodeURIComponent(targetRoute)}&token=bodg`,
        { headers: { Origin: 'https://nastroj.github.io' } },
      );
      const response = await kytarioWorker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('PRO RADOST');

      // Also verify when https://kytario.com/bodg redirects to targetRoute
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
          if (url === 'https://kytario.com/bodg') {
            const res = new Response('<html><h1>PRO RADOST</h1></html>', { status: 200 });
            Object.defineProperty(res, 'url', { value: targetRoute });
            return res;
          }
          return new Response('Not found', { status: 404 });
        }),
      );

      const redirectRequest = new Request(
        'https://worker.example/api/proxy/kytario/bodg?token=bodg',
        { headers: { Origin: 'https://nastroj.github.io' } },
      );
      const redirectResponse = await kytarioWorker.fetch(redirectRequest);
      const redirectData = await redirectResponse.json();

      expect(redirectResponse.status).toBe(200);
      expect(redirectData.title).toBe('PRO RADOST');
    }
  });

  it('extracts songbook links from /projects/<token> HTML without JSON and returns requiresSelection when multiple exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url === 'https://kytario.com/projects/my-band') {
          return new Response(
            `<html>
              <header><nav><a href="/cs/login">Login</a><a href="/projects/other">Other</a></nav></header>
              <main>
                <h1>My Band Project</h1>
                <a href="/cs/bodg"><h2>PRO RADOST</h2><span>12 songs</span></a>
                <a href="/cs/zpevniky/tabor">Táborák</a>
                <a href="/projects/my-band">Self link</a>
              </main>
              <footer><a href="/about">About</a></footer>
            </html>`,
            { status: 200 },
          );
        }
        return new Response('Not found', { status: 404 });
      }),
    );

    const request = new Request(
      'https://worker.example/api/proxy/kytario/my-band?url=https%3A%2F%2Fkytario.com%2Fprojects%2Fmy-band&token=my-band',
      { headers: { Origin: 'https://nastroj.github.io' } },
    );
    const response = await kytarioWorker.fetch(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requiresSelection).toBe(true);
    expect(data.projectSlug).toBe('my-band');
    expect(data.projectTitle).toBe('My Band Project');
    expect(data.songbooks).toEqual([
      { token: 'bodg', name: 'PRO RADOST', url: 'https://kytario.com/cs/bodg' },
      { token: 'tabor', name: 'Táborák', url: 'https://kytario.com/cs/zpevniky/tabor' },
    ]);
  });

  it('tries kytario.com/<token> first and falls back to kytario.com/projects/<token> when missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('/api/songbooks/band-only/sections')) {
          return new Response('Not found', { status: 404 });
        }
        if (url === 'https://kytario.com/projects/band-only') {
          return new Response(
            '<html><main><h1>Band Project</h1><a href="/bodg">PRO RADOST</a><a href="/alpha">Alpha Book</a></main></html>',
            { status: 200 },
          );
        }
        return new Response('Not found', { status: 404 });
      }),
    );

    const request = new Request(
      'https://worker.example/api/proxy/kytario/band-only?url=band-only&token=band-only',
      { headers: { Origin: 'https://nastroj.github.io' } },
    );
    const response = await kytarioWorker.fetch(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requiresSelection).toBe(true);
    expect(data.projectSlug).toBe('band-only');
    expect(data.songbooks).toHaveLength(2);
    expect(data.songbooks.map((s: any) => s.token)).toEqual(['bodg', 'alpha']);
  });
});

