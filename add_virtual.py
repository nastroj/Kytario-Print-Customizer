import sys

with open("src/components/SongbookPreview.tsx", "r") as f:
    content = f.read()

# Insert VirtualPage before SongPagesList
virtual_page_code = """
const VirtualPage = memo(function VirtualPage({ 
  children, 
  isPrinting,
  isScaled,
  scaledWidth,
  scaledHeight,
  defaultWidth,
  defaultHeight
}: { 
  children: React.ReactNode, 
  isPrinting: boolean,
  isScaled: boolean,
  scaledWidth: number,
  scaledHeight: number,
  defaultWidth: string,
  defaultHeight: string
}) {
  const [isVisible, setIsVisible] = useState(isPrinting);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPrinting) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, {
      rootMargin: '2500px 0px'
    });

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [isPrinting]);

  return (
    <div 
      ref={ref}
      className="mx-auto mb-6 sm:mb-10 print:mb-0 print:mx-0 shrink-0 song-page-outer-wrapper"
      style={{
        width: isScaled ? `${scaledWidth}px` : 'fit-content',
        height: isVisible ? (isScaled ? `${scaledHeight}px` : 'auto') : defaultHeight,
        minHeight: isScaled ? `${scaledHeight}px` : defaultHeight,
        minWidth: isScaled ? `${scaledWidth}px` : defaultWidth,
        position: 'relative',
        contentVisibility: 'auto',
        containIntrinsicSize: isScaled ? `${scaledWidth}px ${scaledHeight}px` : `${defaultWidth} ${defaultHeight}`,
      }}
    >
      {isVisible ? children : null}
    </div>
  );
});
"""

content = content.replace("// Dedicated Memoized Song Pages List", virtual_page_code + "\n// Dedicated Memoized Song Pages List")

# Now update SongPagesListProps
content = content.replace(
    "  showMarginGuides?: boolean;\n}", 
    "  showMarginGuides?: boolean;\n  isPrinting?: boolean;\n}"
)

# Now update the SongPagesList signature
content = content.replace(
    "  showMarginGuides = true,\n}: SongPagesListProps) {",
    "  showMarginGuides = true,\n  isPrinting = false,\n}: SongPagesListProps) {"
)

# Now update the usages in SongPagesList (toc pages)
toc_target = """      {tocPages.map((tocPage) => (
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
        >
          <div 
            id={`toc-page-${tocPage.pageIndex}`}"""

toc_replacement = """      {tocPages.map((tocPage) => (
        <VirtualPage
          key={`toc-page-${tocPage.pageIndex}`}
          isPrinting={isPrinting}
          isScaled={isScaled}
          scaledWidth={scaledWidth}
          scaledHeight={scaledHeight}
          defaultWidth={cssWidth}
          defaultHeight={cssHeight}
        >
          <div 
            id={`toc-page-${tocPage.pageIndex}`}"""

content = content.replace(toc_target, toc_replacement)

# And close the toc page div (replace `</div>\n        </div>\n      ))` with `</div>\n        </VirtualPage>\n      ))`)
toc_close_target = """          </div>
        </div>
      ))}"""
toc_close_replacement = """          </div>
        </VirtualPage>
      ))}"""
content = content.replace(toc_close_target, toc_close_replacement, 1)

# Now update the usages in SongPagesList (song pages)
song_target = """      {songs.map((song, i) => (
        <div 
          key={song.id || `song-${i}`}
          className="mx-auto mb-6 sm:mb-10 print:mb-0 print:mx-0 shrink-0 song-page-outer-wrapper"
          style={{
            width: isScaled ? `${scaledWidth}px` : 'fit-content',
            height: isScaled ? `${scaledHeight}px` : 'auto',
            minHeight: isScaled ? `${scaledHeight}px` : undefined,
            position: 'relative',
            contentVisibility: 'auto',
            containIntrinsicSize: isScaled ? `${scaledWidth}px ${scaledHeight}px` : '794px 1123px',
          }}
        >
          <div 
            id={`song-${i}`}"""

song_replacement = """      {songs.map((song, i) => (
        <VirtualPage
          key={song.id || `song-${i}`}
          isPrinting={isPrinting}
          isScaled={isScaled}
          scaledWidth={scaledWidth}
          scaledHeight={scaledHeight}
          defaultWidth={cssWidth}
          defaultHeight={cssHeight}
        >
          <div 
            id={`song-${i}`}"""

content = content.replace(song_target, song_replacement)

# And close the song page div
song_close_target = """          </div>
        </div>
      ))}"""
song_close_replacement = """          </div>
        </VirtualPage>
      ))}"""
content = content.replace(song_close_target, song_close_replacement, 1)

# Pass isPrinting to SongPagesList in SongbookPreview
pass_is_printing_target = """            isPrintPreviewMode={isPrintPreviewMode}
            showMarginGuides={showMarginGuides}
          />"""
pass_is_printing_replacement = """            isPrintPreviewMode={isPrintPreviewMode}
            showMarginGuides={showMarginGuides}
            isPrinting={isPrinting}
          />"""
content = content.replace(pass_is_printing_target, pass_is_printing_replacement)

with open("src/components/SongbookPreview.tsx", "w") as f:
    f.write(content)

