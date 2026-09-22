import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PrintSettings } from '../types';
import { Book, Globe, Music, Sparkles } from 'lucide-react';
import { resolveCoverUrl } from '../utils';

interface FrontCoverPageProps {
  title: string;
  url?: string;
  shortUrl?: string;
  slug?: string;
  settings: PrintSettings;
  isDarkMode?: boolean;
}

export const DEFAULT_NOTATION_TEXT = `Tento zpěvník používá německou notaci - tóny C-C#-D-D#-E-F-F#-G-G#-A-B-H.
Tón B odpovídá tónu A# nebo Hb.`;

export const DEFAULT_FOOTER_TEXT = `Vytvořeno s ❤️ pomocí kytario.com | Vytvoř si zpěvník, sdílej ho a hraj. Posouvejte text živě společně, transponuj do libovolné tóniny nebo exportuj do PDF - zdarma pro tebe i tvé přátele. 🙂`;

export function FrontCoverPage({
  title,
  url,
  shortUrl,
  slug,
  settings,
  isDarkMode = false,
}: FrontCoverPageProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const isCustom = settings.frontCoverType === 'custom';
  
  // Resolve effective values based on auto/custom mode
  const displayTitle = (isCustom && settings.frontCoverTitle?.trim())
    ? settings.frontCoverTitle.trim()
    : (settings.frontCoverTitle?.trim() || title || 'ZPĚVNÍK');

  const { displayUrl, qrTarget } = resolveCoverUrl({
    isCustom,
    customUrl: settings.frontCoverUrl,
    customQrUrl: settings.frontCoverQrUrl,
    songbookUrl: url,
    songbookShortUrl: shortUrl,
    songbookSlug: slug,
  });

  const subtitle = isCustom ? settings.frontCoverSubtitle?.trim() : undefined;
  const showQr = settings.frontCoverShowQr !== false;

  const showNotation = settings.frontCoverShowNotation !== false;
  const notationText = (isCustom && settings.frontCoverNotationText !== undefined)
    ? settings.frontCoverNotationText
    : DEFAULT_NOTATION_TEXT;

  const showFooter = settings.frontCoverShowFooter !== false;
  const footerText = (isCustom && settings.frontCoverFooterText !== undefined)
    ? settings.frontCoverFooterText
    : DEFAULT_FOOTER_TEXT;

  const customImage = settings.frontCoverCustomImage;
  const imagePosition = settings.frontCoverImagePosition || 'replace-qr';
  const alignment = settings.frontCoverAlignment || 'center';
  const isLandscape = settings.orientation === 'landscape';

  useEffect(() => {
    if (!showQr || !qrTarget) {
      setQrCodeDataUrl(null);
      return;
    }

    QRCode.toDataURL(qrTarget, {
      width: 400,
      margin: 1,
      color: {
        dark: '#18181B',
        light: '#FFFFFF',
      },
    })
      .then(setQrCodeDataUrl)
      .catch((err) => {
        console.error('Failed to generate QR code for cover:', err);
      });
  }, [qrTarget, showQr]);

  const effectiveDarkMode = isDarkMode;

  // Responsive sizes based on orientation
  const qrSizeClass = isLandscape
    ? 'w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40'
    : 'w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60';

  const titleSizeClass = isLandscape
    ? 'text-3xl sm:text-4xl md:text-5xl'
    : 'text-4xl sm:text-5xl md:text-6xl';

  return (
    <div
      className={`w-full h-full flex flex-col justify-between p-6 sm:p-8 md:p-10 ${
        effectiveDarkMode ? 'text-zinc-100 bg-zinc-900' : 'text-zinc-900 bg-white'
      } print:text-black print:bg-white select-none`}
      style={{
        textAlign: alignment,
        fontFamily: settings.fontFamily || 'Inter, sans-serif',
      }}
    >
      {/* Top / Center Section */}
      <div className={`flex-1 flex flex-col justify-center ${alignment === 'center' ? 'items-center' : 'items-start'} ${isLandscape ? 'space-y-4 md:space-y-6' : 'space-y-6 md:space-y-8'} my-auto`}>
        
        {/* Custom Artwork Banner / Logo Above Title */}
        {customImage && imagePosition === 'above-title' && (
          <div className="max-w-xs max-h-28 sm:max-h-36 mb-2 overflow-hidden rounded-xl shadow-xs">
            <img
              src={customImage}
              alt="Cover Artwork"
              className="max-h-28 sm:max-h-36 w-auto object-contain mx-auto"
            />
          </div>
        )}

        {/* Main Title */}
        <div className="w-full max-w-4xl px-2">
          <h1
            className={`${titleSizeClass} font-black uppercase tracking-tight leading-tight`}
            style={{
              color: effectiveDarkMode ? (settings.titleColor || '#f4f4f5') : (settings.titleColor || '#1c1917'),
            }}
          >
            {displayTitle}
          </h1>

          {/* Subtitle / Description if present */}
          {subtitle && (
            <p className="mt-2 text-base sm:text-lg md:text-xl font-medium opacity-80 max-w-2xl mx-auto leading-snug">
              {subtitle}
            </p>
          )}

          {/* User-defined Dedication Text if present */}
          {settings.frontCoverShowDedication !== false && settings.frontCoverDedication?.trim() && (
            <div className="mt-4 mb-2 max-w-xl mx-auto px-4 py-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 italic text-sm sm:text-base font-serif opacity-90 leading-relaxed shadow-2xs">
              "{settings.frontCoverDedication.trim()}"
            </div>
          )}

          {/* URL with Icon */}
          {displayUrl && (
            <div className={`flex items-center gap-2 ${alignment === 'center' ? 'justify-center' : 'justify-start'} text-sm sm:text-base font-medium opacity-80 mt-2.5`}>
              <Book className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 opacity-80" />
              <span className="tracking-wide">{displayUrl}</span>
            </div>
          )}
        </div>

        {/* Center Artwork / QR Code */}
        <div className="flex flex-col items-center justify-center pt-1">
          {/* If Custom Image replaces QR code */}
          {customImage && (imagePosition === 'replace-qr' || !showQr) ? (
            <div className="p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-black/5 dark:border-white/10 print:border-none print:shadow-none print:bg-transparent">
              <img
                src={customImage}
                alt="Custom Cover Art"
                className={`${qrSizeClass} object-contain rounded-lg`}
              />
            </div>
          ) : (
            showQr && qrCodeDataUrl && (
              <div className="p-3 sm:p-4 bg-white rounded-2xl shadow-sm border border-black/5 print:border-none print:shadow-none print:bg-transparent transition-transform hover:scale-[1.02]">
                <img
                  src={qrCodeDataUrl}
                  alt={`QR Code to ${qrTarget}`}
                  className={`${qrSizeClass} object-contain`}
                  style={{ mixBlendMode: 'multiply' }}
                />
              </div>
            )
          )}

          {/* Custom Artwork placed below QR code */}
          {customImage && imagePosition === 'below-qr' && showQr && (
            <div className="mt-3 max-h-20 sm:max-h-24 overflow-hidden rounded-lg shadow-xs">
              <img
                src={customImage}
                alt="Cover Graphic"
                className="max-h-20 sm:max-h-24 w-auto object-contain mx-auto"
              />
            </div>
          )}
        </div>
      </div>

      {/* Lower / Footer Section */}
      <div className={`w-full max-w-3xl ${alignment === 'center' ? 'mx-auto text-center' : 'text-left'} space-y-3 pt-4 shrink-0`}>
        {/* German / Custom Notation Note */}
        {showNotation && notationText && (
          <p className="font-medium text-xs sm:text-sm leading-relaxed opacity-85 whitespace-pre-line max-w-2xl mx-auto">
            {notationText}
          </p>
        )}

        {/* Subtle Divider Line */}
        {(showNotation || showFooter) && (
          <div
            className="h-px w-full bg-current opacity-20 my-2"
            style={{
              borderColor: settings.separatorLineColor || '#a1a1aa',
            }}
          />
        )}

        {/* Bottom Attribution Footer */}
        {showFooter && footerText && (
          <p className="text-[11px] sm:text-xs leading-relaxed opacity-75 max-w-2xl mx-auto">
            {footerText}
          </p>
        )}
      </div>
    </div>
  );
}
