import sys

with open("src/components/SongbookPreview.tsx", "r") as f:
    content = f.read()

target = """        minWidth: isScaled ? `${scaledWidth}px` : defaultWidth,
        position: 'relative',
        contentVisibility: 'auto',
        containIntrinsicSize: isScaled ? `${scaledWidth}px ${scaledHeight}px` : `${defaultWidth} ${defaultHeight}`,
      }}
    >
      {isVisible ? children : null}
    </div>"""

replacement = """        minWidth: isScaled ? `${scaledWidth}px` : defaultWidth,
        position: 'relative',
        contentVisibility: isPrinting ? 'visible' : 'auto',
        containIntrinsicSize: isScaled ? `${scaledWidth}px ${scaledHeight}px` : `${defaultWidth} ${defaultHeight}`,
      }}
    >
      {isVisible ? children : <div style={{ height: isScaled ? `${scaledHeight}px` : defaultHeight }} />}
    </div>"""

content = content.replace(target, replacement)

with open("src/components/SongbookPreview.tsx", "w") as f:
    f.write(content)
