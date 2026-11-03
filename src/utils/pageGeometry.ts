/**
 * Page geometry helpers: margin resolution for single and book (facing-page)
 * layouts. Shared by the on-screen preview, the layout engine, and the PDF worker.
 */
import type { PrintSettings } from '../types';

export interface PageMarginsMm {
  top: number;
  bottom: number;
  left: number;
  right: number;
  inner?: number;
  outer?: number;
}

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
export function getPageMargins(
  settings?: Partial<PrintSettings>,
  pageIndex: number = 0,
): PageMarginsMm {
  const defaultTopBottom = 6;
  const defaultLeftRight = 5;
  const defaultInner = 15;
  const defaultOuter = 5;

  const top =
    settings?.pageMarginTop ??
    settings?.pageMarginTopBottom ??
    (settings?.pageMargin ? Math.round(settings.pageMargin * 1.2) : defaultTopBottom);
  const bottom =
    settings?.pageMarginBottom ??
    settings?.pageMarginTopBottom ??
    (settings?.pageMargin ? Math.round(settings.pageMargin * 1.2) : defaultTopBottom);

  let left = defaultLeftRight;
  let right = defaultLeftRight;
  let inner: number | undefined;
  let outer: number | undefined;

  if (settings?.bookMode) {
    inner =
      settings?.pageMarginInner ??
      settings?.pageMarginLeftRight ??
      settings?.pageMargin ??
      defaultInner;
    outer =
      settings?.pageMarginOuter ??
      settings?.pageMarginLeftRight ??
      settings?.pageMargin ??
      defaultOuter;
    // Page 1 (pageIndex 0, odd / recto): spine/binding is on the Left (Inner), outer edge is on the Right (Outer)
    // Page 2 (pageIndex 1, even / verso): outer edge is on the Left (Outer), spine/binding is on the Right (Inner)
    const isOddPage = pageIndex % 2 === 0;
    left = isOddPage ? inner : outer;
    right = isOddPage ? outer : inner;
  } else {
    left =
      settings?.pageMarginLeft ??
      settings?.pageMarginLeftRight ??
      settings?.pageMargin ??
      defaultLeftRight;
    right =
      settings?.pageMarginRight ??
      settings?.pageMarginLeftRight ??
      settings?.pageMargin ??
      defaultLeftRight;
  }

  return { top, bottom, left, right, inner, outer };
}
