# Release Notes

## v1.8.4 - 2026-10-17

### Privacy Filtering in ZIP Import
- **Public-Only Import Filter**: Added an "Import only public songs" checkbox in the project selection modal. When selected, the importer will filter out all songs marked as private in the Kytario export ZIP.
- **Privacy Detection**: Enhanced `normalizeSingleSong` to detect private status (`isPrivate: true`) based on `isPrivate` or `visibility: 'private'` flags in raw Kytario JSON data.
- **Robust ZIP Import Pipeline**: Updated import handling to properly pass filtering settings during project selection, ensuring user privacy settings are respected in generated PDF songbooks.

---

## v1.8.3 - 2026-10-17

### Fix for Project Import Freeze & Responsiveness
- **Deferred Heavy Processing**: Wrapped project import logic in a `setTimeout` to ensure the modal transitions and loading overlay are rendered before the heavy songbook parsing begins, preventing main-thread UI freezes.
- **Optimized Storage Sync**: Refactored `saveCachedSongbookToStorage` to bypass synchronous `localStorage` writes for large songbooks (over 40 songs), relying exclusively on asynchronous IndexedDB to keep the UI snappy.
- **Improved Loading Feedback**: Added `isSubmitting` spinners to the project selection dialog to prevent race conditions during import.

---

## v1.8.2 - 2026-10-17

### Fix for Project Import Freeze & Responsiveness
- **Smooth Loading State Hand-off**: Resolved a state synchronization bug where selecting a project from the multi-project modal could hide the progress overlay before the layout transition began, causing the UI to appear frozen.
- **Button Debouncing & Loading Feedback**: Added active submission indicators (`isSubmitting`) with spinner state to the project selection dialog to prevent duplicate clicks and ensure instant user feedback.
- **Yielded Layout Transition**: Yielded thread control before mounting large songbooks (e.g. 250+ songs) so the progress bar renders cleanly before intensive DOM operations occur.
- **Storage Serialization Optimization**: Prevented 2MB+ synchronous string serializations in `localStorage` for large songbooks, exclusively utilizing background IndexedDB persistence.

---

## v1.8.1 - 2026-10-17

### Multi-Project Selection Modal for Kytario Export ZIPs
- **Interactive Project Picker**: When importing a Kytario account export `.zip` containing multiple projects or songbooks (e.g. `BODG` and `Zkouska`), the app now displays a sleek interactive selection modal.
- **Project Inspection**: Each project card displays its display name, URL slug, description, and song count, with the primary project flagged automatically.
- **Combined Import Option**: Added a 1-click option to "Combine All Projects" into a single master songbook, retaining all songs across all archives with sequential indexing.
- **Instant Double-Click**: Allows double-clicking any project card to import and load immediately.
- **Validation**: Tested against multi-project archives and single-project ZIPs.

---

## v1.8.0 - 2026-10-17

### Kytario Export ZIP & Multi-File Import Support
- **Full ZIP Export Parsing**: Directly drag and drop or browse Kytario account data export ZIP archives. Automatically extracts `projects/{project}/project.json` and all song JSON files (`projects/{project}/songs/*.json`) in-memory using `jszip`.
- **Batch Multi-File Upload**: Users can select multiple song `.json` files simultaneously; the app automatically bundles and normalizes them into a unified songbook.
- **Multi-Project Detection**: When an export archive contains multiple projects, the app identifies all detected projects and defaults to the primary project with the most songs.

### Enhanced Kytario API Integration & Title Resolution
- **Canonical Songbook Title via PDF Endpoint**: Proxy now queries `HEAD /api/songbooks/{slug}/pdf` to retrieve authentic songbook titles (e.g. "PRO RADOST") from the `Content-Disposition: filename*=UTF-8''...` header.
- **Accurate Artist Attribution**: Differentiates between Kytario's `interpreter` (performing artist/band) and `author` (composer/lyricist), correctly mapping performers on covers, headers, and the Table of Contents.
- **Musical Metadata Capture**: Extracts and preserves musical key (`tonalKey`), capo fret position (`capo`), tempo, and release year.
- **Single Song URL Support**: Enhanced proxy and HTML parser to extract song data from individual song pages (`/cs/skladba/{slug}-{id}`) and JSON-LD structured data.

