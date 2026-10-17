import React, { useState } from 'react';
import { Archive, Music, Check, Layers, ChevronRight, X, Sparkles } from 'lucide-react';
import { ExtractedProject } from '../utils/zipParser';

interface ZipProjectSelectModalProps {
  isOpen: boolean;
  fileName: string;
  projects: ExtractedProject[];
  totalSongs: number;
  onSelectProject: (projectSlug: string | 'all') => void;
  onCancel: () => void;
}

export const ZipProjectSelectModal: React.FC<ZipProjectSelectModalProps> = ({
  isOpen,
  fileName,
  projects,
  totalSongs,
  onSelectProject,
  onCancel,
}) => {
  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    // Default to the project with the most songs
    return projects[0]?.slug || 'all';
  });

  if (!isOpen) return null;

  const currentSelectedProject = projects.find(p => p.slug === selectedSlug);
  const isAllSelected = selectedSlug === 'all';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zip-project-modal-title"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal Dialog Card */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl border border-black/10 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="zip-project-modal-title" className="text-base font-bold text-zinc-900">
                  Select Project to Import
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200/70 text-zinc-700">
                  {projects.length} found
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                <span className="font-medium text-zinc-700 truncate inline-block max-w-[240px] sm:max-w-xs align-bottom">
                  {fileName}
                </span>{' '}
                contains multiple songbooks. Choose which one to load:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-600 rounded-lg p-1 transition-colors cursor-pointer -mr-1 -mt-1"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 min-h-0">
          {projects.map((proj, idx) => {
            const isSelected = selectedSlug === proj.slug;
            return (
              <div
                key={proj.slug}
                onClick={() => setSelectedSlug(proj.slug)}
                onDoubleClick={() => onSelectProject(proj.slug)}
                className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-zinc-900 bg-zinc-900/[0.03] shadow-sm'
                    : 'border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/60 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200'
                  }`}>
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 truncate">
                        {proj.name}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                      <span className="font-mono text-[11px] text-zinc-400">/{proj.slug}</span>
                      {proj.description && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[180px] sm:max-w-xs">{proj.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isSelected 
                      ? 'bg-zinc-900 text-white' 
                      : 'bg-zinc-100 text-zinc-700'
                  }`}>
                    {proj.songCount} {proj.songCount === 1 ? 'song' : 'songs'}
                  </span>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected 
                      ? 'border-zinc-900 bg-zinc-900 text-white' 
                      : 'border-zinc-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Option: Combine all projects */}
          {projects.length > 1 && (
            <div
              onClick={() => setSelectedSlug('all')}
              onDoubleClick={() => onSelectProject('all')}
              className={`group relative p-3.5 rounded-xl border border-dashed transition-all cursor-pointer select-none flex items-center justify-between gap-3 mt-3 ${
                isAllSelected
                  ? 'border-zinc-900 bg-zinc-900/[0.04] shadow-sm'
                  : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50/60 bg-zinc-50/20'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isAllSelected ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-700'
                }`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900">
                      Combine All Projects
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Merged
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Merge all {projects.length} songbooks into a single combined collection
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isAllSelected 
                    ? 'bg-zinc-900 text-white' 
                    : 'bg-zinc-100 text-zinc-700'
                }`}>
                  {totalSongs} songs
                </span>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                  isAllSelected 
                    ? 'border-zinc-900 bg-zinc-900 text-white' 
                    : 'border-zinc-300 bg-white'
                }`}>
                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-400 hidden sm:block">
            Tip: Double-click any item to import immediately
          </p>
          <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSelectProject(selectedSlug)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 active:scale-98 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>
                {isAllSelected 
                  ? `Import All (${totalSongs} songs)`
                  : `Import "${currentSelectedProject?.name || 'Selected'}" (${currentSelectedProject?.songCount || 0} songs)`}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
