# Kytario Print Customizer 🎸

**Version:** 1.8.16  
**License:** MIT  
**Live Application:** [GitHub Pages](https://nastroj.github.io/Kytario-Print-Customizer/)

A modern, high-performance web application designed to transform Kytario songbooks into clean, beautifully formatted, print-ready PDF collections. Features intelligent auto-scaling, customizable multi-column layouts, automatic Table of Contents generation, custom front and back covers, and background vector PDF compilation.

> **Release Status:** Version 1.8.16 is ready for deployment to GitHub Pages. Pushing to the `main` branch automatically triggers the `.github/workflows/deploy.yml` workflow to build and publish the production site.

---

## 🌟 What's New in v1.8.16

- **Kytario ZIP Song Ordering**: Preserves the original project song creation order rather than forcing alphabetical sorting when importing Kytario export ZIP files.
- **Accurate Songbook Name Detection**: Automatically reads the true songbook name from `project.json` (e.g. `"PRO RADOST"` for the `bodg` token) inside `songbooks`, rather than using generic project names.
- **Song Selection Sorting Options**: Added a sort dropdown in the Manage Songs dialog with support for Title, Artist, and Original Songbook Order.
- **Responsive Floating Toolbar & Scroll-to-Top**: Multi-line button wrapping on mobile screens, collision-free "Scroll to Top" button positioning, and ToC jump menu aligned with the floating bar.
- **Unified Dark Zinc Theme**: Sleek dark gray (zinc) palette across the floating toolbar, modals, backdrop blurs, and status notifications.
- **Virtual Scrolling & Rendering Performance**: Enhanced layout speed with `content-visibility: auto` and React memoization on songbook pages.
- **Unique Child Keys**: Fixed React duplicate key warnings for robust, flicker-free rendering.

---

## 🌟 What's New in v1.8.15

- **Updating Preview Feedback & Toast**: Added an automatic "Updating preview..." spinner pill overlay and confirmation toast whenever song visibility selections are applied, providing immediate visual feedback during preview recalculation.

---

## 🌟 What's New in v1.8.14

- **Debounced Transitions for Song Selection**: Integrated React `useTransition` and `useDeferredValue` for `selectedSongIds` state in `App.tsx` with a debounced updater, eliminating stutter and maintaining instant responsiveness during high-frequency toggling.

---

## 🌟 What's New in v1.8.13

- **Control Buttons Overhaul & Zero Collisions**: Resolved all button overlap issues by integrating "Manage Songs" into the main action bar, clearly labeling "ToC", elevating the navigation popover with a dismiss backdrop, and structuring controls for mobile and desktop screens.

---

## 🌟 What's New in v1.8.12

- **Instant Checkbox Toggling**: Completely eliminated UI freezing when selecting/unselecting songs by staging selections locally inside the modal, committing changes only on "Apply Selection" with non-blocking React transitions.

---

## 🌟 What's New in v1.8.11

- **React 19 Stability Fix**: Resolved the "Expected static flag was missing" internal React error by ensuring strict Rules of Hooks compliance and clean conditional modal mounting.

---

## 🌟 What's New in v1.8.10

- **Reliable Native Virtual Scroll**: Overhauled song visibility manager with a clean, high-performance virtual windowing list that guarantees all songs render instantly with zero lag and 100% visibility.

---

## 🌟 What's New in v1.8.9

- **Manage Songs Visibility Fix**: Resolved an issue where songs were invisible in the Manage Songs modal by ensuring proper container height for the virtualized list component.

---

## 🌟 What's New in v1.8.8

- **Song Manager List Virtualization**: Implemented `react-window` virtualization to render only visible songs in the Manage Songs modal, eliminating UI freezing for large songbooks.

---

## 🌟 What's New in v1.8.7

- **Instant Song Manager Response**: Optimized `SongSelectionModal` with an early-exit guard and lightweight metadata extraction, eliminating any freezing or lag when opening the modal for large songbooks (250+ songs).

---

## 🌟 What's New in v1.8.6

- **Song Manager Performance Optimization**: Fixed UI freezing issues when managing songs on large songbooks (250+ songs) by introducing high-performance pagination (50 items per page) and optimized filtering.

---

## 🌟 What's New in v1.8.5

- **Song Visibility Manager**: Added a new "Manage Songs" modal allowing users to toggle the visibility of individual songs before final PDF generation, complete with batch selection and search filters.

---

## 🌟 What's New in v1.8.4

- **Privacy Filtering in ZIP Import**: Added an "Import only public songs" checkbox in the project selection modal to automatically filter out private songs based on Kytario visibility metadata.

---

## 🌟 What's New in v1.8.3

- **Import Freeze Elimination**: Fixed an issue where selecting a project from the multi-project modal could hide the progress overlay before the layout transition started, causing the UI to seem unresponsive.
- **Button Loading Feedback**: Added immediate submission spinner feedback (`isSubmitting`) to the project selection dialog to prevent repeated clicks.
- **Background IndexedDB Serialization**: Restricted synchronous `localStorage` updates to small collections, ensuring 2MB+ songbooks are saved entirely via asynchronous IndexedDB without freezing the main thread.

---

## 🌟 What's New in v1.8.2

- **Import Freeze Elimination**: Fixed an issue where selecting a project from the multi-project modal could hide the progress overlay before the layout transition started, causing the UI to seem unresponsive.
- **Button Loading Feedback**: Added immediate submission spinner feedback (`isSubmitting`) to the project selection dialog to prevent repeated clicks.
- **Background IndexedDB Serialization**: Restricted synchronous `localStorage` updates to small collections, ensuring 2MB+ songbooks are saved entirely via asynchronous IndexedDB without freezing the main thread.

---

## 🌟 What's New in v1.8.1

- **Interactive Multi-Project Selector for ZIP Exports**: When uploading a Kytario account export `.zip` containing multiple projects or songbooks, the app displays a project selection modal allowing users to choose which project to customize.
- **Detailed Project Cards**: Displays each project's title, song count, slug, and description, highlighting the primary project.
- **Merge / Combine All Projects Option**: Adds a 1-click option to combine all projects found within the ZIP archive into a single comprehensive songbook.

---

## 🌟 What's New in v1.8.0

- **Kytario Export ZIP Archive Import**: Direct in-memory extraction (`jszip`) of full Kytario account export `.zip` archives. Automatically parses `projects/{project}/project.json` and all songs from `projects/{project}/songs/*.json`, accurately reconstituting ChordPro text and chords from AST tokens.
- **Batch Multi-File JSON Upload**: Users can select and upload multiple song `.json` files at once; the app normalizes and bundles them into a unified songbook automatically.
- **Multi-Project Detection**: Identifies all distinct projects inside a ZIP export archive, notifying the user and defaulting to the primary project with the most songs.
- **Canonical Songbook Title Resolution**: The proxy sends a lightweight `HEAD` request to `/api/songbooks/{slug}/pdf` to parse the authentic UTF-8 songbook title from the `Content-Disposition` header (e.g. *PRO RADOST* instead of slug `bodg`).
- **Accurate Artist vs. Author Attribution**: Differentiates between Kytario's `interpreter` (performing artist/band) and `author` (composer/lyricist), correctly mapping performers across front covers, headers, and the Table of Contents.
- **Musical Metadata Capture**: Parses and preserves song musical key (`tonalKey`), capo fret position (`capo`), tempo, and release year.
- **Single-Song URL Support**: Import individual song links (`/cs/skladba/{slug}-{id}`) directly, extracting lyrics and chords from Next.js App Router streaming payloads and Schema.org `MusicComposition` JSON-LD.
- **Large Songbook Storage (IndexedDB Caching)**: Songbook caching now seamlessly utilizes IndexedDB alongside `localStorage`. Massive songbook collections (e.g. 250+ songs, 2.3+ MB) are cached safely without triggering browser `QuotaExceededError` crashes.
- **React Key & Error Boundary Hardening**: Replaced brittle keys with composite unique identifiers across virtual pages, Table of Contents rows, and multi-column section blocks, eliminating React duplicate key warnings and strengthening error boundaries.

---

- **Dynamic Responsive Settings Sidebar**: Adaptive viewport height calculation that scales between 88% and 94% on mobile and laptops to maximize visible controls, while capping cleanly on large desktop monitors without dead white space.
- **Scroll to Top Snapback & Lag Fix**: Removed `content-visibility: auto` DOM thrashing and enforced `overflow-anchor: none` on preview page containers, eliminating Chromium scroll-anchoring bounce-backs and main-thread layout freezes.
- **Table of Contents Relocation**: The **Content** (Table of Contents / Jump to Song) button is positioned immediately adjacent to the **Fit** zoom toggle in the bottom navigation pod.
- **Preview Canvas Cleanup**: Removed the bottom-left floating pagination widget to provide an uncluttered document preview.
- **Subpath & GitHub Pages Deployment (`BASE_PATH`)**: Added first-class `BASE_PATH` support (with automatic asset prefixing for `/Kytario-Print-Customizer/`) and `DISABLE_HMR` toggle across build configurations and `.env` files.

---

## 🌟 What's New in v1.7.0

- **Dual Floating Pod Bottom Toolbar**: Redesigned the bottom toolbar into two distinct floating capsules for cleaner visual balance and ergonomics:
  - **Pod 1 (Navigation & View)**: Contains canvas zoom, Reset Zoom %, Fit page, and the Table of Contents Navigation popover.
  - **Pod 2 (Document Management)**: Houses the Import Songbook, Sidebar Settings, and Export PDF actions with expanded, spacious buttons.
- **Responsive Wrap & Stacking**: Both pods automatically wrap and stack vertically on narrow mobile viewports or high browser zoom levels, maintaining large touch targets and preventing screen overflow.
- **Smart Click-Outside Validation**: Solved accidental sidebar closures by checking clicked element connectedness (`isConnected`). Clicks on dynamic, unmounting React components inside the sidebar are correctly treated as inside clicks.
- **Auto-Scroll to Uncollapsed Sections**: Added a smart scroll-into-view helper that triggers whenever a collapsible section (Page Margins, Smart Auto-scale, Front Cover, Back Cover, and Font and Colors) is expanded in the sidebar.
- **Logical Sidebar Hierarchy**: Relocated the granular **Page Margins** card to sit directly after **Orientation** for an improved configuration flow.
- **CI/CD Lockfile Resolution**: Created a root `package-lock.json` file, resolving the GitHub Pages caching action failure for reproducible, high-speed builds.

---

## 🌟 What's New in v1.6.0

- **Streamlined Monotheme Experience**: Removed dark mode to provide a clean, high-contrast interface that perfectly mirrors the final print output. All settings and previews now use a unified light theme optimized for clarity and accuracy.
- **Redesigned Sidebar Header**: The app name is now prominently featured at the top of the sidebar, followed by a refined settings menu, creating a more professional and branded layout.
- **Improved Sidebar Organization**: Removed redundant headers and restyled the **Smart Auto-scale** section to be collapsible and collapsed by default, ensuring a focused and uncluttered settings experience.
- **Floating Bar Navigation**: The **Table of Contents (Nav)** button has been moved to the floating bottom bar for better ergonomics and quick access during layout tuning.
- **Persistent Songbook Caching**: Your imported songbooks are now cached in `localStorage`, surviving page refreshes and environment changes so you don't have to re-import your data every session.
- **Robust Navigation Fixes**: Resolved a critical bug that caused the song navigation menu to close prematurely, ensuring smooth and reliable document browsing.
- **Enhanced Progress Feedback**: Fine-tuned the import progress modal to provide better visual confirmation upon successful songbook loading.

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

| Technology | Purpose |
| :--- | :--- |
| **React 19 + TypeScript** | Frontend UI framework & robust type safety |
| **Tailwind CSS v4** | Modern utility-first styling engine |
| **Vite 6** | High-performance build tool, dev server, and worker bundler |
| **JSZip** | Client-side in-memory ZIP archive extraction and parsing |
| **pdf-lib & @pdf-lib/fontkit** | Client-side vector PDF generation in Web Worker |
| **vite-plugin-pwa** | Service worker registration, offline asset caching, and web manifest |
| **Express (Development Proxy)** | Local CORS proxy for direct Kytario API and page title fetching |
| **IndexedDB API** | Client-side PDF binary caching and large songbook persistence |
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
   git commit -m "chore: release v1.8.16"
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
- Added background native vector PDF engine using `pdf-lib` and `@pdf-lib/fontkit`.
- Added persistent settings profiles for layout and typography.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
