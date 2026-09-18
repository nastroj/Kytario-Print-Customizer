import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PrintSettings } from '../types';
import { Book } from 'lucide-react';

interface BackCoverPageProps {
  title: string;
  url?: string;
  shortUrl?: string;
  settings: PrintSettings;
  isDarkMode?: boolean;
}

export function BackCoverPage({
  title,
  url,
  shortUrl,
  settings,
  isDarkMode = false,
}: BackCoverPageProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const displayUrl = shortUrl || url || 'kytario.com';
  const qrTarget = url || 'https://kytario.com';

  useEffect(() => {
    QRCode.toDataURL(qrTarget, {
      width: 300,
      margin: 1,
      color: {
        dark: isDarkMode ? '#FFFFFF' : '#18181B',
        light: '#00000000', // Transparent
      }
    }).then(setQrCodeDataUrl).catch(console.error);
  }, [qrTarget, isDarkMode]);

  const effectiveDarkMode = isDarkMode && settings.simplifyPrintUI !== true;
  
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center p-8 ${effectiveDarkMode ? 'text-zinc-100' : 'text-zinc-900'} print:text-black`}>
      
      <div className="flex-1 flex flex-col items-center justify-center space-y-10">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-center" style={{ fontFamily: settings.fontFamily }}>
          {title}
        </h1>
        
        {/* URL with Icon */}
        <div className="flex items-center gap-3 text-lg font-medium opacity-80">
          <Book className="w-5 h-5" />
          <span>{displayUrl}</span>
        </div>

        {/* QR Code */}
        {qrCodeDataUrl && (
          <div className="p-4 bg-white rounded-2xl shadow-sm border border-black/5 print:border-none print:shadow-none print:bg-transparent">
            <img 
              src={qrCodeDataUrl} 
              alt="QR Code" 
              className="w-48 h-48 md:w-64 md:h-64 object-contain print:brightness-0"
              style={{ mixBlendMode: 'multiply' }}
            />
          </div>
        )}
      </div>

      {/* Footer Texts */}
      <div className="w-full max-w-2xl text-center space-y-6 mt-12 opacity-80 text-sm md:text-base">
        <p className="font-medium">
          Tento zpěvník používá německou notaci - tóny C-C#-D-D#-E-F-F#-G-G#-A-B-H.<br />
          Tón B odpovídá tónu A# nebo Hb.
        </p>
        
        <div className="h-px w-full bg-current opacity-20" />
        
        <p className="text-xs md:text-sm">
          Vytvořeno s ❤️ pomocí <span className="font-semibold">kytario.com</span> | Vytvoř si zpěvník, sdílej ho a hraj. Posouvejte text živě společně, transponuj do libovolné tóniny nebo exportuj do PDF - zdarma pro tebe i tvé přátele. 🙂
        </p>
      </div>

    </div>
  );
}
