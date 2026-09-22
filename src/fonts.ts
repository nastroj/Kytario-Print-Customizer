export type FontCategory = 'sans-serif' | 'serif' | 'monospace';

export interface CuratedFont {
  id: string;
  name: string;
  category: FontCategory;
  categoryLabel: string;
  description: string;
  googleFontFamily: string;
  cssStack: string;
}

export const CURATED_FONTS: CuratedFont[] = [
  // Sans-Serif Fonts (Modern & Clean)
  {
    id: 'Inter',
    name: 'Inter',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    description: 'Modern, balanced & crisp',
    googleFontFamily: 'Inter:ital,wght@0,400;0,600;0,700;1,400;1,700',
    cssStack: '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: 'Roboto',
    name: 'Roboto',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    description: 'Neutral, clean & versatile',
    googleFontFamily: 'Roboto:ital,wght@0,400;0,500;0,700;1,400;1,700',
    cssStack: '"Roboto", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    id: 'Open Sans',
    name: 'Open Sans',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    description: 'Warm, open & friendly print',
    googleFontFamily: 'Open+Sans:ital,wght@0,400;0,600;0,700;1,400;1,700',
    cssStack: '"Open Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    id: 'Lato',
    name: 'Lato',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    description: 'Humanist warmth & harmony',
    googleFontFamily: 'Lato:ital,wght@0,400;0,700;1,400;1,700',
    cssStack: '"Lato", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    id: 'Montserrat',
    name: 'Montserrat',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    description: 'Geometric display & bold titles',
    googleFontFamily: 'Montserrat:ital,wght@0,400;0,600;0,700;1,400;1,700',
    cssStack: '"Montserrat", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    id: 'Rubik',
    name: 'Rubik',
    category: 'sans-serif',
    categoryLabel: 'Sans-Serif',
    description: 'Slightly rounded modern tone',
    googleFontFamily: 'Rubik:ital,wght@0,400;0,600;0,700;1,400;1,700',
    cssStack: '"Rubik", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },

  // Serif Fonts (Classic, Literary & Hymnal)
  {
    id: 'Merriweather',
    name: 'Merriweather',
    category: 'serif',
    categoryLabel: 'Serif',
    description: 'Designed for printed songbooks',
    googleFontFamily: 'Merriweather:ital,wght@0,400;0,700;1,400;1,700',
    cssStack: '"Merriweather", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    id: 'Lora',
    name: 'Lora',
    category: 'serif',
    categoryLabel: 'Serif',
    description: 'Calligraphic lyricism & acoustic folk',
    googleFontFamily: 'Lora:ital,wght@0,400;0,600;0,700;1,400;1,700',
    cssStack: '"Lora", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    id: 'Playfair Display',
    name: 'Playfair Display',
    category: 'serif',
    categoryLabel: 'Serif',
    description: 'High-contrast elegant editorial',
    googleFontFamily: 'Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700',
    cssStack: '"Playfair Display", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    id: 'PT Serif',
    name: 'PT Serif',
    category: 'serif',
    categoryLabel: 'Serif',
    description: 'Traditional literary book aesthetic',
    googleFontFamily: 'PT+Serif:ital,wght@0,400;0,700;1,400;1,700',
    cssStack: '"PT Serif", ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    id: 'EB Garamond',
    name: 'EB Garamond',
    category: 'serif',
    categoryLabel: 'Serif',
    description: 'Renaissance classical & hymnal',
    googleFontFamily: 'EB+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,700',
    cssStack: '"EB Garamond", ui-serif, Garamond, Georgia, serif',
  },

  // Monospace Fonts (Technical, Chord-Aligned & Retro)
  {
    id: 'Roboto Mono',
    name: 'Roboto Mono',
    category: 'monospace',
    categoryLabel: 'Monospace',
    description: 'Precision chord-lyric alignment',
    googleFontFamily: 'Roboto+Mono:ital,wght@0,400;0,600;0,700;1,400;1,700',
    cssStack: '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  {
    id: 'JetBrains Mono',
    name: 'JetBrains Mono',
    category: 'monospace',
    categoryLabel: 'Monospace',
    description: 'Wide, legible modern characters',
    googleFontFamily: 'JetBrains+Mono:ital,wght@0,400;0,600;0,700;1,400;1,700',
    cssStack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
  },
  {
    id: 'Fira Code',
    name: 'Fira Code',
    category: 'monospace',
    categoryLabel: 'Monospace',
    description: 'Clean structured monospace',
    googleFontFamily: 'Fira+Code:wght@400;600;700',
    cssStack: '"Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
  },
  {
    id: 'Space Mono',
    name: 'Space Mono',
    category: 'monospace',
    categoryLabel: 'Monospace',
    description: 'Distinctive retro typewriter vibe',
    googleFontFamily: 'Space+Mono:ital,wght@0,400;0,700;1,400;1,700',
    cssStack: '"Space Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
  },
];

export const DEFAULT_FONT_ID = 'Inter';

const loadedFonts = new Set<string>();

/**
 * Finds a curated font definition by its ID or name.
 */
export function getFontById(id?: string): CuratedFont {
  if (!id) {
    return CURATED_FONTS[0];
  }
  const match = CURATED_FONTS.find(
    (f) => f.id.toLowerCase() === id.toLowerCase() || f.name.toLowerCase() === id.toLowerCase()
  );
  return match || CURATED_FONTS[0];
}

/**
 * Returns the CSS font-family stack for a given font ID.
 */
export function getFontFamilyStack(id?: string): string {
  return getFontById(id).cssStack;
}

/**
 * Dynamically ensures the Google Font stylesheet is loaded in the browser.
 */
export function loadGoogleFont(id?: string): void {
  if (typeof document === 'undefined') return;

  const font = getFontById(id);
  if (!font || font.id === 'Inter') {
    // Inter is already loaded in index.html
    return;
  }

  if (loadedFonts.has(font.id)) {
    return;
  }

  const linkId = `kytario-font-${font.id.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) {
    loadedFonts.add(font.id);
    return;
  }

  try {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${font.googleFontFamily}&display=swap`;
    document.head.appendChild(link);
    loadedFonts.add(font.id);
  } catch (err) {
    console.warn(`Could not load Google Font "${font.name}":`, err);
  }
}