### Large Songbook Reliability & React Stability
- **IndexedDB Large Songbook Caching**: Large songbooks (e.g. 250+ songs, 2+ MB) are now saved safely in IndexedDB, preventing `QuotaExceededError` crashes in browser `localStorage`.
- **React Key Hardening**: Eliminated duplicate key warnings by using unique compound keys for virtual pages, Table of Contents rows, and multi-column section blocks.
- **Error Boundary Hardening**: Upgraded React error boundaries for reliable error capture and recovery.

### Validation
- `npm run lint` (`tsc --noEmit`)
- `npm run build` (`vite build`)
- Tested against full Kytario export archives (e.g. 256 songs) and live API endpoints.

### Deployment
Published as GitHub Release `v1.8.0` and deployed to GitHub Pages via `.github/workflows/deploy.yml`.

---

## v1.7.1 - 2026-10-12

### Dynamic Responsive Settings Sidebar
- **Adaptive Viewport Scaling**: Implemented a dynamic height calculation for the Settings drawer that scales between 88% and 94% on smaller screens to maximize usable space, while capping cleanly (max 920px) on large high-resolution desktop monitors.
- **Content-Fitted Height**: Eliminated forced flex expansion that previously left empty white gaps between settings controls and bottom action buttons; the drawer now fits its content snugly.
- **Enhanced Internal Scrolling**: Settings sections scroll smoothly within `min-h-0 overflow-y-auto` while keeping the grab handle header and bottom action bar pinned and accessible.

### Scroll to Top Snapback & Lag Elimination
- **Removed `contentVisibility: auto` Thrashing**: Removed `content-visibility: auto` and `contain-intrinsic-size` from preview pages. This eliminates massive layout shifts and main-thread freezes when jumping to the top of large songbooks.
- **Disabled Browser Scroll Anchoring**: Enforced `overflow-anchor: none` on the scroll container and page wrappers (`.print-scroll-container` and `.song-page-outer-wrapper`), preventing Chromium from automatically snapping scroll position back down after scrolling up.
- **Smooth Native Scrolling**: Replaced conflicting touch handlers with a clean, smooth `useCallback` scroll implementation (`el.scrollTo({ top: 0, left: 0, behavior: 'smooth' })`).

### Toolbar Ergonomics & Page Cleanliness
- **Table of Contents Relocation**: Moved the **Content** (Table of Contents / Jump to Song) trigger button directly adjacent to the **Fit** zoom toggle in the View & Navigation toolbar pod.
- **Floating Pagination Cleanup**: Removed the bottom-left floating `<- page / total ->` widget to keep the preview canvas unobstructed.

### Build & GitHub Pages Deployment Pipeline
- **Subpath Base Path Configuration**: Added full `BASE_PATH` support (defaulting to `/Kytario-Print-Customizer/`) across `vite.config.ts`, `server.ts`, and `.env` to ensure seamless GitHub Pages deployment without broken asset paths.
- **Selective HMR Control**: Implemented `DISABLE_HMR` toggle across both Vite client and Express server to disable file-watching and WebSocket servers in environments where live reload is not desired.
- **SPA Fallback Verification**: Ensured `dist/404.html` and `dist/index.html` are generated and verified on production builds.

### Validation
- `npm run lint` (`tsc --noEmit`)
- `npm run build` (`vite build`)

### Deployment
This release is prepared for GitHub Pages deployment via the `.github/workflows/deploy.yml` workflow.

---

## v1.7.0 - 2026-10-06

### Separated View & Action Toolbar Pods (Responsive UX Overhaul)

- **Sleek Dual Floating Pods**: Split the crowded bottom bar into two centered floating capsules:
  - **Pod 1 (Navigation & View)**: Groups all inspection tools (`Zoom Out`, `Zoom % Display & Reset`, `Zoom In`, `Fit Width/Page`, and the `Content` [Song Navigation] popover).
  - **Pod 2 (Workflow & Output)**: Dedicated to core document operations (`Import`, `Settings`, and `Export PDF`).
