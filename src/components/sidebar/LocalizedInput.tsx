import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface LocalizedInputProps {
  id?: string;
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  title?: string;
  disabled?: boolean;
  type?: string;
  debounceMs?: number;
  ariaLabel?: string;
}

export const LocalizedInput = React.memo(function LocalizedInput({
  id,
  value,
  onChange,
  placeholder,
  className = '',
  title,
  disabled = false,
  type = 'text',
  debounceMs = 200,
  ariaLabel,
}: LocalizedInputProps) {
  const [localVal, setLocalVal] = useState<string>(value ?? '');
  const isFocusedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValRef = useRef<string>(value ?? '');

  // Synchronize when external value changes and not actively focused
  useEffect(() => {
    latestValRef.current = value ?? '';
    if (!isFocusedRef.current) {
      setLocalVal(value ?? '');
    }
  }, [value]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const flush = useCallback((valToCommit: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (valToCommit !== latestValRef.current) {
      latestValRef.current = valToCommit;
      onChange(valToCommit);
    }
  }, [onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setLocalVal(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flush(nextVal);
    }, debounceMs);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    flush(localVal);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      flush(localVal);
    }
  };

  return (
    <input
      id={id}
      type={type}
      value={localVal}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      title={title}
      disabled={disabled}
      aria-label={ariaLabel || title || placeholder}
    />
  );
});

export interface LocalizedTextareaProps {
  id?: string;
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  title?: string;
  disabled?: boolean;
  rows?: number;
  debounceMs?: number;
  ariaLabel?: string;
}

export const LocalizedTextarea = React.memo(function LocalizedTextarea({
  id,
  value,
  onChange,
  placeholder,
  className = '',
  title,
  disabled = false,
  rows = 2,
  debounceMs = 250,
  ariaLabel,
}: LocalizedTextareaProps) {
  const [localVal, setLocalVal] = useState<string>(value ?? '');
  const isFocusedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValRef = useRef<string>(value ?? '');

  useEffect(() => {
    latestValRef.current = value ?? '';
    if (!isFocusedRef.current) {
      setLocalVal(value ?? '');
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const flush = useCallback((valToCommit: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (valToCommit !== latestValRef.current) {
      latestValRef.current = valToCommit;
      onChange(valToCommit);
    }
  }, [onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setLocalVal(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flush(nextVal);
    }, debounceMs);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    flush(localVal);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  return (
    <textarea
      id={id}
      rows={rows}
      value={localVal}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      title={title}
      disabled={disabled}
      aria-label={ariaLabel || title || placeholder}
    />
  );
});
