import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  forgetCachedSongbook,
  listOfflineSongbooks,
  loadCachedSongbookFromStorage,
  loadGeneratedPdfFromStorage,
  saveCachedSongbookToStorage,
  saveGeneratedPdfToStorage,
  saveSongbookToOfflineLibrary,
} from './storage';

function installMockStorage() {
  const ls = new Map<string, string>();
  const idbStore = new Map<string, any>();

  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (ls.has(key) ? ls.get(key)! : null),
    setItem: (key: string, val: string) => {
      ls.set(key, String(val));
    },
    removeItem: (key: string) => {
      ls.delete(key);
    },
  });

  const makeReq = (executor: () => any) => {
    const req: any = { result: undefined, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      try {
        req.result = executor();
        req.onsuccess?.({ target: req });
      } catch (err) {
        req.error = err;
        req.onerror?.({ target: req });
      }
    });
    return req;
  };

  const fakeDb: any = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => ({}),
    transaction: () => ({
      onerror: null,
      objectStore: () => ({
        put: (value: any, key: string) => makeReq(() => idbStore.set(key, value)),
        get: (key: string) => makeReq(() => idbStore.get(key)),
        delete: (key: string) => makeReq(() => idbStore.delete(key)),
      }),
    }),
  };

  vi.stubGlobal('indexedDB', {
    open: () => makeReq(() => fakeDb),
  });

  return { ls, idbStore };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('forgetCachedSongbook', () => {
  it('deletes the remembered songbook from localStorage, IndexedDB, PDF cache, and offline library', async () => {
    const { ls, idbStore } = installMockStorage();

    const songbookA = {
      title: 'PRO RADOST',
      urlToken: 'bodg',
      url: 'https://kytario.com/bodg',
      shortUrl: 'kytario.com/bodg',
      songs: [{ id: 1, title: 'Song 1', content: 'Lyrics' }],
    };
    const songbookB = {
      title: 'Other Book',
      urlToken: 'other',
      url: 'https://kytario.com/other',
      shortUrl: 'kytario.com/other',
      songs: [{ id: 2, title: 'Song 2', content: 'Lyrics' }],
    };

    await saveSongbookToOfflineLibrary(songbookB);
    await saveSongbookToOfflineLibrary(songbookA);
    await saveCachedSongbookToStorage(songbookA);
    await saveGeneratedPdfToStorage({
      blob: new Blob(['pdf'], { type: 'application/pdf' }),
      filename: 'pro-radost.pdf',
      pageCount: 2,
      sizeFormatted: '1 KB',
      generatedAt: Date.now(),
      fingerprint: 'fp-1',
    });

    expect(ls.has('kytario-cached-songbook')).toBe(true);
    expect(idbStore.has('cachedSongbook')).toBe(true);
    expect(idbStore.has('cachedPdf')).toBe(true);
    expect((await listOfflineSongbooks()).map((s) => s.urlToken)).toEqual(['bodg', 'other']);

    const remaining = await forgetCachedSongbook(null, { title: 'PRO RADOST', songCount: 1 });

    expect(ls.has('kytario-cached-songbook')).toBe(false);
    expect(await loadCachedSongbookFromStorage()).toBeNull();
    expect(await loadGeneratedPdfFromStorage()).toBeNull();
    expect(idbStore.has('offlineSongbook:kytario:bodg')).toBe(false);
    expect(remaining.map((s) => s.urlToken)).toEqual(['other']);
  });
});
