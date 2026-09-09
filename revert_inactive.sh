#!/bin/bash
sed -i "s/: 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 border-black\/5 dark:border-zinc-700\/60'/: 'hover:bg-black\/5 dark:hover:bg-white\/10 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-600 dark:text-zinc-300'/g" src/components/SongbookPreview.tsx

sed -i "s/? 'bg-black\/10 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'               : 'hover:bg-black\/5 dark:hover:bg-white\/10 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-600 dark:text-zinc-300'          }\"\n          title={isPrintPreviewMode/? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'               : 'hover:bg-black\/5 dark:hover:bg-white\/10 hover:text-zinc-900 dark:hover:text-zinc-100 text-zinc-600 dark:text-zinc-300'          }\"\n          title={isPrintPreviewMode/g" src/components/SongbookPreview.tsx

