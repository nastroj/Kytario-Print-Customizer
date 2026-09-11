import React from 'react';

interface KytarioLogoProps {
  className?: string;
  size?: number;
  showBorder?: boolean;
}

export const KytarioLogo: React.FC<KytarioLogoProps> = ({
  className = 'w-14 h-14 sm:w-16 sm:h-16',
  showBorder = true,
}) => {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden shrink-0 ${
        showBorder ? 'border border-zinc-800/80 shadow-md' : ''
      } ${className}`}
      role="img"
      aria-label="Kytario Logo"
    >
      <svg
        viewBox="0 0 512 512"
        className="w-full h-full block"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="kytarioBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18181b" />
            <stop offset="50%" stopColor="#27272a" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>
          <linearGradient id="kytarioAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <filter id="kytarioShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Background container with rounded corners */}
        <rect width="512" height="512" rx="112" fill="url(#kytarioBgGrad)" />
        <rect
          width="504"
          height="504"
          x="4"
          y="4"
          rx="108"
          fill="none"
          stroke="#3f3f46"
          strokeWidth="3"
          opacity="0.6"
        />

        {/* Subtle musical chord sheet lines in background */}
        <g opacity="0.15" stroke="#ffffff" strokeWidth="2">
          <line x1="96" y1="120" x2="416" y2="120" />
          <line x1="96" y1="140" x2="416" y2="140" />
          <line x1="96" y1="160" x2="416" y2="160" />
          <line x1="96" y1="180" x2="416" y2="180" />
          <line x1="96" y1="200" x2="416" y2="200" />

          <line x1="96" y1="340" x2="416" y2="340" />
          <line x1="96" y1="360" x2="416" y2="360" />
          <line x1="96" y1="380" x2="416" y2="380" />
          <line x1="96" y1="400" x2="416" y2="400" />
        </g>

        {/* Central Emblem: Guitar Pick & Songbook / Guitar */}
        <g filter="url(#kytarioShadow)">
          {/* Stylized Guitar Body / Pick Contour */}
          <path
            d="M 256,76 
               C 340,76 404,136 404,228 
               C 404,310 326,400 268,438 
               C 260,443 252,443 244,438 
               C 186,400 108,310 108,228 
               C 108,136 172,76 256,76 Z"
            fill="#18181b"
            stroke="url(#kytarioAccentGrad)"
            strokeWidth="10"
          />

          {/* Acoustic Guitar Soundhole & Strings */}
          <circle cx="256" cy="245" r="54" fill="#09090b" stroke="url(#kytarioAccentGrad)" strokeWidth="5" />
          <circle cx="256" cy="245" r="44" fill="#18181b" stroke="#52525b" strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="256" cy="245" r="32" fill="#09090b" />

          {/* Guitar Neck extending upwards */}
          <rect x="242" y="104" width="28" height="96" fill="#27272a" rx="4" />
          {/* Frets */}
          <line x1="242" y1="126" x2="270" y2="126" stroke="#71717a" strokeWidth="2" />
          <line x1="242" y1="148" x2="270" y2="148" stroke="#71717a" strokeWidth="2" />
          <line x1="242" y1="170" x2="270" y2="170" stroke="#71717a" strokeWidth="2" />
          <line x1="242" y1="192" x2="270" y2="192" stroke="#71717a" strokeWidth="2" />

          {/* Guitar Strings */}
          <line x1="247" y1="104" x2="247" y2="350" stroke="#e4e4e7" strokeWidth="2" opacity="0.85" />
          <line x1="251" y1="104" x2="251" y2="350" stroke="#e4e4e7" strokeWidth="1.8" opacity="0.85" />
          <line x1="255" y1="104" x2="255" y2="350" stroke="#e4e4e7" strokeWidth="1.8" opacity="0.85" />
          <line x1="259" y1="104" x2="259" y2="350" stroke="#e4e4e7" strokeWidth="1.8" opacity="0.85" />
          <line x1="263" y1="104" x2="263" y2="350" stroke="#e4e4e7" strokeWidth="2" opacity="0.85" />

          {/* Guitar Bridge */}
          <rect x="230" y="344" width="52" height="14" rx="5" fill="url(#kytarioAccentGrad)" />
          <circle cx="238" cy="351" r="2" fill="#18181b" />
          <circle cx="245" cy="351" r="2" fill="#18181b" />
          <circle cx="252" cy="351" r="2" fill="#18181b" />
          <circle cx="259" cy="351" r="2" fill="#18181b" />
          <circle cx="266" cy="351" r="2" fill="#18181b" />
          <circle cx="274" cy="351" r="2" fill="#18181b" />

          {/* Musical Eighth Notes on sides */}
          <g transform="translate(148, 200) scale(0.75)" fill="url(#kytarioAccentGrad)">
            <circle cx="20" cy="40" r="12" />
            <rect x="28" y="10" width="4" height="30" />
            <path d="M 32,10 C 44,12 48,22 48,28 C 42,22 36,22 32,20 Z" />
          </g>

          <g transform="translate(300, 185) scale(0.75)" fill="url(#kytarioAccentGrad)">
            <ellipse cx="20" cy="42" rx="11" ry="8" transform="rotate(-20 20 42)" />
            <ellipse cx="50" cy="34" rx="11" ry="8" transform="rotate(-20 50 34)" />
            <rect x="27" y="12" width="4" height="30" />
            <rect x="57" y="4" width="4" height="30" />
            <polygon points="27,12 61,4 61,12 27,20" />
          </g>
        </g>

        {/* Subtle Chord labels: C, G */}
        <g
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="14"
          fontWeight="700"
          textAnchor="middle"
          letterSpacing="1"
        >
          <text x="185" y="325" fill="#f59e0b">C</text>
          <text x="327" y="325" fill="#f59e0b">G</text>
        </g>
      </svg>
    </div>
  );
};
