#!/bin/bash

# Zoom Out (-)
sed -i "s/className=\"p-1.5 sm:p-2 rounded-lg border border-black\/5 dark:border-zinc-700\/60 shadow-2xs transition-colors cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent\"/className=\"p-1.5 sm:p-2 hover:bg-black\/5 dark:hover:bg-white\/10 active:bg-black\/10 dark:active:bg-white\/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-full transition-colors cursor-pointer\"/g" src/components/SongbookPreview.tsx

# Zoom Preset Menu Toggle
sed -i "s/className=\"px-2.5 py-1 rounded-lg border border-black\/5 dark:border-zinc-700\/60 shadow-2xs transition-colors cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-semibold flex items-center gap-1 min-w-\[66px\] justify-center\"/className=\"px-2.5 py-1 hover:bg-black\/5 dark:hover:bg-white\/10 active:bg-black\/10 dark:active:bg-white\/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors min-w-\[66px\] justify-center cursor-pointer\"/g" src/components/SongbookPreview.tsx

# zoom-100-btn and zoom-fit-width-btn and zoom-print-preview-btn
# First, remove border and shadow from the base classes
# Wait, I changed "rounded-full transition-colors cursor-pointer ${" to "rounded-lg border shadow-2xs transition-colors cursor-pointer ${" previously? No, wait! I used "rounded-full" in my replace earlier for the three toggles! Ah, wait, no, I actually did NOT change rounded-full to rounded-lg! Let's look at the output above. 

# Oh, looking at the output above:
# className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer ${
# Ah! I see what happened. I missed changing `rounded-full` to `rounded-lg border shadow-2xs` for those 3. But I DID change their inside classes! 

# Revert inside classes for toggles:
# bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 -> bg-black/10 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 (for 100% and fit)
sed -i "s/? 'bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'/? 'bg-black\/10 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'/g" src/components/SongbookPreview.tsx

# Wait, print preview toggle had 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
# I need to handle that carefully.
# Wait, I replaced all instances of "? 'bg-zinc-900 hover:..." above. Let me just replace them all back to "? 'bg-black/10...'" and then manually fix print preview if needed.
# Actually let's just do it directly.

