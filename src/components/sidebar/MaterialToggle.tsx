import React from 'react';

export interface MaterialToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

/**
 * Material You (Material 3) styled Toggle Switch component.
 * Features:
 * - Fluid pill track with Material You responsive color scheme
 * - Floating thumb with scale/translate animation
 * - Accessible keyboard navigation & ARIA switch role
 * - Right-aligned compact footprint
 */
export const MaterialToggle = React.memo(function MaterialToggle({
  id,
  checked,
  onChange,
  disabled = false,
  size = 'md',
  ariaLabel,
  className = '',
}: MaterialToggleProps) {
  const isSm = size === 'sm';

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 select-none ${
        isSm ? 'h-5 w-9' : 'h-6 w-11'
      } ${
        checked
          ? 'bg-zinc-900 dark:bg-zinc-100 border border-transparent'
          : 'bg-zinc-200/90 dark:bg-zinc-700/80 border border-zinc-300/80 dark:border-zinc-600'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      <span
        className={`pointer-events-none inline-block rounded-full shadow-xs transition-all duration-200 ease-out transform flex items-center justify-center ${
          isSm
            ? checked
              ? 'h-3.5 w-3.5 translate-x-4.5 bg-white dark:bg-zinc-900'
              : 'h-3 w-3 translate-x-0.5 bg-zinc-400 dark:bg-zinc-300'
            : checked
            ? 'h-4.5 w-4.5 translate-x-5.5 bg-white dark:bg-zinc-900'
            : 'h-3.5 w-3.5 translate-x-1 bg-zinc-400 dark:bg-zinc-300'
        }`}
      >
        {checked && (
          <span
            className={`rounded-full bg-zinc-900 dark:bg-zinc-100 ${
              isSm ? 'w-1 h-1' : 'w-1.5 h-1.5'
            }`}
          />
        )}
      </span>
    </button>
  );
});
