import sys

with open("src/App.tsx", "r") as f:
    content = f.read()

content = content.replace("  maxScaleMultiplier: 2.0,\n  maxAutoFontSize: 0,", "  maxFontSizePx: 32,")
content = content.replace("  maxScaleMultiplier: 2.0,\n  maxAutoFontSize: 0,", "  maxFontSizePx: 32,") # Do it twice just in case (light and dark)

# In the migration logic
migration_target = """        // Migrate legacy defaults (14px or 11px) to 45-line 12px default
        if (
          (parsed.lyricsFontSize === 14 || parsed.lyricsFontSize === 11) &&
          (parsed.chordsFontSize === 14 || parsed.chordsFontSize === 11)
        ) {
          parsed.lyricsFontSize = 12;
          parsed.chordsFontSize = 12;
        }"""

migration_replacement = """        // Migrate legacy defaults (14px or 11px) to 45-line 12px default
        if (
          (parsed.lyricsFontSize === 14 || parsed.lyricsFontSize === 11) &&
          (parsed.chordsFontSize === 14 || parsed.chordsFontSize === 11)
        ) {
          parsed.lyricsFontSize = 12;
          parsed.chordsFontSize = 12;
        }
        
        // Migrate maxScaleMultiplier to maxFontSizePx
        if (typeof parsed.maxFontSizePx !== 'number') {
          if (typeof parsed.maxScaleMultiplier === 'number') {
             const baseLyricsPt = parsed.lyricsFontSize || 12;
             parsed.maxFontSizePx = Math.round(baseLyricsPt * parsed.maxScaleMultiplier * (96 / 72));
          } else {
             parsed.maxFontSizePx = 32;
          }
        }"""

content = content.replace(migration_target, migration_replacement)

with open("src/App.tsx", "w") as f:
    f.write(content)
