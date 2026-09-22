import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'primary' | 'sidebar' | 'minimal';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'primary',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Suppress completely if already installed as standalone PWA
  if (isInstalled) {
    return null;
  }

  // If not installable and not iOS, nothing to show
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const renderButton = () => {
    if (variant === 'sidebar') {
      return (
        <button
          id="pwa-install-sidebar-btn"
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-200 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer group ${className}`}
          title={isIOS ? 'Install on iOS' : 'Install Kytario App'}
        >
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
            PWA
          </span>
        </button>
      );
    }

    if (variant === 'minimal') {
      return (
        <button
          id="pwa-install-minimal-btn"
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${className}`}
          title="Install as Progressive Web App"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
      );
    }

    // Default 'primary' variant
    return (
      <button
        id="pwa-install-primary-btn"
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-sm transition-all active:scale-95 cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      {/* iOS Safari Guided Install Sheet */}
      {showIOSGuide && (
        <div
          id="pwa-ios-modal-backdrop"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            id="pwa-ios-modal-content"
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-zinc-800 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Install Kytario
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Add to iPhone or iPad Home Screen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  1
                </span>
                <span className="leading-relaxed">
                  Tap the <strong className="text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 inline text-blue-500" /> Share</strong> button in Safari's navigation bar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  2
                </span>
                <span className="leading-relaxed">
                  Scroll down the menu and tap <strong className="text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline text-zinc-700 dark:text-zinc-300" /> Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                  3
                </span>
                <span className="leading-relaxed">
                  Tap <strong className="text-zinc-900 dark:text-zinc-100">Add</strong> in the top right to launch Kytario with full-screen offline access.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 px-3 text-xs font-medium rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
