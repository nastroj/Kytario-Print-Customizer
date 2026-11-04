const DB_NAME = 'kytario_pdf_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'pdf_cache';

let dbPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Checks if IndexedDB is supported and accessible in current environment
 */
export function isIndexedDBSupported(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Opens or returns the cached IndexedDB instance
 */
function getIDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBSupported()) {
    return Promise.resolve(null);
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        resolve(null);
      };

      request.onblocked = () => {
        resolve(null);
      };
    } catch (err) {
      resolve(null);
    }
  });

  return dbPromise;
}

async function idbSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await getIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
        transaction.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  } catch (e) {
    return false;
  }
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await getIDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result !== undefined ? (request.result as T) : null);
        };
        request.onerror = () => resolve(null);
        transaction.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  } catch (e) {
    return null;
  }
}

async function idbDelete(key: string): Promise<boolean> {
  try {
    const db = await getIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
        transaction.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  } catch (e) {
    return false;
  }
}

/**
 * Persist generated PDF state to IndexedDB
 */
export async function saveGeneratedPdfToStorage(
  pdfInfo: {
    blob: Blob;
    filename: string;
    pageCount: number;
    sizeFormatted: string;
    generatedAt: number;
    fingerprint: string;
  } | null,
): Promise<boolean> {
  if (!pdfInfo) {
    return await idbDelete('cachedPdf');
  }
  return await idbSet('cachedPdf', pdfInfo);
}

/**
 * Load persisted generated PDF state from IndexedDB
 */
export async function loadGeneratedPdfFromStorage(): Promise<{
  blob: Blob;
  filename: string;
  pageCount: number;
  sizeFormatted: string;
  generatedAt: number;
  fingerprint: string;
} | null> {
  try {
    const data = await idbGet<{
      blob: Blob;
      filename: string;
      pageCount: number;
      sizeFormatted: string;
      generatedAt: number;
      fingerprint: string;
    }>('cachedPdf');
    if (data && data.blob instanceof Blob) {
      return data;
    }
  } catch (e) {
    console.warn('Failed to load cached PDF from IndexedDB:', e);
  }
  return null;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Keep the last songbook for one week

/**
 * Persist cached songbook data to IndexedDB and localStorage safely without quota crashes.
 * Returns `true` when the cache write actually succeeded, `false` otherwise.
 */
export async function saveCachedSongbookToStorage(songbook: any): Promise<boolean> {
  if (!songbook) {
    try {
      localStorage.removeItem('kytario-cached-songbook');
    } catch {}
    await idbDelete('cachedSongbook');
    return true;
  }

  // Always persist to IndexedDB asynchronously without blocking the main thread
  const idbOk = await idbSet('cachedSongbook', songbook);

  // Only store small/medium songbooks in synchronous localStorage (<= 40 songs)
  // to avoid blocking the main thread or crashing with QuotaExceededError on massive JSON payloads
  const songCount = (songbook.songs || songbook.items || []).length;
  let lsOk = false;
  if (songCount > 0 && songCount <= 40) {
    try {
      localStorage.setItem(
        'kytario-cached-songbook',
        JSON.stringify({ __cachedAt: Date.now(), songbook }),
      );
      lsOk = true;
    } catch {
      try {
        localStorage.removeItem('kytario-cached-songbook');
      } catch {}
    }
  } else {
    // Large songbook: clean localStorage so IndexedDB is used cleanly
    try {
      localStorage.removeItem('kytario-cached-songbook');
    } catch {}
    lsOk = true;
  }

  return idbOk || lsOk;
}

/**
 * Synchronously peek at the small localStorage mirror of the last used songbook.
 * Used during first render so the "load last songbook?" prompt can appear instantly.
 * Silently migrates legacy unwrapped cache entries.
 */
export function peekCachedSongbookFromLocalStorage(): any | null {
  try {
    const saved = localStorage.getItem('kytario-cached-songbook');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return null;

    // Legacy format: raw songbook stored directly
    if (parsed.songs || parsed.items || parsed.sections) {
      const wrapped = { __cachedAt: 0, songbook: parsed };
      try {
        localStorage.setItem('kytario-cached-songbook', JSON.stringify(wrapped));
      } catch {}
      return parsed;
    }

    // Wrapped format with timestamp — drop stale caches
    if (parsed.songbook && (parsed.songbook.songs || parsed.songbook.items || parsed.songbook.sections)) {
      if (typeof parsed.__cachedAt === 'number' && Date.now() - parsed.__cachedAt > CACHE_TTL_MS) {
        return null;
      }
      return parsed.songbook;
    }
  } catch {}
  return null;
}

/**
 * Load cached songbook data from localStorage or IndexedDB
 */
export async function loadCachedSongbookFromStorage(): Promise<any> {
  const local = peekCachedSongbookFromLocalStorage();
  if (local) {
    return local;
  }

  try {
    const idbData = await idbGet<any>('cachedSongbook');
    if (idbData && (idbData.songs || idbData.items || idbData.sections)) {
      return idbData;
    }
  } catch {}

  return null;
}

/**
 * Lightweight metadata about the last used songbook (title + song count),
 * safe to read synchronously even for huge songbooks stored in IndexedDB.
 */
export interface CachedSongbookMeta {
  title: string;
  songCount: number;
}

let cachedSongbookMetaPromise: Promise<CachedSongbookMeta | null> | null = null;

export function getCachedSongbookMeta(): Promise<CachedSongbookMeta | null> {
  if (!cachedSongbookMetaPromise) {
    cachedSongbookMetaPromise = (async () => {
      const data = await loadCachedSongbookFromStorage();
      if (!data) return null;
      const songs = data.songs || data.items || [];
      return {
        title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Untitled Songbook',
        songCount: Array.isArray(songs) ? songs.length : 0,
      };
    })();
  }
  return cachedSongbookMetaPromise;
}

/** Invalidate the memoized metadata promise after the cache changes. */
export function resetCachedSongbookMetaCache(): void {
  cachedSongbookMetaPromise = null;
}
