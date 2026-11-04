import React, { useRef } from 'react';
import { History, Trash2, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface LoadLastSongbookDialogProps {
  isOpen: boolean;
  title: string;
  songCount: number;
  onLoad: () => void;
  onDismiss: () => void;
  onForget: () => void;
}

/**
 * Prompt shown after a page reload when the app remembers the last used
 * songbook. Lets the user load it back, dismiss (import something else),
 * or forget the remembered songbook entirely.
 */
export function LoadLastSongbookDialog({
  isOpen,
  title,
  songCount,
  onLoad,
  onDismiss,
  onForget,
}: LoadLastSongbookDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const loadRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(dialogRef, {
    active: isOpen,
    onEscape: onDismiss,
    initialFocusRef: loadRef,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onDismiss}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="load-last-songbook-title"
        aria-describedby="load-last-songbook-description"
        className="relative bg-white rounded-2xl shadow-2xl border border-black/10 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 z-10"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
            <History className="w-5 h-5 text-zinc-700" />
          </div>
          <div className="min-w-0">
            <h3 id="load-last-songbook-title" className="text-base font-bold text-zinc-900">
              Load Last Songbook?
            </h3>
            <p id="load-last-songbook-description" className="text-xs sm:text-sm text-zinc-600 mt-1">
              The app remembers your last used songbook{' '}
              <span className="font-semibold text-zinc-800 break-words">&ldquo;{title}&rdquo;</span>{' '}
              ({songCount} {songCount === 1 ? 'song' : 'songs'}). Would you like to continue where
              you left off?
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
          <button
            ref={loadRef}
            type="button"
            onClick={onLoad}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#b40b24] hover:bg-[#9b091f] active:bg-[#82071a] transition-colors cursor-pointer shadow-sm"
          >
            Yes, Load &ldquo;{title}&rdquo;
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Import Another
          </button>
          <button
            type="button"
            onClick={onForget}
            title="Forget the remembered songbook"
            className="px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Forget
          </button>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
