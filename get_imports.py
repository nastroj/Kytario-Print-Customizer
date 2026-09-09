import re
with open("src/components/SongbookPreview.tsx", "r") as f:
    for i, line in enumerate(f.readlines()):
        if i < 40:
            print(line.strip())
