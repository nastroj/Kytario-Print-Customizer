# Release Notes

## v1.4.2 - 2026-09-23

### Reading and layout improvements

- Reduced desktop title-block spacing from 24px to 16px to save page space while preserving readability.
- Synchronized title spacing and SmartFit height estimates between preview and PDF output.
- Kept the on-screen preview and background PDF renderer synchronized.

### Validation

- `npm run lint`
- `npm run build`

### Deployment

The GitHub Pages workflow deploys from `main` using Node.js 22. Push the release commit to `main` to trigger deployment.
