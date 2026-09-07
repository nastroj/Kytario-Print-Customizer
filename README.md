# Kytario Print Customizer 🎵📄

[![Version](https://img.shields.io/badge/version-1.0.1-emerald.svg)](package.json)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A modern, responsive web application designed for guitarists, musicians, worship teams, and choir leaders to format, customize, preview, and print beautiful, professional songbooks with chords and lyrics.

Built to process and print exported songbook JSON files from [Kytario](https://kytario.cz) or standard bracketed chord notation (`[Am]`, `[G]`, `[C]`).

---

## 🌟 Key Features

### 📄 Professional Print Engine
- **Physical Page Precision**: Supports **A4** (210 × 297 mm), **A5** (148 × 210 mm), and **US Letter** (8.5 × 11 in) in both **Landscape** and **Portrait** orientations.
- **Pixel-Perfect Printing**: Native `@media print` CSS engine with strict page break isolation (`break-after: page`), balanced margins, and two-sided printing support.
- **Direct PDF Export**: Seamlessly print or export to PDF via the browser print dialog (`Ctrl+P` / `Cmd+P` or the one-click toolbar button) with crisp vector fonts.

### 📐 SmartFit Auto-Scaling Algorithm
- **Intelligent Section-Aware Fitting**: Calculates the physical vertical height of songs by summing line heights, chords, stanza breaks (`h-3`), and inter-section margin buffers (`mb-4`).
- **Page-Filling for Short Songs**: Automatically detects songs with fewer lines and upscales them (up to 2.25×) to fill the page with generous, readable typography, eliminating awkward empty space.
- **Strict Readability Floor**: Enforces a strict minimum font size constraint (**≥ 9.0px**), guaranteeing that dense multi-stanza songs remain easily readable on stage, music stands, and tablets.

### 🎨 Complete Typography & Color Customization
- **Independent Font Sizes**: Configure specific font sizes for:
  - Song Titles (8px – 48px)
  - Artist Names (6px – 36px)
  - Lyrics (6px – 36px)
  - Chords (6px – 36px)
  - Table of Contents (6px – 36px)
- **Granular Color Pickers**: Individual color controls for Titles, Artists, Lyrics, Chords, Table of Contents, and Section Markers (`[Chorus]`, `[Verse]`, `[Intro]`, etc.).
- **One-Click Defaults**: Instantly reset colors and typography to balanced light or dark defaults.

### 📑 Structured Table of Contents & Navigation
- **Automatic TOC Generation**: Dynamically builds an interactive Table of Contents with computed physical page numbers.
- **Flexible Sorting**: Sort songs **Alphabetically** or preserve the **Original Order** from your source file.
- **Quick Song Navigation**: Jump to any song instantly via the floating preview navigation drawer or TOC links.

### 🎛️ Interactive Preview & Stage Modes
- **Realistic WYSIWYG Pagination**: Live viewport showing exact physical page borders, margins, and column layouts.
- **Multi-Column Flow**: Choose 1, 2, or 3 columns with balanced CSS multi-column flow and section break protection (`break-inside: avoid`).
- **Zoom Presets**: Fit to Width, Fit Page, or smooth custom zoom (50% – 200%).
- **Dark / Light Mode**: Switch between high-contrast daylight mode and an eye-safe dark theme designed for dimly lit stages and rehearsals.

### 🛠️ Developer & Debug Tools (Configurable)
- **Song Fit Debug HUD**: An analytical diagnostic panel displaying exact line counts (raw, non-empty, visual wrapped), chosen font sizes, scale factors, column height utilization %, and section breakdown.
- **Hidden by Default**: Controlled via `/src/config.ts` (`ENABLE_DEBUG_HUD: false`) to keep the user interface clean and distraction-free.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Node.js** (v18.0.0 or v20+ recommended)
- **npm** (v9+), **yarn**, or **pnpm**

### 1. Clone the Repository
```bash
git clone https://github.com/nastroj/Kytario-Print-Customizer.git
cd Kytario-Print-Customizer
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

### 4. Build for Production
To create an optimized production build in `dist/`:
```bash
npm run build
```

To test the production build locally:
```bash
npm run preview
```

### 5. Code Quality & Typechecking
```bash
npm run lint
```

---

## 📖 How to Use

### 1. Loading Your Songs
You can load songs into the application in three ways:
1. **Load Default Sample**: Click **"Use Sample Songbook"** on the welcome screen to explore a curated multi-song songbook (Pink Floyd, Leonard Cohen, Czech folk classics, etc.).
2. **Upload a JSON File**: Drag & drop your `.json` file or click **"Choose JSON File"** to upload an exported Kytario file.
3. **Paste Raw JSON**: Click **"Paste JSON Content"** in the sidebar or upload screen to paste JSON directly from your clipboard.

### 2. Customizing the Printout
Use the left sidebar to fine-tune your songbook:
- **Page & Layout**: Select paper size (A4, A5, Letter), orientation (Landscape or Portrait), and column count (1, 2, or 3).
- **Display Options**: Toggle chords on/off, enable/disable `smartFit` auto-scaling, and choose Table of Contents sorting.
- **Fonts & Colors**: Adjust font sizes and colors with real-time sliders and color pickers.
- Click **"Update Preview"** to re-render the songbook.

### 3. Printing & Saving to PDF
1. Click the **"Print"** button in the top bar or press `Ctrl+P` (`Cmd+P` on Mac).
2. In the browser print dialog:
   - **Destination**: Choose your physical printer or **"Save as PDF"**.
   - **Paper Size**: Match the setting selected in the app (e.g. A4 or Letter).
   - **Layout**: Match the orientation selected in the app (e.g. Landscape).
   - **Margins**: Set to **"None"** or **"Default"** (page margins are already built into the print stylesheets).
   - **Options**: Ensure **"Background graphics"** is checked to preserve chord colors and section backgrounds.

---

## 📋 Supported JSON Format

The application expects JSON matching the Kytario schema:

```json
{
  "title": "My Acoustic Songbook",
  "songs": [
    {
      "title": "Wish You Were Here",
      "artist": "Pink Floyd",
      "text": "[Intro]\n[Em7] [G] [Em7] [G] [Em7] [A7sus4] [Em7] [A7sus4] [G]\n\n[1.]\n[C] So, so you think you can [D/F#] tell\nHeaven from [Am] hell, blue skies from [G] pain.\nCan you tell a green [D/F#] field from a cold steel [C] rail?\nA smile from a [Am] veil? Do you think you can [G] tell?\n\n[R]\n[C] How I wish, how I wish you were [D/F#] here.\nWe're just [Am] two lost souls swimming in a fish bowl, [G] year after year,\n[D/F#] Running over the same old ground. [C] What have we found?\nThe same old [Am] fears. Wish you were [G] here.\n\n[Outro]\n[Em7] [G] [Em7] [G] [Em7] [A7sus4] [Em7] [A7sus4] [G]"
    }
  ]
}
```

### Syntax Notes:
- **Chords**: Wrapped in square brackets (e.g. `[Am]`, `[D/F#]`, `[Cmaj7]`). Placed immediately before the lyric syllable they correspond to.
- **Chord-only / Instrumental Lines**: Lines containing only chords (e.g. intros, solos) are automatically identified and positioned without blank lyric gaps.
- **Section Markers**: Wrapped in square brackets at the start of a block (e.g. `[1.]`, `[Verse 1]`, `[Chorus]`, `[R]`, `[Intro]`, `[Bridge]`, `[Outro]`).
- **Empty Lines**: Standard newline breaks (`\n\n`) represent stanza and section pauses.

---

## ⚙️ Configuration

Global application settings can be configured in `/src/config.ts`:

```typescript
export const APP_CONFIG = {
  /**
   * Set to `true` to enable the Song Fit Debug HUD and show the bug icon
   * in the preview toolbar. When `false` (default), the debug panel and
   * icon remain completely hidden.
   */
  ENABLE_DEBUG_HUD: false,
};
```

When enabled, you can toggle the Debug HUD using the toolbar icon or the shortcut:
```
Ctrl + Shift + D
```

---

## 🏗️ Architecture & Project Structure

```
kytario-print-customizer/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx            # Left drawer with layout, font, & color controls
│   │   ├── SongbookPreview.tsx    # Interactive WYSIWYG pagination & preview canvas
│   │   ├── SongDisplay.tsx        # Individual song card & useSmartFit hook
│   │   ├── SongFitDebugHud.tsx    # Diagnostic HUD for line counts and font metrics
│   │   ├── ProgressBar.tsx        # Loading & rendering progress indicator
│   │   └── ErrorBoundary.tsx      # Graceful error fallbacks
│   ├── config.ts                  # Global configuration (debug flags, etc.)
│   ├── types.ts                   # Shared TypeScript interfaces & types
│   ├── utils.ts                   # Chord parsing, smartFit algorithm, & debug metrics
│   ├── App.tsx                    # Root application state & file upload handlers
│   └── main.tsx                   # Vite entry point
├── index.html                     # HTML entry point with print styles
├── vite.config.ts                 # Vite + Tailwind CSS plugin configuration
└── package.json                   # Dependencies and scripts
```

---

## 🛠️ Built With

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/)
- **Language**: [TypeScript 5.8](https://www.typescriptlang.org/)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [Issues](https://github.com/nastroj/Kytario-Print-Customizer/issues) page.
