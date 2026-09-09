#!/bin/bash
# Insert at line 644 (before the 4th </div>)
sed -i '644i\
          <div className="text-center pt-8 pb-2">\
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">\
              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}\
            </span>\
          </div>\
' src/components/Sidebar.tsx
