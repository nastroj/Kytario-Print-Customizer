#!/bin/bash
# Revert 100% and fit-width to their subtle active state
sed -i "1284,1310s/? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'/? 'bg-black\/10 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'/g" src/components/SongbookPreview.tsx