- **Flexible Wrapping & Stacking**: Designed both pods to automatically wrap and stack vertically on narrow mobile viewports or high browser zoom levels, maintaining comfortable, large touch targets and preventing any clipping or visual overflow.
- **Wider, High-End Layout**: Expanded the main Actions capsule to provide elegant, roomy spacing between primary buttons on desktop screens.

### Smart Click-Outside Dismissal (React Stability Fix)

- **Connectedness Validation**: Added safety connectedness checks (`!target.isConnected || !document.body.contains(target)`) to the document-level click outside listener. 
- **Elimination of Accidental Dismissals**: Prevents the sidebar or song drawer from closing when users click dynamic elements (like stepper buttons, select dropdowns, toggles, or color card dots) that React unmounts or replaces in the DOM synchronously during state changes.

### Sidebar Layout & Scroll Navigation Enhancements

- **Logical Customization Flow**: Relocated the granular **Page Margins** settings section in the sidebar to sit immediately after the **Orientation** card for a more intuitive design configuration sequence.
- **Auto-Scroll to Uncollapsed Sections**: Added a smart `scrollSectionIntoView` utility that triggers whenever a collapsible section (Page Margins, Smart Auto-scale, Front Cover, Back Cover, and Font and Colors) is expanded.
- **Intelligent View Positioning**: Automatically computes section height and scroll bounds. If the expanded card fits in the sidebar viewport, it brings the entire card in view; if the card is taller than the viewport, it aligns the top cleanly so the user can easily interact with it.

### GitHub CI/CD Pipeline Resiliency

- **Lockfile Generation**: Created a fully resolved root `package-lock.json` file in the project.
- **Actions Optimization**: Resolved the `actions/setup-node@v4` caching failure (`cache: 'npm'`), resulting in faster, robust, and reproducible builds in GitHub Actions.

---

## v1.6.0 - 2026-10-05

### Complete Theme Overhaul & Monotheme Migration

- **Dark Mode Removal**: Completely removed all dark mode logic, classes, and settings persistence. The application now uses a clean, high-contrast light theme optimized for both screen preview and physical printing.
- **Simplified Color Logic**: Cleaned up color utility functions (removed `getDisplayColor` inversion) as the UI now strictly mirrors the intended print output colors at all times.

### Sidebar Navigation & UI Redesign

- **App Branding & Header Layout**: Reorganized the Sidebar header to place the **application name** at the top, with the **Settings** menu and version info positioned logically below it.
- **Clutter-Free Interface**: Removed redundant section-level text headers ("Page layout, fonts & colors") to streamline the user experience and maximize vertical space.
- **Collapsible Smart Auto-scale**: Restyled the **Smart Auto-scale** settings card to be collapsible (collapsed by default), matching the design pattern of the Cover Page sections for a unified feel.

### Navigation & UX Enhancements

- **Floating Bar Navigation**: Relocated the **"Nav" (Table of Contents)** icon to the floating bottom bar, positioned between Settings and Export for better thumb-reach and accessibility.
- **Nav Menu Bug Fix**: Fixed a critical issue where the song navigation menu would immediately close upon clicking the toggle button due to a click-outside detection conflict.
- **Visual Feedback**: Increased the songbook import progress modal duration to 2000ms, ensuring users can clearly see the 100% completion state before the preview renders.

### Import & Persistence Improvements

- **Songbook Caching**: Implemented persistent **songbook caching** in browser `localStorage`. Imported songbooks now survive page refreshes, tab closures, or environment resets (like system appearance changes), eliminating the need for frequent re-imports.
- **Reset Reliability**: Refined the **Reset Songbook** flow to correctly clear all cached data and return the user to a clean initial state.

### Validation

- `npm run lint` (`tsc --noEmit`)
- `npm run build` (`vite build`)

### Deployment

This release is prepared for GitHub Pages deployment via the `.github/workflows/deploy.yml` workflow.

---

## v1.5.0 - 2026-10-04

### Local Settings Persistence & Streamlined System Actions

