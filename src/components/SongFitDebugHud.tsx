import React, { useState } from 'react';
import { SongFitDebugInfo } from '../types';
import { 
  Bug, 
  X, 
  Copy, 
  Check, 
  Terminal, 
  Minimize2, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  Hash, 
  Type, 
  Ruler, 
  Columns,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SongFitDebugHudProps {
  debugInfo: SongFitDebugInfo | null;
  totalSongs: number;
  onPrevSong?: () => void;
  onNextSong?: () => void;
  onClose?: () => void;
  onScrollToActive?: () => void;
}

export const SongFitDebugHud: React.FC<SongFitDebugHudProps> = ({
  debugInfo,
  totalSongs,
  onPrevSong,
  onNextSong,
  onClose,
  onScrollToActive,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);

  if (!debugInfo) return null;

  const handleCopy = () => {
    const markdown = [
      `### Debug Report: Song #${debugInfo.songIndex + 1} - "${debugInfo.title}"`,
      `- **Artist:** ${debugInfo.artist || 'N/A'}`,
      `- **Total Line Count:** ${debugInfo.totalLines} (raw: ${debugInfo.rawLinesCount}, non-empty: ${debugInfo.nonEmptyLinesCount}, section lines: ${debugInfo.sectionLinesCount})`,
      `- **Visual Wrapped Lines:** ${debugInfo.visualLinesAtScale}`,
      `- **Sections Count:** ${debugInfo.sectionsCount}`,
      `- **Chosen Font Size:** Lyrics: ${debugInfo.chosenLyricsFontSize}px | Chords: ${debugInfo.chosenChordsFontSize}px`,
      `- **Base Font Size:** Lyrics: ${debugInfo.baseLyricsFontSize}px | Chords: ${debugInfo.baseChordsFontSize}px | Title: ${debugInfo.baseTitleFontSize}px`,
      `- **Min Readability Limit:** ${debugInfo.minFontSizeConstraint}px (Clamped by minimum: ${debugInfo.isMinConstraintActive ? 'YES' : 'No'})`,
      `- **Scale Factor:** ${debugInfo.computedScale}x (${Math.round((debugInfo.computedScale - 1) * 100)}%)`,
      `- **Calculated Column Height:** ${debugInfo.calculatedHeight}px / ${debugInfo.availColHeight}px (${debugInfo.heightUtilization}% utilization)`,
      `- **Layout:** ${debugInfo.columns} columns, ${debugInfo.pageFormat} ${debugInfo.orientation}`,
      `- **SmartFit Enabled:** ${debugInfo.smartFitEnabled ? 'Yes' : 'No'}`,
      debugInfo.columnBalancing ? `- **Smart Column Balancing:** Strategy: "${debugInfo.columnBalancing.strategy}", Orphan Protection: ${debugInfo.columnBalancing.hasOrphanProtection ? 'Active' : 'None'}, Max Col Est: ~${debugInfo.columnBalancing.estimatedMaxColumnHeight}px` : '',
      debugInfo.sectionsDetail.length > 0 ? `\n#### Sections:\n` + debugInfo.sectionsDetail.map((s, idx) => {
        const secPlan = debugInfo.columnBalancing?.sections?.[idx];
        const planNote = secPlan ? ` [avoid-break: ${secPlan.avoidBreakInside}, break-before: ${secPlan.breakBeforeColumn}, orphan-guard: ${secPlan.orphanProtection?.hasHeadGroup ? 'yes' : 'no'}]` : '';
        return `  ${idx + 1}. \`${s.marker}\`: ${s.lineCount} lines (~${s.estimatedHeight}px)${planNote}`;
      }).join('\n') : ''
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback
    });
  };

  const handleLogConsole = () => {
    console.group(`%c[Songbook Debug] Song #${debugInfo.songIndex + 1}: "${debugInfo.title}"`, 'color: #3b82f6; font-size: 13px; font-weight: bold;');
    console.log(`Total Line Count (calculated): %c${debugInfo.totalLines} lines%c (Raw lines: ${debugInfo.rawLinesCount}, Section lines: ${debugInfo.sectionLinesCount}, Visual wrapped lines: ${debugInfo.visualLinesAtScale})`, 'color: #10b981; font-weight: bold;', 'color: inherit;');
    console.log(`Chosen Font Size: %c${debugInfo.chosenLyricsFontSize}px%c (Base: ${debugInfo.baseLyricsFontSize}px, Scale: ${debugInfo.computedScale}x, Min Constraint: ${debugInfo.minFontSizeConstraint}px, Active: ${debugInfo.isMinConstraintActive})`, 'color: #f59e0b; font-weight: bold;', 'color: inherit;');
    console.log(`Chords Font Size: %c${debugInfo.chosenChordsFontSize}px%c (Base: ${debugInfo.baseChordsFontSize}px)`, 'color: #3b82f6; font-weight: bold;', 'color: inherit;');
    console.log(`Height Estimation: %c${debugInfo.calculatedHeight}px / ${debugInfo.availColHeight}px%c (${debugInfo.heightUtilization}% column capacity)`, 'color: #ec4899; font-weight: bold;', 'color: inherit;');
    console.log(`Layout: %c${debugInfo.columns} columns%c (${debugInfo.pageFormat} ${debugInfo.orientation})`, 'font-weight: bold;', 'color: inherit;');
    if (debugInfo.sectionsDetail.length > 0) {
      console.table(debugInfo.sectionsDetail.map(s => ({
        'Section Marker': s.marker,
        'Lines Count': s.lineCount,
        'Est. Height (px)': s.estimatedHeight
      })));
    }
    console.groupEnd();

    setLogged(true);
    setTimeout(() => setLogged(false), 2000);
  };

  // Minimized floating pill
  if (isMinimized) {
    return (
      <div 
        id="debug-hud-minimized"
        className="fixed top-16 right-4 sm:right-6 z-50 print:hidden flex items-center gap-2.5 bg-zinc-950/90 text-zinc-100 px-3 py-1.5 rounded-full shadow-2xl border border-zinc-700/80 backdrop-blur-md text-xs font-mono select-none"
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-semibold text-amber-300">DEBUG #{debugInfo.songIndex + 1}:</span>
        <span className="text-zinc-300 truncate max-w-[120px]">{debugInfo.title}</span>
        <span className="text-zinc-500">•</span>
        <span className="text-emerald-400 font-bold">{debugInfo.totalLines} lines</span>
        <span className="text-zinc-500">•</span>
        <span className="text-amber-400 font-bold">{debugInfo.chosenLyricsFontSize}px</span>

        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded cursor-pointer transition-colors"
          title="Expand Debug View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded cursor-pointer transition-colors"
          title="Close Debug View"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div 
      id="debug-hud-expanded"
      className="fixed top-16 right-3 sm:right-6 w-84 sm:w-96 max-h-[85vh] z-50 print:hidden flex flex-col bg-zinc-950/95 text-zinc-100 rounded-2xl shadow-2xl border border-zinc-700/90 backdrop-blur-xl font-mono text-xs overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 select-none"
    >
      {/* HUD Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bug className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold text-amber-300 text-[11px] uppercase tracking-wider shrink-0">Song Fit Debug</span>
          <span className="text-zinc-500 text-[10px]">({debugInfo.songIndex + 1}/{totalSongs})</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
            title="Copy Debug Info"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleLogConsole}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
            title="Log to DevTools Console"
          >
            {logged ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
            title="Close (Ctrl+Shift+D)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Song Navigation Bar */}
      <div className="px-3.5 py-2 bg-zinc-900/50 border-b border-zinc-800/80 flex items-center justify-between gap-2 shrink-0">
        <button
          onClick={onPrevSong}
          disabled={debugInfo.songIndex <= 0}
          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent rounded cursor-pointer transition-colors"
          title="Previous Song"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div 
          onClick={onScrollToActive}
          className="truncate flex-1 text-center cursor-pointer hover:underline"
          title="Click to jump to this song in preview"
        >
          <span className="font-bold text-zinc-100">{debugInfo.title}</span>
          {debugInfo.artist && <span className="text-zinc-400 ml-1 font-normal">- {debugInfo.artist}</span>}
        </div>

        <button
          onClick={onNextSong}
          disabled={debugInfo.songIndex >= totalSongs - 1}
          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent rounded cursor-pointer transition-colors"
          title="Next Song"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Debug Metrics Body */}
      <div className="p-3.5 space-y-3 overflow-y-auto max-h-[calc(85vh-90px)]">
        {/* Core Calculation Cards */}
        <div className="grid grid-cols-2 gap-2">
          {/* Total Line Count Box */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
              <Hash className="w-3 h-3 text-emerald-400" />
              <span>Total Lines</span>
            </div>
            <div className="my-1">
              <span className="text-2xl font-black text-emerald-400 tracking-tight">
                {debugInfo.totalLines}
              </span>
              <span className="text-zinc-500 text-[10px] ml-1">lines</span>
            </div>
            <div className="text-[10px] text-zinc-400 leading-tight space-y-0.5 border-t border-zinc-800/80 pt-1.5 mt-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Raw lines:</span>
                <span className="font-semibold text-zinc-300">{debugInfo.rawLinesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Section lines:</span>
                <span className="font-semibold text-zinc-300">{debugInfo.sectionLinesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Visual rows:</span>
                <span className="font-semibold text-zinc-300">{debugInfo.visualLinesAtScale}</span>
              </div>
            </div>
          </div>

          {/* Chosen Font Size Box */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
              <Type className="w-3 h-3 text-amber-400" />
              <span>Chosen Font</span>
            </div>
            <div className="my-1">
              <span className="text-2xl font-black text-amber-400 tracking-tight">
                {debugInfo.chosenLyricsFontSize}
              </span>
              <span className="text-zinc-500 text-[10px] ml-1">px</span>
            </div>
            <div className="text-[10px] text-zinc-400 leading-tight space-y-0.5 border-t border-zinc-800/80 pt-1.5 mt-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Base size:</span>
                <span className="font-semibold text-zinc-300">{debugInfo.baseLyricsFontSize}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Scale factor:</span>
                <span className="font-semibold text-amber-300">
                  {debugInfo.computedScale}× 
                  {debugInfo.computedScale > 1.0 
                    ? ` (+${Math.round((debugInfo.computedScale - 1) * 100)}%)` 
                    : debugInfo.computedScale < 1.0 
                    ? ` (${Math.round((debugInfo.computedScale - 1) * 100)}%)` 
                    : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Chords size:</span>
                <span className="font-semibold text-blue-400">{debugInfo.chosenChordsFontSize}px</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Min limit:</span>
                <span className={`font-semibold ${debugInfo.isMinConstraintActive ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
                  {debugInfo.minFontSizeConstraint}px {debugInfo.isMinConstraintActive ? '(active)' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Height & Layout Capacity */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-blue-400" />
              <span>Column Height Utilization</span>
            </span>
            <span className="font-bold text-zinc-200">{debugInfo.heightUtilization}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                debugInfo.heightUtilization > 100 
                  ? 'bg-rose-500' 
                  : debugInfo.heightUtilization >= 85 
                  ? 'bg-emerald-500' 
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, debugInfo.heightUtilization)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>Estimated Content: <b className="text-zinc-200">{debugInfo.calculatedHeight}px</b></span>
            <span>Available Height: <b className="text-zinc-200">{debugInfo.availColHeight}px</b></span>
          </div>

          <div className="border-t border-zinc-800/80 pt-2 flex items-center justify-between text-[10px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Columns className="w-3 h-3 text-zinc-500" />
              <span>{debugInfo.columns} Columns</span>
            </span>
            <span>{debugInfo.pageFormat} {debugInfo.orientation}</span>
            <span className={debugInfo.smartFitEnabled ? 'text-emerald-400' : 'text-zinc-500'}>
              {debugInfo.smartFitEnabled ? 'SmartFit Active' : 'Fixed Scale'}
            </span>
          </div>

          {debugInfo.columnBalancing && (
            <div className="border-t border-zinc-800/80 pt-1.5 flex items-center justify-between text-[10px]">
              <span className="text-zinc-400">Column Balancing:</span>
              <span className="font-semibold text-teal-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                {debugInfo.columnBalancing.strategy === 'clean-breaks' 
                  ? 'Clean Breaks' 
                  : debugInfo.columnBalancing.strategy === 'protected-split'
                  ? 'Orphan-Guarded' 
                  : 'Single Column'}
              </span>
            </div>
          )}
        </div>

        {/* Sections Breakdown Accordion */}
        {debugInfo.sectionsDetail.length > 0 && (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSections(!showSections)}
              className="w-full px-3 py-2 text-left flex items-center justify-between text-zinc-300 hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <span className="font-bold text-[10px] uppercase tracking-wider text-zinc-400">
                Sections ({debugInfo.sectionsCount})
              </span>
              {showSections ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
            </button>

            {showSections && (
              <div className="p-2 border-t border-zinc-800 space-y-1 text-[10px]">
                {debugInfo.sectionsDetail.map((sec, idx) => (
                  <div key={idx} className="flex items-center justify-between px-2 py-1 rounded bg-zinc-900/70">
                    <span className="text-zinc-300 font-bold truncate max-w-[120px]">{sec.marker || `Part ${idx + 1}`}</span>
                    <span className="text-zinc-400">{sec.lineCount} lines</span>
                    <span className="text-zinc-500">~{sec.estimatedHeight}px</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Hint */}
        <div className="text-[10px] text-zinc-500 text-center">
          Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300">Ctrl+Shift+D</kbd> to toggle this view anytime.
        </div>
      </div>
    </div>
  );
};
