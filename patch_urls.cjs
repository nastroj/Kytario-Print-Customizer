const fs = require('fs');
let code = fs.readFileSync('src/hooks/useBackgroundPdfGenerator.ts', 'utf8');

const urlResolver = `
          // Robustly resolve font URLs relative to the current window location
          // This avoids issues with GitHub Pages subpaths and missing trailing slashes
          const getAbsoluteUrl = (path: string) => {
            const loc = window.location;
            let basePath = loc.pathname;
            // If the path doesn't end with a slash, strip the last segment (e.g. index.html)
            if (!basePath.endsWith('/')) {
              basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
            }
            return loc.origin + basePath + path;
          };

          const fontRegularUrl = getAbsoluteUrl('fonts/Inter-Regular.ttf');
          const fontBoldUrl = getAbsoluteUrl('fonts/Inter-Bold.ttf');
          const fontItalicUrl = getAbsoluteUrl('fonts/Inter-Italic.ttf');
          const fontBoldItalicUrl = getAbsoluteUrl('fonts/Inter-BoldItalic.ttf');
`;

code = code.replace(/\/\/ Resolve font URLs relative to base and window origin[\s\S]*?const fontBoldItalicUrl =[^;]+;/, urlResolver.trim());

fs.writeFileSync('src/hooks/useBackgroundPdfGenerator.ts', code);
