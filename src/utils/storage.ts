import { SongbookData, PrintSettings } from '../types';

const DB_NAME = 'kytario_songbook_db';
const DB_VERSION = 1;
const STORE_NAME = 'customizer_state';

const STORAGE_KEYS = {
  SONGBOOK: 'kytario-saved-songbook',
  SETTINGS: 'kytario-print-settings-v2',
  DRAFT_SETTINGS: 'kytario-draft-settings',
  LAST_SAVED: 'kytario-last-saved-time',
  STORAGE_BACKEND: 'kytario-storage-backend',
} as const;

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

      request.onerror = (e) => {
        console.warn('IndexedDB failed to open, falling back to localStorage:', e);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('IndexedDB blocked by other tab');
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB error during initialization:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Generic helper to write a key-value pair to IndexedDB
 */
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

/**
 * Generic helper to read a key-value pair from IndexedDB
 */
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

/**
 * Generic helper to delete a key from IndexedDB
 */
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
 * Helper to safely save to localStorage with quota protection
 */
function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`localStorage save failed for key "${key}":`, err?.message || err);
    return false;
  }
}

/**
 * Auto-Save: Persist songbook data to IndexedDB with localStorage fallback
 */
export async function saveSongbookToStorage(data: SongbookData | null): Promise<boolean> {
  const timestamp = Date.now();
  if (!data) {
    await idbDelete('songbook');
    try {
      localStorage.removeItem(STORAGE_KEYS.SONGBOOK);
      localStorage.removeItem(STORAGE_KEYS.LAST_SAVED);
    } catch (e) {}
    return true;
  }

  // 1. Try IndexedDB (handles large songbooks without quota limit)
  const idbSuccess = await idbSet('songbook', data);
  await idbSet('lastSavedAt', timestamp);

  // 2. Also try localStorage as secondary mirror (if data size permits)
  try {
    const serialized = JSON.stringify(data);
    safeLocalStorageSet(STORAGE_KEYS.SONGBOOK, serialized);
    safeLocalStorageSet(STORAGE_KEYS.LAST_SAVED, String(timestamp));
  } catch (e) {
    // If localStorage quota exceeded, IndexedDB is already saved
  }

  return idbSuccess;
}

/**
 * Auto-Save: Persist print settings and in-progress draft settings
 */
export async function saveSettingsToStorage(
  isDarkMode: boolean,
  settings: PrintSettings,
  draftSettings?: PrintSettings | null
): Promise<boolean> {
  const timestamp = Date.now();

  // 1. Save settings to IndexedDB
  await idbSet(isDarkMode ? 'settings_dark' : 'settings_light', settings);
  if (draftSettings) {
    await idbSet(isDarkMode ? 'draftSettings_dark' : 'draftSettings_light', draftSettings);
  } else {
    await idbDelete(isDarkMode ? 'draftSettings_dark' : 'draftSettings_light');
  }
  await idbSet('lastSavedAt', timestamp);

  // 2. Save settings to localStorage
  try {
    safeLocalStorageSet(isDarkMode ? STORAGE_KEYS.SETTINGS + '_dark' : STORAGE_KEYS.SETTINGS + '_light', JSON.stringify(settings));
    if (draftSettings) {
      safeLocalStorageSet(isDarkMode ? STORAGE_KEYS.DRAFT_SETTINGS + '_dark' : STORAGE_KEYS.DRAFT_SETTINGS + '_light', JSON.stringify(draftSettings));
    } else {
      localStorage.removeItem(isDarkMode ? STORAGE_KEYS.DRAFT_SETTINGS + '_dark' : STORAGE_KEYS.DRAFT_SETTINGS + '_light');
    }
    safeLocalStorageSet(STORAGE_KEYS.LAST_SAVED, String(timestamp));
  } catch (e) {}

  return true;
}

export interface RestoredAppState {
  songbookData: SongbookData | null;
  lightSettings: PrintSettings | null;
  darkSettings: PrintSettings | null;
  lightDraft: PrintSettings | null;
  darkDraft: PrintSettings | null;
  lastSavedAt: number | null;
  backend: 'indexeddb' | 'localstorage' | 'none';
}

/**
 * Restore complete application state from IndexedDB or legacy localStorage
 */

