import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { PrintSettings } from '../types';
import { APP_CONFIG } from '../config';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  Settings2, 
  FileDown,
  FolderOpen, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Loader2, 
  RefreshCw,
  Save,
  RotateCcw,
} from 'lucide-react';
import { ChangedSettingItem, getChangedSettingsList } from './UnappliedSettingsBanner';
import { PageLayoutSection } from './sidebar/PageLayoutSection';
import { CoverPageSection } from './sidebar/CoverPageSection';
import { TypographySection } from './sidebar/TypographySection';

interface SidebarProps {
  settings: PrintSettings;
  draftSettings?: PrintSettings;
  onDraftSettingsChange?: (settings: PrintSettings | ((prev: PrintSettings) => PrintSettings)) => void;
  onDiscardSettings?: () => void;
  hasUnappliedChanges?: boolean;
  changes?: ChangedSettingItem[];
  onApplySettings: (settings: PrintSettings) => void;
  onSaveSettings?: () => void;
  onResetToDefaults?: () => void;
  onResetSongbook?: () => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadPdf?: () => void;
  isDownloadingPdf?: boolean;
  isPdfReady?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isUpdatingLayout?: boolean;
  isLoadingJson?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

interface SidebarContentProps {
  idSuffix: string;
  isDrawer: boolean;
  draftSettings: PrintSettings;
  changes: ChangedSettingItem[];
  hasChanges: boolean;
  hasLayoutChanges: boolean;
  hasCoverChanges: boolean;
  hasTypographyChanges: boolean;
  onSettingChange: (keyOrPartial: keyof PrintSettings | Partial<PrintSettings>, value?: any) => void;
  onSaveSettings?: () => void;
  onResetToDefaults?: () => void;
  onDiscardChanges: () => void;
  onApplyChanges: (isDrawer: boolean) => void;
  onClose?: () => void;
  onResetSongbook?: () => void;
  onFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadPdf?: () => void;
  isDownloadingPdf?: boolean;
  isPdfReady?: boolean;
  isUpdatingLayout?: boolean;
  isLoadingJson?: boolean;
  headerSwipeProps?: {
    onTouchStart?: (e: React.TouchEvent) => void;
    onTouchMove?: (e: React.TouchEvent) => void;
    onTouchEnd?: () => void;
    onTouchCancel?: () => void;
    onMouseDown?: (e: React.MouseEvent) => void;
  };
}

const SidebarContent = memo(function SidebarContent({
  idSuffix,
  isDrawer,
  draftSettings,
  changes,
  hasChanges,
  hasLayoutChanges,
  hasCoverChanges,
  hasTypographyChanges,
  onSettingChange,
  onSaveSettings,
  onResetToDefaults,
  onDiscardChanges,
  onApplyChanges,
  onClose,
  onResetSongbook,
  onDownloadPdf,
  isDownloadingPdf = false,
  isPdfReady = false,
  isUpdatingLayout = false,
  isLoadingJson = false,
  headerSwipeProps,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full gap-3.5">
      {/* Header Area (Supports swipe-down to dismiss in mobile drawer) */}
      <div 
        className={`pb-2.5 border-b border-black/5 shrink-0 ${
          isDrawer ? 'cursor-grab active:cursor-grabbing select-none touch-pan-y' : ''
        }`}
        {...(isDrawer ? headerSwipeProps : {})}
      >
        <h1 className="text-lg font-bold text-zinc-900 mb-0.5 leading-tight select-none pointer-events-none">
          Kytario Print Customizer
        </h1>
        <div className="flex items-center justify-between select-none pointer-events-none">
          <h2 className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5 tracking-tight">
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </h2>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-400 border border-black/5">
            v{APP_CONFIG.APP_VERSION}
          </span>
        </div>
      </div>

      {/* Modular Settings Sections */}
      <div className="space-y-5 flex-1 overflow-y-auto pr-1">
        {/* SECTION 1: Page Layout */}
        <PageLayoutSection
          idSuffix={idSuffix}
          draftSettings={draftSettings}
          hasLayoutChanges={hasLayoutChanges}
          onSettingChange={onSettingChange}
        />

        {/* SECTION 2: Cover Pages */}
        <CoverPageSection
          idSuffix={idSuffix}
          draftSettings={draftSettings}
          hasCoverChanges={hasCoverChanges}
          onSettingChange={onSettingChange}
        />

        {/* SECTION 3: Typography & Colors */}
        <TypographySection
          idSuffix={idSuffix}
          draftSettings={draftSettings}
          hasTypoChanges={hasTypographyChanges}
          onSettingChange={onSettingChange}
        />
      </div>

      {/* Footer / Actions Area */}
      <div className="pt-3 border-t border-black/5 shrink-0 space-y-3">
        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Unapplied Changes Bar in Sidebar */}
        {hasChanges && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                <span className="text-xs font-bold text-amber-900 truncate">
                  {changes.length} {changes.length === 1 ? 'change' : 'changes'} pending
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDiscardChanges}
                className="flex-1 py-2 px-3 bg-zinc-200/80 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Discard changes and revert to current preview"
              >
                Discard
              </button>
              <button
                type="button"
                id={`sidebar-apply-btn-${idSuffix}`}
                onClick={() => onApplyChanges(isDrawer)}
                disabled={isUpdatingLayout}
                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Apply changes to update songbook layout"
              >
                {isUpdatingLayout ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Apply Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons Area - Reorganized */}
        <div className="space-y-2">
          {/* Row 1: Primary Actions */}
          <div className="flex items-center gap-2">
            {onResetSongbook && (
              <button
                type="button"
                id={`sidebar-switch-songbook-btn-${idSuffix}`}
                onClick={onResetSongbook}
                disabled={isLoadingJson}
                className="flex-1 h-11 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-black/5"
                title="Import a different songbook"
              >
                {isLoadingJson ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderOpen className="w-4 h-4 text-zinc-500 shrink-0" />
                )}
                <span>Import</span>
              </button>
            )}

            <button
              type="button"
              id={`sidebar-pdf-download-btn-${idSuffix}`}
              onClick={() => onDownloadPdf?.()}
              disabled={isDownloadingPdf}
              className={`flex-[1.5] h-11 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border ${
                isPdfReady
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
                  : 'bg-zinc-900 hover:bg-black text-white border-transparent'
              }`}
              title={isPdfReady ? "PDF generated! Click to save" : "Export and download as PDF"}
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Building PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 shrink-0" />
                  <span>{isPdfReady ? 'Save PDF' : 'Export PDF'}</span>
                </>
              )}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-11 h-11 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl transition-all flex items-center justify-center cursor-pointer border border-black/5 shrink-0"
                title="Close Settings"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Row 2: Secondary / Maintenance Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id={`reset-settings-btn-${idSuffix}`}
              onClick={onResetToDefaults}
              className="flex-1 py-2 px-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-black/5"
              title="Reset all settings to default"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
              <span>Reset defaults</span>
            </button>
            <button
              type="button"
              id={`save-settings-btn-${idSuffix}`}
              onClick={onSaveSettings}
              className="flex-1 py-2 px-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-black/5"
              title="Save settings locally in browser"
            >
              <Save className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
              <span>Save settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export const Sidebar = memo(function Sidebar({ 
  settings, 
  draftSettings: externalDraftSettings,
  onDraftSettingsChange,
  onDiscardSettings,
  hasUnappliedChanges: externalHasUnappliedChanges,
  changes: externalChanges,
  onApplySettings, 
  onSaveSettings,
  onResetToDefaults,
  onResetSongbook, 
  onFileUpload, 
  onDownloadPdf, 
  isDownloadingPdf = false,
  isPdfReady = false,
  isMobileOpen = false,
  onMobileClose,
  isUpdatingLayout = false,
  isLoadingJson = false,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const [internalDraftSettings, setInternalDraftSettings] = useState<PrintSettings>(settings);

  // Swipe-down to dismiss gesture tracking for the entire top part of the bottom sheet
  const touchStartYRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const currentDragOffsetRef = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartXRef.current = e.touches[0].clientX;
    currentDragOffsetRef.current = 0;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const clientY = e.touches[0].clientY;
    const clientX = e.touches[0].clientX;
    const deltaY = clientY - touchStartYRef.current;
    const deltaX = clientX - (touchStartXRef.current ?? clientX);

    // Track downward movement when vertically dominant
    if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX) * 0.4) {
      currentDragOffsetRef.current = deltaY;
      setDragOffset(deltaY);
    } else if (deltaY < 0) {
      currentDragOffsetRef.current = 0;
      setDragOffset(0);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartYRef.current === null) return;
    const finalOffset = currentDragOffsetRef.current;
    touchStartYRef.current = null;
    touchStartXRef.current = null;
    setIsDragging(false);

    // If dragged downward by 45px or more, dismiss the sidebar
    if (finalOffset > 45) {
      setDragOffset(0);
      onMobileClose?.();
    } else {
      setDragOffset(0);
    }
  }, [onMobileClose]);

  const handleTouchCancel = useCallback(() => {
    touchStartYRef.current = null;
    touchStartXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    touchStartYRef.current = e.clientY;
    touchStartXRef.current = e.clientX;
    currentDragOffsetRef.current = 0;
    setIsDragging(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (touchStartYRef.current === null) return;
      const deltaY = moveEvent.clientY - touchStartYRef.current;
      if (deltaY > 0) {
        currentDragOffsetRef.current = deltaY;
        setDragOffset(deltaY);
      }
    };

    const onMouseUp = () => {
      const finalOffset = currentDragOffsetRef.current;
      touchStartYRef.current = null;
      touchStartXRef.current = null;
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (finalOffset > 45) {
        setDragOffset(0);
        onMobileClose?.();
      } else {
        setDragOffset(0);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [onMobileClose]);

  const headerSwipeProps = useMemo(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    onMouseDown: handleMouseDown,
  }), [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, handleMouseDown]);

  // Synchronize internal draft when settings prop changes if not externally controlled
  useEffect(() => {
    setInternalDraftSettings(settings);
  }, [settings]);

  // Effective draft settings
  const draftSettings = externalDraftSettings ?? internalDraftSettings;

  // Compute changes using standard helper
  const changes = useMemo(() => {
    return externalChanges ?? getChangedSettingsList(draftSettings, settings);
  }, [externalChanges, draftSettings, settings]);

  const hasChanges = externalHasUnappliedChanges !== undefined ? externalHasUnappliedChanges : changes.length > 0;

  const hasLayoutChanges = useMemo(() => {
    return changes.some(c => c.section === 'layout');
  }, [changes]);

  const hasCoverChanges = useMemo(() => {
    return changes.some(c => c.section === 'cover');
  }, [changes]);

  const hasTypographyChanges = useMemo(() => {
    return changes.some(c => c.section === 'typography');
  }, [changes]);

  const setCollapsed = useCallback((val: boolean) => {
    if (onToggleCollapse) {
      onToggleCollapse(val);
    } else {
      setInternalCollapsed(val);
    }
  }, [onToggleCollapse]);

  const updateDraft = useCallback((updater: (prev: PrintSettings) => PrintSettings) => {
    if (onDraftSettingsChange) {
      (onDraftSettingsChange as any)((prev: PrintSettings) => updater(prev));
    } else {
      setInternalDraftSettings(updater);
    }
  }, [onDraftSettingsChange]);

  const handleSettingChange = useCallback((keyOrPartial: keyof PrintSettings | Partial<PrintSettings>, value?: any) => {
    updateDraft((prev) => {
      if (typeof keyOrPartial === 'object' && keyOrPartial !== null) {
        return {
          ...prev,
          ...keyOrPartial,
        };
      }
      return {
        ...prev,
        [keyOrPartial as keyof PrintSettings]: value,
      };
    });
  }, [updateDraft]);

  const handleApplyChanges = useCallback((isDrawer = false) => {
    onApplySettings(draftSettings);
    if (isDrawer && onMobileClose) {
      setTimeout(() => {
        onMobileClose();
      }, 150);
    }
  }, [onApplySettings, draftSettings, onMobileClose]);

  const handleDiscardChanges = useCallback(() => {
    if (onDiscardSettings) {
      onDiscardSettings();
    } else {
      setInternalDraftSettings(settings);
    }
  }, [onDiscardSettings, settings]);

  return (
    <>
      {/* Desktop Docked Sidebar (Hidden on print) */}
      <aside 
        className={`hidden md:flex flex-col h-full bg-white border-r border-black/5 transition-all duration-300 ease-in-out relative z-30 print:hidden ${
          isCollapsed ? 'w-0 overflow-hidden' : 'w-[240px] lg:w-[260px]'
        }`}
      >
        {!isCollapsed && (
          <div className="flex-1 flex flex-col min-h-0 p-3.5 lg:p-4 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
            <SidebarContent
              idSuffix="desktop"
              isDrawer={false}
              draftSettings={draftSettings}
              changes={changes}
              hasChanges={hasChanges}
              hasLayoutChanges={hasLayoutChanges}
              hasCoverChanges={hasCoverChanges}
              hasTypographyChanges={hasTypographyChanges}
              onSettingChange={handleSettingChange}
              onSaveSettings={onSaveSettings}
              onResetToDefaults={onResetToDefaults}
              onDiscardChanges={handleDiscardChanges}
              onApplyChanges={handleApplyChanges}
              onResetSongbook={onResetSongbook}
              onFileUpload={onFileUpload}
              onDownloadPdf={onDownloadPdf}
              isDownloadingPdf={isDownloadingPdf}
              isPdfReady={isPdfReady}
              isUpdatingLayout={isUpdatingLayout}
              isLoadingJson={isLoadingJson}
            />
          </div>
        )}

        {/* Desktop Collapse Toggle Handle Overlay */}
        <button
          onClick={() => setCollapsed(!isCollapsed)}
          className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-black/5 shadow-sm rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-all hover:scale-110 active:scale-95 cursor-pointer z-40 ${
            isCollapsed ? 'rotate-180 -right-7' : ''
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </aside>

      {/* Settings Bottom Sheet Backdrop (translucent, animated) */}
      <div 
        className={`fixed inset-0 z-50 flex print:hidden transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
        aria-hidden={!isMobileOpen}
      >
        {/* Backdrop (backdrop blur and fade) */}
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onMobileClose}
        />
        {/* Bottom Sheet Container */}
        <div 
          id="mobile-settings-sidebar"
          onClick={(e) => e.stopPropagation()}
          className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-[75vw] sm:w-[75vw] md:max-w-[336px] h-[85vh] md:h-[75vh] bg-white text-zinc-900 border-t border-black/10 rounded-t-3xl shadow-2xl p-4 z-50 flex flex-col will-change-transform ${
            isDragging ? '' : 'transition-transform duration-300 ease-out'
          } ${isMobileOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={dragOffset > 0 ? { transform: `translate(-50%, ${dragOffset}px)` } : undefined}
        >
          {/* Top Swipable Grab Area */}
          <div 
            className="w-full pt-1 pb-2 shrink-0 select-none touch-pan-y cursor-grab active:cursor-grabbing flex justify-center items-center"
            {...headerSwipeProps}
            onClick={onMobileClose}
            title="Swipe down to close"
          >
            <div className="w-12 h-1.5 bg-zinc-300 hover:bg-zinc-400 rounded-full transition-colors" />
          </div>

          {isMobileOpen && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SidebarContent
                idSuffix="bottom-sheet"
                isDrawer={true}
                headerSwipeProps={headerSwipeProps}
                draftSettings={draftSettings}
                changes={changes}
                hasChanges={hasChanges}
                hasLayoutChanges={hasLayoutChanges}
                hasCoverChanges={hasCoverChanges}
                hasTypographyChanges={hasTypographyChanges}
                onSettingChange={handleSettingChange}
                onSaveSettings={onSaveSettings}
                onResetToDefaults={onResetToDefaults}
                onDiscardChanges={handleDiscardChanges}
                onApplyChanges={handleApplyChanges}
                onClose={onMobileClose}
                onResetSongbook={onResetSongbook}
                onFileUpload={onFileUpload}
                onDownloadPdf={onDownloadPdf}
                isDownloadingPdf={isDownloadingPdf}
                isPdfReady={isPdfReady}
                isUpdatingLayout={isUpdatingLayout}
                isLoadingJson={isLoadingJson}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
});
