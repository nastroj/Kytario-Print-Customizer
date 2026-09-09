import re

with open('src/components/SongDisplay.tsx', 'r') as f:
    content = f.read()

# Let's remove pb-0.5 from song-chord
content = content.replace('song-chord pb-0.5 select-text', 'song-chord select-text')

with open('src/components/SongDisplay.tsx', 'w') as f:
    f.write(content)
