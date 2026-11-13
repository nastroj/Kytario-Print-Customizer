import React, { useState, useEffect } from 'react';
import { ColorPickerModal } from './ColorPickerModal';
import { normalizeHex } from '../../utils/colorUtils';

export interface ColorDotInputProps {
  id: string;
  value: string;
  onChange: (color: string) => void;
  label?: string;
  pickerTitle?: string;
  defaultColor?: string;
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
  pickerTitle,
  defaultColor,
  title = 'Click to change color',
  disabled = false,
  size = 'md',
  className = '',
}: ColorDotInputProps) {
  const [localColor, setLocalColor] = useState(value);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    setLocalColor(value);
  }, [value]);

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  const resolvedTitle = pickerTitle || label || title;
  const displayHex = (normalizeHex(localColor) ?? localColor).toUpperCase();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsPickerOpen(true);
        }}
        className={`relative ${sizeClasses} rounded-full border border-black/15 shrink-0 hover:scale-110 active:scale-95 transition-transform shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-1 ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{ backgroundColor: localColor }}
        title={`${title} (${displayHex})`}
        aria-label={`${resolvedTitle}: ${displayHex}`}
        aria-haspopup="dialog"
        aria-expanded={isPickerOpen}
      />
      {label && (
        <label
          htmlFor={id}
          className={`text-xs font-semibold text-zinc-800 select-none truncate ${
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title={title}
        >
          {label}
        </label>
      )}
      <ColorPickerModal
        isOpen={isPickerOpen}
        title={resolvedTitle}
        value={localColor}
        defaultColor={defaultColor}
        onConfirm={(nextHex) => {
          setLocalColor(nextHex);
          setIsPickerOpen(false);
          if (nextHex !== value) {
            onChange(nextHex);
          }
        }}
        onCancel={() => setIsPickerOpen(false)}
      />
    </div>
  );
});
