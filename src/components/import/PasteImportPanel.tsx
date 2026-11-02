import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface PasteImportPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

/**
 * Paste-JSON import panel with an accessible labelled textarea and a
 * live character-count hint.
 */
export function PasteImportPanel({ value, onChange, onSubmit, isProcessing }: PasteImportPanelProps) {
  const isEmpty = value.trim().length === 0;

  return (
    <div className="space-y-4" role="group" aria-label="Paste songbook JSON">
      <label htmlFor="paste-json-input" className="sr-only">
        Kytario songbook JSON payload
      </label>
      <textarea
        id="paste-json-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your Kytario songbook JSON payload here..."
        rows={7}
        disabled={isProcessing}
        aria-describedby="paste-json-help"
        className="w-full rounded-lg border border-black/10 p-3 text-xs font-mono focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800 resize-none bg-zinc-50 disabled:opacity-60"
      />
      <p id="paste-json-help" className="text-[11px] text-zinc-500 ml-1" aria-live="polite">
        {value.length > 0
          ? `${value.length.toLocaleString()} characters pasted`
          : 'Copy the JSON from kytario.com and paste it above.'}
      </p>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isProcessing || isEmpty}
        aria-busy={isProcessing}
        className={`w-full text-white text-xs sm:text-sm font-bold py-2.5 sm:py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm ${
          isProcessing || isEmpty
            ? 'bg-zinc-800 pointer-events-none opacity-70'
            : 'bg-zinc-900 hover:bg-zinc-800 cursor-pointer'
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
        )}
        <span>{isProcessing ? 'Processing Songbook...' : 'Load Pasted Songbook'}</span>
      </button>
    </div>
  );
}
