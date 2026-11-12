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

const OFFLINE_LIBRARY_INDEX_KEY = 'offlineSongbooksIndex';
const OFFLINE_SONGBOOK_KEY_PREFIX = 'offlineSongbook:';
const MAX_OFFLINE_SONGBOOKS = 15;

export interface OfflineSongbookSummary {
  id: string;
  title: string;
  songCount: number;
  lastOpenedAt: number;
  urlToken?: string;
  url?: string;
  shortUrl?: string;
}

function getSongbookStorageId(songbook: any): string {
  const token =
    typeof songbook?.urlToken === 'string' && songbook.urlToken.trim()
      ? songbook.urlToken.trim().toLowerCase()
      : typeof songbook?.slug === 'string' && songbook.slug.trim()
        ? songbook.slug.trim().toLowerCase()
        : '';
  if (token) {
    const urlStr = typeof songbook?.url === 'string' ? songbook.url : '';
    const playlistMatch = urlStr.match(/[?&]playlist=([^&#]+)/i);
    if (playlistMatch?.[1]) {
      return `kytario:${token}:pl:${decodeURIComponent(playlistMatch[1]).toLowerCase()}`;
    }
    return `kytario:${token}`;
  }

  const shortUrl =
    typeof songbook?.shortUrl === 'string' && songbook.shortUrl.trim()
      ? songbook.shortUrl.trim().toLowerCase()
      : '';
  if (shortUrl) return `url:${shortUrl}`;

  const rawTitle =
    typeof songbook?.title === 'string' && songbook.title.trim()
      ? songbook.title.trim()
      : typeof songbook?.name === 'string' && songbook.name.trim()
        ? songbook.name.trim()
        : 'untitled-songbook';
  const normalizedTitle = rawTitle
    .toLowerCase()
    .replace(/[^a-z0-9čďěňřšťůúýž]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `local:${normalizedTitle || 'songbook'}`;
}

function buildOfflineSummary(songbook: any, id: string): OfflineSongbookSummary {
  const songs = songbook?.songs || songbook?.items || [];
  const title =
    typeof songbook?.title === 'string' && songbook.title.trim()
      ? songbook.title.trim()
      : typeof songbook?.name === 'string' && songbook.name.trim()
        ? songbook.name.trim()
        : 'Untitled Songbook';
  return {
    id,
    title,
    songCount: Array.isArray(songs) ? songs.length : 0,
    lastOpenedAt: Date.now(),
    urlToken: typeof songbook?.urlToken === 'string' ? songbook.urlToken : undefined,
    url: typeof songbook?.url === 'string' ? songbook.url : undefined,
    shortUrl: typeof songbook?.shortUrl === 'string' ? songbook.shortUrl : undefined,
  };
}

/**
 * Save a songbook into the persistent IndexedDB offline library so all
 * previously opened songbooks remain accessible without network connectivity.
 */
export async function saveSongbookToOfflineLibrary(
  songbook: any,
): Promise<OfflineSongbookSummary[]> {
  if (!songbook || !(songbook.songs || songbook.items || songbook.sections)) {
    return listOfflineSongbooks();
  }

  const id = getSongbookStorageId(songbook);
  const summary = buildOfflineSummary(songbook, id);
  const payloadOk = await idbSet(`${OFFLINE_SONGBOOK_KEY_PREFIX}${id}`, songbook);
  if (!payloadOk) {
    return listOfflineSongbooks();
  }

  const existing = (await idbGet<OfflineSongbookSummary[]>(OFFLINE_LIBRARY_INDEX_KEY)) || [];
  const filtered = existing.filter((entry) => entry && entry.id !== id);
  const updated = [summary, ...filtered];

  // Evict oldest entries beyond MAX_OFFLINE_SONGBOOKS
  const evicted = updated.slice(MAX_OFFLINE_SONGBOOKS);
  const kept = updated.slice(0, MAX_OFFLINE_SONGBOOKS);

  await idbSet(OFFLINE_LIBRARY_INDEX_KEY, kept);
  for (const oldItem of evicted) {
    if (oldItem?.id) {
      await idbDelete(`${OFFLINE_SONGBOOK_KEY_PREFIX}${oldItem.id}`);
    }
  }

  return kept;
}

/**
 * List all previously opened songbooks stored offline in IndexedDB.
 * Migrates the legacy single `cachedSongbook` entry if the library index is empty.
 */
export async function listOfflineSongbooks(): Promise<OfflineSongbookSummary[]> {
  const existing = await idbGet<OfflineSongbookSummary[]>(OFFLINE_LIBRARY_INDEX_KEY);
  if (Array.isArray(existing) && existing.length > 0) {
    return [...existing].sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
  }

  // Seed library from legacy single cached songbook if present
  const legacy = await loadCachedSongbookFromStorage();
  if (legacy) {
    return saveSongbookToOfflineLibrary(legacy);
  }

  return [];
}

/**
 * Load a specific previously opened songbook payload from IndexedDB by its summary ID.
 */
export async function loadOfflineSongbookById(id: string): Promise<any | null> {
  if (!id) return null;
  const data = await idbGet<any>(`${OFFLINE_SONGBOOK_KEY_PREFIX}${id}`);
  if (data && (data.songs || data.items || data.sections)) {
    return data;
  }
  return null;
}

/**
 * Find a previously opened songbook in offline storage matching a Kytario URL or slug.
 */
export async function findOfflineSongbookByQuery(query: string): Promise<any | null> {
  const trimmed = (query || '').trim().toLowerCase();
  if (!trimmed) return null;

  const normalizedQuery = trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/index(?:-\d+)?\/?(?=[?#]|$)/i, '')
    .replace(/\/+$/, '');

  const list = await listOfflineSongbooks();
  const match = list.find((entry) => {
    const token = entry.urlToken?.toLowerCase();
    const shortUrl = entry.shortUrl?.toLowerCase().replace(/\/+$/, '');
    const fullUrl = entry.url
      ?.toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/+$/, '');
    if (token && (normalizedQuery === token || normalizedQuery.endsWith(`/${token}`))) {
      return true;
    }
    if (shortUrl && normalizedQuery === shortUrl) {
      return true;
    }
    if (fullUrl && normalizedQuery === fullUrl) {
      return true;
    }
    return false;
  });

  if (!match) return null;
  return loadOfflineSongbookById(match.id);
}

/**
 * Remove a songbook from the IndexedDB offline library.
 */
export async function removeOfflineSongbook(id: string): Promise<OfflineSongbookSummary[]> {
  if (!id) return listOfflineSongbooks();
  await idbDelete(`${OFFLINE_SONGBOOK_KEY_PREFIX}${id}`);
  const existing = (await idbGet<OfflineSongbookSummary[]>(OFFLINE_LIBRARY_INDEX_KEY)) || [];
  const next = existing.filter((entry) => entry && entry.id !== id);
  await idbSet(OFFLINE_LIBRARY_INDEX_KEY, next);
  return next;
}

