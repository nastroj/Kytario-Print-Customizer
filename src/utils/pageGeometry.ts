/**
 * Page geometry helpers: physical page dimensions and exact per-page margins
 * (including Book Mode with alternating inner/outer margins).
 */
import { PrintSettings } from '../types';
import { MM_TO_PX, INCH_TO_PX } from './constants';

export interface PageMarginsMm {
  top: number;
  bottom: number;
  left: number;
  right: number;
  inner?: number;
  outer?: number;
}

/** Default margin values in millimeters. */
const DEFAULT_TOP_BOTTOM = 6;
const DEFAULT_LEFT_RIGHT = 5;
const DEFAULT_INNER = 15;
const DEFAULT_OUTER = 5;

/**
 * Calculates exact page margins in millimeters for any page index,
 * fully supporting separate margins (top, bottom, left, right) and
 * Book Mode (facing pages with alternating inner/outer margins).
 *
 * In Book Mode:
 * - Page 1 (index 0, odd): Outer is Left, Inner is Right
 * - Page 2 (index 1, even): Inner is Left, Outer is Right
 * - Page 3 (index 2, odd): Outer is Left, Inner is Right
 */
export function getPageMargins(settings?: Partial<PrintSettings>, pageIndex: number = 0): PageMarginsMm {
  const legacyTopBottom = settings?.pageMargin ? Math.round(settings.pageMargin * 1.2) : DEFAULT_TOP_BOTTOM;
  const legacyLeftRight = settings?.pageMargin ?? DEFAULT_LEFT_RIGHT;

  const top = settings?.pageMarginTop ?? settings?.pageMarginTopBottom ?? legacyTopBottom;
  const bottom = settings?.pageMarginBottom ?? settings?.pageMarginTopBottom ?? legacyTopBottom;

  let left: number;
  let right: number;
  let inner: number | undefined;
  let outer: number | undefined;

  if (settings?.bookMode) {
    inner = settings?.pageMarginInner ?? settings?.pageMarginLeftRight ?? settings?.pageMargin ?? DEFAULT_INNER;
    outer = settings?.pageMarginOuter ?? settings?.pageMarginLeftRight ?? settings?.pageMargin ?? DEFAULT_OUTER;
    // Page 1 (pageIndex 0, odd / recto): spine/binding is on the Left (Inner), outer edge is on the Right (Outer)
    // Page 2 (pageIndex 1, even / verso): outer edge is on the Left (Outer), spine/binding is on the Right (Inner)
    const isOddPage = pageIndex % 2 === 0;
    left = isOddPage ? inner : outer;
    right = isOddPage ? outer : inner;
  } else {
    left = settings?.pageMarginLeft ?? settings?.pageMarginLeftRight ?? legacyLeftRight;
    right = settings?.pageMarginRight ?? settings?.pageMarginLeftRight ?? legacyLeftRight;
  }

  return { top, bottom, left, right, inner, outer };
}

export interface PageDimensionsPx {
  width: number;
  height: number;
}

/**
 * Returns the usable page size in CSS pixels for the given format/orientation,
 * optionally reduced by the provided margins (in millimeters).
 */
export function getPageDimensionsPx(
  pageFormat: 'A4' | 'A5' | 'Letter' | undefined,
  orientation: 'portrait' | 'landscape' | undefined,
  marginsMm?: { left: number; right: number; top: number; bottom: number }
): PageDimensionsPx {
  const isLand = orientation === 'landscape';

  let totalWidth: number;
  let totalHeight: number;

  if (pageFormat === 'A5') {
    totalWidth = (isLand ? 210 : 148) * MM_TO_PX;
    totalHeight = (isLand ? 148 : 210) * MM_TO_PX;
  } else if (pageFormat === 'Letter') {
    totalWidth = (isLand ? 11 : 8.5) * INCH_TO_PX;
    totalHeight = (isLand ? 8.5 : 11) * INCH_TO_PX;
  } else {
    // A4 (default)
    totalWidth = (isLand ? 297 : 210) * MM_TO_PX;
    totalHeight = (isLand ? 210 : 297) * MM_TO_PX;
  }

  if (marginsMm) {
    totalWidth -= (marginsMm.left + marginsMm.right) * MM_TO_PX;
    totalHeight -= (marginsMm.top + marginsMm.bottom) * MM_TO_PX;
  }

  return { width: totalWidth, height: totalHeight };
}
