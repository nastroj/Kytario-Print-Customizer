import React, { useState, useEffect, useRef } from 'react';

export interface ColorDotInputProps {
  id: string;
  value: string;
  onChange: (color: string) => void;
  label?: string;
  title?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ColorDotInput = React.memo(function ColorDotInput({
  id,
  value,
  onChange,
  label,
  title = 'Click to change color',
  disabled = false,
  size = 'md',
  className = '',
}: ColorDotInputProps) {
  const [localColor, setLocalColor] = useState(value);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalColor(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextColor = e.target.value;
    setLocalColor(nextColor);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange(nextColor);
    }, 120);
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (localColor !== value) {
      onChange(localColor);
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`relative ${sizeClasses} rounded-full border border-black/15 dark:border-zinc-600 shrink-0 hover:scale-110 active:scale-95 transition-transform overflow-hidden shadow-2xs ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{ backgroundColor: localColor }}
        title={title}
      >
        <input
          type="color"
          id={id}
          value={localColor}
          disabled={disabled}
          onChange={handleColorChange}
          onBlur={handleBlur}
          className="absolute opacity-0 inset-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
          title={title}
          aria-label={label || title}
        />
      </div>
      {label && (
        <label
          htmlFor={id}
          className={`text-xs font-semibold text-zinc-800 dark:text-zinc-200 select-none truncate ${
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title={title}
        >
          {label}
        </label>
      )}
    </div>
  );
});