- **Separated Light & Dark Mode Saved Settings**: Introduced a **Save Settings** button that explicitly saves current preferences to browser `localStorage` under `kytario-print-settings-v2_light` (for Light Mode) or `kytario-print-settings-v2_dark` (for Dark Mode).
- **Single "Reset Defaults" Button**: Consolidated scattered section-level "Defaults" buttons across sidebar cards into **one single, centralized "Reset Defaults" button** that resets all settings for the active mode and clears saved `localStorage` overrides.
- **Space-Saving Footer Relocation & Color Sync**: Relocated the Save Settings and Reset Defaults buttons to the footer action buttons area in the sidebar, freeing up massive vertical space at the top of the settings page. Styled both buttons in a matching, clean zinc theme with concise labels (removing redundant `(Light)` and `(Dark)` suffixes).

### Fine-Grained Table of Contents Colors

- **ToC Author Name & Page Number Color Customization**: Added specialized controls for **ToC Authors** (`tocArtistColor`) and **ToC Page Nums** (`tocPageColor`) in the Table of Contents Typography settings card. Users can now individually customize the colors of song titles, author names, and page numbers/headers in the Table of Contents, with full parity between the interactive on-screen preview and the generated PDF.

### Smart Auto-scale & Layout Refinements

- **Smart Auto-scale Controls**: Replaced single-toggle section filling with two precise steppers: **Max. Line Height** and **Section Margin Cap**, located directly under the **Smart Auto-scale** settings card.
- **Max Font Cap Distribution**: When font size hits the user-configured **Max Font Cap**, remaining vertical column height is smoothly distributed across section padding (65%) and line margins (35%), maintaining uniform visual rhythm and eliminating bottom voids.

### Book Mode & Page Number Positioning

- **Default Page Positioning**:
  - When **Book Mode is OFF**, page numbers default to **Right** and the "Outer (Alternating)" choice is hidden.
  - When **Book Mode is ON**, page numbers default to **Outer (Alternating)**.
- **Physical Page Accounting**: Updated page alternating logic to account for total preceding pages (Front Cover + Table of Contents page count), ensuring odd physical pages (recto) place numbers on the right and even physical pages (verso) place numbers on the left.
- **PDF Parity**: Both web preview and background `pdfWorker` share exact page number positioning calculations.

### Validation

- `npm run lint` (`tsc --noEmit`)
- `npm run build` (`vite build`)

### Deployment

This release is prepared for GitHub Pages deployment via the `.github/workflows/deploy.yml` workflow.

### Release checklist

- Version aligned across `package.json`, `package-lock.json`, `src/config.ts`, `README.md`, and `RELEASE_NOTES.md`: `1.5.0`
- PDF export verified and aligned with browser preview
- Ready to push to `main` for deployment

---

### Import Flow Cleanup

- **Removed PDF Import**: Removed the unreliable PDF import UI and parser, along with the parser-only `pdfjs-dist` dependency. PDF generation and export are unchanged.
- **Reordered Import Tabs**: The import screen now presents Kytario URL, Paste JSON, and JSON File in that order, with Kytario URL selected by default.

### Validation

- `npm run lint` (`tsc --noEmit`)
- `npm run build` (`vite build`)

### Deployment

This release is prepared for GitHub Pages deployment via the `.github/workflows/deploy.yml` workflow.

### Release checklist

- Version aligned across `package.json`, `package-lock.json`, `src/config.ts`, `README.md`, and `RELEASE_NOTES.md`: `1.4.9`
- PDF export remains available
- Ready to push to `main` for deployment

---

## v1.4.8 - 2026-09-29

### Kytario Songbook Name Extraction, GitHub Pages Optimization & Asset Audit

