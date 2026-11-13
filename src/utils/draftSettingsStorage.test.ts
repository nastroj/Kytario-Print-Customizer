import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PRINT_SETTINGS, STORAGE_KEYS } from '../config/constants';
import {
  DRAFT_SETTINGS_TTL_MS,
  arePrintSettingsEqual,
  clearDraftSettingsFromStorage,
  loadDraftSettingsFromStorage,
  sanitizePrintSettings,
  saveDraftSettingsToStorage,
} from './draftSettingsStorage';

function installMockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
  return store;
}

describe('draftSettingsStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('saves and recovers a modified draft from localStorage', () => {
    installMockLocalStorage();
    const modified = {
      ...DEFAULT_PRINT_SETTINGS,
      chordsColor: '#b40b24',
      lyricsFontSize: 15,
    };

    expect(saveDraftSettingsToStorage(modified)).toBe(true);

    const recovered = loadDraftSettingsFromStorage(DEFAULT_PRINT_SETTINGS);
    expect(recovered).not.toBeNull();
    expect(recovered?.draft.chordsColor).toBe('#b40b24');
    expect(recovered?.draft.lyricsFontSize).toBe(15);
    expect(recovered?.draft.columns).toBe(2);
  });

  it('returns null and cleans up when saved draft matches applied settings', () => {
    const store = installMockLocalStorage();
    saveDraftSettingsToStorage(DEFAULT_PRINT_SETTINGS);
    expect(store.has(STORAGE_KEYS.DRAFT_SETTINGS)).toBe(true);

    const recovered = loadDraftSettingsFromStorage(DEFAULT_PRINT_SETTINGS);
    expect(recovered).toBeNull();
    expect(store.has(STORAGE_KEYS.DRAFT_SETTINGS)).toBe(false);
  });

  it('drops expired draft entries past TTL', () => {
    const store = installMockLocalStorage();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    saveDraftSettingsToStorage({ ...DEFAULT_PRINT_SETTINGS, titleFontSize: 22 });

    nowSpy.mockReturnValue(1_000_000 + DRAFT_SETTINGS_TTL_MS + 1000);
    expect(loadDraftSettingsFromStorage(DEFAULT_PRINT_SETTINGS)).toBeNull();
    expect(store.has(STORAGE_KEYS.DRAFT_SETTINGS)).toBe(false);
  });

  it('clears corrupt JSON gracefully and supports explicit clear', () => {
    const store = installMockLocalStorage();
    store.set(STORAGE_KEYS.DRAFT_SETTINGS, '{not-valid-json');

    expect(loadDraftSettingsFromStorage(DEFAULT_PRINT_SETTINGS)).toBeNull();
    expect(store.has(STORAGE_KEYS.DRAFT_SETTINGS)).toBe(false);

    saveDraftSettingsToStorage({ ...DEFAULT_PRINT_SETTINGS, pageFormat: 'A5' });
    expect(store.has(STORAGE_KEYS.DRAFT_SETTINGS)).toBe(true);
    clearDraftSettingsFromStorage();
    expect(store.has(STORAGE_KEYS.DRAFT_SETTINGS)).toBe(false);
  });

  it('handles localStorage QuotaExceededError safely without throwing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    });

    expect(saveDraftSettingsToStorage({ ...DEFAULT_PRINT_SETTINGS, bookMode: false })).toBe(false);
  });

  it('compares and sanitizes settings accurately', () => {
    const s1 = sanitizePrintSettings({ lyricsFontSize: 14, chordsFontSize: 14 });
    expect(s1.lyricsFontSize).toBe(12);
    expect(s1.chordsFontSize).toBe(12);
    expect(arePrintSettingsEqual(DEFAULT_PRINT_SETTINGS, s1)).toBe(true);
  });
});
