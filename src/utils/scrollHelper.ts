/**
 * Scrolls the sidebar container to ensure the entire uncollapsed section
 * is visible in view. If the section is taller than the viewport, it aligns the top
 * of the section near the top so the user can easily interact from the start.
 * Uses instant 'auto' behavior to avoid fighting CSS layout animations.
 */
export function scrollSectionIntoView(element: HTMLElement | null, delayMs = 30): void {
  if (!element || typeof window === 'undefined') return;

  setTimeout(() => {
    if (!element.isConnected) return;

    // Find the nearest scrollable parent container in the sidebar
    let container = element.parentElement;
    while (container && container !== document.body) {
      const overflowY = window.getComputedStyle(container).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        break;
      }
      container = container.parentElement;
    }

    if (!container || container === document.body) {
      element.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const elemRect = element.getBoundingClientRect();

    const elemTopRelativeToContainer = elemRect.top - containerRect.top + container.scrollTop;
    const elemHeight = element.offsetHeight;
    const containerHeight = container.clientHeight;

    const padding = 12;

    if (elemHeight <= containerHeight) {
      // The entire uncollapsed section fits within the container height
      const targetScrollTop = elemTopRelativeToContainer - padding;
      const maxScrollNeeded = elemTopRelativeToContainer + elemHeight - containerHeight + padding;

      // If bottom overflows container bottom, scroll down enough to see the whole section
      // Otherwise if top is above container top, scroll up enough to see top
      if (elemRect.bottom > containerRect.bottom) {
        container.scrollTo({
          top: Math.max(0, maxScrollNeeded),
          left: container.scrollLeft, // Preserve horizontal scroll
          behavior: 'auto',
        });
      } else if (elemRect.top < containerRect.top) {
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          left: container.scrollLeft, // Preserve horizontal scroll
          behavior: 'auto',
        });
      }
    } else {
      // The section is taller than the container: align its top near the top of the container
      const targetScrollTop = elemTopRelativeToContainer - padding;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        left: container.scrollLeft, // Preserve horizontal scroll
        behavior: 'auto',
      });
    }
  }, delayMs);
}
