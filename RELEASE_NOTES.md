# Release Notes

## v1.4.1 - 2026-09-23

### Reading and layout improvements

- Improved SmartFit spacing between song sections when spare page space is available.
- Measured free space from the tallest balanced song column instead of the combined height of all columns.
- Distributed available space across visible gaps between sections.
- Allowed section spacing to grow from the 16px baseline up to 32px when the page can accommodate it.
- Kept the on-screen preview and background PDF renderer synchronized.

### Validation

- `npm run lint`
- `npm run build`

### Deployment

The GitHub Pages workflow deploys from `main` using Node.js 22. Push the release commit to `main` to trigger deployment.
