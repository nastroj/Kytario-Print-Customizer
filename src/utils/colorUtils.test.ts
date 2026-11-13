import { describe, expect, it } from 'vitest';
import {
  getContrastTextColor,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  hsvToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsv,
} from './colorUtils';

describe('colorUtils', () => {
  it('normalizes 3-digit and 6-digit hex strings', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('F0A')).toBe('#ff00aa');
    expect(normalizeHex(' #2563EB ')).toBe('#2563eb');
    expect(normalizeHex('invalid')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
  });

  it('roundtrips hex -> rgb -> hex accurately', () => {
    const samples = ['#000000', '#ffffff', '#2563eb', '#b40b24', '#1c1917', '#e4e4e7'];
    for (const hex of samples) {
      const rgb = hexToRgb(hex);
      expect(rgbToHex(rgb.r, rgb.g, rgb.b)).toBe(hex);
    }
  });

  it('converts between RGB and HSV cleanly', () => {
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 100, v: 100 });
    expect(rgbToHsv(0, 255, 0)).toEqual({ h: 120, s: 100, v: 100 });
    expect(rgbToHsv(0, 0, 255)).toEqual({ h: 240, s: 100, v: 100 });
    expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 });
    expect(rgbToHsv(255, 255, 255)).toEqual({ h: 0, s: 0, v: 100 });

    expect(hsvToRgb(0, 100, 100)).toEqual({ r: 255, g: 0, b: 0 });
    expect(hsvToRgb(240, 100, 100)).toEqual({ r: 0, g: 0, b: 255 });
    expect(hsvToHex(221, 84, 92)).toBe('#2664eb');
    expect(hexToHsv('#2563eb')).toEqual({ h: 221, s: 84, v: 92 });
  });

  it('computes legible contrast foreground colors', () => {
    expect(getContrastTextColor('#000000')).toBe('#ffffff');
    expect(getContrastTextColor('#2563eb')).toBe('#ffffff');
    expect(getContrastTextColor('#ffffff')).toBe('#18181b');
    expect(getContrastTextColor('#e4e4e7')).toBe('#18181b');
  });
});
