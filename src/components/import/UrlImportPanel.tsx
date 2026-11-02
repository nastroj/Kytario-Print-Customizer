import React, { useCallback } from 'react';
import { Globe, ExternalLink, AlertTriangle, Clipboard, Loader2 } from 'lucide-react';
import type { KytarioErrorDetails } from '../../utils/api';

interface UrlImportPanelProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  onBlurNormalize: () => void;
  isProcessing: boolean;
  fetchDetails: KytarioErrorDetails | null;
  showProxyConfig: boolean;
  onToggleProxyConfig: () => void;
  proxyInput: string;
  onProxyInputChange: (value: string) => void;
  onSaveProxyAndRetry: () => void;
  onClearProxy: () => void;
  onSwitchToPasteTab: () => void;
}

/**
 * Import-from-Kytario-URL panel with accessible form fields
 * (labelled input, aria-describedby help/error text, Enter-to-submit).
 */
export function UrlImportPanel({
  url,
  onUrlChange,
  onSubmit,
  onBlurNormalize,
  isProcessing,
  fetchDetails,
  showProxyConfig,
  onToggleProxyConfig,
  proxyInput,
  onProxyInputChange,
  onSaveProxyAndRetry,
  onClearProxy,
  onSwitchToPasteTab,
}: UrlImportPanelProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) {
      e.preventDefault();
      onSubmit();
    }
  }, [isProcessing, onSubmit]);

  return (
    <div className="space-y-4 py-4" role="group" aria-label="Import from Kytario URL">
      <div className="space-y-2">
        <label htmlFor="kytario-url-input" className="text-xs font-bold text-zinc-700 uppercase tracking-wider ml-1 block">
          Kytario Songbook Link or Code
        </label>
        <input
          id="kytario-url-input"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onBlur={onBlurNormalize}
          onKeyDown={handleKeyDown}
          placeholder="https://kytario.com/... or songbook code"
          disabled={isProcessing}
          aria-describedby="kytario-url-help"
          aria-busy={isProcessing}
          className="w-full rounded-lg border border-black/10 p-3 text-sm focus:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-800 bg-zinc-50 disabled:opacity-60"
        />
        <p id="kytario-url-help" className="text-[11px] text-zinc-500 ml-1">
          Paste a public Kytario songbook link or its short code, then press Enter to import.
        </p>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isProcessing}
        aria-busy={isProcessing}
        className={`w-full text-white text-xs sm:text-sm font-bold py-2.5 sm:py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm ${
          isProcessing
            ? 'bg-zinc-800 pointer-events-none'
            : 'bg-zinc-900 hover:bg-zinc-800 cursor-pointer'
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
        ) : (
          <Globe className="w-4 h-4" aria-hidden="true" />
        )}
        <span>{isProcessing ? 'Fetching Data...' : 'Import from Kytario'}</span>
      </button>

      {fetchDetails && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-left" role="alert">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                GitHub Pages Static Hosting Notice
              </h4>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Automatic import tried public CORS relays but could not fetch this songbook. If relays are unavailable, configure the optional Cloudflare Worker proxy or use the manual JSON steps below.
              </p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-amber-200/70 space-y-2">
            <div className="text-xs font-bold text-zinc-900">
              ⚡ Quick 2-Step Import:
            </div>
            <ol className="text-xs text-zinc-600 list-decimal list-inside space-y-1.5 leading-relaxed">
              <li>
                Click below to open the songbook JSON data directly in your browser:
                <div className="mt-1">
                  <a
                    href={fetchDetails.apiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 font-mono text-[11px] font-semibold hover:bg-blue-100 transition-colors"
                  >
                    <span>Open {fetchDetails.token} JSON Data</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
              </li>
              <li>
                Press <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded font-mono text-[10px] font-semibold">Ctrl+A</kbd> then <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded font-mono text-[10px] font-semibold">Ctrl+C</kbd> to copy all text.
              </li>
              <li>
                Switch to the{' '}
                <button
                  type="button"
                  onClick={onSwitchToPasteTab}
                  className="text-blue-600 font-bold underline cursor-pointer"
                >
                  Paste JSON tab
                </button>{' '}
                and press <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded font-mono text-[10px] font-semibold">Ctrl+V</kbd>.
              </li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2 pt-0.5">
            <a
              href={fetchDetails.apiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[130px] px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors text-center"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span>1. Open JSON Tab</span>
            </a>
            <button
              type="button"
              onClick={onSwitchToPasteTab}
              className="flex-1 min-w-[130px] px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5" aria-hidden="true" />
              <span>2. Go to Paste Tab</span>
            </button>
          </div>

          <div className="pt-2 border-t border-amber-200/70">
            <button
              type="button"
              onClick={onToggleProxyConfig}
              aria-expanded={showProxyConfig}
              aria-controls="proxy-config-panel"
              className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center justify-between w-full py-1 text-left cursor-pointer"
            >
              <span>⚙️ Optional: Configure Cloudflare Worker Proxy</span>
              <span className="text-[11px] underline text-amber-700">{showProxyConfig ? 'Hide' : 'Set Proxy URL'}</span>
            </button>
            {showProxyConfig && (
              <div id="proxy-config-panel" className="mt-2 p-3 bg-white/95 rounded-lg border border-amber-200 text-xs space-y-2">
                <p className="text-zinc-600 leading-relaxed text-[11px]">
                  To enable automated 1-click imports on GitHub Pages, enter your Cloudflare Worker URL (e.g. <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 font-mono">https://kytario-proxy.workers.dev</code>):
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <label htmlFor="proxy-url-input" className="sr-only">Custom proxy URL</label>
                  <input
                    id="proxy-url-input"
                    type="url"
                    value={proxyInput}
                    onChange={(e) => onProxyInputChange(e.target.value)}
                    placeholder="https://kytario-proxy.workers.dev"
                    className="flex-1 rounded border border-zinc-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-800 bg-white"
                  />
                  <button
                    type="button"
                    onClick={onSaveProxyAndRetry}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Save &amp; Retry
                  </button>
                </div>
                {proxyInput && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onClearProxy}
                      className="text-[10px] text-zinc-500 hover:text-red-600 underline cursor-pointer"
                    >
                      Reset to default
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-zinc-500 leading-tight">
                  💡 You can copy the ready-to-use worker script from <code className="text-zinc-700 font-semibold">cloudflare-worker.js</code> in the repository.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
