import React, { useState } from 'react';
import { BookOpen, Sparkles, FileText, Upload, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { PrintSettings } from '../../types';
import { resizeAndCompressImage } from '../../utils/imageResize';
import { MaterialToggle } from './MaterialToggle';
import { LocalizedInput, LocalizedTextarea } from './LocalizedInput';

export const DEFAULT_NOTATION_TEXT = "Tento zpěvník používá německou notaci - tóny C-C#-D-D#-E-F-F#-G-G#-A-B-H.\nTón B odpovídá tónu A# nebo Hb.";
export const DEFAULT_FOOTER_TEXT = "Vytvořeno s ♥ pomocí kytario.com | Vytvoř si zpěvník, sdílej ho a hraj.\nPosouvejte text živě společně, transponuj do libovolné tóniny nebo exportuj do PDF - zdarma pro tebe i tvé přátele. :)";

export interface CoverPageSectionProps {
  idSuffix: string;
  draftSettings: PrintSettings;
  hasCoverChanges: boolean;
  onSettingChange: (key: keyof PrintSettings, value: any) => void;
  onResetDefaults: () => void;
}

const COVER_KEYS: (keyof PrintSettings)[] = [
  'showFrontCover',
  'frontCoverType',
  'frontCoverTitle',
  'frontCoverSubtitle',
  'frontCoverDedication',
  'frontCoverShowDedication',
  'frontCoverUrl',
  'frontCoverQrUrl',
  'frontCoverShowQr',
  'frontCoverCustomImage',
  'frontCoverImagePosition',
  'frontCoverAlignment',
  'frontCoverShowNotation',
  'frontCoverNotationText',
  'frontCoverShowFooter',
  'frontCoverFooterText',
  'showBackCover',
  'backCoverType',
  'backCoverTitle',
  'backCoverSubtitle',
  'backCoverDedication',
  'backCoverShowDedication',
  'backCoverUrl',
  'backCoverQrUrl',
  'backCoverShowQr',
  'backCoverCustomImage',
  'backCoverImagePosition',
  'backCoverAlignment',
  'backCoverShowNotation',
  'backCoverNotationText',
  'backCoverShowFooter',
  'backCoverFooterText',
];

function areCoverPropsEqual(prev: CoverPageSectionProps, next: CoverPageSectionProps): boolean {
  if (prev.idSuffix !== next.idSuffix) return false;
  if (prev.hasCoverChanges !== next.hasCoverChanges) return false;
  if (prev.onSettingChange !== next.onSettingChange) return false;
  if (prev.onResetDefaults !== next.onResetDefaults) return false;

  for (const key of COVER_KEYS) {
    if (prev.draftSettings[key] !== next.draftSettings[key]) {
      return false;
    }
  }
  return true;
}

export const CoverPageSection = React.memo(function CoverPageSection({
  idSuffix,
  draftSettings,
  hasCoverChanges,
  onSettingChange,
  onResetDefaults,
}: CoverPageSectionProps) {
  const [isProcessingFrontImage, setIsProcessingFrontImage] = useState(false);
  const [isProcessingBackImage, setIsProcessingBackImage] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(true);
  const [isFrontCoverOpen, setIsFrontCoverOpen] = useState(false);
  const [isBackCoverOpen, setIsBackCoverOpen] = useState(false);

  const handleFrontImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingFrontImage(true);
      const compressedDataUrl = await resizeAndCompressImage(file, 1200, 0.85);
      onSettingChange('frontCoverCustomImage', compressedDataUrl);
    } catch (err) {
      console.error('Failed to resize front cover image:', err);
      // Fallback to raw FileReader if canvas resize fails
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onSettingChange('frontCoverCustomImage', reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingFrontImage(false);
    }
  };

  const handleBackImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingBackImage(true);
      const compressedDataUrl = await resizeAndCompressImage(file, 1200, 0.85);
      onSettingChange('backCoverCustomImage', compressedDataUrl);
    } catch (err) {
      console.error('Failed to resize back cover image:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onSettingChange('backCoverCustomImage', reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingBackImage(false);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-black/5 dark:border-zinc-800">
      {/* Section Header */}
      <div 
        onClick={() => setIsSectionOpen((prev) => !prev)}
        className="flex items-center justify-between cursor-pointer group select-none py-0.5"
      >
        <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
          <BookOpen className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          Cover Pages
          {hasCoverChanges && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.2 rounded-md normal-case">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Modified
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResetDefaults();
            }}
            className="px-2 py-0.5 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title="Reset cover settings to default"
          >
            Defaults
          </button>
          <div className="p-0.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
            {isSectionOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {isSectionOpen && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* =========================================================================
              FRONT COVER
             ========================================================================= */}
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60 transition-all">
            <div 
              onClick={() => setIsFrontCoverOpen((prev) => !prev)}
              className="flex items-center justify-between select-none cursor-pointer group"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    id={`showFrontCover-label-${idSuffix}`}
                    className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors"
                  >
                    Front Cover Page
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-md ${
                    draftSettings.showFrontCover === false
                      ? 'bg-zinc-200/50 dark:bg-zinc-700/50 text-zinc-500 dark:text-zinc-400'
                      : draftSettings.frontCoverType === 'custom'
                      ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold'
                      : 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                  }`}>
                    {draftSettings.showFrontCover === false 
                      ? 'Hidden' 
                      : draftSettings.frontCoverType === 'custom' 
                      ? 'Custom Page' 
                      : 'Auto (Kytario)'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">Opening title & attribution page</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div onClick={(e) => e.stopPropagation()} title="Enable or disable front cover page">
                  <MaterialToggle
                    id={`showFrontCover-toggle-${idSuffix}`}
                    size="sm"
                    checked={draftSettings.showFrontCover !== false}
                    onChange={(checked) => onSettingChange('showFrontCover', checked)}
                    ariaLabel="Enable front cover page"
                  />
                </div>
                <div className="p-0.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
                  {isFrontCoverOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {isFrontCoverOpen && (
              <div className="space-y-2.5 pt-2.5 mt-2.5 border-t border-black/5 dark:border-zinc-700/60 animate-in fade-in duration-150">
            {/* Type Toggle: Auto (Kytario) vs Custom */}
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Front Cover Style
                </label>
                <div className="grid grid-cols-2 gap-1 bg-zinc-200/70 dark:bg-zinc-900/80 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => onSettingChange('frontCoverType', 'auto')}
                    className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      (draftSettings.frontCoverType || 'auto') === 'auto'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Auto (Kytario)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSettingChange('frontCoverType', 'custom')}
                    className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      draftSettings.frontCoverType === 'custom'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Custom Page</span>
                  </button>
                </div>
              </div>

              {/* Informational banner when Auto is selected */}
              {(draftSettings.frontCoverType || 'auto') === 'auto' ? (
                <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/40 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    Auto-generated Cover
                  </p>
                  <p className="text-blue-700/80 dark:text-blue-300/80 leading-relaxed text-[10px]">
                    Automatically renders songbook title, short link, centered QR code, standard German notation guide, and Kytario footer. Switch to <strong>Custom Page</strong> to override texts, add custom artwork, or customize the layout.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 p-2 bg-white dark:bg-zinc-900/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                  {/* Custom Cover Form */}
                  {/* Custom Title */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Cover Title
                    </label>
                    <LocalizedInput
                      id={`frontCoverTitle-${idSuffix}`}
                      value={draftSettings.frontCoverTitle ?? ''}
                      onChange={(val) => onSettingChange('frontCoverTitle', val)}
                      placeholder="Defaults to songbook title"
                      className="w-full text-xs px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                    />
                  </div>

                  {/* Custom Subtitle / Author */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Subtitle / Author / Date
                    </label>
                    <LocalizedInput
                      id={`frontCoverSubtitle-${idSuffix}`}
                      value={draftSettings.frontCoverSubtitle ?? ''}
                      onChange={(val) => onSettingChange('frontCoverSubtitle', val)}
                      placeholder="e.g. Summer Camp 2026 • Guitar Edition"
                      className="w-full text-xs px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                    />
                  </div>

                  {/* Dedication / Note Text */}
                  <div className="space-y-1.5">
                    <div
                      onClick={() => onSettingChange('frontCoverShowDedication', draftSettings.frontCoverShowDedication === false ? true : false)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
                        Dedication / Note Text
                      </label>
                      <MaterialToggle
                        size="sm"
                        checked={draftSettings.frontCoverShowDedication !== false}
                        onChange={(checked) => onSettingChange('frontCoverShowDedication', checked)}
                        ariaLabel="Dedication / Note Text"
                      />
                    </div>
                    {draftSettings.frontCoverShowDedication !== false && (
                      <LocalizedTextarea
                        id={`frontCoverDedication-${idSuffix}`}
                        rows={2}
                        value={draftSettings.frontCoverDedication ?? ''}
                        onChange={(val) => onSettingChange('frontCoverDedication', val)}
                        placeholder="e.g. Dedicated to all campfire musicians and friends of good music."
                        className="w-full text-xs px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 resize-none italic"
                      />
                    )}
                  </div>

                  {/* URL / Link */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Display Link / Web Address
                    </label>
                    <LocalizedInput
                      id={`frontCoverUrl-${idSuffix}`}
                      value={draftSettings.frontCoverUrl ?? ''}
                      onChange={(val) => onSettingChange('frontCoverUrl', val)}
                      placeholder="e.g. kytario.com/bodg"
                      className="w-full text-xs px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                    />
                  </div>

                  {/* QR Code Toggle */}
                  <div
                    onClick={() => onSettingChange('frontCoverShowQr', draftSettings.frontCoverShowQr === false ? true : false)}
                    className="flex items-center justify-between pt-1 cursor-pointer select-none"
                  >
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                      Include QR Code
                    </span>
                    <MaterialToggle
                      id={`frontCoverShowQr-${idSuffix}`}
                      size="sm"
                      checked={draftSettings.frontCoverShowQr !== false}
                      onChange={(checked) => onSettingChange('frontCoverShowQr', checked)}
                      ariaLabel="Include QR Code"
                    />
                  </div>

                  {/* Custom Artwork Upload */}
                  <div className="pt-2 border-t border-black/5 dark:border-zinc-700/60">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                      Cover Image / Artwork
                    </label>
                    {draftSettings.frontCoverCustomImage ? (
                      <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-black/10 dark:border-zinc-700">
                        <img
                          src={draftSettings.frontCoverCustomImage}
                          alt="Cover Preview"
                          className="w-10 h-10 object-contain rounded bg-white dark:bg-zinc-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            Custom Image Attached
                          </p>
                          <p className="text-[10px] text-zinc-400">Optimized for print & PDF</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSettingChange('frontCoverCustomImage', undefined)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="Remove custom image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-dashed border-black/15 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-500 cursor-pointer transition-colors text-center">
                        {isProcessingFrontImage ? (
                          <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                          {isProcessingFrontImage ? 'Resizing & optimizing...' : 'Upload cover photo or logo'}
                        </span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          disabled={isProcessingFrontImage}
                          onChange={handleFrontImageUpload}
                        />
                      </label>
                    )}

                    {draftSettings.frontCoverCustomImage && (
                      <div className="mt-2">
                        <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                          Image Placement
                        </label>
                        <select
                          value={draftSettings.frontCoverImagePosition || 'replace-qr'}
                          onChange={(e) => onSettingChange('frontCoverImagePosition', e.target.value)}
                          className="w-full text-xs px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                        >
                          <option value="replace-qr">Replace QR code with image</option>
                          <option value="above-title">Above Title (Header Logo)</option>
                          <option value="below-qr">Below QR code</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Notation Guide Options */}
                  <div className="pt-2 border-t border-black/5 dark:border-zinc-700/60 space-y-1.5">
                    <div
                      onClick={() => onSettingChange('frontCoverShowNotation', draftSettings.frontCoverShowNotation === false ? true : false)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                        German Notation Notice
                      </span>
                      <MaterialToggle
                        id={`frontCoverShowNotation-${idSuffix}`}
                        size="sm"
                        checked={draftSettings.frontCoverShowNotation !== false}
                        onChange={(checked) => onSettingChange('frontCoverShowNotation', checked)}
                        ariaLabel="German Notation Notice"
                      />
                    </div>
                    {draftSettings.frontCoverShowNotation !== false && (
                      <LocalizedTextarea
                        id={`frontCoverNotationText-${idSuffix}`}
                        rows={2}
                        value={draftSettings.frontCoverNotationText ?? DEFAULT_NOTATION_TEXT}
                        onChange={(val) => onSettingChange('frontCoverNotationText', val)}
                        className="w-full text-[11px] p-2 rounded bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 resize-none font-mono"
                        title="Edit notation guide message"
                      />
                    )}
                  </div>

                  {/* Footer Attribution Options */}
                  <div className="pt-2 border-t border-black/5 dark:border-zinc-700/60 space-y-1.5">
                    <div
                      onClick={() => onSettingChange('frontCoverShowFooter', draftSettings.frontCoverShowFooter === false ? true : false)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                        Footer Attribution
                      </span>
                      <MaterialToggle
                        id={`frontCoverShowFooter-${idSuffix}`}
                        size="sm"
                        checked={draftSettings.frontCoverShowFooter !== false}
                        onChange={(checked) => onSettingChange('frontCoverShowFooter', checked)}
                        ariaLabel="Footer Attribution"
                      />
                    </div>
                    {draftSettings.frontCoverShowFooter !== false && (
                      <LocalizedTextarea
                        id={`frontCoverFooterText-${idSuffix}`}
                        rows={2}
                        value={draftSettings.frontCoverFooterText ?? DEFAULT_FOOTER_TEXT}
                        onChange={(val) => onSettingChange('frontCoverFooterText', val)}
                        className="w-full text-[11px] p-2 rounded bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 resize-none"
                        title="Edit footer attribution message"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            BACK COVER
           ========================================================================= */}
        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-black/5 dark:border-zinc-700/60 transition-all">
          <div 
            onClick={() => setIsBackCoverOpen((prev) => !prev)}
            className="flex items-center justify-between select-none cursor-pointer group"
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  id={`showBackCover-label-${idSuffix}`}
                  className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors"
                >
                  Back Cover Page
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-md ${
                  draftSettings.showBackCover === false
                    ? 'bg-zinc-200/50 dark:bg-zinc-700/50 text-zinc-500 dark:text-zinc-400'
                    : draftSettings.backCoverType === 'custom'
                    ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                }`}>
                  {draftSettings.showBackCover === false 
                    ? 'Hidden' 
                    : draftSettings.backCoverType === 'custom' 
                    ? 'Custom Page' 
                    : 'Auto (Standard)'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">Closing rear page & epilogue</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div onClick={(e) => e.stopPropagation()} title="Enable or disable back cover page">
                <MaterialToggle
                  id={`showBackCover-toggle-${idSuffix}`}
                  size="sm"
                  checked={draftSettings.showBackCover !== false}
                  onChange={(checked) => onSettingChange('showBackCover', checked)}
                  ariaLabel="Enable back cover page"
                />
              </div>
              <div className="p-0.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
                {isBackCoverOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {isBackCoverOpen && (
            <div className="space-y-2.5 pt-2.5 mt-2.5 border-t border-black/5 dark:border-zinc-700/60 animate-in fade-in duration-150">
            {/* Back Cover Style: Auto vs Custom */}
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Back Cover Style
                </label>
                <div className="grid grid-cols-2 gap-1 bg-zinc-200/70 dark:bg-zinc-900/80 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => onSettingChange('backCoverType', 'auto')}
                    className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      (draftSettings.backCoverType || 'auto') === 'auto'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Auto (Standard)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSettingChange('backCoverType', 'custom')}
                    className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      draftSettings.backCoverType === 'custom'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Custom Page</span>
                  </button>
                </div>
              </div>

              {(draftSettings.backCoverType || 'auto') === 'auto' ? (
                <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/40 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    Auto-generated Back Cover
                  </p>
                  <p className="text-blue-700/80 dark:text-blue-300/80 leading-relaxed text-[10px]">
                    Renders default back cover layout with QR code, German notation guide, and attributions. Switch to <strong>Custom Page</strong> to override texts, add custom artwork, or customize layout.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 p-2 bg-white dark:bg-zinc-900/60 rounded-lg border border-black/5 dark:border-zinc-700/60">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Back Cover Title
                    </label>
                    <LocalizedInput
                      id={`backCoverTitle-${idSuffix}`}
                      value={draftSettings.backCoverTitle ?? ''}
                      onChange={(val) => onSettingChange('backCoverTitle', val)}
                      placeholder="Defaults to ZADNÍ STRANA"
                      className="w-full text-xs px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Subtitle / Author
                    </label>
                    <LocalizedInput
                      id={`backCoverSubtitle-${idSuffix}`}
                      value={draftSettings.backCoverSubtitle ?? ''}
                      onChange={(val) => onSettingChange('backCoverSubtitle', val)}
                      placeholder="e.g. Epilogue • Notes"
                      className="w-full text-xs px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div
                      onClick={() => onSettingChange('backCoverShowDedication', draftSettings.backCoverShowDedication === false ? true : false)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer">
                        Dedication / Note Text
                      </label>
                      <MaterialToggle
                        size="sm"
                        checked={draftSettings.backCoverShowDedication !== false}
                        onChange={(checked) => onSettingChange('backCoverShowDedication', checked)}
                        ariaLabel="Dedication / Note Text"
                      />
                    </div>
                    {draftSettings.backCoverShowDedication !== false && (
                      <LocalizedTextarea
                        id={`backCoverDedication-${idSuffix}`}
                        rows={2}
                        value={draftSettings.backCoverDedication ?? ''}
                        onChange={(val) => onSettingChange('backCoverDedication', val)}
                        placeholder="e.g. Keep on playing!"
                        className="w-full text-xs px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400 resize-none italic"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Display Link / Web Address
                    </label>
                    <LocalizedInput
                      id={`backCoverUrl-${idSuffix}`}
                      value={draftSettings.backCoverUrl ?? ''}
                      onChange={(val) => onSettingChange('backCoverUrl', val)}
                      placeholder="e.g. kytario.com"
                      className="w-full text-xs px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                    />
                  </div>

                  <div
                    onClick={() => onSettingChange('backCoverShowQr', draftSettings.backCoverShowQr === false ? true : false)}
                    className="flex items-center justify-between pt-1 cursor-pointer select-none"
                  >
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                      Include QR Code
                    </span>
                    <MaterialToggle
                      id={`backCoverShowQr-${idSuffix}`}
                      size="sm"
                      checked={draftSettings.backCoverShowQr !== false}
                      onChange={(checked) => onSettingChange('backCoverShowQr', checked)}
                      ariaLabel="Include QR Code"
                    />
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-zinc-700/60">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1.5">
                      Back Cover Artwork
                    </label>
                    {draftSettings.backCoverCustomImage ? (
                      <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-black/10 dark:border-zinc-700">
                        <img
                          src={draftSettings.backCoverCustomImage}
                          alt="Back Cover Preview"
                          className="w-10 h-10 object-contain rounded bg-white dark:bg-zinc-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            Custom Image Attached
                          </p>
                          <p className="text-[10px] text-zinc-400">Optimized for print & PDF</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSettingChange('backCoverCustomImage', undefined)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="Remove custom image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-dashed border-black/15 dark:border-zinc-700 hover:border-zinc-900 dark:hover:border-zinc-500 cursor-pointer transition-colors text-center">
                        {isProcessingBackImage ? (
                          <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                          {isProcessingBackImage ? 'Resizing & optimizing...' : 'Upload back cover image or logo'}
                        </span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          disabled={isProcessingBackImage}
                          onChange={handleBackImageUpload}
                        />
                      </label>
                    )}

                    {draftSettings.backCoverCustomImage && (
                      <div className="mt-2">
                        <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                          Image Placement
                        </label>
                        <select
                          value={draftSettings.backCoverImagePosition || 'replace-qr'}
                          onChange={(e) => onSettingChange('backCoverImagePosition', e.target.value)}
                          className="w-full text-xs px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                        >
                          <option value="replace-qr">Replace QR code with image</option>
                          <option value="above-title">Above Title (Header Logo)</option>
                          <option value="below-qr">Below QR code</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-zinc-700/60 space-y-1.5">
                    <div
                      onClick={() => onSettingChange('backCoverShowNotation', draftSettings.backCoverShowNotation === false ? true : false)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                        Notation Notice
                      </span>
                      <MaterialToggle
                        id={`backCoverShowNotation-${idSuffix}`}
                        size="sm"
                        checked={draftSettings.backCoverShowNotation !== false}
                        onChange={(checked) => onSettingChange('backCoverShowNotation', checked)}
                        ariaLabel="Notation Notice"
                      />
                    </div>
                    {draftSettings.backCoverShowNotation !== false && (
                      <LocalizedTextarea
                        id={`backCoverNotationText-${idSuffix}`}
                        rows={2}
                        value={draftSettings.backCoverNotationText ?? DEFAULT_NOTATION_TEXT}
                        onChange={(val) => onSettingChange('backCoverNotationText', val)}
                        className="w-full text-[11px] p-2 rounded bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 resize-none font-mono"
                      />
                    )}
                  </div>

                  <div className="pt-2 border-t border-black/5 dark:border-zinc-700/60 space-y-1.5">
                    <div
                      onClick={() => onSettingChange('backCoverShowFooter', draftSettings.backCoverShowFooter === false ? true : false)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                        Footer Attribution
                      </span>
                      <MaterialToggle
                        id={`backCoverShowFooter-${idSuffix}`}
                        size="sm"
                        checked={draftSettings.backCoverShowFooter !== false}
                        onChange={(checked) => onSettingChange('backCoverShowFooter', checked)}
                        ariaLabel="Footer Attribution"
                      />
                    </div>
                    {draftSettings.backCoverShowFooter !== false && (
                      <LocalizedTextarea
                        id={`backCoverFooterText-${idSuffix}`}
                        rows={2}
                        value={draftSettings.backCoverFooterText ?? DEFAULT_FOOTER_TEXT}
                        onChange={(val) => onSettingChange('backCoverFooterText', val)}
                        className="w-full text-[11px] p-2 rounded bg-zinc-50 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 resize-none"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}
    </div>
  );
}, areCoverPropsEqual);

