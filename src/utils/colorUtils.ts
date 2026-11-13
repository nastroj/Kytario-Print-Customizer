export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number; // 0..360
  s: number; // 0..100
  v: number; // 0..100
}

export const RECENT_COLORS_STORAGE_KEY = 'kytario-recent-colors-v1';
const MAX_RECENT_COLORS = 8;

export const PRINT_COLOR_PRESETS: readonly { hex: string; name: string }[] = [
  // Row 1: Ink blacks, charcoals & print grays
  { hex: '#000000', name: 'Pure Black' },
  { hex: '#1c1917', name: 'Stone Ink' },
  { hex: '#27272a', name: 'Charcoal' },
  { hex: '#57534e', name: 'Warm Slate' },
  { hex: '#71717a', name: 'Muted Gray' },
  { hex: '#a1a1aa', name: 'Silver Gray' },
  { hex: '#d4d4d8', name: 'Light Gray' },
  { hex: '#e4e4e7', name: 'Hairline Gray' },
  // Row 2: Crisp print accents
  { hex: '#2563eb', name: 'Kytario Blue' },
  { hex: '#1d4ed8', name: 'Cobalt Blue' },
  { hex: '#0284c7', name: 'Cerulean' },
  { hex: '#0f766e', name: 'Deep Teal' },
  { hex: '#059669', name: 'Forest Green' },
  { hex: '#d97706', name: 'Warm Amber' },
  { hex: '#dc2626', name: 'Crimson' },
  { hex: '#b40b24', name: 'Kytario Red' },
];

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Normalizes a hex string (#rgb, rgb, #rrggbb, rrggbb) into lowercase #rrggbb.
 * Returns null if the input is not a valid hex color.
 */
export function normalizeHex(input: string): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
    return `#${expanded.toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`;
  }
  return null;
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHex(hex) ?? '#000000';
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;

  return {
    h: Math.round(h) % 360,
    s: Math.round(s),
    v: Math.round(v),
  };
}

export function hsvToRgb(h: number, s: number, v: number): RgbColor {
  const hh = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;

  const c = vn * sn;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vn - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hh < 60) {
    rp = c;
    gp = x;
  } else if (hh < 120) {
    rp = x;
    gp = c;
  } else if (hh < 180) {
    gp = c;
    bp = x;
  } else if (hh < 240) {
    gp = x;
    bp = c;
  } else if (hh < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

export function hexToHsv(hex: string): HsvColor {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

/** Returns readable foreground color (#ffffff or #18181b) for any background hex. */
export function getContrastTextColor(hex: string): '#ffffff' | '#18181b' {
  const { r, g, b } = hexToRgb(hex);
  // Relative luminance (sRGB)
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.36 ? '#18181b' : '#ffffff';
}

export function getRecentColors(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_COLORS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === 'string' ? normalizeHex(item) : null))
      .filter((item): item is string => Boolean(item))
      .slice(0, MAX_RECENT_COLORS);
  } catch {
    return [];
  }
}

export function addRecentColor(hex: string): string[] {
  const normalized = normalizeHex(hex);
  if (!normalized) return getRecentColors();
  const current = getRecentColors().filter((c) => c !== normalized);
  const next = [normalized, ...current].slice(0, MAX_RECENT_COLORS);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}
