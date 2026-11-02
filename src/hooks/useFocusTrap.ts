import { useEffect, type RefObject } from 'react';

/**
 * Selector matching all natively focusable elements that are currently
 * visible. Kept in sync with common a11y dialog implementations:
 * links, buttons, inputs, selects, textareas and any element with a
 * non-negative tabindex.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface UseFocusTrapOptions {
  /** Whether the trap is currently active (e.g. dialog open). */
  active: boolean;
  /** Handler invoked when the user presses Escape while the trap is active. */
  onEscape?: () => void;
  /**
   * Element to focus when the trap becomes active. Defaults to the first
   * focusable element inside `containerRef`.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** If true, do not steal focus on activation (used for passive overlays). */
  deferInitialFocus?: boolean;
}

/**
 * Traps keyboard focus inside `containerRef` while `active` is true:
 *
 * - Moves focus into the container on open (restoring it to the previously
 *   focused element on close).
 * - Cycles Tab / Shift+Tab within the container's focusable descendants.
 * - Calls `onEscape` when Escape is pressed.
 * - Locks body scrolling while active.
 *
 * This implements the WAI-ARIA "Dialog (Modal)" keyboard pattern.
 */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  { active, onEscape, initialFocusRef, deferInitialFocus }: UseFocusTrapOptions,
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Lock background interaction while the modal is open.
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusables = (): HTMLElement[] =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el): el is HTMLElement =>
          el instanceof HTMLElement && (el.offsetParent !== null || el === document.activeElement),
      );

    // Move focus into the dialog (unless the caller opted out).
    let cleanupFocusTimer = () => {};
    if (!deferInitialFocus) {
      const target = initialFocusRef?.current ?? getFocusables()[0] ?? container;
      // Slight delay lets mount animations settle before focus moves.
      const focusTimer = window.setTimeout(() => target.focus(), 0);
      cleanupFocusTimer = () => window.clearTimeout(focusTimer);
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = getFocusables();
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      cleanupFocusTimer();
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = prevBodyOverflow;
      // Restore focus to the trigger element when the dialog closes.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
