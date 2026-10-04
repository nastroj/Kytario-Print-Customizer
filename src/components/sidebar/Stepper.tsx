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
  const isFloat = (step % 1 !== 0) || (min % 1 !== 0) || (max % 1 !== 0) || (defaultValue % 1 !== 0);

  const parseNum = (valStr: string) => {
    return isFloat ? parseFloat(valStr) : parseInt(valStr, 10);
  };

  const formatNum = (num: number) => {
    if (isFloat) {
      return Number(num.toFixed(2)).toString();
    }
    return num.toString();
  };

  const [localStr, setLocalStr] = useState(formatNum(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalStr(formatNum(value));
    }
  }, [value, isFocused, isFloat]);

  const commitValue = (valStr: string) => {
    const num = parseNum(valStr);
    if (isNaN(num)) {
      setLocalStr(formatNum(defaultValue));
      onChange(defaultValue);
      return;
    }
    const clamped = Math.max(min, Math.min(max, num));
    const rounded = isFloat ? Math.round(clamped * 100) / 100 : clamped;
    setLocalStr(formatNum(rounded));
    if (rounded !== value) {
      onChange(rounded);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLocalStr(text);
    const parsed = parseNum(text);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(isFloat ? Math.round(parsed * 100) / 100 : parsed);
    }
  };

  const handleIncrement = () => {
    if (disabled) return;
    const current = isNaN(parseNum(localStr)) ? value : parseNum(localStr);
    const next = isFloat ? Math.min(max, Math.round((current + step) * 100) / 100) : Math.min(max, current + step);
    setLocalStr(formatNum(next));
    onChange(next);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const current = isNaN(parseNum(localStr)) ? value : parseNum(localStr);
    const prev = isFloat ? Math.max(min, Math.round((current - step) * 100) / 100) : Math.max(min, current - step);
    setLocalStr(formatNum(prev));
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
          inputMode={isFloat ? "decimal" : "numeric"}
          pattern={isFloat ? "[0-9]*[.]?[0-9]*" : "[0-9]*"}
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
