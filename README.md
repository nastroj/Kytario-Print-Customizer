# Kytario Print Customizer 🎸

**Version:** 1.9.5  
**License:** MIT  
**Live Application:** [GitHub Pages](https://nastroj.github.io/Kytario-Print-Customizer/)

A modern, high-performance web application designed to transform Kytario songbooks into clean, beautifully formatted, print-ready PDF collections. Features intelligent auto-scaling, customizable multi-column layouts, automatic Table of Contents generation, custom front and back covers, and background vector PDF compilation.

> **Release Status:** Version 1.9.5 is ready for sync and GitHub Pages deployment. Pushing to the `main` branch automatically triggers the `.github/workflows/deploy.yml` workflow to build and publish the production site.

---

## 🌟 What's New in v1.9.5

- **Project Page Songbook Discovery & Chooser Modal**: When `kytario.com/<token>` does not exist or a `/projects/<token>` URL is imported, scans the project page's songbook links (even without embedded JSON) and opens a selection dialog when multiple songbooks are found.
- **Playlist Support (`?playlist=` & `/playlists/<token>`)**: Full playlist extraction, ordering, capo, transposition merging, and combined titles across the Cloudflare Worker, Express proxy, and client relays.
- **Extended Locale & Route Title Extraction + Diagnostics**: Accepts locale-redirected routes (`/songbook(s)/`, `/zpevnik(y)/`, `/pisnicka|pisnicky/`, `/projects/`, `/cs/projekty/`, `/song/`, `/cs/skladba/`), prevents caching fallback `"Songbook"` titles, and adds `?debug=1` / `X-Kytario-Title-*` diagnostics.
- **Complete "Forget" Cache Eviction & Render Blueprint**: Clicking **Forget** removes the songbook from localStorage, IndexedDB, and the offline library; added `render.yaml` for 1-click full-stack Render deployment.

### Carried over from v1.9.4

- **Compact Uniform Table of Contents**: Removed the redundant subtitle line and `(continued)` label, and made ToC pages 2+ use the same header size and clean headerless-line layout as page 1 in both preview and PDF export.
- **Book Mode Default & Streamlined Controls**: Enabled double-sided Book Mode by default, simplified quick-jump and settings notices, and added a blurred blocking `"Updating preview..."` overlay plus accurate `"Almost ready..."` import progress.
- **Full Offline PWA & Faster URL Imports**: Expanded Workbox precaching + offline songbook library support and parallelized Kytario API/relay imports to eliminate stalls.

### Carried over from v1.9.3

- **Single Source of Truth for Version Display**: In-app version badge is injected at build time from `package.json` via Vite's `define`, keeping the UI version automatically synced with releases.

- **Accurate Page Heading Title Extraction**: Songbook titles are authoritatively extracted directly from the primary `<h1>` heading on `kytario.com/<slug>` and `<slug>/index-1` metadata, cleanly stripped of site prefixes. Songbooks whose names match their slug (such as *PRO RADOST* from `bodg`) are preserved without false-positive rejection.
- **True Cover Page URLs & QR Code Links**: Imported Kytario songbooks strictly preserve the user-requested URL above cover QR codes (displayed with `https://` cleanly stripped, e.g. `kytario.com/kytarove-sedanky-brno`) rather than resolving to non-existent contributor profile paths.
- **Contributor Metadata Isolation**: Eliminated cross-contamination where individual song contributor metadata (e.g. author `project.urlToken` like `vaclav-dressler-49` or song-level contributor project names) hijacked top-level songbook URLs and titles.
- **Guarded Playlist vs. Full Songbook Imports**: Songbooks with playlist listings load their complete song collections without being accidentally truncated or renamed by sub-playlists unless explicitly requested via `?playlist=`.
- **Scoped Project Routing**: Strictly scopes project resolution to explicit `/projekty/` and `/projects/` routes, preventing false matches on general songbook slugs.
- **Production Asset Audit**: Pruned obsolete test scripts and standardized TypeScript and layout engine formatting.

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

4. **Preview the production build locally:**

   ```bash
   npm run preview
   ```

   This builds the app and serves it with the Express production server at [http://localhost:4173](http://localhost:4173), including the Kytario API proxy.

5. **Run TypeScript check & production build:**
   ```bash
   npm run lint
   npm run build
   ```

---

## 🌐 GitHub Pages Deployment

The repository includes a continuous deployment workflow in `.github/workflows/deploy.yml`.

### Kytario URL Imports on GitHub Pages

GitHub Pages is static hosting, so it cannot run the Express proxy used by local development. Public CORS relays are best-effort and can be slow or unavailable. For reliable one-click URL imports (including `?playlist=` and `/playlists/` links), deploy the included `cloudflare-worker.js` and configure the GitHub Actions variable `VITE_KYTARIO_PROXY_URL` to the Worker endpoint, for example `https://<worker>.<account>.workers.dev/api/proxy/kytario`, then rerun the Pages deployment. The Worker resolves project URLs and playlists, fetches the canonical songbook data and title, and only allows the configured site origins. Without a hosted proxy, use the JSON paste/import option when browser CORS blocks direct access.

The Worker allows the project's GitHub Pages origin and localhost by default. If you use a custom site domain, set its origin in the Worker environment variable `ALLOWED_ORIGINS` (comma-separated).

### Deployment Steps

1. **Commit and push changes to `main`:**

   ```bash
   git add .
   git commit -m "chore: release v1.9.5"
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

## ☁️ Render Full-Stack Deployment (No Cloudflare Worker Needed)

Because this project includes `server.ts` (Express serving both the built app and `/api/proxy/kytario`), you can deploy the entire app to [Render](https://render.com) using the included [`render.yaml`](render.yaml) Blueprint:

1. Push your repository to GitHub (`render.yaml` and `engines.node >= 22.18.0` in `package.json` are ready out of the box).
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** > **Blueprint** (or **Web Service**), connect your GitHub repository, and deploy.
3. If configuring a **Web Service** manually instead of using the Blueprint:
   - **Runtime:** `Node`
   - **Build Command:** `npm ci --include=dev && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Environment Variables:** `NODE_ENV=production`, `DISABLE_HMR=true`

> **Note:** Render's free tier spins down after ~15 minutes of inactivity (causing a 30–50s wake-up delay on the first request), after which URL imports, songbook titles, and playlists run at full server-side speed.

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

### v1.9.5 (2026-11-13)

- **Project Fallback Discovery & Songbook Picker**: Tries `kytario.com/<token>` first and falls back to `kytario.com/projects/<token>` (plus localized `/projekty/` routes), parses songbook anchor links directly from project HTML without requiring embedded JSON, and prompts with a chooser modal when a project lists multiple songbooks.
- **Playlist Support**: Added `?playlist=` and `/playlists/<token>` resolution with song ordering, capo/transposition overrides, and combined titles in `cloudflare-worker.js`, `server.ts`, and client fallback relays.
- **Extended Route Prefix & Title Extraction Fixes**: Updated `isPageForKytarioToken` and slug parsing for `/songbook(s)/`, `/zpevnik(y)/`, `/pisnicka|pisnicky/`, `/projects/`, `/cs/projekty/`, `/song/`, and `/cs/skladba/`, added Next.js HTML metadata title fallbacks and `no-store` caching on fallback titles, plus `X-Kytario-Title-Source` / `X-Kytario-Title-Debug` / `?debug=1` diagnostics.
- **Cache Eviction & Deployment**: Fixed **Forget** to delete cached songbooks from localStorage, IndexedDB, and the offline library; added `render.yaml` and Vite React deduplication for `qrcode`.

### v1.9.4 (2026-11-12)

- **Compact & Consistent ToC**: Removed the extra `"Table of Contents..."` subtitle line and `(continued)` suffix, and unified subsequent ToC page headers with page 1 in preview and PDF export.
- **Book Mode Default & Streamlined UI**: Enabled double-sided Book Mode by default, removed redundant auto-save/Cover-jump/Manage-Song-Visibility clutter, and replaced `"Ready!"` premature stalls and pill collisions with `"Almost ready..."` readiness sync plus a centered blurred blocking `"Updating preview..."` overlay.
- **Full Offline PWA & Faster URL Imports**: Improved Workbox precaching and offline songbook caching, parallelized Kytario URL/CORS relay lookups with tight timeouts, disabled production debug HUD, and fixed HMR WebSocket errors.

### v1.9.3 (2026-11-05)

- **Version Display Fix**: Replaced the hardcoded `1.9.1` string in `src/config.ts` with a build-time `APP_VERSION` value injected from `package.json` through Vite's `define` (single source of truth), so the sidebar/header badge always matches the released version.
- **Safe Fallback**: Falls back to `0.0.0` if the define is undefined at build time, keeping local and CI builds consistent.
- **Documentation Sync**: Updated README and Release Notes to reflect the deployed 1.9.3 state.

### v1.9.1 (2026-11-04)

- **Accurate Heading Extraction**: Prioritizes `<h1>` page headings from `http://kytario.com/<input url>` and `/index-1` metadata, ensuring proper songbook titles (e.g. *Kytarové sedánky Brno*, *PRO RADOST*) are imported.
- **Accurate Cover Display Link**: Preserves the original requested songbook link on cover pages above the QR code (with `https://` removed) instead of resolving to invalid contributor profile slugs.
- **Contributor Project Isolation**: Prevents song contributor project metadata (e.g. `vaclav-dressler-49` or song creator project names) from overwriting top-level songbook URLs and titles.
- **Guarded Playlist vs. Full Songbook Imports**: Entire songbooks containing playlists now import all songs without being replaced or truncated by sub-playlists unless explicitly requested.
- **Scoped Project Resolution**: Restricts project resolution strictly to `/projekty/` and `/projects/` routes.
- **Production Clean-up**: Pruned obsolete test scripts and verified clean TypeScript compilation.

### v1.9.0 (2026-11-02)

- **Modular Architecture & Code-Splitting**: Decomposed monolithic sidebar and import panels into decoupled subcomponents with lazy loading (`React.lazy`) for the heavy preview rendering engine.
- **Draft Settings & Unapplied Changes Tracking**: Real-time settings diffing across 40+ parameters with unapplied changes indicator and one-click review/update banner.
- **URL & Slug Resolution Fixes**: Robust Kytario URL and slug parsing with subpage ignoring (`/songs`, `/print`) and enhanced title enrichment.
- **Concurrent Performance & Storage**: React 19 concurrent transitions and asynchronous IndexedDB caching for large songbooks (250+ songs).

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
