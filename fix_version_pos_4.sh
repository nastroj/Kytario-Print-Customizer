#!/bin/bash
# Remove it again
sed -i -z 's/          <div className="text-center pt-8 pb-4">\n            <span className="text-\[10px\] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">\n              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}\n            <\/span>\n          <\/div>\n//g' src/components/Sidebar.tsx

# Now insert it BEFORE the last </div> of the scrollable container
# We know the scrollable container ends with:
#             </div>
#           </div>
#         </div>
#         {/* Sticky Action Footer */}
# 
# Wait, actually:
#                 <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Color only</span>
#               </div>
#             </div>
#           </div>
#           
#           <div className="text-center pt-8 pb-4">...</div>
#         </div>

sed -i -z 's/                <span className="text-\[11px\] text-zinc-400 dark:text-zinc-500 font-medium">Color only<\/span>\n              <\/div>\n            <\/div>\n          <\/div>\n        <\/div>/                <span className="text-\[11px\] text-zinc-400 dark:text-zinc-500 font-medium">Color only<\/span>\n              <\/div>\n            <\/div>\n          <\/div>\n\n          <div className="text-center pt-8 pb-4">\n            <span className="text-\[10px\] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">\n              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}\n            <\/span>\n          <\/div>\n        <\/div>/g' src/components/Sidebar.tsx

