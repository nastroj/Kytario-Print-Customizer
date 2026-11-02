# Kytario Print Customizer 🎸

**Version:** 1.9.0  
**License:** MIT  
**Live Application:** [GitHub Pages](https://nastroj.github.io/Kytario-Print-Customizer/)

A modern, high-performance web application designed to transform Kytario songbooks into clean, beautifully formatted, print-ready PDF collections. Features intelligent auto-scaling, customizable multi-column layouts, automatic Table of Contents generation, custom front and back covers, and background vector PDF compilation.

> **Release Status:** Version 1.9.0 is ready for deployment to GitHub Pages. Pushing to the `main` branch automatically triggers the `.github/workflows/deploy.yml` workflow to build and publish the production site.

---

## 🌟 What's New in v1.9.0

- **Modular Component Architecture & Code Decomposition**:
  - Decomposed the monolithic sidebar into clean, maintainable subcomponents under `src/components/sidebar/` (`PageLayoutSection`, `CoverPageSection`, `TypographySection`, `ColorDotInput`, `LocalizedInput`, `MaterialToggle`, `Stepper`).
  - Modularized the songbook import interface into dedicated panels under `src/components/import/` (`ImportTabs`, `UrlImportPanel`, `PasteImportPanel`, `FileDropzonePanel`).
  - Extracted self-contained dialogs for `ResetSongbookDialog`, `SongSelectionModal`, and `ZipProjectSelectModal`.
- **On-Demand Code-Splitting & Lazy Loading**:
  - Code-split the heavy layout & preview rendering engine (`SongbookPreview`, ~2,200 lines) using dynamic `React.lazy()` and `Suspense`, drastically reducing initial bundle size and accelerating initial load time for the import screen.
  - Lazy-loaded modal dialogs (`BackgroundPdfProgressModal`, `SongSelectionModal`) on demand with a dedicated `PreviewChunkFallback` component for smooth transitions.
- **Draft Settings & Unapplied Changes Tracking**:
  - Introduced real-time settings diffing (`getChangedSettingsList`) across 40+ layout, typography, and cover settings.
  - Added pending change indicators and animated badges to the floating Settings button showing the exact count of pending changes (`hasUnappliedChanges`).
  - Added section-level change tracking (`hasLayoutChanges`, `hasCoverChanges`, `hasTypographyChanges`) so users can see which categories were modified before applying.
  - Added the `UnappliedSettingsBanner` component with one-click **Review**, **Discard**, and **Update Layout** controls.
- **Concurrent State & Storage Performance**:
  - Debounced and transition-wrapped song selection updates (`startSongSelectionTransition`, `useDeferredValue`) to maintain instant responsiveness during batch updates.
  - Hybrid storage engine utilizing asynchronous IndexedDB alongside `localStorage` to safely store large songbooks (250+ songs) without browser quota crashes.
- **Build Hygiene & Environment Optimization**:
  - Removed non-npm artifacts (`bun.lock`), validated all production dependencies, and ensured clean Node.js 22 + React 19 + Tailwind v4 + Express compatibility.

---

## 🚀 Key Features

### 🌐 Direct Kytario Import & Title Enrichment

- **Kytario Export ZIP Import:** Direct in-memory parsing of full Kytario account/project `.zip` exports, automatically extracting project metadata and converting AST tokens into ChordPro notation.
- **Batch Multi-File Selection:** Select and import multiple individual song `.json` files simultaneously into one consolidated collection.
- **Instant Online Import:** Paste any Kytario songbook link (e.g., `https://kytario.com/your-songbook` or `kytario.com/cs/your-songbook`), single song link (`/cs/skladba/{slug}-{id}`), or code (`your-songbook`) to fetch songbook sections and songs directly.
- **Canonical Metadata & Title Auto-Resolution:** Automatically fetches authentic UTF-8 songbook titles via PDF header inspection (`HEAD /api/songbooks/{slug}/pdf`) and preserves song musical keys, capo frets, tempo, and release year.
- **JSON Drag & Drop:** Support for direct drag-and-drop of `.json` and `.zip` files with multi-pass error correction.

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
- **Customized Styling:** Fine-tuned controls for typography, colors, and layout balancing.

### 📱 Offline Progressive Web App (PWA)

- **Fully Installable:** Install as a native-like standalone app on macOS, Windows, Linux, iOS, and Android.
- **Offline Capable:** Full offline caching via Workbox and `vite-plugin-pwa`.

---

## 🛠 Tech Stack

| Technology                      | Purpose                                                              |
| :------------------------------ | :------------------------------------------------------------------- |
| **React 19 + TypeScript**       | Frontend UI framework & robust type safety                           |
| **Tailwind CSS v4**             | Modern utility-first styling engine                                  |
| **Vite 6**                      | High-performance build tool, dev server, and worker bundler          |
| **JSZip**                       | Client-side in-memory ZIP archive extraction and parsing             |
| **pdf-lib & @pdf-lib/fontkit**  | Client-side vector PDF generation in Web Worker                      |
| **vite-plugin-pwa**             | Service worker registration, offline asset caching, and web manifest |
| **Express (Development Proxy)** | Local CORS proxy for direct Kytario API and page title fetching      |
| **IndexedDB API**               | Client-side PDF binary caching and large songbook persistence        |
| **Lucide React**                | Clean, accessible icon system                                        |

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
   git commit -m "chore: release v1.9.0"
   git push origin main
   ```

2. **Verify GitHub Pages configuration:**
   - In your repository, navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, ensure **GitHub Actions** is selected.
   - The workflow will build the project and publish the `dist` artifact to GitHub Pages automatically.

3. **Configure Optional Cloudflare Worker Proxy (for 1-click Kytario URL imports):**
   - GitHub Pages is a purely static host with no Node.js backend. Because `kytario.com` does not send `Access-Control-Allow-Origin: *` headers, browser security (CORS) blocks direct client-side fetch requests to Kytario's API.
   - To enable seamless 1-click URL imports on your GitHub Pages site, deploy the free, ready-made Cloudflare Worker script located in [`cloudflare-worker.js`](cloudflare-worker.js):
     1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) and go to **Workers & Pages** > **Create application** > **Create Worker**.
     2. Name it (e.g. `kytario-proxy`) and click **Deploy**.
     3. Click **Edit code**, copy and paste the contents of `cloudflare-worker.js`, and click **Deploy**.
     4. Copy your worker URL (e.g., `https://kytario-proxy.<your-subdomain>.workers.dev`).
     5. In your GitHub repository:
        - Navigate to **Settings** > **Secrets and variables** > **Actions** > **Variables** tab.
        - Click **New repository variable**.
        - Name: `VITE_KYTARIO_PROXY_URL`
        - Value: `https://kytario-proxy.<your-subdomain>.workers.dev`
     6. Re-run or trigger the **Deploy to GitHub Pages** workflow.
   - Alternatively, you can paste the proxy URL directly into the app UI under **Optional: Configure Cloudflare Worker Proxy** without needing to re-deploy!

---

## 📖 How to Use

1. **Import Songbook:**
   - **Kytario URL:** Paste your songbook link (e.g., `https://kytario.com/cs/bodg`). On GitHub Pages, use your configured Cloudflare Worker or the quick 2-step JSON copy if CORS relays are unavailable.
   - **ZIP Archive Export:** Drag and drop your Kytario `.zip` export file directly onto the upload zone. Preserves custom songbook order and authentic titles automatically!
   - **JSON Upload / Paste:** Paste your songbook JSON payload or select exported `.json` files.
2. **Configure Layout:** Use the sidebar to configure page size, orientation, columns, margins, font sizing, and double-sided book printing mode.
3. **Customize Styling & Covers:** Set color schemes, font family, and cover page designs (custom titles, subtitles, uploaded images, QR code link).
4. **Apply Changes:** Click **Apply Changes** in the sidebar to recompute the SmartFit layout and update the live preview.
5. **Export Vector PDF:** Click **Download PDF** to trigger background generation and save a high-resolution, print-ready document.

---

## 📝 Release History

### v1.8.17 (2026-10-30)

- **Clean Covers**: Removed default promotional footer text; front and back covers default to clean presentation unless explicitly enabled.
- **English Localization**: Translated all remaining Czech generation status messages across the PDF engine and UI.
- **Workbox Large Worker Pre-cache**: Raised `maximumFileSizeToCacheInBytes` to 6 MB for `pdfWorker.js`.
- **Resilient Server Port**: Added CLI `--port` parsing and prioritized port 3000 in development.

### v1.8.16 (2026-10-21)

- **ZIP Song Ordering**: Preserves chronological project creation order instead of forcing alphabetical sorting on ZIP imports.
- **Real Songbook Title**: Extracts true songbook name from `project.json` inside archive payloads.
- **Song Selection Sorting**: Added sort options (Title, Artist, Original Order) in Manage Songs.
- **Responsive Floating Toolbar**: Mobile button wrapping, repositioned collision-free Scroll to Top, and dark zinc styling.

### v1.8.15 (2026-10-19)

- **Preview Feedback**: Added floating "Updating preview..." spinner pill overlay and toast notifications during selection updates.

### v1.8.14 (2026-10-19)

- **Concurrent Transitions**: Integrated `useTransition` and `useDeferredValue` with debouncing for fluid song selection toggling.

### v1.8.13 (2026-10-19)

- **Control Buttons Overhaul**: Integrated "Manage Songs" into main action pod and elevated ToC jump popover with an outside-click backdrop.

### v1.8.12 (2026-10-19)

- **Instant Checkbox Toggling**: Staged local modal state in Manage Songs for lag-free 0ms checkbox interaction.

### v1.8.11 (2026-10-19)

- **React 19 Stability**: Fixed conditional hook ordering in `SongSelectionModal`.

### v1.8.10 (2026-10-19)

- **Native Virtual Scroll**: Implemented rock-solid zero-dependency virtual windowing for song selection.

### v1.8.9 (2026-10-19)

- **Modal Sizing**: Fixed virtual list container height to ensure visibility in Manage Songs modal.

### v1.8.8 (2026-10-19)

- **List Virtualization**: Integrated virtualization for large songbook collections.

### v1.8.7 (2026-10-17)

- **Instant Modal Opening**: Lightweight metadata extraction and early-exit guards for 250+ song collections.

### v1.8.6 (2026-10-17)

- **Paginated Song List**: Introduced 50-items-per-page pagination and non-blocking search filtering.

### v1.8.5 (2026-10-17)

- **Manage Songs Modal**: Added interactive song visibility manager with batch selection and search.

### v1.8.4 (2026-10-17)

- **ZIP Privacy Filter**: Added option to filter out private songs based on Kytario visibility metadata.

### v1.8.3 (2026-10-17)

- **Storage Serialization**: Shifted large songbook serialization entirely to asynchronous IndexedDB.

### v1.8.2 (2026-10-17)

- **Loading State Hand-off**: Added submission indicators to project selection dialog and smoothed layout transitions.

### v1.8.1 (2026-10-17)

- **Interactive Multi-Project Selector**: Added selection modal with project cards and 1-click combine for multi-project ZIP archives.

### v1.8.0 (2026-10-17)

- **Kytario Export ZIP Import**: Direct in-memory extraction (`jszip`) of full account ZIPs and AST chord reconstruction.
- **Batch JSON Upload**: Multi-file selection and automatic normalization into a single songbook.
- **Canonical Title Resolution**: Header inspection (`HEAD /api/songbooks/{slug}/pdf`) for authentic UTF-8 titles.
- **Musical Metadata**: Captures musical key (`tonalKey`), capo fret, tempo, and release year.
- **IndexedDB Large Caching**: Seamless caching for massive songbook collections without `QuotaExceededError`.

### v1.7.1 (2026-10-12)

- **Adaptive Sidebar Height**: Dynamic viewport scaling for the settings drawer.
- **Scroll Anchoring Fix**: Enforced `overflow-anchor: none` to eliminate Chromium snapback scroll lag.
- **Toolbar Ergonomics**: Relocated Table of Contents jump button directly adjacent to the zoom fit toggle.

### v1.7.0 (2026-10-06)

- **Dual Floating Pods**: Separated bottom controls into View & Navigation and Document Management capsules.
- **Smart Click-Outside**: Added DOM connectedness validation to prevent unintended drawer dismissals.
- **Sidebar Organization**: Reordered page margins card and added auto-scrolling to expanded sections.

### v1.6.0 (2026-10-05)

- Removed dark mode for a unified light-theme print-accurate experience.
- Redesigned sidebar header with prominent app name and refined branding.
- Moved Table of Contents (Nav) button to the floating action bar for better accessibility.
- Implemented persistent songbook caching in `localStorage`.
- Fixed Nav menu toggle bug and improved import progress feedback.

### v1.5.0 (2026-10-04)

- **Local Settings Persistence**: Introduced Save Settings and Reset Defaults buttons in the sidebar footer.
- **Fine-Grained ToC Colors**: Added specialized controls for ToC Authors and Page Numbers.
- **Smart Auto-scale Refinements**: Introduced Max. Line Height and Section Margin Cap controls.

### v1.4.9 (2026-10-01)

- Removed unreliable PDF import and its `pdfjs-dist` dependency.
- Reordered import tabs to Kytario URL, Paste JSON, then JSON File; Kytario URL is selected by default.

### v1.4.8 (2026-09-29)

- **Authentic Songbook Name Extraction**: Automatically fetches real songbook names (e.g., _"PRO RADOST"_) from public Kytario page metadata (JSON-LD `MusicAlbum`, `<title>`, and OpenGraph).
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

- Added background native vector PDF engine using `pdf-lib` and `@pdf-lib/fontkit`.
- Added persistent settings profiles for layout and typography.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
