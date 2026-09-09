import sys

with open("src/utils.ts", "r") as f:
    content = f.read()

target = """  // Apply user-configured max auto-scale multiplier
  const userMultiplierCap = (typeof settings.maxScaleMultiplier === 'number' && settings.maxScaleMultiplier > 0)
    ? settings.maxScaleMultiplier
    : 2.0;
  maxUpscale = Math.min(maxUpscale, userMultiplierCap);

  // Apply user-configured max auto-scale font size cap (for lyrics font size)
  if (typeof settings.maxAutoFontSize === 'number' && settings.maxAutoFontSize > 0) {
    const fontCapMultiplier = settings.maxAutoFontSize / baseLyricsSize;
    maxUpscale = Math.min(maxUpscale, fontCapMultiplier);
  }"""

replacement = """  // Apply user-configured max font size in px
  const maxFontSizePx = (typeof settings.maxFontSizePx === 'number' && settings.maxFontSizePx > 0)
    ? settings.maxFontSizePx
    : 32;
    
  // Convert px to pt (1pt = 1.333px, so px * 0.75 = pt)
  const maxFontSizePt = maxFontSizePx * (72 / 96);
  
  // Constrain maxUpscale based on the font cap
  const fontCapMultiplier = maxFontSizePt / baseLyricsSize;
  maxUpscale = Math.min(maxUpscale, fontCapMultiplier);"""

content = content.replace(target, replacement)

# replace interface type as well
content = content.replace("    maxScaleMultiplier?: number;\n    maxAutoFontSize?: number;", "    maxFontSizePx?: number;")

with open("src/utils.ts", "w") as f:
    f.write(content)

with open("src/components/SongbookPreview.tsx", "r") as f:
    content = f.read()

content = content.replace("    prev.maxScaleMultiplier === next.maxScaleMultiplier &&\n    prev.maxAutoFontSize === next.maxAutoFontSize &&", "    prev.maxFontSizePx === next.maxFontSizePx &&")

with open("src/components/SongbookPreview.tsx", "w") as f:
    f.write(content)

with open("src/components/SongDisplay.tsx", "r") as f:
    content = f.read()
    
content = content.replace("    settings.maxScaleMultiplier,\n    settings.maxAutoFontSize,", "    settings.maxFontSizePx,")

with open("src/components/SongDisplay.tsx", "w") as f:
    f.write(content)


