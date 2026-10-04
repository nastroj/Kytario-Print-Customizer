# Kytario Print Customizer 🎸

**Version:** 1.5.0  
**License:** MIT  
**Live Application:** [GitHub Pages](https://nastroj.github.io/Kytario-Print-Customizer/)

A modern, high-performance web application designed to transform Kytario songbooks into clean, beautifully formatted, print-ready PDF collections. Features intelligent auto-scaling, customizable multi-column layouts, automatic Table of Contents generation, custom front and back covers, and background vector PDF compilation.

> **Release Status:** Version 1.5.0 is ready for deployment to GitHub Pages. Pushing to the `main` branch automatically triggers the `.github/workflows/deploy.yml` workflow to build and publish the production site.

---

## 🌟 What's New in v1.5.0

- **Local Settings Persistence (Light & Dark Mode)**: Added highly compact, matching zinc-colored **Save Settings** and **Reset Defaults** action buttons in the sidebar's footer, freeing up vertical space at the top of the settings page so layout sections are immediately visible. Settings persist in the browser separately for **Light Mode** (`kytario-print-settings-v2_light`) and **Dark Mode** (`kytario-print-settings-v2_dark`).
- **Unified & Streamlined Action Buttons**: Consolidated scattered section-level reset buttons and removed redundant mode name suffixes (like `(Light)` or `(Dark)`) on buttons for a cleaner, unified user experience. A single click on the reset button restores defaults for the active mode.
- **Smart Auto-scale Controls Refinement**: Transformed section filling settings into two explicit controls (**Max. Line Height** and **Section Margin Cap**), both grouped directly inside the **Smart Auto-scale** section for intuitive layout tuning.
- **Max Font Cap Space Distribution**: Refactored the Smart Auto-scale algorithm to intelligently distribute remaining layout space as stanza section padding (65%) and line margins (35%) whenever font size reaches its cap, avoiding uneven gaps or trailing voids.
- **Smart Book Mode Page Numbering**:
  - When **Book Mode is OFF**, page numbers default to **Right** (with the "Outer" choice hidden).
  - When **Book Mode is ON**, page numbers default to **Outer (Alternating)** and dynamically adjust based on physical document page counts (Front Cover, ToC pages, etc.), placing numbers on outer edges (Recto = Right, Verso = Left).

---

## 🚀 Key Features

### 🌐 Direct Kytario Import & Title Enrichment
- **Instant Online Import:** Paste any Kytario songbook link (e.g., `https://kytario.com/your-songbook` or `kytario.com/cs/your-songbook`) or code (`your-songbook`) to fetch songbook sections and songs directly.
- **Metadata Auto-Resolution:** Automatically detects and applies the songbook's human-readable name and author across covers, headers, and PDF document metadata.
- **JSON Drag & Drop:** Support for direct drag-and-drop of exported `.json` songbook files with multi-pass error correction.

### 📄 Background Native PDF Generation
- **Client-Side PDF Engine:** Generates crisp vector PDFs entirely in the browser using `pdf-lib` and `@pdf-lib/fontkit` inside a dedicated Web Worker.
- **Zero-Copy High-Performance Architecture:** Uses binary `ArrayBuffer` transfer to prevent main-thread freezing even when rendering massive collections (250+ songs).
- **Embedded Unicode Typography:** Automatically embeds optimized `.ttf` font files with complete diacritics support (Czech, Slovak, etc.).
- **Smart Caching:** Generated PDFs are cached in memory and IndexedDB for instant re-downloads until settings or songs change.

### 📐 SmartFit Auto-Scaling & Layout Balancing
- **Per-Song Dynamic Scaling:** Automatically balances font sizes and line heights so each song fits comfortably on a single page without awkward page breaks.
- **Multi-Column Formatting:** Flexible 1 to 4 column arrangements with intelligent stanza breaking that prevents lone lyric lines or orphaned chord headers.
- **Double-Sided Book Printing:** Injects precise `@page :left` and `@page :right` rules with alternating inner/outer gutter margins and page numbers for bound songbooks.
- **Print Formats:** Supports **A4**, **A5**, and **US Letter** in both **Portrait** and **Landscape** orientations with customizable physical margins (mm).

### 📑 Dynamic Table of Contents (ToC)
- **Alphabetical Grouping:** Automatically groups songs by letter with optional section dividers.
- **Smart Column Balancing:** 2-column or 3-column directory layout with automatic top-of-column divider suppression to prevent awkward leading lines.
- **Interactive Navigation:** Click any song in the Table of Contents on-screen to smoothly scroll directly to that song in preview.

### 🎨 Custom Covers & Theme Profiles
- **Front & Back Cover Pages:** Configurable title, subtitle, dedication, notation guide, and custom artwork or logo uploads with in-browser image optimization.
- **Dynamic QR Codes:** Automatically generates vector QR codes linking directly to the online digital songbook for mobile play-along.
- **Dual Theme Profiles:** Independent custom color palettes and typography settings for Light Mode and Dark Mode.

### 📱 Offline Progressive Web App (PWA)
- **Fully Installable:** Install as a native-like standalone app on macOS, Windows, Linux, iOS, and Android.
- **Offline Capable:** Full offline caching via Workbox and `vite-plugin-pwa`.

---

## 🛠 Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React 19 + TypeScript** | Frontend UI framework & robust type safety |
| **Tailwind CSS v4** | Modern utility-first styling engine |
| **Vite 6** | High-performance build tool, dev server, and worker bundler |
| **pdf-lib & @pdf-lib/fontkit** | Client-side vector PDF generation in Web Worker |
| **vite-plugin-pwa** | Service worker registration, offline asset caching, and web manifest |
| **Express (Development Proxy)** | Local CORS proxy for direct Kytario API and page title fetching |
| **IndexedDB API** | Client-side PDF binary caching and draft settings persistence |
| **Lucide React** | Clean, accessible icon system |

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

4. **Run TypeScript check & production build:**
   ```bash
   npm run lint
   npm run build
   ```

---

## 🌐 GitHub Pages Deployment

The repository includes a continuous deployment workflow in `.github/workflows/deploy.yml`.

### Kytario URL Imports on GitHub Pages

GitHub Pages is static hosting, so it cannot run the Express proxy used by local development. The app tries public CORS relays for Kytario URL imports, including Jina Reader for large songbook responses. Public relays can be rate-limited or unavailable; for a more reliable option, deploy the included Cloudflare Worker from the repository root with `npx wrangler login` followed by `npx wrangler deploy`. Then add a repository Actions variable named `VITE_KYTARIO_PROXY_URL` with the deployed endpoint, for example `https://<worker>.<account>.workers.dev/api/proxy/kytario`, and rerun the Pages deployment. The Worker only fetches fixed public Kytario API routes; it does not accept arbitrary proxy URLs.

The Worker allows the project's GitHub Pages origin and localhost by default. If you use a custom site domain, set its origin in the Worker environment variable `ALLOWED_ORIGINS` (comma-separated).

### Deployment Steps

1. **Commit and push changes to `main`:**
   ```bash
   git add .
   git commit -m "chore: release v1.4.9"
   git push origin main
   ```

2. **Verify GitHub Pages configuration:**
   - In your repository, navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, ensure **GitHub Actions** is selected.
   - The workflow will build the project and publish the `dist` artifact to GitHub Pages automatically.

---

## 📖 How to Use

1. **Import Songbook:** Enter a Kytario songbook link (e.g., `https://kytario.com/your-songbook`) or drag and drop your exported `.json` file into the upload zone.
2. **Configure Layout:** Use the sidebar to configure page size, orientation, columns, margins, font sizing, and double-sided book printing mode.
3. **Customize Styling & Covers:** Set color schemes, font family, and cover page designs (custom titles, subtitles, uploaded images, QR code link).
4. **Apply Changes:** Click **Apply Changes** in the sidebar to recompute the SmartFit layout and update the live preview.
5. **Export Vector PDF:** Click **Download PDF** to trigger background generation and save a high-resolution, print-ready document.

---

## 📝 Release History

### v1.4.9 (2026-10-01)
- Removed unreliable PDF import and its `pdfjs-dist` dependency.
- Reordered import tabs to Kytario URL, Paste JSON, then JSON File; Kytario URL is selected by default.

### v1.4.8 (2026-09-29)
- **Authentic Songbook Name Extraction**: Automatically fetches real songbook names (e.g., *"PRO RADOST"*) from public Kytario page metadata (JSON-LD `MusicAlbum`, `<title>`, and OpenGraph).
- **Hardened URL & Language Prefix Handling**: Handled edge cases with `/cs` language prefixes, query strings, and anchors.
- **Redundant Asset & Artifact Audit**: Pruned 1.08 MB `pdf.worker.min.js`, unreferenced `Roboto-*.ttf` font binaries, leftover `bun.lock`, and unused `src/lib/utils.ts`.
- **GitHub Pages SPA Routing Support**: Automated generation of `dist/404.html` on build.
- **PWA Precache Optimization**: Reduced precache bundle size by >30% for faster load times.

### v1.4.7 (2026-09-26)
- **Double-Sided Book Printing Registration**: Enhanced dynamic `@page` print setup with `:left` and `:right` pseudo-classes for alternating inner/outer gutter margins.
- **Smart Section Separators**: Added section divider lines with automatic top-of-column suppression.
- **High-Performance Worker Serialization**: Zero-Copy `ArrayBuffer` transfer for non-blocking exports of massive songbooks.
- **Direct Import**: Added Kytario URL import proxy.

### v1.4.4 (2026-09-26)
- **Print Optimization**: Enforced `@page` registration mark suppression (`marks: none`, `bleed: 0mm`) and exact color preservation (`color-adjust: exact`).
- **Back Cover Synchronization**: Aligned PDF back cover colors and title with live web preview.
- **Consolidated Print CSS**: Refactored print container styles into `.print-page-base` utility classes.
- **Project-Wide Audit**: Removed legacy assets and unreferenced dependencies (`motion`, `@google/genai`).

### v1.4.3 (2026-09-26)
- **Resilient Page Badges**: Migrated top page number badges to inline vector SVG shapes to survive browser print background stripping.
- **Document Page Index Synchronization**: Synchronized cover and ToC page offset counting for accurate alternating book margins.
- **Dynamic Base Path Support**: Added `%BASE_URL%` interpolation and dynamic base path support for GitHub Pages.
- **Build Optimization**: Added Rollup vendor chunking (`react-vendor`, `icons-vendor`).

### v1.4.2 (2026-09-24)
- **Title Block Spacing**: Reduced title block spacing from 24px to 16px to optimize page vertical space.
- **SmartFit Height Sync**: Synchronized preview and Web Worker height estimations.

### v1.4.0 (2026-09-23)
- Aligned release metadata and refreshed default print customizer layout.
- Verified TypeScript checks and production build pipeline for GitHub Pages deployment.

### v1.2.0 (2026-09-20)
- Fixed Table of Contents (ToC) bottom margin overflow using column height calculations.
- Synchronized Web Worker PDF generation with on-screen DOM metrics.

### v1.1.0 (2026-09-18)
- Introduced background native vector PDF engine using `pdf-lib` and `@pdf-lib/fontkit`.
- Added theme-aware persistent settings profiles for Light and Dark modes.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
