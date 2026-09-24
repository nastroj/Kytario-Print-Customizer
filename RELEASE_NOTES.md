# Release Notes

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
