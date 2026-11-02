import React, { useCallback, useRef } from 'react';
import { Globe, Clipboard, FileArchive } from 'lucide-react';

export type ImportTabId = 'url' | 'paste' | 'upload';

interface TabDef {
  id: ImportTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: 'url', label: 'Kytario URL', icon: Globe },
  { id: 'paste', label: 'Paste JSON', icon: Clipboard },
  { id: 'upload', label: 'File / ZIP', icon: FileArchive },
];

interface ImportTabsProps {
  activeTab: ImportTabId;
  onTabChange: (tab: ImportTabId) => void;
}

/**
 * Accessible tab list for the import screen.
 * Implements the WAI-ARIA tabs pattern: role="tablist"/"tab", aria-selected,
 * and roving focus with Arrow Left/Right, Home and End keyboard navigation.
 */
export function ImportTabs({ activeTab, onTabChange }: ImportTabsProps) {
  const tabRefs = useRef<Record<ImportTabId, HTMLButtonElement | null>>({
    url: null,
    paste: null,
    upload: null,
  });

  const focusTab = useCallback((index: number) => {
    const clamped = (index + TABS.length) % TABS.length;
    const tab = TABS[clamped];
    tabRefs.current[tab.id]?.focus();
    onTabChange(tab.id);
  }, [onTabChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        focusTab(currentIndex + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusTab(currentIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusTab(0);
        break;
      case 'End':
        e.preventDefault();
        focusTab(TABS.length - 1);
        break;
    }
  }, [focusTab]);

  return (
    <div
      role="tablist"
      aria-label="Songbook import method"
      className="flex border-b border-black/5 overflow-x-auto no-scrollbar"
    >
      {TABS.map((tab, index) => {
        const Icon = tab.icon;
        const isSelected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[tab.id] = el; }}
            role="tab"
            id={`import-tab-${tab.id}`}
            aria-selected={isSelected}
            aria-controls={`import-panel-${tab.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex-1 min-w-[80px] py-2.5 text-[11px] sm:text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              isSelected
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
