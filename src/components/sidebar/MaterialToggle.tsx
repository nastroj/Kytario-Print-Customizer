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
      className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 select-none ${
        isSm ? 'h-6 w-11' : 'h-7.5 w-13.5'
      } ${
        checked
          ? 'bg-zinc-900 border border-transparent'
          : 'bg-zinc-200/90 border border-zinc-300/80'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      <span
        className={`pointer-events-none inline-block rounded-full shadow-xs transition-all duration-200 ease-out transform flex items-center justify-center ${
          isSm
            ? checked
              ? 'h-4.5 w-4.5 translate-x-5 bg-white'
              : 'h-3.5 w-3.5 translate-x-1 bg-zinc-400'
            : checked
            ? 'h-5.5 w-5.5 translate-x-6.5 bg-white'
            : 'h-4.5 w-4.5 translate-x-1.25 bg-zinc-400'
        }`}
      >
        {checked && (
          <span
            className={`rounded-full bg-zinc-900 ${
              isSm ? 'w-1.5 h-1.5' : 'w-2 h-2'
            }`}
          />
        )}
      </span>
    </button>
  );
});
