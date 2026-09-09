import sys

with open("src/components/SongbookPreview.tsx", "r") as f:
    content = f.read()

target = """      {/* INDEX / TABLE OF CONTENTS PAGES (PAGINATED) */}
      {tocPages.map((tocPage) => (
        <div 
          key={`toc-page-${tocPage.pageIndex}`}
          className="mx-auto mb-6 sm:mb-10 print:mb-0 print:mx-0 shrink-0 song-page-outer-wrapper"
          style={{
            width: isScaled ? `${scaledWidth}px` : 'fit-content',
            height: isScaled ? `${scaledHeight}px` : 'auto',
            minHeight: isScaled ? `${scaledHeight}px` : undefined,
            position: 'relative',
            contentVisibility: 'auto',
            containIntrinsicSize: isScaled ? `${scaledWidth}px ${scaledHeight}px` : '794px 1123px',
          }}
        >"""

replacement = """      {/* INDEX / TABLE OF CONTENTS PAGES (PAGINATED) */}
      {tocPages.map((tocPage) => (
        <VirtualPage
          key={`toc-page-${tocPage.pageIndex}`}
          isPrinting={isPrinting}
          isScaled={isScaled}
          scaledWidth={scaledWidth}
          scaledHeight={scaledHeight}
          defaultWidth={cssWidth}
          defaultHeight={cssHeight}
        >"""

content = content.replace(target, replacement)

target_close = """          </div>
        </div>
      ))}

      {/* SONG PAGES */}"""

replacement_close = """          </div>
        </VirtualPage>
      ))}

      {/* SONG PAGES */}"""

content = content.replace(target_close, replacement_close)

with open("src/components/SongbookPreview.tsx", "w") as f:
    f.write(content)

