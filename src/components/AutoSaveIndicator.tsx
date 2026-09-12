import React, { useState, useEffect } from 'react';
import { Check, Loader2, CloudCheck, CloudAlert, Database } from 'lucide-react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: number | null;
  storageBackend?: 'indexeddb' | 'localstorage' | 'none';
  compact?: boolean;
  className?: string;
}

export function AutoSaveIndicator({
  status,
  lastSavedAt,
  storageBackend = 'indexeddb',
  compact = false,
  className = '',
}: AutoSaveIndicatorProps) {
  const [formattedTime, setFormattedTime] = useState<string>('');

  useEffect(() => {
    if (!lastSavedAt) {
      setFormattedTime('');
      return;
    }

    const updateTime = () => {
      const date = new Date(lastSavedAt);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      setFormattedTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  const backendName = storageBackend === 'indexeddb' ? 'IndexedDB' : 'Local Storage';
  const tooltipText = lastSavedAt
    ? `Progress auto-saved to ${backendName} at ${formattedTime}. Persists automatically across browser refreshes.`
    : `Auto-save active via ${backendName}.`;

  if (status === 'saving') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 select-none animate-in fade-in duration-150 ${className}`}
        title="Saving changes to browser storage..."
      >
        <Loader2 className="w-3 h-3 animate-spin shrink-0 text-blue-600 dark:text-blue-400" />
        {!compact && <span>Auto-saving...</span>}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 select-none ${className}`}
        title="Could not auto-save (storage quota or access restricted)"
      >
        <CloudAlert className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
        {!compact && <span>Save failed</span>}
      </div>
    );
  }

  // Saved / Idle
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-help select-none ${className}`}
      title={tooltipText}
    >
      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
      {!compact ? (
        <span className="truncate">
          Auto-saved {formattedTime ? `(${formattedTime})` : ''}
        </span>
      ) : (
        <span className="text-[10px] font-mono opacity-80">{formattedTime || 'Saved'}</span>
      )}
    </div>
  );
}
