#!/bin/bash
sed -i -e '/{\/\* Sticky Action Footer \*\/}/i \
          <div className="text-center pt-5 pb-1">\
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">\
              Kytario Print Customizer v{APP_CONFIG.APP_VERSION}\
            </span>\
          </div>\
' src/components/Sidebar.tsx
