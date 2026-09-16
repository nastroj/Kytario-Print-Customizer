import { useState, useRef, useCallback, useEffect } from 'react';
import { SongbookData, PrintSettings } from '../types';
import { WorkerInMessage, WorkerOutMessage } from '../workers/pdfWorker';
import { saveGeneratedPdfToStorage, loadGeneratedPdfFromStorage } from '../utils/storage';

export interface GenerationProgress {
  percent: number;
  phase: 'fonts' | 'toc' | 'songs' | 'finalizing';
  message: string;
  currentSongIndex?: number;
  totalSongs?: number;
  currentSongTitle?: string;
}

export interface GeneratedFileInfo {
  filename: string;
  pageCount: number;
  sizeFormatted: string;
}

export interface CachedPdfInfo {
  blob: Blob;
  filename: string;
  pageCount: number;
  sizeFormatted: string;
  generatedAt: number;
  fingerprint: string;
}

export function useBackgroundPdfGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<GeneratedFileInfo | null>(null);
  const [cachedPdf, setCachedPdf] = useState<CachedPdfInfo | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Load persisted cached PDF from IndexedDB on mount and clean up worker on unmount
  useEffect(() => {
    loadGeneratedPdfFromStorage().then((stored) => {
      if (stored) {
        setCachedPdf(stored);
        setLastGenerated({
          filename: stored.filename,
          pageCount: stored.pageCount,
          sizeFormatted: stored.sizeFormatted,
        });
      }
    });

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const cancelPdfGeneration = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsGenerating(false);
    setProgress(null);
  }, []);

  const downloadCachedPdf = useCallback((): boolean => {
    if (!cachedPdf) return false;
    const blobUrl = URL.createObjectURL(cachedPdf.blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = cachedPdf.filename;
    downloadLink.target = '_blank';
    downloadLink.rel = 'noopener noreferrer';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 15000);
    return true;
  }, [cachedPdf]);

  const invalidateCachedPdf = useCallback(() => {
    setCachedPdf(null);
    saveGeneratedPdfToStorage(null);
  }, []);

  const generatePdf = useCallback(
    async (songbookData: SongbookData, settings: PrintSettings, fingerprint: string = ''): Promise<void> => {
      // Abort any existing generation
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      setIsGenerating(true);
      setError(null);
      setProgress({
        percent: 0,
        phase: 'fonts',
        message: 'Starting background Web Worker...',
      });

      return new Promise<void>((resolve, reject) => {
        try {
          // Resolve font URLs relative to base and window origin
          const baseUrl = (import.meta as any).env?.BASE_URL || './';
          const fontRegularUrl = new URL(`${baseUrl}fonts/Inter-Regular.ttf`, window.location.href).href;
          const fontBoldUrl = new URL(`${baseUrl}fonts/Inter-Bold.ttf`, window.location.href).href;
          const fontItalicUrl = new URL(`${baseUrl}fonts/Inter-Italic.ttf`, window.location.href).href;
          const fontBoldItalicUrl = new URL(`${baseUrl}fonts/Inter-BoldItalic.ttf`, window.location.href).href;

          // Instantiate Vite web worker
          const worker = new Worker(
            new URL('../workers/pdfWorker.ts', import.meta.url),
            { type: 'module' }
          );
          workerRef.current = worker;

          worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
            const data = event.data;

            if (data.type === 'PROGRESS') {
              setProgress(data.payload);
            } else if (data.type === 'COMPLETE') {
              const { pdfBytes, filename, pageCount, sizeBytes } = data.payload;

              // Format size nicely
              const sizeInKb = sizeBytes / 1024;
              const sizeFormatted = sizeInKb > 1024
                ? `${(sizeInKb / 1024).toFixed(1)} MB`
                : `${Math.round(sizeInKb)} KB`;

              // Download file directly
              const blob = new Blob([pdfBytes], { type: 'application/pdf' });
              const blobUrl = URL.createObjectURL(blob);
              const downloadLink = document.createElement('a');
              downloadLink.href = blobUrl;
              downloadLink.download = filename;
              downloadLink.target = '_blank';
              downloadLink.rel = 'noopener noreferrer';
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);

              // Revoke URL after a brief delay
              setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
              }, 15000);

              // Cache the generated PDF for instant re-downloads until changes occur and persist to IndexedDB
              const newCachedPdf = {
                blob,
                filename,
                pageCount,
                sizeFormatted,
                generatedAt: Date.now(),
                fingerprint,
              };
              setCachedPdf(newCachedPdf);
              saveGeneratedPdfToStorage(newCachedPdf);

              setLastGenerated({
                filename,
                pageCount,
                sizeFormatted,
              });

              setIsGenerating(false);
              setProgress(null);
              worker.terminate();
              workerRef.current = null;
              resolve();
            } else if (data.type === 'ERROR') {
              const errMsg = data.payload.message || 'Error occurred during PDF generation.';
              setError(errMsg);
              setIsGenerating(false);
              setProgress(null);
              worker.terminate();
              workerRef.current = null;
              reject(new Error(errMsg));
            }
          };

          worker.onerror = (err) => {
            const errMsg = err.message || 'Web Worker script execution failed.';
            console.error('PDF Worker runtime error:', err);
            setError(errMsg);
            setIsGenerating(false);
            setProgress(null);
            worker.terminate();
            workerRef.current = null;
            reject(new Error(errMsg));
          };

          // Send data to worker
          const inMessage: WorkerInMessage = {
            type: 'GENERATE_PDF',
            payload: {
              songbookData,
              settings,
              fontRegularUrl,
              fontBoldUrl,
              fontItalicUrl,
              fontBoldItalicUrl,
            },
          };

          worker.postMessage(inMessage);
        } catch (err: any) {
          const errMsg = err.message || 'Failed to initialize PDF worker.';
          setError(errMsg);
          setIsGenerating(false);
          setProgress(null);
          reject(err);
        }
      });
    },
    []
  );

  return {
    isGenerating,
    progress,
    error,
    lastGenerated,
    cachedPdf,
    generatePdf,
    downloadCachedPdf,
    invalidateCachedPdf,
    cancelPdfGeneration,
    clearError: () => setError(null),
    clearLastGenerated: () => setLastGenerated(null),
  };
}
