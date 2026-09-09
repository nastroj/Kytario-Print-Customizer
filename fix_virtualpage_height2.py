import sys

with open("src/components/SongbookPreview.tsx", "r") as f:
    content = f.read()

target = """        height: isVisible ? (isScaled ? `${scaledHeight}px` : 'auto') : defaultHeight,"""

replacement = """        height: isVisible ? (isScaled ? `${scaledHeight}px` : 'auto') : (isScaled ? `${scaledHeight}px` : defaultHeight),"""

content = content.replace(target, replacement)

with open("src/components/SongbookPreview.tsx", "w") as f:
    f.write(content)
