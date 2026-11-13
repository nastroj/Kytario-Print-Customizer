import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Copy, RotateCcw } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  PRINT_COLOR_PRESETS,
  addRecentColor,
  clamp,
  getContrastTextColor,
  getRecentColors,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  hsvToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsv,
  type HsvColor,
} from '../../utils/colorUtils';

export interface ColorPickerModalProps {
  isOpen: boolean;
  title: string;
  value: string;
  defaultColor?: string;
  onConfirm: (hex: string) => void;
  onCancel: () => void;
}

type ChannelMode = 'rgb' | 'hsv';

/**
 * Windows 11–style Color Picker dialog designed for smooth touch interaction on
 * Android and precise mouse/keyboard control on desktop:
 * - 2D Saturation/Value spectrum pad with pointer capture & touch-action: none
 * - Full-width Hue rainbow slider
 * - Original vs. New preview pill (tap Original to revert) + editable #HEX input
 * - Switchable RGB (0-255) and HSV (H 0-360, S/V 0-100) numeric inputs
 * - Curated print swatches + recently applied colors
 */
export function ColorPickerModal({
  isOpen,
  title,
  value,
  defaultColor,
  onConfirm,
  onCancel,
}: ColorPickerModalProps) {
  const initialHex = normalizeHex(value) ?? '#18181b';
  const normalizedDefault = defaultColor ? normalizeHex(defaultColor) : null;

  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(initialHex));
  const [selectedHex, setSelectedHex] = useState<string>(initialHex);
  const [hexInput, setHexInput] = useState<string>(initialHex.slice(1).toUpperCase());
  const [channelMode, setChannelMode] = useState<ChannelMode>('rgb');
  const [recentColors, setRecentColors] = useState<string[]>(() => getRecentColors());
  const [copied, setCopied] = useState(false);
  const [isDraggingSpectrum, setIsDraggingSpectrum] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const spectrumRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const backdropPointerDownRef = useRef(false);

  // Sync internal HSV/HEX state only when the modal opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const startHex = normalizeHex(value) ?? '#18181b';
      setHsv(hexToHsv(startHex));
      setSelectedHex(startHex);
      setHexInput(startHex.slice(1).toUpperCase());
      setRecentColors(getRecentColors());
      setCopied(false);
      backdropPointerDownRef.current = false;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, value]);

  useFocusTrap(dialogRef, {
    active: isOpen,
    onEscape: onCancel,
    deferInitialFocus: true,
  });

  const currentHex = selectedHex;
  const currentRgb = hexToRgb(currentHex);

  const applyHsv = useCallback((next: HsvColor) => {
    const clampedHsv: HsvColor = {
      h: ((Math.round(next.h) % 360) + 360) % 360,
      s: clamp(Math.round(next.s), 0, 100),
      v: clamp(Math.round(next.v), 0, 100),
    };
    const nextHex = hsvToHex(clampedHsv.h, clampedHsv.s, clampedHsv.v);
    setHsv(clampedHsv);
    setSelectedHex(nextHex);
    setHexInput(nextHex.slice(1).toUpperCase());
  }, []);

  const applyHex = useCallback((hex: string) => {
    const norm = normalizeHex(hex);
    if (!norm) return;
    setHsv((prev) => {
      const next = hexToHsv(norm);
      // Preserve existing hue when selecting achromatic gray/black/white
      if (next.s === 0) {
        return { h: prev.h, s: 0, v: next.v };
      }
      return next;
    });
    setSelectedHex(norm);
    setHexInput(norm.slice(1).toUpperCase());
  }, []);

  // 2D Spectrum Pointer Handling
  const updateSpectrumFromClientPos = useCallback(
    (clientX: number, clientY: number) => {
      const el = spectrumRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);
      setHsv((prev) => {
        const next: HsvColor = {
          h: prev.h,
          s: Math.round(x * 100),
          v: Math.round((1 - y) * 100),
        };
        const nextHex = hsvToHex(next.h, next.s, next.v);
        setSelectedHex(nextHex);
        setHexInput(nextHex.slice(1).toUpperCase());
        return next;
      });
    },
    [],
  );

  const handleSpectrumPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingSpectrum(true);
    updateSpectrumFromClientPos(e.clientX, e.clientY);
  };

  const handleSpectrumPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSpectrum) return;
    e.preventDefault();
    updateSpectrumFromClientPos(e.clientX, e.clientY);
  };

  const handleSpectrumPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSpectrum) return;
    setIsDraggingSpectrum(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleSpectrumKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    let handled = true;
    if (e.key === 'ArrowLeft') applyHsv({ ...hsv, s: hsv.s - step });
    else if (e.key === 'ArrowRight') applyHsv({ ...hsv, s: hsv.s + step });
    else if (e.key === 'ArrowUp') applyHsv({ ...hsv, v: hsv.v + step });
    else if (e.key === 'ArrowDown') applyHsv({ ...hsv, v: hsv.v - step });
    else handled = false;
    if (handled) e.preventDefault();
  };

  // Hue Slider Pointer Handling
  const updateHueFromClientPos = useCallback((clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const nextHue = Math.round(ratio * 359);
    setHsv((prev) => {
      const next: HsvColor = { ...prev, h: nextHue };
      const nextHex = hsvToHex(next.h, next.s, next.v);
      setSelectedHex(nextHex);
      setHexInput(nextHex.slice(1).toUpperCase());
      return next;
    });
  }, []);

  const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingHue(true);
    updateHueFromClientPos(e.clientX);
  };

  const handleHuePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingHue) return;
    e.preventDefault();
    updateHueFromClientPos(e.clientX);
  };

  const handleHuePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingHue) return;
    setIsDraggingHue(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleHueKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 15 : 3;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      applyHsv({ ...hsv, h: (hsv.h - step + 360) % 360 });
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      applyHsv({ ...hsv, h: (hsv.h + step) % 360 });
    }
  };

  // Hex Input Handlers
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
    setHexInput(raw.toUpperCase());
    if (raw.length === 6) {
      const norm = normalizeHex(raw);
      if (norm) {
        setSelectedHex(norm);
        setHsv((prev) => {
          const next = hexToHsv(norm);
          return next.s === 0 ? { h: prev.h, s: 0, v: next.v } : next;
        });
      }
    }
  };

  const commitHexInput = () => {
    const norm = normalizeHex(hexInput);
    if (norm) {
      applyHex(norm);
    } else {
      setHexInput(currentHex.slice(1).toUpperCase());
    }
  };

  // RGB / HSV Numeric Handlers
  const handleRgbChannelChange = (channel: 'r' | 'g' | 'b', rawVal: string) => {
    const cleaned = rawVal.replace(/\D/g, '');
    const parsed = cleaned === '' ? 0 : clamp(parseInt(cleaned, 10), 0, 255);
    const nextRgb = { ...currentRgb, [channel]: parsed };
    const nextHex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    const nextHsv = rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b);
    setHsv((prev) => (nextHsv.s === 0 ? { h: prev.h, s: 0, v: nextHsv.v } : nextHsv));
    setSelectedHex(nextHex);
    setHexInput(nextHex.slice(1).toUpperCase());
  };

  const handleHsvChannelChange = (channel: 'h' | 's' | 'v', rawVal: string) => {
    const cleaned = rawVal.replace(/\D/g, '');
    const maxVal = channel === 'h' ? 360 : 100;
    const parsed = cleaned === '' ? 0 : clamp(parseInt(cleaned, 10), 0, maxVal);
    applyHsv({ ...hsv, [channel]: channel === 'h' ? parsed % 360 : parsed });
  };

  const handleCopyHex = async () => {
    try {
      await navigator.clipboard.writeText(currentHex.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Ignore clipboard errors in restricted contexts
    }
  };

  const handleConfirm = () => {
    const finalHex = normalizeHex(hexInput) ?? currentHex;
    addRecentColor(finalHex);
    onConfirm(finalHex);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const pureHueColor = `hsl(${hsv.h}, 100%, 50%)`;
  const contrastOnCurrent = getContrastTextColor(currentHex);
  const showDefaultReset = Boolean(normalizedDefault && normalizedDefault !== currentHex);

  return createPortal(
    <div
      data-color-picker-modal="true"
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 print:hidden"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-xs animate-in fade-in duration-150"
        onPointerDown={(e) => {
          backdropPointerDownRef.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (backdropPointerDownRef.current) {
            backdropPointerDownRef.current = false;
            onCancel();
          }
        }}
        aria-hidden="true"
      />

      {/* Windows 11-inspired Color Picker Surface */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="color-picker-modal-title"
        onPointerDown={() => {
          backdropPointerDownRef.current = false;
        }}
        className="relative z-10 w-full sm:max-w-[368px] max-h-[92dvh] overflow-y-auto bg-white text-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-black/10 p-4 sm:p-5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3
              id="color-picker-modal-title"
              className="text-sm font-bold text-zinc-900 truncate leading-tight"
            >
              {title}
            </h3>
            <p className="text-[11px] text-zinc-500">Pick a color or enter HEX / RGB / HSV</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close color picker"
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. 2D Saturation / Brightness Spectrum Square */}
        <div
          ref={spectrumRef}
          role="slider"
          tabIndex={0}
          aria-label="Color saturation and brightness"
          aria-valuetext={`Saturation ${hsv.s}%, Brightness ${hsv.v}%`}
          onPointerDown={handleSpectrumPointerDown}
          onPointerMove={handleSpectrumPointerMove}
          onPointerUp={handleSpectrumPointerUp}
          onPointerCancel={handleSpectrumPointerUp}
          onKeyDown={handleSpectrumKeyDown}
          className="relative w-full h-44 sm:h-48 rounded-xl overflow-hidden border border-black/12 shadow-inner cursor-crosshair select-none touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          style={{ backgroundColor: pureHueColor }}
        >
          {/* White horizontal gradient (Saturation) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #ffffff, rgba(255,255,255,0))' }}
          />
          {/* Black vertical gradient (Brightness / Value) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #000000, rgba(0,0,0,0))' }}
          />
          {/* Draggable Spectrum Thumb */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-75 ${
              isDraggingSpectrum ? 'w-7 h-7 scale-110' : 'w-6 h-6'
            }`}
            style={{
              left: `${hsv.s}%`,
              top: `${100 - hsv.v}%`,
              backgroundColor: currentHex,
            }}
          />
        </div>

        {/* 2. Hue Rainbow Bar (Thick touch target for Android) */}
        <div className="space-y-1">
          <div
            ref={hueRef}
            role="slider"
            tabIndex={0}
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={hsv.h}
            onPointerDown={handleHuePointerDown}
            onPointerMove={handleHuePointerMove}
            onPointerUp={handleHuePointerUp}
            onPointerCancel={handleHuePointerUp}
            onKeyDown={handleHueKeyDown}
            className="relative w-full h-7 flex items-center cursor-pointer select-none touch-none focus:outline-none group"
          >
            <div
              className="w-full h-3.5 rounded-full border border-black/10 shadow-inner"
              style={{
                background:
                  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
              }}
            />
            <div
              className={`absolute -translate-x-1/2 pointer-events-none rounded-full bg-white border border-black/25 shadow-md flex items-center justify-center transition-transform duration-75 ${
                isDraggingHue ? 'w-7 h-7 scale-110' : 'w-6 h-6'
              }`}
              style={{ left: `${(hsv.h / 359) * 100}%` }}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: pureHueColor }}
              />
            </div>
          </div>
        </div>

        {/* 3. Current vs. New Preview + Editable HEX Input */}
        <div className="flex items-stretch gap-2.5">
          {/* Split Swatch: Original (left, click to revert) / New (right) */}
          <div className="flex rounded-xl overflow-hidden border border-black/15 shadow-2xs shrink-0 h-10 w-24">
            <button
              type="button"
              onClick={() => applyHex(initialHex)}
              title={`Original: ${initialHex.toUpperCase()} (tap to revert)`}
              className="flex-1 h-full relative cursor-pointer transition-opacity hover:opacity-90 flex items-center justify-center"
              style={{ backgroundColor: initialHex }}
            >
              <span
                className="text-[9px] font-bold tracking-tight uppercase opacity-75"
                style={{ color: getContrastTextColor(initialHex) }}
              >
                Old
              </span>
            </button>
            <div
              className="flex-1 h-full flex items-center justify-center border-l border-black/10"
              style={{ backgroundColor: currentHex }}
              title={`Selected: ${currentHex.toUpperCase()}`}
            >
              <span
                className="text-[9px] font-bold tracking-tight uppercase opacity-90"
                style={{ color: contrastOnCurrent }}
              >
                New
              </span>
            </div>
          </div>

          {/* #HEX Field + Copy Button */}
          <div className="flex-1 flex items-center bg-zinc-50 border border-black/10 rounded-xl px-2.5 h-10 focus-within:ring-2 focus-within:ring-zinc-900 focus-within:bg-white transition-all">
            <span className="text-xs font-bold text-zinc-400 select-none mr-1">#</span>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              onBlur={commitHexInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitHexInput();
                  e.currentTarget.blur();
                }
              }}
              maxLength={6}
              spellCheck={false}
              autoCapitalize="characters"
              aria-label="Hex color code"
              className="w-full bg-transparent text-xs font-mono font-bold text-zinc-900 tracking-wider uppercase focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyHex}
              title={copied ? 'Copied!' : 'Copy HEX code'}
              aria-label="Copy HEX code"
              className="p-1.5 -mr-1 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/60 transition-colors cursor-pointer shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* 4. Windows 11-style RGB / HSV Channel Switcher & Numeric Inputs */}
        <div className="p-2.5 bg-zinc-50 rounded-xl border border-black/5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
              Color Values
            </span>
            <div className="inline-flex p-0.5 bg-zinc-200/80 rounded-lg">
              <button
                type="button"
                onClick={() => setChannelMode('rgb')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  channelMode === 'rgb'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                RGB
              </button>
              <button
                type="button"
                onClick={() => setChannelMode('hsv')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  channelMode === 'hsv'
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                HSV
              </button>
            </div>
          </div>

          {channelMode === 'rgb' ? (
            <div className="grid grid-cols-3 gap-2">
              {(['r', 'g', 'b'] as const).map((ch) => (
                <label
                  key={ch}
                  className="flex items-center justify-between bg-white border border-black/10 rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-zinc-900"
                >
                  <span className="text-[11px] font-bold text-zinc-400 uppercase select-none">
                    {ch}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentRgb[ch]}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleRgbChannelChange(ch, e.target.value)}
                    aria-label={ch === 'r' ? 'Red' : ch === 'g' ? 'Green' : 'Blue'}
                    className="w-10 text-right text-xs font-mono font-bold text-zinc-900 bg-transparent focus:outline-none"
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'h', label: 'H', suffix: '°', aria: 'Hue' },
                { key: 's', label: 'S', suffix: '%', aria: 'Saturation' },
                { key: 'v', label: 'V', suffix: '%', aria: 'Brightness' },
              ] as const).map(({ key, label, suffix, aria }) => (
                <label
                  key={key}
                  className="flex items-center justify-between bg-white border border-black/10 rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-zinc-900"
                >
                  <span className="text-[11px] font-bold text-zinc-400 select-none">{label}</span>
                  <div className="flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={hsv[key]}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleHsvChannelChange(key, e.target.value)}
                      aria-label={aria}
                      className="w-8 text-right text-xs font-mono font-bold text-zinc-900 bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] text-zinc-400 ml-0.5 select-none">{suffix}</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 5. Quick Swatches (Print Palette & Recent Colors) */}
        <div className="space-y-2">
          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">
              Print Swatches
            </span>
            <div className="grid grid-cols-8 gap-1.5">
              {PRINT_COLOR_PRESETS.map((preset) => {
                const isSelected = currentHex === preset.hex;
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => applyHex(preset.hex)}
                    title={`${preset.name} (${preset.hex.toUpperCase()})`}
                    aria-label={`${preset.name} ${preset.hex}`}
                    aria-pressed={isSelected}
                    className={`h-7 rounded-lg border transition-transform active:scale-95 cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'ring-2 ring-zinc-900 ring-offset-1 border-black/25 scale-105'
                        : 'border-black/15 hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5"
                        style={{ color: getContrastTextColor(preset.hex) }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {recentColors.length > 0 && (
            <div>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Recent
              </span>
              <div className="grid grid-cols-8 gap-1.5">
                {recentColors.map((hex) => {
                  const isSelected = currentHex === hex;
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => applyHex(hex)}
                      title={hex.toUpperCase()}
                      aria-label={`Recent color ${hex}`}
                      aria-pressed={isSelected}
                      className={`h-7 rounded-lg border transition-transform active:scale-95 cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'ring-2 ring-zinc-900 ring-offset-1 border-black/25 scale-105'
                          : 'border-black/15 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    >
                      {isSelected && (
                        <Check
                          className="w-3.5 h-3.5"
                          style={{ color: getContrastTextColor(hex) }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 6. Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5">
          {showDefaultReset && normalizedDefault ? (
            <button
              type="button"
              onClick={() => applyHex(normalizedDefault)}
              title={`Reset to default (${normalizedDefault.toUpperCase()})`}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Default</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-black active:scale-[0.98] transition-all cursor-pointer shadow-xs"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
