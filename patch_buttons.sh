#!/bin/bash

# Update preview-guides-btn and preview-pagination-toggle-btn base class
sed -i "s/rounded-lg text-xs font-medium transition-colors cursor-pointer/rounded-lg text-xs font-medium border border-black\/5 dark:border-zinc-700\/60 shadow-2xs transition-colors cursor-pointer/g" src/components/SongbookPreview.tsx

# Update Exit Preview Button
sed -i "s/className=\"p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer\"/className=\"p-1.5 rounded-lg border border-black\/5 dark:border-zinc-700\/60 shadow-2xs transition-colors cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100\"/g" src/components/SongbookPreview.tsx

# Update Zoom Out (-)
sed -i "s/className=\"p-1.5 sm:p-2 hover:bg-black\/5 dark:hover:bg-white\/10 active:bg-black\/10 dark:active:bg-white\/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-colors cursor-pointer\"/className=\"p-1.5 sm:p-2 rounded-lg border border-black\/5 dark:border-zinc-700\/60 shadow-2xs transition-colors cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent\"/g" src/components/SongbookPreview.tsx

# Update Zoom In (+)
sed -i "s/className=\"p-1.5 sm:p-2 hover:bg-black\/5 dark:hover:bg-white\/10 active:bg-black\/10 dark:active:bg-white\/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-colors cursor-pointer\"/className=\"p-1.5 sm:p-2 rounded-lg border border-black\/5 dark:border-zinc-700\/60 shadow-2xs transition-colors cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent\"/g" src/components/SongbookPreview.tsx

# Update zoom presets
sed -i "s/className=\`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer \${/className=\`p-1.5 sm:p-2 rounded-lg border shadow-2xs transition-colors cursor-pointer \${/g" src/components/SongbookPreview.tsx

# Fix the internal condition for 100%, fit-width, print-preview toggles:
# Find: bg-black/10 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
# Replace: bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100

# Find: hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-600 dark:text-zinc-300
# Replace: bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 border-black/5 dark:border-zinc-700/60

sed -i "s/? 'bg-black\/10 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'/? 'bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'/g" src/components/SongbookPreview.tsx

sed -i "s/: 'hover:bg-black\/5 dark:hover:bg-white\/10 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-600 dark:text-zinc-300'/: 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 border-black\/5 dark:border-zinc-700\/60'/g" src/components/SongbookPreview.tsx

# Wait, print preview active state already had custom classes, let's fix that one too
sed -i "s/? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'/? 'bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'/g" src/components/SongbookPreview.tsx

# Also, update zoom-preset-menu-btn
sed -i "s/className=\"px-2.5 py-1 hover:bg-black\/5 dark:hover:bg-white\/10 active:bg-black\/10 dark:active:bg-white\/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors min-w-\[66px\] justify-center cursor-pointer\"/className=\"px-2.5 py-1 rounded-lg border border-black\/5 dark:border-zinc-700\/60 shadow-2xs transition-colors cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold flex items-center gap-1 min-w-\[66px\] justify-center\"/g" src/components/SongbookPreview.tsx

# Sidebar + - buttons container border. Let's make sure it matches.
# Wait, the Stepper container has "border border-transparent"
# Let's change "border-transparent" to "border-black/5 dark:border-zinc-700/60" in Sidebar.tsx
sed -i "s/border border-transparent bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 focus:bg-white dark:focus:bg-zinc-800 rounded-lg overflow-hidden shrink-0 shadow-2xs/border border-black\/5 dark:border-zinc-700\/60 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 focus:bg-white dark:focus:bg-zinc-800 rounded-lg overflow-hidden shrink-0 shadow-2xs/g" src/components/Sidebar.tsx

sed -i "s/border border-transparent bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg overflow-hidden shrink-0 shadow-2xs/border border-black\/5 dark:border-zinc-700\/60 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg overflow-hidden shrink-0 shadow-2xs/g" src/components/Sidebar.tsx

