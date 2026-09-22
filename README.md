# Kytario Print Customizer 🎸

**Version:** 1.3.1  
**License:** MIT  
**Live Application:** [GitHub Pages](https://nastroj.github.io/Kytario-Print-Customizer/)

A modern web app for transforming Kytario songbook JSON into clean print-ready layouts, table-of-contents pages, and downloadable PDFs.

---

## 🌟 What's New in v1.4.0

- Cleaned up the default sidebar configuration so a fresh session opens with the current, validated layout settings.
- Removed leftover separator-related behavior and aligned the shared layout logic with the final minimal print design.
- Improved repo hygiene for GitHub Pages deployment and release readiness.
- Finalized the project for syncing to GitHub and publishing from the `main` branch.

---

## 🚀 Key Features

### 📄 Background Native PDF Generation
- **Client-Side PDF Engine:** Generates vector PDFs entirely in the browser using `pdf-lib` and `@pdf-lib/fontkit` inside a dedicated Web Worker.
- **Non-Blocking Execution:** Export even massive 200+ song collections in the background with an animated progress modal while continuing to navigate the app.
- **True Type Font Embedding:** Automatically fetches and embeds optimized `.ttf` font files (Plus Jakarta Sans, Playfair Display) for crisp, professional typography.

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
# Initialize git if needed
git init
git remote add origin https://github.com/nastroj/Kytario-Print-Customizer.git

# Stage, commit, and push
git add .
git commit -m "chore: release v1.2.0 - ToC overflow fixes, sync GitHub Pages workflow, update README"
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages in Repository Settings

1. In your GitHub repository, open **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. Once pushed to `main` (or `master`), the **Deploy to GitHub Pages** action will automatically run and publish your app at:
   ```
   https://<username>.github.io/Kytario-Print-Customizer/
   ```

---

## 📖 How to Use

1. **Import:** Drag and drop your Kytario songbook `.json` export file into the upload zone, or click to browse.
2. **Customize:** Open the sidebar to choose page format, orientation, font scales, margin sizes, and color themes.
3. **Apply & Preview:** Click **Apply Settings** in the floating action dock to update the layout. Toggle between continuous scroll and two-page spread views.
4. **Print / Download:**
   - Click **Download PDF** for an instant high-quality vector PDF compiled by the background Web Worker.
   - Or click **Print** for browser native print dialog with paper margins pre-configured.

---

## 📝 Release History

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
