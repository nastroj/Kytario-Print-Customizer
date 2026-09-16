# Kytario Print Customizer 🎸

**Version:** 1.1.0

A powerful, customizable web application built with React and Tailwind CSS that allows you to process, format, and prepare Kytario songbook JSON data for publication-grade, pixel-perfect printing.

## 🌟 Features

- **Background Native PDF Generation (New in v1.1.0):**
  - **Client-Side PDF Engine:** Uses `pdf-lib` and `@pdf-lib/fontkit` inside a dedicated Web Worker to generate beautiful vector PDFs entirely in the browser.
  - **Non-Blocking UI:** Generates massive songbooks in the background without freezing the application interface, complete with a clean, dynamic progress modal.
  - **Embedded Custom Fonts:** Automatically fetches and embeds optimized `.ttf` font files (Plus Jakarta Sans, Playfair Display) so the exported PDF is highly exact and crisp.

- **Theme-Aware Persistent Settings (New in v1.1.0):**
  - **Independent Profiles:** The app now remembers completely separate configuration profiles for Light Mode and Dark Mode. Switch themes and instantly get your colors and fonts restored precisely as you left them for that specific mode.

- **Robust Multi-Pass JSON Parser (New in v1.1.0):**
  - Parses malformed, truncated, or unescaped Kytario JSON files with a multi-pass pipeline.
  - Visual, fluid progress bars showing exact parsing phases ("Extracting X of Y songs...") instead of static loading spinners.

- **Robust Auto-Save & State Persistence:**
  - **IndexedDB Engine:** Seamlessly saves full songbooks and print settings into browser IndexedDB, eliminating browser storage quota limits for large collections.
  - **Local Storage Fallback & Auto-Migration:** Automatically detects and migrates legacy songbooks from `localStorage` into IndexedDB.
  - **Draft Settings Protection:** Preserves in-progress tweaks and unapplied sidebar drafts across browser refreshes.

- **SmartFit Auto-Scaling Algorithm:**
  - Automatically calculates the optimal font size and layout scale for every single song to perfectly fill page space without awkward mid-song page breaks.
  - Configurable maximum font size caps (in pixels) to avoid oversized lyrics on short songs.

- **Smart Column Balancing & Orphan Prevention:**
  - Multi-column distribution calculates stanza breaks dynamically to avoid lone lyric lines or orphaned headers at the tops of columns.
  - Keeps head groups and tail groups intact for a clean, publication-grade print aesthetic.

- **Granular Layout & Typography Controls:**
  - Page format presets: **A4**, **A5**, and **US Letter**.
  - Orientation: **Portrait** or **Landscape**.
  - Customizable margins (mm), line spacing, and column count (1, 2, 3, or 4 columns).
  - Fine-grained typography color palette: Song Title, Artist/Metadata, Lyrics, Chords, and Section Markers.

- **Dynamic Table of Contents (TOC):**
  - Automatically indexes all songs with computed page numbers and multi-column directory formatting.

- **Progressive Web App (PWA) & Offline Ready:**
  - Installable directly to desktop or mobile home screens via `vite-plugin-pwa`.
  - Offline connectivity indicator and offline asset caching.
  - Tailored installation prompts, including step-by-step iOS Safari guidance.

## 🛠 Tech Stack

- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Animations:** Motion
- **Storage:** IndexedDB API + LocalStorage
- **PDF Generation:** `pdf-lib` + `@pdf-lib/fontkit` via Web Workers
- **PWA:** `vite-plugin-pwa`
- **Tooling:** Vite 6

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. Type-check and build for production:
   ```bash
   npm run lint
   npm run build
   ```

## 📖 Usage Guide

1. **Import Songbook:** Drag and drop your Kytario `.json` export file into the upload zone, or click to browse.
2. **Customize Layout:**
   - Adjust page format (A4, A5, Letter) and orientation in the sidebar.
   - Fine-tune font sizes, line margins, and page margins (in mm).
   - Customize color themes for lyrics, chords, and section headers. (Settings are unique to Light/Dark modes!)
3. **Review & Apply:** Changes are tracked in real-time. Click **Apply Settings** in the floating action bar to re-render the book with the new parameters.
4. **Auto-Save:** All imported songbooks and settings are automatically persisted locally via IndexedDB.
5. **Download Native PDF:** Click the **Download PDF** button to generate a crisp, vector-based PDF file directly in your browser using the background Web Worker engine.

## 📝 Release Notes

### v1.1.0
- **Native PDF Engine:** Replaced basic browser-print mechanisms with a high-fidelity `pdf-lib` Web Worker.
- **Theme-Aware Profiles:** Light and Dark modes now maintain entirely separate persistence states.
- **Enhanced Loaders:** Multi-pass JSON rescue pipelines with beautiful, real-time progress indicators.
- **UI Polish:** Removed distracting badges and standardized glassmorphic modals.

### v1.0.6
- **Auto-Save Engine:** Added periodic, debounced, and lifecycle-driven state persistence to IndexedDB.
- **Draft Session Restoration:** Preserves unapplied configuration drafts across page reloads.

### v1.0.5
- **Sticky Actions Footer:** Re-architected sidebar with a fixed bottom action dock.
- **Chord-Only Formatting Fix:** Fixed vertical spacing on repetition lines containing chords without accompanying lyrics.

## 📄 License

This project is licensed under the MIT License.
