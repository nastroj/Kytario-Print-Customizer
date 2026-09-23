# Kytario Print Customizer 🎸

**Version:** 1.4.2
**License:** MIT  
**Live Application:** [GitHub Pages](https://nastroj.github.io/Kytario-Print-Customizer/)

A modern web app for transforming Kytario songbook JSON into clean print-ready layouts, table-of-contents pages, and downloadable PDFs.

---

## What's New In v1.4.2

- Reduced desktop title-block spacing from 24px to 16px to save page space while preserving readability.
- Synchronized title spacing and SmartFit height estimates between preview and PDF output.
- Synchronized application, package, lockfile, and documentation versions at `1.4.2`.

---

## 🚀 Key Features

### 📄 Background Native PDF Generation
- **Client-Side PDF Engine:** Generates vector PDFs entirely in the browser using `pdf-lib` and `@pdf-lib/fontkit` inside a dedicated Web Worker.
- **Non-Blocking Execution:** Export even massive 200+ song collections in the background with an animated progress modal while continuing to navigate the app.
- **True Type Font Embedding:** Automatically fetches and embeds optimized `.ttf` font files for crisp, professional typography.

### 📐 SmartFit Auto-Scaling & Layout Balancing
- **Intelligent Song Scaling:** Dynamically scales font sizes and line heights per song so every song cleanly fills a single page without awkward page breaks.
- **Orphan & Widow Prevention:** Multi-column layouts break verses and stanzas cleanly, preventing lone lyric lines or orphaned chord headers.
- **Print Formats:** Supports **A4**, **A5**, and **US Letter** in both **Portrait** and **Landscape** orientations.
- **Custom Margins & Columns:** Select from 1 to 4 columns and set exact physical page margins in millimeters.

### 📑 Dynamic Table of Contents (ToC)
- **Alphabetical Grouping:** Group songs alphabetically by letter with optional section dividers.
- **Multi-Column Formatting:** 2-column or 3-column directory layout with balanced distributions.
- **Interactive Jumping:** Click any song in the Table of Contents on-screen to smoothly scroll directly to that song.

### 🎨 Theme-Aware Color & Typography Profiles
- **Independent Profiles:** Retains distinct configuration profiles for Light Mode and Dark Mode. Switching modes restores your preferred color palette and contrast settings immediately.
- **Custom Palette:** Independently customize Title, Artist, Lyrics, Chords, Section Markers, and Divider lines.

### 💾 Auto-Save & Offline PWA
- **IndexedDB Storage:** Persists uploaded songbooks and settings locally in the browser with high capacity, auto-migrating legacy `localStorage` entries.
- **Progressive Web App (PWA):** Fully installable on iOS, Android, and Desktop with offline caching via `vite-plugin-pwa`.

---

## 🛠 Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React 19 + TypeScript** | Frontend framework & type safety |
| **Tailwind CSS v4** | Modern utility-first styling |
| **Vite 6** | High-performance build tool and dev server |
| **pdf-lib & fontkit** | Client-side vector PDF generation in Web Worker |
| **vite-plugin-pwa** | PWA service worker & asset caching |
| **IndexedDB API** | Client-side persistent songbook database |
| **Lucide React** | Clean, accessible icon set |
| **Motion** | Fluid animations and drawer transitions |

---

## 📖 How to Use

1. **Import:** Drag and drop your Kytario songbook `.json` export file into the upload zone, or click to browse.
2. **Customize:** Open the sidebar to choose page format, orientation, font scales, margin sizes, and color themes.
3. **Apply & Preview:** Click **Apply Settings** in the floating action dock to update the layout. Toggle between continuous scroll and two-page spread views.
4. **Print / Download:**
   - Click **Download PDF** for an instant high-quality vector PDF compiled by the background Web Worker.
   - Or click **Print** for browser native print dialog with paper margins pre-configured.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
