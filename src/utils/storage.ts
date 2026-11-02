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
export async function saveGeneratedPdfToStorage(pdfInfo: {
  blob: Blob;
  filename: string;
  pageCount: number;
  sizeFormatted: string;
  generatedAt: number;
  fingerprint: string;
} | null): Promise<boolean> {
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

/**
 * Persist cached songbook data to IndexedDB and localStorage safely without quota crashes
 */
export async function saveCachedSongbookToStorage(songbook: any): Promise<void> {
  if (!songbook) {
    try { localStorage.removeItem('kytario-cached-songbook'); } catch {}
    await idbDelete('cachedSongbook');
    return;
  }

  // Always persist to IndexedDB asynchronously without blocking the main thread
  await idbSet('cachedSongbook', songbook);

  // Only store small/medium songbooks in synchronous localStorage (<= 40 songs)
  // to avoid blocking the main thread or crashing with QuotaExceededError on massive JSON payloads
  const songCount = (songbook.songs || songbook.items || []).length;
  if (songCount > 0 && songCount <= 40) {
    try {
      localStorage.setItem('kytario-cached-songbook', JSON.stringify(songbook));
    } catch {
      try { localStorage.removeItem('kytario-cached-songbook'); } catch {}
    }
  } else {
    // Large songbook: clean localStorage so IndexedDB is used cleanly
    try { localStorage.removeItem('kytario-cached-songbook'); } catch {}
  }
}

/**
 * Load cached songbook data from localStorage or IndexedDB
 */
export async function loadCachedSongbookFromStorage(): Promise<any> {
  try {
    const saved = localStorage.getItem('kytario-cached-songbook');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.songs || parsed.items || parsed.sections)) {
        return parsed;
      }
    }
  } catch {}

  try {
    const idbData = await idbGet<any>('cachedSongbook');
    if (idbData && (idbData.songs || idbData.items || idbData.sections)) {
      return idbData;
    }
  } catch {}

  return null;
}
