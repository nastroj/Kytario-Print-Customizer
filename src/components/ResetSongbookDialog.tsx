import React, { useRef } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ResetSongbookDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Accessible confirmation dialog (role="alertdialog", aria-modal) using the
 * shared focus-trap hook: Tab cycling, Escape-to-close, initial focus on the
 * Cancel button and focus restoration to the trigger on close.
 */
export function ResetSongbookDialog({ isOpen, onCancel, onConfirm }: ResetSongbookDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(dialogRef, {
    active: isOpen,
    onEscape: onCancel,
    initialFocusRef: cancelRef,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-songbook-title"
        aria-describedby="reset-songbook-description"
        className="relative bg-white rounded-2xl shadow-2xl border border-black/10 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 z-10"
      >
        <h3 id="reset-songbook-title" className="text-base font-bold text-zinc-900">
          Change Songbook?
        </h3>
        <p id="reset-songbook-description" className="text-xs sm:text-sm text-zinc-600">
          Are you sure you want to change the songbook? Any unsaved layout adjustments or current
          songbook data will be cleared and you will return to the upload screen.
        </p>
        <div className="flex justify-end gap-2.5 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#b40b24] hover:bg-[#9b091f] active:bg-[#82071a] transition-colors cursor-pointer shadow-sm"
          >
            Yes, Change Songbook
          </button>
        </div>
      </div>
    </div>
  );
}
