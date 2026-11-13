import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, Music, Check, ChevronRight, X, Loader2 } from 'lucide-react';
import { ProjectSongbookChoice } from '../utils/api';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ProjectSongbookSelectModalProps {
  isOpen: boolean;
  projectTitle: string;
  projectSlug: string;
  songbooks: ProjectSongbookChoice[];
  onSelectSongbook: (songbook: ProjectSongbookChoice) => void;
  onCancel: () => void;
}

export const ProjectSongbookSelectModal: React.FC<ProjectSongbookSelectModalProps> = ({
  isOpen,
  projectTitle,
  projectSlug,
  songbooks,
  onSelectSongbook,
  onCancel,
}) => {
  const [selectedToken, setSelectedToken] = useState<string>(() => songbooks[0]?.token || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, {
    active: isOpen,
    onEscape: () => {
      if (!isSubmitting) onCancel();
    },
  });

  useEffect(() => {
    if (isOpen && songbooks.length > 0) {
      setIsSubmitting(false);
      setSelectedToken(songbooks[0].token);
    }
  }, [isOpen, songbooks]);

  if (!isOpen) return null;

  const selectedSongbook =
    songbooks.find((sb) => sb.token === selectedToken) || songbooks[0] || null;

  const handleConfirm = (songbookToLoad?: ProjectSongbookChoice) => {
    if (isSubmitting) return;
    const target = songbookToLoad || selectedSongbook;
    if (!target) return;
    setIsSubmitting(true);
    onSelectSongbook(target);
  };

  const displayProjectLabel =
    projectTitle && projectTitle !== projectSlug ? projectTitle : `projects/${projectSlug}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-songbook-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={() => {
          if (!isSubmitting) onCancel();
        }}
      />

      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl border border-black/10 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 pb-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="project-songbook-modal-title"
                  className="text-base font-bold text-zinc-900"
                >
                  Choose Songbook to Import
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200/70 text-zinc-700">
                  {songbooks.length} found
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                Project{' '}
                <span className="font-medium text-zinc-800 truncate inline-block max-w-[220px] sm:max-w-xs align-bottom">
                  {displayProjectLabel}
                </span>{' '}
                contains multiple songbooks. Select which one to load:
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-600 rounded-lg p-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed -mr-1 -mt-1"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 min-h-0">
          {songbooks.map((sb) => {
            const isSelected = selectedToken === sb.token;
            const displayUrl = (sb.url || `https://kytario.com/${sb.token}`)
              .replace(/^https?:\/\//i, '')
              .replace(/^www\./i, '');

            return (
              <div
                key={sb.token}
                onClick={() => {
                  if (!isSubmitting) setSelectedToken(sb.token);
                }}
                onDoubleClick={() => handleConfirm(sb)}
                className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                  isSubmitting ? 'pointer-events-none opacity-70' : ''
                } ${
                  isSelected
                    ? 'border-zinc-900 bg-zinc-900/[0.03] shadow-sm'
                    : 'border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/60 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200'
                    }`}
                  >
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-zinc-900 truncate">
                      {sb.name || sb.token}
                    </div>
                    <div className="text-xs font-mono text-[11px] text-zinc-500 truncate mt-0.5">
                      {displayUrl}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 sm:p-5 border-t border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-400 hidden sm:block">
              Tip: Double-click any item to import immediately
            </p>
            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !selectedSongbook}
                onClick={() => handleConfirm()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 active:scale-98 transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-75 disabled:cursor-wait"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading songbook...</span>
                  </>
                ) : (
                  <>
                    <span className="truncate max-w-[220px]">
                      Import &ldquo;{selectedSongbook?.name || selectedSongbook?.token}&rdquo;
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
