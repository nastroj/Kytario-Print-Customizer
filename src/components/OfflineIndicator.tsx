import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed left-4 z-50 flex items-center gap-2.5 rounded-xl bg-zinc-900/90 dark:bg-zinc-800/95 text-white px-3.5 py-2 text-xs font-medium shadow-xl border border-zinc-700/60 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ bottom: 'max(1rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))' }}
    >
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Offline Mode — Cached songbooks and templates available</span>
    </div>
  );
};