export async function loadAppStateFromStorage(): Promise<RestoredAppState> {
  let restoredSongbook: SongbookData | null = null;
  let restoredLightSettings: PrintSettings | null = null;
  let restoredDarkSettings: PrintSettings | null = null;
  let restoredLightDraft: PrintSettings | null = null;
  let restoredDarkDraft: PrintSettings | null = null;
  let restoredTimestamp: number | null = null;
  let backend: 'indexeddb' | 'localstorage' | 'none' = 'none';

  // 1. Try IndexedDB first
  try {
    const [idbSongbook, idbLight, idbDark, idbLightDraft, idbDarkDraft, idbTime, idbLegacySettings, idbLegacyDraft] = await Promise.all([
      idbGet<SongbookData>('songbook'),
      idbGet<PrintSettings>('settings_light'),
      idbGet<PrintSettings>('settings_dark'),
      idbGet<PrintSettings>('draftSettings_light'),
      idbGet<PrintSettings>('draftSettings_dark'),
      idbGet<number>('lastSavedAt'),
      idbGet<PrintSettings>('settings'), // Fallbacks
      idbGet<PrintSettings>('draftSettings')
    ]);

    if (idbSongbook && typeof idbSongbook === 'object') {
      restoredSongbook = idbSongbook;
      backend = 'indexeddb';
    }
    
    // settings
    if (idbLight && typeof idbLight === 'object') { restoredLightSettings = idbLight; backend = 'indexeddb'; }
    if (idbDark && typeof idbDark === 'object') { restoredDarkSettings = idbDark; backend = 'indexeddb'; }
    if (!idbLight && !idbDark && idbLegacySettings && typeof idbLegacySettings === 'object') {
       restoredLightSettings = idbLegacySettings;
       restoredDarkSettings = idbLegacySettings;
       backend = 'indexeddb';
    }
    
    // draft
    if (idbLightDraft && typeof idbLightDraft === 'object') restoredLightDraft = idbLightDraft;
    if (idbDarkDraft && typeof idbDarkDraft === 'object') restoredDarkDraft = idbDarkDraft;
    if (!idbLightDraft && !idbDarkDraft && idbLegacyDraft && typeof idbLegacyDraft === 'object') {
       restoredLightDraft = idbLegacyDraft;
       restoredDarkDraft = idbLegacyDraft;
    }

    if (typeof idbTime === 'number') restoredTimestamp = idbTime;
  } catch (e) {
    console.warn('Error reading from IndexedDB:', e);
  }

  // 2. Fall back to / migrate from localStorage if IndexedDB had no songbook or settings
  if (!restoredSongbook) {
    try {
      const savedLsSongbook = localStorage.getItem(STORAGE_KEYS.SONGBOOK);
      if (savedLsSongbook) {
        const parsed = JSON.parse(savedLsSongbook);
        if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.songs) || Array.isArray(parsed.items))) {
          restoredSongbook = parsed;
          backend = 'localstorage';
          idbSet('songbook', parsed);
        }
      }
    } catch (e) {}
  }

  if (!restoredLightSettings && !restoredDarkSettings) {
    try {
      const savedLight = localStorage.getItem(STORAGE_KEYS.SETTINGS + '_light');
      const savedDark = localStorage.getItem(STORAGE_KEYS.SETTINGS + '_dark');
      const savedLegacy = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      
      if (savedLight) { restoredLightSettings = JSON.parse(savedLight); backend = 'localstorage'; }
      if (savedDark) { restoredDarkSettings = JSON.parse(savedDark); backend = 'localstorage'; }
      
      if (!savedLight && !savedDark && savedLegacy) {
         const parsed = JSON.parse(savedLegacy);
         restoredLightSettings = parsed;
         restoredDarkSettings = parsed;
         backend = 'localstorage';
      }
      
      if (restoredLightSettings) idbSet('settings_light', restoredLightSettings);
      if (restoredDarkSettings) idbSet('settings_dark', restoredDarkSettings);
    } catch (e) {}
  }

  if (!restoredLightDraft && !restoredDarkDraft) {
    try {
      const savedLight = localStorage.getItem(STORAGE_KEYS.DRAFT_SETTINGS + '_light');
      const savedDark = localStorage.getItem(STORAGE_KEYS.DRAFT_SETTINGS + '_dark');
      const savedLegacy = localStorage.getItem(STORAGE_KEYS.DRAFT_SETTINGS);
      
      if (savedLight) restoredLightDraft = JSON.parse(savedLight);
      if (savedDark) restoredDarkDraft = JSON.parse(savedDark);
      
      if (!savedLight && !savedDark && savedLegacy) {
         const parsed = JSON.parse(savedLegacy);
         restoredLightDraft = parsed;
         restoredDarkDraft = parsed;
      }
      
      if (restoredLightDraft) idbSet('draftSettings_light', restoredLightDraft);
      if (restoredDarkDraft) idbSet('draftSettings_dark', restoredDarkDraft);
    } catch (e) {}
  }

  if (!restoredTimestamp) {
    try {
      const savedTime = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);
      if (savedTime) {
        restoredTimestamp = Number(savedTime) || null;
      }
    } catch (e) {}
  }

  return {
    songbookData: restoredSongbook,
    lightSettings: restoredLightSettings,
    darkSettings: restoredDarkSettings,
    lightDraft: restoredLightDraft,
    darkDraft: restoredDarkDraft,
    lastSavedAt: restoredTimestamp,
    backend
  };
}

export async function clearSavedSongbookStorage(): Promise<void> {
  await Promise.all([
    idbDelete('songbook'),
    idbDelete('draftSettings'),
    idbDelete('lastSavedAt'),
    idbDelete('cachedPdf'),
  ]);

  try {
    localStorage.removeItem(STORAGE_KEYS.SONGBOOK);
    localStorage.removeItem(STORAGE_KEYS.DRAFT_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.LAST_SAVED);
  } catch (e) {}
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

