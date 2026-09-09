#!/bin/bash
# Remove from current location
sed -i -z 's/          <\/div>\n        <\/div>\n          \n          <div className="text-center pt-5 pb-1">\n            <span className="text-\[10px\] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">\n              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}\n            <\/span>\n          <\/div>\n        {\/\* Sticky Action Footer \*\/}/          <\/div>\n        <\/div>\n        {\/\* Sticky Action Footer \*\/}/g' src/components/Sidebar.tsx

# Put it before the closing of the overflow container
sed -i -z 's/            <\/div>\n          <\/div>\n        <\/div>\n        {\/\* Sticky Action Footer \*\/}/            <\/div>\n          <\/div>\n\n          <div className="text-center pt-5 pb-1">\n            <span className="text-\[10px\] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">\n              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}\n            <\/span>\n          <\/div>\n        <\/div>\n        {\/\* Sticky Action Footer \*\/}/g' src/components/Sidebar.tsx
