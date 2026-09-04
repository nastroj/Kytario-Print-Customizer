# Kytario Print Customizer

A modern, responsive web application designed for musicians, worship bands, and choir directors to beautifully format, customize, and print songbooks with lyrics and chords.

## ✨ Features

- **Dynamic Layout & Scaling**: Adjust lyrics size, chord size, and overall song scaling to perfectly fit your preferred page format.
- **Smart Formatting**: Intelligently aligns section markers (Chorus, Verse, Bridge, etc.) and chords with lyrics.
- **Chord Toggling**: Easily show or hide chords globally depending on who the printout is for (e.g., singers vs. instrumentalists).
- **Table of Contents Generation**: Automatically generates a clean, structured Table of Contents for multi-song songbooks.
- **Print Optimization**: Pixel-perfect print stylesheets ensure exact physical dimensions (A4, Letter) with zero-waste margins and proper page breaks.
- **Interactive Preview**: Real-time preview with "Fit to Width" and "Fit Page" zoom modes to see exactly how your songbook will print.

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: GitHub Pages (via GitHub Actions)

## 🚀 Getting Started

To run this project locally:

### Prerequisites
Make sure you have Node.js installed (v20 or newer recommended).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/kytario-print-customizer.git
   cd kytario-print-customizer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

## 📦 Deployment

This project is configured to automatically deploy to **GitHub Pages** using GitHub Actions. 
Any push to the `main` or `master` branch will trigger a build and deployment. 

To set this up on your fork:
1. Go to your repository **Settings**.
2. Navigate to **Pages** (under Code and automation).
3. Under **Build and deployment > Source**, select **GitHub Actions**.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
