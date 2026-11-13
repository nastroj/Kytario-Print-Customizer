import { DEFAULT_PRINT_SETTINGS, STORAGE_KEYS } from '../config/constants';
import type { PrintSettings } from '../types';

/** Interval for periodic auto-save of unapplied print settings draft (5 seconds). */
export const DRAFT_AUTO_SAVE_INTERVAL_MS = 5000;

/** Drop recovered draft snapshots older than 7 days. */
export const DRAFT_SETTINGS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredDraftPayload {
  __savedAt: number;
  draft: PrintSettings;
}

/**
 * Migrate and sanitize a raw settings object into a valid PrintSettings object.
 */
export function sanitizePrintSettings(raw: unknown): PrintSettings {
  const baseDefaults = DEFAULT_PRINT_SETTINGS;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return baseDefaults;
  }

  const parsed: Record<string, any> = { ...(raw as Record<string, any>) };

  if (
    (parsed.lyricsFontSize === 14 || parsed.lyricsFontSize === 11) &&
    (parsed.chordsFontSize === 14 || parsed.chordsFontSize === 11)
  ) {
    parsed.lyricsFontSize = 12;
    parsed.chordsFontSize = 12;
  }
  if (typeof parsed.maxFontSizePx !== 'number') {
    parsed.maxFontSizePx = 16;
  }
  if (typeof parsed.maxLineHeight !== 'number') {
    parsed.maxLineHeight = 1.6;
  }
  if (typeof parsed.sectionMarginCap !== 'number') {
    parsed.sectionMarginCap = 28;
  }

  return {
    ...baseDefaults,
    ...(parsed as Partial<PrintSettings>),
    columns: 2,
  };
}

/**
 * Shallow-compares all fields of two PrintSettings objects.
 */
export function arePrintSettingsEqual(a: PrintSettings, b: PrintSettings): boolean {
  if (a === b) return true;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof PrintSettings>;
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

/**
 * Persist the current print settings draft to localStorage for crash recovery.
 */
export function saveDraftSettingsToStorage(draft: PrintSettings): boolean {
  try {
    const sanitized = sanitizePrintSettings(draft);
    const payload: StoredDraftPayload = {
      __savedAt: Date.now(),
      draft: sanitized,
    };
    localStorage.setItem(STORAGE_KEYS.DRAFT_SETTINGS, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove any auto-saved draft settings from localStorage.
 */
export function clearDraftSettingsFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DRAFT_SETTINGS);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load a previously auto-saved print settings draft from localStorage.
 * Returns null if no draft exists, it is corrupted/expired, or it matches `appliedSettings`.
 */
export function loadDraftSettingsFromStorage(
  appliedSettings: PrintSettings,
): { draft: PrintSettings; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRAFT_SETTINGS);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredDraftPayload> | null;
    if (!parsed || typeof parsed !== 'object' || !parsed.draft) {
      clearDraftSettingsFromStorage();
      return null;
    }

    const savedAt = typeof parsed.__savedAt === 'number' ? parsed.__savedAt : 0;
    if (savedAt > 0 && Date.now() - savedAt > DRAFT_SETTINGS_TTL_MS) {
      clearDraftSettingsFromStorage();
      return null;
    }

    const sanitizedDraft = sanitizePrintSettings(parsed.draft);
    const sanitizedApplied = sanitizePrintSettings(appliedSettings);
    if (arePrintSettingsEqual(sanitizedDraft, sanitizedApplied)) {
      clearDraftSettingsFromStorage();
      return null;
    }

    return { draft: sanitizedDraft, savedAt };
  } catch {
    clearDraftSettingsFromStorage();
    return null;
  }
}
