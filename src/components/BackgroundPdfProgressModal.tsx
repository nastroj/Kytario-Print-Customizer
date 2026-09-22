import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronUp, FileDown, Sparkles, RotateCw } from 'lucide-react';
import { GenerationProgress, GeneratedFileInfo } from '../hooks/useBackgroundPdfGenerator';

interface BackgroundPdfProgressModalProps {
  isGenerating: boolean;
  progress: GenerationProgress | null;
  error: string | null;
  lastGenerated: GeneratedFileInfo | null;
  isPdfReady?: boolean;
  onDownloadAgain?: () => void;
  onRegenerate?: () => void;
  onCancel: () => void;
  onClearError: () => void;
  onClearLastGenerated: () => void;
}

export const BackgroundPdfProgressModal: React.FC<BackgroundPdfProgressModalProps> = ({
  isGenerating,
  progress,
  error,
  lastGenerated,
  isPdfReady = false,
  onDownloadAgain,
  onRegenerate,
  onCancel,
  onClearError,
  onClearLastGenerated,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // If nothing is happening, don't render anything
  if (!isGenerating && !error && !lastGenerated) {
    return null;
  }

  return (
    <div
      id="background-pdf-status-container"
      className="fixed bottom-4 right-4 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-96 font-sans print:hidden animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      {/* 1. Active Generation State */}
      {isGenerating && progress && (
        <div
          id="background-pdf-generating-card"
          className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/80 border-b border-black/5 dark:border-zinc-700/60">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-6 h-6">
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                <Sparkles className="w-2.5 h-2.5 text-amber-400 absolute -top-0.5 -right-0.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  Generating PDF
                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                    Web Worker
                  </span>
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Background Client Thread</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                id="bg-pdf-minimize-btn"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors"
                title={isMinimized ? 'Expand progress' : 'Minimize to corner'}
                aria-label={isMinimized ? 'Expand progress' : 'Minimize to corner'}
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                type="button"
                id="bg-pdf-cancel-btn"
                onClick={onCancel}
                className="p-1 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Cancel background generation"
                aria-label="Cancel background generation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Collapsible Content */}
          {!isMinimized && (
            <div className="p-4 space-y-3">
              {/* Progress and percentage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[70%]">
                    {progress.message}
                  </span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {progress.percent}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-black/5 dark:border-zinc-700/50">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(3, progress.percent)}%` }}
                  />
                </div>
              </div>

              {/* Non-blocking friendly tip */}
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                Running in the background. You can freely adjust settings or browse preview while this generates.
              </p>

              {/* Cancel Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  id="bg-pdf-abort-btn"
                  onClick={onCancel}
                  className="text-xs px-3 py-1.5 text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
                >
                  Cancel Generation
                </button>
              </div>
            </div>
          )}

          {/* Minimized strip */}
          {isMinimized && (
            <div className="px-4 py-2 flex items-center justify-between text-xs bg-white dark:bg-zinc-900">
              <span className="text-zinc-600 dark:text-zinc-300 font-medium truncate max-w-[70%]">
                {progress.percent}% - {progress.message}
              </span>
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="text-amber-600 dark:text-amber-400 hover:underline text-[11px] font-semibold"
              >
                Expand
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Success Notification */}
      {!isGenerating && lastGenerated && (
        <div
          id="background-pdf-success-card"
          className="bg-white dark:bg-zinc-900 border border-emerald-500/30 dark:border-emerald-500/30 rounded-xl shadow-2xl p-3.5 backdrop-blur-xl flex items-start gap-3"
        >
          <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              PDF Generated & Downloaded
              {isPdfReady && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded">
                  Ready in Cache
                </span>
              )}
            </h4>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate mt-0.5 font-medium">
              {lastGenerated.filename}
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              {lastGenerated.pageCount} pages • {lastGenerated.sizeFormatted} • Saved to Downloads
            </p>

            {isPdfReady ? (
              <div className="flex items-center gap-2 pt-2.5 mt-2 border-t border-black/5 dark:border-zinc-800">
                {onDownloadAgain && (
                  <button
                    type="button"
                    id="bg-pdf-download-again-btn"
                    onClick={onDownloadAgain}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-2xs transition-colors cursor-pointer"
                    title="Download ready PDF again without regenerating"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download Again</span>
                  </button>
                )}
                {onRegenerate && (
                  <button
                    type="button"
                    id="bg-pdf-force-regenerate-btn"
                    onClick={onRegenerate}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Re-run PDF generation from scratch"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 pt-1.5 border-t border-black/5 dark:border-zinc-800 flex items-center gap-1">
                <span>Changes made since generation • Next download will regenerate</span>
              </p>
            )}
          </div>

          <button
            type="button"
            id="bg-pdf-dismiss-success-btn"
            onClick={onClearLastGenerated}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Error Notification */}
      {!isGenerating && error && (
        <div
          id="background-pdf-error-card"
          className="bg-white dark:bg-zinc-900 border border-rose-500/30 dark:border-rose-500/30 rounded-xl shadow-2xl p-3.5 backdrop-blur-xl flex items-start gap-3"
        >
          <div className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">PDF Generation Failed</h4>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
              {error}
            </p>
          </div>

          <button
            type="button"
            id="bg-pdf-dismiss-error-btn"
            onClick={onClearError}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0"
            title="Dismiss error"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
