# Kytario Print Customizer 🎸

**Version:** 1.4.3  
**License:** MIT  
**Live Application:** [GitHub Pages](https://nastroj.github.io/Kytario-Print-Customizer/)

A modern web app for transforming Kytario songbook JSON into clean print-ready layouts, table-of-contents pages, and downloadable PDFs.

> Release status: this branch is prepared for GitHub Pages deployment. The deployment workflow is configured to build from the `main` branch and publish the generated `dist` output to GitHub Pages automatically.

---

## What's New in v1.4.3

- **Fixed Missing Page Numbers in PDFs**: Replaced DOM CSS background badges with resilient inline SVG badges and vector paths in the Web Worker PDF generator so page numbers are never omitted, even if browser print engines have background graphics disabled.
- **Accurate Document Page Indexing & Book Mode Alignment**: Document page indices (`docPageIndex`) are now calculated uniformly across front cover, Table of Contents, and song pages. Alternating odd/even page badges and inner/outer margins in book mode now align with physical booklet spreads.
- **Deep Audit of Print CSS & `@page` Directives**: Audited `@media print` rules, removed legacy padding overrides from `index.css`, and ensured `.print-page-container` maintains proper flex column layouts without page-break clip issues.
- **GitHub Pages Synchronization**: Enhanced `vite.config.ts` with dynamic `BASE_PATH` support matching the GitHub Actions workflow (`deploy.yml`), and converted `index.html` asset tags to `%BASE_URL%` for robust repository subpath hosting.
- **Cleaned Redundant Assets & Legacy Artifacts**: Deleted redundant lockfiles (`bun.lock`), removed duplicate SVGs (`icon.svg`, `icon-maskable.svg`), removed 110+ unused packages (heavy `@resvg/resvg-js` native binaries, unneeded server packages `express`, `@types/express`, `dotenv`, `autoprefixer`, and `class-variance-authority`), configured Rollup manual vendor chunk splitting, and aligned all version metadata.

---

## Deployment

- GitHub Pages deployment is triggered from the `main` branch via the workflow in `.github/workflows/deploy.yml`.
- The build runs with Node.js 22 and publishes the generated static site from the `dist` folder.
- Dynamic base path support ensures all assets and service worker caches resolve correctly.
- Push the release commit to `main` to trigger deployment automatically.

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
- **Custom Margins & Columns:** Select from 1 to 4 columns and set exact physical page margins in millimeters, including outer/inner gutter margins for book mode.

### 📑 Dynamic Table of Contents (ToC)
- **Alphabetical Grouping:** Group songs alphabetically by letter with optional section dividers.
- **Multi-Column Formatting:** 2-column or 3-column directory layout with balanced distributions.
- **Interactive Jumping:** Click any song in the Table of Contents on-screen to smoothly scroll directly to that song.

### 🎨 Theme-Aware Color & Typography Profiles
- **Independent Profiles:** Retains distinct configuration profiles for Light Mode and Dark Mode. Switching modes restores your preferred color palette and contrast settings immediately.
- **Custom Palette:** Independently customize Title, Artist, Lyrics, Chords, Section Markers, and Divider lines.

### 📱 Offline PWA
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
| **IndexedDB API** | Client-side generated PDF caching |
| **Lucide React** | Clean, accessible icon set |
| **Motion** | Fluid animations and drawer transitions |

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18 or higher, v22 recommended)
- npm or yarn

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nastroj/Kytario-Print-Customizer.git
   cd Kytario-Print-Customizer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   The application will be running at [http://localhost:3000](http://localhost:3000).

4. **Verify TypeScript & build:**
   ```bash
   npm run lint
   npm run build
   ```

---

## 🌐 GitHub Sync & GitHub Pages Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) ready for GitHub Pages.

### 1. Push changes to GitHub

```bash
# Stage, commit, and push the release
git add .
git commit -m "chore: release v1.4.3"
git push -u origin main
```

### 2. Enable GitHub Pages in Repository Settings

1. In your GitHub repository, open **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. Once pushed to `main`, the **Deploy to GitHub Pages** action will automatically run and publish your app at:
   ```
   https://<username>.github.io/Kytario-Print-Customizer/
   ```

---

## 📖 How to Use

1. **Import:** Drag and drop your Kytario songbook `.json` export file into the upload zone, or click to browse.
2. **Customize:** Open the sidebar to choose page format, orientation, font scales, margin sizes, and color themes.
3. **Apply Changes:** Review any unapplied changes and click **Apply Changes** in the sidebar to recalculate the SmartFit layout and update the preview.
4. **Download PDF:** Click **Download PDF** for an instant high-quality vector PDF compiled by the background Web Worker with crisp page numbers, headers, and Table of Contents.

---

## 📝 Release History

### v1.4.3
- Fixed missing page numbers on top of pages in generated PDFs and browser print rendering.
- Migrated page badges from CSS background blocks to resilient inline vector/SVG shapes that survive background graphics stripping.
- Synchronized document page index calculations across covers, Table of Contents, and songs for accurate book mode alternating badge and margin placement.
- Conducted deep audit of `@media print` and `@page` rules, removing legacy padding overrides and ensuring clean page-break flows.
- Synchronized GitHub Pages deployment configuration with dynamic `BASE_PATH` support in `vite.config.ts` and `%BASE_URL%` interpolation in `index.html`.
- Cleaned up redundant assets and legacy code artifacts: deleted unused lockfiles (`bun.lock`), redundant SVG icons (`icon.svg`, `icon-maskable.svg`), and purged 110+ unneeded dependencies (including heavy native `@resvg/resvg-js`, `express`, `@types/express`, `dotenv`, `autoprefixer`, and `class-variance-authority`).
- Optimized Vite build and PWA manifest: added vendor code chunking (`react-vendor`, `icons-vendor`, `motion-vendor`), streamlined manifest icon declarations, and embedded Schema.org JSON-LD structured data.

### v1.4.2
- Reduced desktop title-block spacing from 24px to 16px to save page space while preserving readability.
- Synchronized title spacing and SmartFit height estimates between preview and PDF output.
- Kept the on-screen preview and background PDF renderer synchronized.
- Verified the GitHub Pages workflow and production build before release.

### v1.4.0
- Aligned release metadata across `package.json`, `package-lock.json`, the application configuration, and README.
- Refreshed the default print customizer layout and removed obsolete separator behavior.
- Verified the TypeScript check and production build before release.
- Prepared the GitHub Pages workflow for deployment from `main`.

### v1.3.1
- Refined the print customizer layout and release configuration.

### v1.2.0
- Fixed Table of Contents (ToC) bottom margin overflow in both preview and PDF engine using column height calculations.
- Synchronized Web Worker PDF generation with on-screen DOM metrics.
- Configured automated GitHub Pages deployment workflow with dynamic base path support.
- Updated documentation and version tracking.

### v1.1.3
- Minor layout and responsive polish.
- Debug HUD toggle options in global app configuration.

### v1.1.0
- Background native PDF engine using `pdf-lib` and `@pdf-lib/fontkit`.
- Theme-aware persistent settings profiles for Light and Dark modes.
- Multi-pass JSON rescue parser with visual progress indicators.

### v1.0.6
- Periodic and debounced auto-save engine to IndexedDB.
- Unapplied draft settings preservation across page reloads.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
