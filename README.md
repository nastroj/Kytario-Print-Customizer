# Kytario Print Customizer 🎸

**Version:** 1.0.4

A powerful, customizable web application built with React and Tailwind CSS that allows you to process, format, and prepare Kytario songbook JSON data for pixel-perfect printing.

## 🌟 Features

- **SmartFit Auto-Scaling Algorithm:** Automatically calculates the optimal font size and layout scale for every single song to perfectly utilize page space, avoiding awkward mid-song page breaks.
- **Smart Column Balancing & Orphan Prevention:** Automatically computes multi-column distribution to prevent lone lines or orphaned headers at the top of subsequent columns, keeping head groups and tail groups intact for a clean, publication-grade print aesthetic.
- **Granular Layout Controls:** Configure max font sizes (px), page margins, page formats (A4, A5, Letter), column layouts, and orientation (Portrait/Landscape).
- **Intelligent Spacing:** Precisely aligned chords that sit directly above their target words, with dynamic margin spacing applied specifically to lyric lines.
- **Advanced Theming:** Complete control over title, artist, lyric, chord, and section marker colors.
- **System Theme Sync:** Automatically defaults to your operating system's light/dark mode and persists user-defined default settings.
- **Drag & Drop Upload:** A beautiful, responsive drop zone to instantly load your songbook JSON files.
- **Progressive Web App (PWA) Ready:** Install Kytario directly to desktop or mobile home screens with offline caching, custom guitar & songbook icons, and instant loading.
- **Lazy DOM Rendering:** Virtualized page loading strictly rendering only the visible (and +/- 1 adjacent) pages into the DOM, unlocking massive performance gains for large 100+ item songbooks.
- **Print Ready:** Uses `react-to-print` for flawless PDF generation and physical printing.

## 🛠 Tech Stack

- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Animations:** Motion (Framer Motion)
- **Tooling:** Vite

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## 📖 Usage

1. **Upload your Songbook:** Export your JSON file from Kytario and drag it into the designated upload area.
2. **Customize Layout:** Use the sidebar to adjust font sizes, margins, column count, and orientation. The **SmartFit** toggle ensures each song fills the page beautifully.
3. **Save Defaults:** Hit the "Set as Defaults" button in the sidebar if you want to keep your specific configuration for future sessions.
4. **Print:** Click the "Print Songbook" button to generate a clean, print-optimized document.

## 📝 Recent Updates (v1.0.4)
- **Smart Column Balancing & Orphan Prevention:** Enhanced the song rendering engine with an analytical column balancer that prevents lone lines from orphan breaks at the top of new columns. Protects atomic head and tail stanza groups (first 2 lines and last 2 lines) while allowing natural inter-section flow for long multi-verse songs.
- **Progressive Web App (PWA) & Custom Branding:** Full PWA setup powered by `vite-plugin-pwa` with custom branded icons (`pwa-192x192.png`, `pwa-512x512.png`, maskable variants, `apple-touch-icon.png`, `favicon.ico`, and SVG vectors). Includes an in-app installation prompt with dedicated iOS Safari step-by-step guidance and an offline status indicator.
- **Virtual Page Rendering (Lazy Render):** Restructured `SongbookPreview` to use an `IntersectionObserver` that only mounts the current page and its immediate neighbors into the DOM, drastically improving preview frame rates and scroll stability for massive songbooks.
- **Formatting Overhaul:** Removed internal bottom spacing directly beneath chords. Margin logic has been refined to apply specifically to the bottom of lyric lines, creating a tighter and more natural chord-lyric pairing.
- **Max Font Size (px):** Upgraded the auto-scaler to cap at a specific pixel size (e.g., 32px) rather than an arbitrary multiplier.

## 📄 License

This project is licensed under the MIT License.
