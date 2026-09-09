#!/bin/bash
# Remove the block from the bottom
sed -i -z 's/          <div className="text-center pt-1">\n            <span className="text-\[10px\] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">\n              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}\n            <\/span>\n          <\/div>\n//g' src/components/Sidebar.tsx

# Insert the block before Sticky Action Footer
sed -i -z 's/        <\/div>\n\n        {\/\* Sticky Action Footer \*\/}/          <div className="text-center pt-4 pb-2 border-t border-black\/5 dark:border-zinc-800 mt-4">\n            <span className="text-\[10px\] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">\n              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}\n            <\/span>\n          <\/div>\n        <\/div>\n\n        {\/\* Sticky Action Footer \*\/}/g' src/components/Sidebar.tsx

