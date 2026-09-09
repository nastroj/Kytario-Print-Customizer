#!/bin/bash
# Remove it completely everywhere it exists first
sed -i -z 's/          <div className="text-center pt-5 pb-1">\n            <span className="text-\[10px\] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">\n              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}\n            <\/span>\n          <\/div>\n//g' src/components/Sidebar.tsx

# Then insert it where we want it (before the last closing div of the scrollable area)
# The scrollable area ends with:
#             </div>
#           </div>
#         </div>
#         {/* Sticky Action Footer */}

sed -i -z 's/            <\/div>\n          <\/div>\n        <\/div>\n        {\/\* Sticky Action Footer \*\/}/            <\/div>\n          <\/div>\n          <div className="text-center pt-5 pb-1">\n            <span className="text-\[10px\] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">\n              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}\n            <\/span>\n          <\/div>\n        <\/div>\n        {\/\* Sticky Action Footer \*\/}/g' src/components/Sidebar.tsx
