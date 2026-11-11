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
});
