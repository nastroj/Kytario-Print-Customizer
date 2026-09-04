import React from 'react';
import { PrintSettings } from '../types';

interface SongbookSkeletonProps {
  settings: PrintSettings;
  cssWidth: string;
  cssHeight: string;
  scaledWidth: number;
  scaledHeight: number;
  effectiveScale: number;
  isScaled: boolean;
  pageCount?: number;
}

export const SongbookSkeleton: React.FC<SongbookSkeletonProps> = ({
  settings,
  cssWidth,
  cssHeight,
  scaledWidth,
  scaledHeight,
  effectiveScale,
  isScaled,
  pageCount = 2,
}) => {
  const isLandscape = settings.orientation === 'landscape';
  const tocColumns = isLandscape ? 3 : 2;

  return (
    <div 
      id="songbook-preview-skeleton"
      className="flex flex-col items-center select-none pointer-events-none animate-in fade-in duration-200"
      aria-label="Calculating preview layout"
    >
      {/* SKELETON PAGE 1: Table of Contents / Index Overview */}
      <div 
        className="mx-auto mb-6 sm:mb-10 shrink-0"
        style={{
          width: isScaled ? `${scaledWidth}px` : 'fit-content',
          height: isScaled ? `${scaledHeight}px` : 'auto',
          minHeight: isScaled ? `${scaledHeight}px` : undefined,
          position: 'relative',
        }}
      >
        <div 
          className="bg-white shadow-md px-[5mm] py-[6mm] flex flex-col overflow-hidden origin-top-left border border-black/5/50"
          style={{ 
            width: cssWidth, 
            height: cssHeight,
            minHeight: cssHeight,
            transform: isScaled ? `scale(${effectiveScale})` : 'none',
            transformOrigin: 'top left',
            position: isScaled ? 'absolute' : 'relative',
            top: 0,
            left: 0,
          }}
        >
          {/* Header Skeleton */}
          <div className="mb-6 text-center animate-pulse flex flex-col items-center">
            <div className="h-7 w-64 bg-zinc-300/80 rounded-xl mb-2.5" />
            <div className="h-3 w-36 bg-zinc-200/80 rounded-full" />
          </div>

          {/* Table of Contents Columns Skeleton */}
          <div 
            className="flex-1 grid gap-x-8 gap-y-2 animate-pulse"
            style={{ 
              gridTemplateColumns: `repeat(${tocColumns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: isLandscape ? 18 : 22 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1">
                <div className="w-5 h-3.5 bg-zinc-300/70 rounded shrink-0" />
                <div 
                  className="h-3.5 bg-zinc-200/90 rounded" 
                  style={{ width: `${60 + ((idx * 17) % 35)}%` }} 
                />
              </div>
            ))}
          </div>

          {/* Page Footer */}
          <div className="mt-auto pt-4 flex justify-between items-center text-zinc-300 text-xs border-t border-zinc-100 animate-pulse">
            <div className="h-2.5 w-24 bg-zinc-200/60 rounded" />
            <div className="h-2.5 w-6 bg-zinc-200/60 rounded" />
          </div>
        </div>
      </div>

      {/* SKELETON PAGE 2: Song Content Page */}
      {pageCount >= 2 && (
        <div 
          className="mx-auto mb-6 sm:mb-10 shrink-0"
          style={{
            width: isScaled ? `${scaledWidth}px` : 'fit-content',
            height: isScaled ? `${scaledHeight}px` : 'auto',
            minHeight: isScaled ? `${scaledHeight}px` : undefined,
            position: 'relative',
          }}
        >
          <div 
            className="bg-white shadow-md px-[5mm] py-[6mm] flex flex-col overflow-hidden origin-top-left border border-black/5/50"
            style={{ 
              width: cssWidth, 
              height: cssHeight,
              minHeight: cssHeight,
              transform: isScaled ? `scale(${effectiveScale})` : 'none',
              transformOrigin: 'top left',
              position: isScaled ? 'absolute' : 'relative',
              top: 0,
              left: 0,
            }}
          >
            {/* Song Header Skeleton */}
            <div className="mb-4 pb-3 border-b border-black/5/80 flex items-start justify-between animate-pulse">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-zinc-300/90 rounded-xl font-bold text-xs" />
                  <div className="h-6 w-48 bg-zinc-300/90 rounded-xl" />
                </div>
                <div className="h-3.5 w-32 bg-zinc-200/80 rounded" />
              </div>
              <div className="flex gap-1.5">
                <div className="h-5 w-14 bg-zinc-200/70 rounded-full" />
                <div className="h-5 w-10 bg-amber-100/80 rounded-full" />
              </div>
            </div>

            {/* 2-Column Song Verses & Chords Skeleton */}
            <div 
              className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4 animate-pulse"
            >
              {/* Column 1 */}
              <div className="space-y-3.5">
                {/* Verse 1 */}
                <div className="space-y-1.5">
                  <div className="h-4 w-7 bg-amber-200/70 rounded text-[10px] mb-1" />
                  <div className="flex gap-4">
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                  </div>
                  <div className="h-3 w-11/12 bg-zinc-200/90 rounded" />
                  <div className="flex gap-6 mt-1">
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                  </div>
                  <div className="h-3 w-4/5 bg-zinc-200/90 rounded" />
                  <div className="h-3 w-5/6 bg-zinc-200/90 rounded mt-1" />
                </div>

                {/* Chorus */}
                <div className="space-y-1.5 pl-2 border-l-2 border-amber-300/50 bg-amber-50/30 p-1.5 rounded-r">
                  <div className="h-4 w-6 bg-amber-300/70 rounded text-[10px] mb-1" />
                  <div className="flex gap-5">
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                  </div>
                  <div className="h-3 w-full bg-zinc-300/70 rounded font-medium" />
                  <div className="flex gap-4 mt-1">
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                  </div>
                  <div className="h-3 w-10/12 bg-zinc-300/70 rounded font-medium" />
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-3.5">
                {/* Verse 2 */}
                <div className="space-y-1.5">
                  <div className="h-4 w-7 bg-amber-200/70 rounded text-[10px] mb-1" />
                  <div className="flex gap-5">
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                  </div>
                  <div className="h-3 w-11/12 bg-zinc-200/90 rounded" />
                  <div className="h-3 w-3/4 bg-zinc-200/90 rounded mt-1" />
                  <div className="flex gap-4 mt-1">
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                  </div>
                  <div className="h-3 w-5/6 bg-zinc-200/90 rounded" />
                </div>

                {/* Bridge / Outro */}
                <div className="space-y-1.5">
                  <div className="h-4 w-10 bg-zinc-200/80 rounded text-[10px] mb-1" />
                  <div className="flex gap-3">
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                    <div className="h-2.5 w-4 bg-amber-300/80 rounded" />
                  </div>
                  <div className="h-3 w-4/5 bg-zinc-200/90 rounded" />
                  <div className="h-3 w-2/3 bg-zinc-200/90 rounded mt-1" />
                </div>
              </div>
            </div>

            {/* Page Footer */}
            <div className="mt-auto pt-4 flex justify-between items-center text-zinc-300 text-xs border-t border-zinc-100 animate-pulse">
              <div className="h-2.5 w-32 bg-zinc-200/60 rounded" />
              <div className="h-2.5 w-6 bg-zinc-200/60 rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