- **Human-Readable Songbook Title Extraction**: Upgraded the Kytario API proxy and parser to retrieve the authentic songbook title (e.g. *"PRO RADOST"*) from public page metadata (JSON-LD `MusicAlbum`, HTML `<title>`, OpenGraph tags) instead of defaulting to the technical URL/project token (`"YOUR-SONGBOOK"`).
- **Edge-Case Validation for URL & Language Slugs**: Hardened `extractKytarioSlug` across client and server to prevent false matches against language prefixes (such as `/cs`, `/en`), query parameters, or hash fragments, returning informative user-facing alerts instead of uncaught 404 network errors.
- **GitHub Pages Static Host Fallback & 1-Click JSON Helper**: Added client-side fallback strategies (direct fetch, public CORS proxies) when deployed to static hosting environments like GitHub Pages where no Express proxy backend runs. If browser CORS restrictions block automated background requests, the app displays an actionable guidance card with a 1-click link to open the raw JSON in a new browser tab and instantly switch to the Paste tab.
- **Redundant Asset & Binary Cleanup**:
  - Removed obsolete 1.08 MB `public/pdf.worker.min.js` (PDF parsing runs in-thread with `disableWorker: true`, eliminating unnecessary distribution payload).
  - Pruned unused `public/fonts/Roboto-*.ttf` font binaries (412 KB saved; web preview uses Google Fonts and PDF worker uses embedded Unicode Inter typography).
  - Deleted legacy `bun.lock` (161 KB) and unused `src/lib/utils.ts` boilerplate.
  - Removed dead `motion-vendor` rollup chunk rule from `vite.config.ts`.
- **GitHub Pages SPA Routing (`404.html`)**: Added automated generation of `404.html` during the production build to ensure clean SPA direct routing and refreshes on static GitHub Pages hosting.
- **Optimized PWA Precache**: Reduced service worker precache footprint by over 30% (~5.3 MB to ~2.8 MB), accelerating offline caching, PWA installation, and initial load performance on GitHub Pages.

### Validation

- `npm run lint` (`tsc --noEmit`)
- `npm run build` (`vite build`)

### Deployment

This release is prepared for GitHub Pages deployment via the `.github/workflows/deploy.yml` workflow.

### Release checklist

- Version aligned across `package.json`, `package-lock.json`, `src/config.ts`, `README.md`, and `RELEASE_NOTES.md`: `1.4.8`
- Legacy and redundant assets completely pruned
- Build artifact includes `404.html` for GitHub Pages
- Ready to push to `main` for deployment

---

## v1.4.7 - 2026-09-26

### Book Printing, Performance, & Build Audit

- **Double-Sided Book Printing Registration**: Enhanced the dynamic `@page` print setup to inject precise `:left` and `:right` pseudo-classes, supporting gutter binding margins for double-sided printouts.
- **Smart Section Separators with Top-of-Column Filtering**: Introduced clean horizontal section dividers that automatically suppress when appearing at the top of a column, preserving visual cleanliness.
- **High-Performance Worker Serialization**: Upgraded the background PDF worker communication with Zero-Copy Serialization (transferring binary `ArrayBuffer` payloads) and asynchronous chunked loops, preventing main-thread freezes during large songbook exports.
- **Advanced Import Capabilities**: Added direct importing from Kytario URLs via a server-side proxy and PDF text/chord parser recovery for orphaned documents.
- **Redundant Asset & Artifact Cleanup**: Pruned unnecessary files (such as leftover `bun.lock` files) to ensure a pristine, lean deployment for GitHub Pages.

### Validation

- `npm run lint` (`tsc --noEmit`)
- `npm run build` (`vite build`)

### Deployment

This release is prepared for GitHub Pages deployment via the `.github/workflows/deploy.yml` workflow.

### Release checklist

- Version aligned across `package.json`, `package-lock.json`, `src/config.ts`, and `README.md`: `1.4.7`
- Printing configuration verified across major browser engines
- Project-wide audit completed and legacy artifacts removed
- Ready to push to `main` for deployment

---

## v1.4.4 - 2026-09-26

### Print Optimization & Code Audit

