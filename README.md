# Kytario Print Customizer 🎸

**Version:** 1.0.6

A powerful, customizable web application built with React and Tailwind CSS that allows you to process, format, and prepare Kytario songbook JSON data for publication-grade, pixel-perfect printing.

## 🌟 Features

- **Robust Auto-Save & State Persistence (New in v1.0.6):**
  - **IndexedDB Engine:** Seamlessly saves full songbooks and print settings into browser IndexedDB, eliminating browser storage quota limits for large 100+ song collections.
  - **Local Storage Fallback & Auto-Migration:** Automatically detects and migrates legacy songbooks from `localStorage` into IndexedDB, while maintaining a mirrored fallback.
  - **Draft Settings Protection:** Preserves in-progress tweaks and unapplied sidebar drafts across browser refreshes.
  - **Smart Sync Triggers:** Debounced saving (1.2s), a 10s background heartbeat, and emergency saves on tab switch (`visibilitychange`) or window exit (`beforeunload`).
  - **Status Indicator:** Real-time visual indicator displaying auto-save timestamps (`Auto-saved (HH:MM:SS)`) and active save spinners across desktop and mobile views.

- **SmartFit Auto-Scaling Algorithm:**
  - Automatically calculates the optimal font size and layout scale for every single song to perfectly fill page space without awkward mid-song page breaks.
  - Configurable maximum font size caps (in pixels) to avoid oversized lyrics on short songs.

- **Smart Column Balancing & Orphan Prevention:**
  - Multi-column distribution calculates stanza breaks dynamically to avoid lone lyric lines or orphaned headers at the tops of columns.
  - Keeps head groups and tail groups intact for a clean, publication-grade print aesthetic.

- **Granular Layout & Typography Controls:**
  - Page format presets: **A4**, **A5**, and **US Letter**.
  - Orientation: **Portrait** or **Landscape**.
  - Customizable margins (mm), line spacing, and column count (1 or 2 columns).
  - Fine-grained typography color palette: Song Title, Artist/Metadata, Lyrics, Chords, and Section Markers.

- **Virtual Page Rendering (Lazy DOM):**
  - Uses `IntersectionObserver` to mount only visible and adjacent pages, maintaining smooth 60 FPS scrolling and low memory usage even for massive songbooks.

- **Intelligent Chord & Lyric Alignment:**
  - Chords align directly over target words.
  - Natural vertical rhythm with dynamic line margins applied to lyric lines and special handling for chord-only repetition lines.

- **Dynamic Table of Contents (TOC):**
  - Automatically indexes all songs with computed page numbers and multi-column directory formatting.

- **Unapplied Changes Management:**
  - Live preview with explicit "Apply Settings" sticky toolbar, visual counters for pending changes, and one-click reset to defaults.

- **Progressive Web App (PWA) & Offline Ready:**
  - Installable directly to desktop or mobile home screens via `vite-plugin-pwa`.
  - Offline connectivity indicator and offline asset caching.
  - Tailored installation prompts, including step-by-step iOS Safari guidance.

- **Print & PDF Optimization:**
  - Powered by `react-to-print` with fine-tuned print stylesheets, exact `@page` rules, high-contrast printing, and ink-friendly color rendering.

## 🛠 Tech Stack

- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Animations:** Motion
- **Storage:** IndexedDB API + LocalStorage
- **Printing:** `react-to-print`
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

4. Preview the production build:
   ```bash
   npm run preview
   ```

## 📖 Usage Guide

1. **Import Songbook:** Drag and drop your Kytario `.json` export file into the upload zone, or click to browse.
2. **Customize Layout:**
   - Adjust page format (A4, A5, Letter) and orientation in the sidebar.
   - Fine-tune font sizes, line margins, and page margins (in mm).
   - Customize color themes for lyrics, chords, and section headers.
3. **Review & Apply:** Changes are tracked in real-time. Click **Apply Settings** in the floating action bar to re-render the book with the new parameters.
4. **Auto-Save:** All imported songbooks and settings are automatically persisted locally via IndexedDB. You can refresh or close the tab at any time without losing work.
5. **Print or Export PDF:** Click the **Print Songbook** button to trigger the browser's native print dialog and save as PDF or send to a physical printer.

## 📝 Release Notes

### v1.0.6
- **Auto-Save Engine:** Added periodic, debounced, and lifecycle-driven state persistence to IndexedDB with localStorage fallback.
- **Auto-Save Status UI:** Added real-time save status badges in the sidebar footer, preview toolbar, and mobile header.
- **Draft Session Restoration:** Preserves unapplied configuration drafts across page reloads.
- **Clean Workspace:** Removed obsolete build and patch scripts, streamlining project structure and build dependencies.

### v1.0.5
- **Sticky Actions Footer:** Re-architected sidebar with a fixed bottom action dock for instant access to apply, reset, and print actions.
- **Chord-Only Formatting Fix:** Fixed vertical spacing on repetition lines containing chords without accompanying lyrics.
- **Visual Improvements:** Enhanced dark mode contrast and responsive layout scaling.

### v1.0.4
- **Smart Column Balancing:** Analytical column balancing preventing orphaned lines and stanza fragmentation.
- **PWA Integration:** Full offline support, web app manifest, and install prompts.
- **Virtual Page Rendering:** DOM virtualization via `IntersectionObserver` for high performance with 100+ songs.

## 📄 License

This project is licensed under the MIT License.
