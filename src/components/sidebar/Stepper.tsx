import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface StepperProps {
  id: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  suffix?: string;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const Stepper = React.memo(function Stepper({
  id,
  value,
  min = 1,
  max = 100,
  step = 1,
  defaultValue = 12,
  suffix = 'px',
  onChange,
  disabled = false,
  className = '',
  ariaLabel,
}: StepperProps) {
  const [localStr, setLocalStr] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalStr(value.toString());
    }
  }, [value, isFocused]);

  const commitValue = (valStr: string) => {
    const num = parseInt(valStr, 10);
    if (isNaN(num)) {
      setLocalStr(defaultValue.toString());
      onChange(defaultValue);
      return;
    }
    const clamped = Math.max(min, Math.min(max, num));
    setLocalStr(clamped.toString());
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLocalStr(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
  };

  const handleIncrement = () => {
    if (disabled) return;
    const current = isNaN(parseInt(localStr, 10)) ? value : parseInt(localStr, 10);
    const next = Math.min(max, current + step);
    setLocalStr(next.toString());
    onChange(next);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const current = isNaN(parseInt(localStr, 10)) ? value : parseInt(localStr, 10);
    const prev = Math.max(min, current - step);
    setLocalStr(prev.toString());
    onChange(prev);
  };

  return (
    <div
      className={`flex items-center border border-black/10 dark:border-zinc-700/60 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 rounded-lg overflow-hidden shrink-0 shadow-2xs focus-within:ring-1 focus-within:ring-zinc-800 dark:focus-within:ring-zinc-400 transition-colors ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 active:bg-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
        title="Decrease value"
        aria-label={ariaLabel ? `Decrease ${ariaLabel}` : 'Decrease value'}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={disabled}
          value={localStr}
          onFocus={(e) => {
            setIsFocused(true);
            e.target.select();
          }}
          onChange={handleInputChange}
          onBlur={() => {
            setIsFocused(false);
            commitValue(localStr);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitValue(localStr);
              e.currentTarget.blur();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              handleIncrement();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              handleDecrement();
            }
          }}
          className="w-8 text-center py-0.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-transparent focus:outline-none"
          aria-label={ariaLabel || 'Numeric value'}
        />
        {suffix && (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 -ml-1 pr-1 pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 active:bg-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
        title="Increase value"
        aria-label={ariaLabel ? `Increase ${ariaLabel}` : 'Increase value'}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});
