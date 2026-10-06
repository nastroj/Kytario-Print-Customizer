import React from 'react';
import { Loader2, Music } from 'lucide-react';

interface ProgressBarProps {
  progress?: number; // 0 to 100, or undefined for indeterminate
  active: boolean;
  statusText?: string;
  subText?: string;
  variant?: 'top-bar' | 'toast' | 'overlay';
}

export function ProgressBar({
  progress,
  active,
  statusText = 'Processing...',
  subText,
  variant = 'top-bar'
}: ProgressBarProps) {
  if (!active) return null;

  if (variant === 'top-bar') {
    const isDeterminate = typeof progress === 'number';
    const clampedProgress = isDeterminate ? Math.min(100, Math.max(0, progress)) : null;

    return (
      <div 
        id="global-progress-bar"
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none print:hidden h-1.5 bg-transparent overflow-hidden"
      >
        {isDeterminate ? (
          <div 
            className="h-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 shadow-[0_0_10px_rgba(245,158,11,0.6)] transition-all duration-300 ease-out"
            style={{ width: `${clampedProgress}%` }}
          />
        ) : (
          <div className="h-full w-full bg-zinc-200/50 relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-amber-500 via-zinc-900 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-indeterminate-bar rounded-full" />
          </div>
        )}
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div 
        id="processing-toast"
        className="fixed top-4 right-4 z-40 print:hidden flex items-center gap-3 bg-zinc-900/95 text-white px-4 py-2.5 rounded-lg shadow-2xl border border-zinc-700/80 backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-top-2 text-xs"
      >
        <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
        <div className="flex flex-col">
          <span className="font-semibold text-zinc-100">{statusText}</span>
          {subText && <span className="text-[10px] text-zinc-400">{subText}</span>}
        </div>
      </div>
    );
  }

  
  // Overlay variant (active spinner & dynamic indicator for JSON loading & songbook processing)
  const isDeterminate = typeof progress === 'number';
  const clampedProgress = isDeterminate ? Math.min(100, Math.max(0, progress)) : null;

  return (
    <div 
      id="loading-modal-overlay"
      className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200 select-none pointer-events-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-black/10 max-w-sm w-full p-6 sm:p-7 text-center space-y-5 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle accent gradient bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700" />

        {/* Dynamic Multi-Ring Spinner with glowing pulse */}
        <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
          {/* Ambient pulsating glow */}
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping opacity-60" />
          
          {/* Outer rotating gradient ring */}
          <div className="w-14 h-14 rounded-full border-[3px] border-zinc-100 border-t-amber-500 border-r-amber-400 animate-spin" />
          
          {/* Inner disc with pulsing icon */}
          <div className="absolute inset-2 bg-zinc-50 rounded-full flex items-center justify-center shadow-md">
            <Music className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
        </div>

        {/* Status headings */}
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
            {statusText}
          </h3>
          {subText && (
            <p className="text-xs text-zinc-500 font-medium">
              {subText}
            </p>
          )}
        </div>

        {/* Dynamic Activity Indicator */}
        <div className="space-y-3 pt-1">
          {/* Progress bar */}
          <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-black/5 relative">
            {isDeterminate ? (
               <div
                 className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-200 ease-out"
                 style={{ width: `${clampedProgress === 100 ? 100 : Math.max(3, clampedProgress!)}%` }}
               />
            ) : (
               <div className="h-full w-2/5 bg-gradient-to-r from-zinc-800/0 via-amber-500 to-zinc-800/0 rounded-full absolute animate-indeterminate-bar" />
            )}
          </div>
          
          {isDeterminate && (
            <div className="flex items-center justify-between text-xs font-bold text-amber-600 tabular-nums">
              <span className="text-[11px] font-medium text-zinc-500">
                {clampedProgress === 100 ? 'Complete' : 'Progress'}
              </span>
              <span>{clampedProgress}%</span>
            </div>
          )}

          {/* Active status badge with live ping dot */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${clampedProgress === 100 ? 'bg-emerald-500' : 'bg-amber-500'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${clampedProgress === 100 ? 'bg-emerald-600' : 'bg-amber-600'}`} />
            </span>
            <span>{clampedProgress === 100 ? 'Layout complete!' : (statusText || 'Processing songbook data...')}</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 pt-0.5 leading-relaxed">
          Please wait while the file is processed and formatted.
        </p>
      </div>
    </div>
  );

}
