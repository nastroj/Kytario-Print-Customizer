# Release Notes

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
- **Optimized Vite build process**: Implemented Rollup `manualChunks` in `vite.config.ts` splitting `react-vendor`, `icons-vendor`, and `motion-vendor` into separate cacheable chunks under 400 kB, converted `index.html` asset tags to `%BASE_URL%`, and added Schema.org JSON-LD structured data.

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