- **Robust Printing Configuration**: Updated `@page` and `@media print` rules in `index.html` to suppress registration marks (`marks: none`, `bleed: 0mm`), reset margins, and enforce color preservation (`color-adjust: exact`).
- **Back Cover Synchronization**: Fixed a discrepancy where the PDF back cover defaulted to a hardcoded title and black-and-white colors; it now correctly mirrors the songbook title and active color palette from the web preview.
- **Consolidated Print CSS**: Refactored `src/index.css` to use a shared `.print-page-base` utility class for all page containers, improving maintainability and ensuring consistent layout behavior.
- **Project-Wide Audit & Pruning**: Removed redundant legacy `assets/` directory, unused lockfiles (`bun.lock`), and pruned unreferenced dependencies (`motion`, `@google/genai`) to ensure a clean, production-optimized codebase.
- **Improved PDF Page Stability**: Standardized `print-cover-container` and `print-page-container` usage across `SongbookPreview.tsx` to prevent unintended page breaks or clipping.

### Validation

- `npm run lint` (`tsc --noEmit`)
- `npm run build` (`vite build`)

### Deployment

This release is prepared for GitHub Pages deployment via the `.github/workflows/deploy.yml` workflow.

### Release checklist

- Version aligned across `package.json`, `package-lock.json`, `src/config.ts`, and `README.md`: `1.4.4`
- Printing configuration verified across major browser engines
- Project-wide audit completed and legacy artifacts removed
- Ready to push to `main` for deployment

---

## v1.4.3 - 2026-09-26

### PDF Rendering & Print Audit

- **Fixed missing page numbers in generated PDFs**: Migrated top-of-page number badges to resilient inline SVG paths (`<svg>` DOM elements and native PDF vector paths), preventing browser print stripping when "Background graphics" is unchecked.
- **Synchronized document page indexing (`docPageIndex`)**: Page indices now accurately account for front cover and Table of Contents pages, ensuring outer/inner margin alternating badges and margins in book mode match actual physical book spreads.
- **Deep audit of `@media print` and `@page` rules**: Removed legacy padding overrides from `src/index.css`, cleaned up dynamic `@page` rule injection, and ensured `.print-page-container` preserves flex column layout without page-break clip issues.
- **Fixed Back Cover Title & Styling in PDF Export**: Updated `renderBackCoverPage` in `pdfWorker.ts` to correctly fallback to the songbook title (`songbookData.title`) instead of hardcoded `"ZADNÍ STRANA"`. Improved color alignment by utilizing `separatorLineColor` and applying opacities to match the web preview's visual hierarchy.
- **Legacy artifact and asset cleanup**: Deleted redundant lockfile (`bun.lock`), pruned unused duplicate SVGs (`icon.svg`, `icon-maskable.svg`), removed 110+ unused packages (purged native `@resvg/resvg-js` binaries, unneeded server packages `express`, `@types/express`, `dotenv`, `autoprefixer`, and `class-variance-authority`), and deduplicated PWA manifest icon declarations.
- **Optimized Vite build process**: Implemented Rollup `manualChunks` in `vite.config.ts` splitting `react-vendor` and `icons-vendor` into separate cacheable chunks under 400 kB, converted `index.html` asset tags to `%BASE_URL%`, and added Schema.org JSON-LD structured data.

### Validation

- `npm run lint` (`tsc --noEmit`)
- `npm run build` (`vite build`)

### Deployment

This release is prepared for GitHub Pages deployment. The workflow in `.github/workflows/deploy.yml` builds with Node.js 22 and deploys the generated `dist` output from the `main` branch.

### Release checklist

- Version aligned across `package.json`, `package-lock.json`, `src/config.ts`, and `README.md`: `1.4.3`
- Dynamic base path support verified for GitHub Pages
- Ready to push to `main` for deployment

---

## v1.4.2 - 2026-09-24

### Reading and layout improvements

- Reduced desktop title-block spacing from 24px to 16px to save page space while preserving readability.
- Synchronized title spacing and SmartFit height estimates between preview and PDF output.
- Kept the on-screen preview and background PDF renderer synchronized.
- Improved release consistency across the app metadata and documentation.

### Validation

- `npm run lint`
- `npm run build`

### Deployment

This release is prepared for GitHub Pages deployment. The workflow in `.github/workflows/deploy.yml` builds with Node.js 22 and deploys the generated `dist` output from the `main` branch.

### Release checklist

- Version aligned across the app and package metadata: `1.4.2`
- Documentation synced with the current GitHub Pages workflow
- Ready to push to `main` for deployment
