import re

with open('src/components/SongDisplay.tsx', 'r') as f:
    content = f.read()

# Replace `mb-0.5` with dynamic margin
content = content.replace('className="relative mb-0.5 song-line grid items-end"', 'className={`relative song-line grid items-end ${isChordsOnly ? \'mb-0\' : \'mb-[5px]\'}`}')

with open('src/components/SongDisplay.tsx', 'w') as f:
    f.write(content)
