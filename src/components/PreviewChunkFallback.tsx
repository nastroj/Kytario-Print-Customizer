import React from 'react';
import { Loader2 } from 'lucide-react';
import { PrintSettings } from '../types';

interface PreviewChunkFallbackProps {
  settings: PrintSettings;
}

/**
 * Lightweight fallback rendered by <Suspense> while the lazily-loaded
 * SongbookPreview chunk (layout engine + page rendering) is being fetched.
 * Mirrors the A4/A5 page silhouette so the viewport doesn't jump when the
 * real preview mounts.
 */
export const PreviewChunkFallback: React.FC<PreviewChunkFallbackProps> = ({ settings }) => {
  const isLandscape = settings.orientation === 'landscape';
  // Approximate A4 aspect ratio for the chosen orientation/paper size.
  const cssWidth = isLandscape ? 'min(90vw, 840px)' : 'min(90vw, 595px)';
  const cssHeight = isLandscape ? 'min(60vw, 595px)' : 'min(120vw, 840px)';

  return (
    <div
      className="flex flex-col items-center gap-6 py-10 min-w-fit"
      role="status"
      aria-live="polite"
      aria-label="Loading songbook preview"
    >
      <div className="flex items-center gap-2 text-zinc-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        <span>Loading preview…</span>
      </div>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="bg-white rounded-md shadow-lg border border-zinc-200 flex items-center justify-center"
          style={{ width: cssWidth, height: cssHeight }}
          aria-hidden="true"
        >
          <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
        </div>
      ))}
      <span className="sr-only">The songbook preview is loading.</span>
    </div>
  );
};
