import sys

with open("src/types.ts", "r") as f:
    content = f.read()

content = content.replace("  maxScaleMultiplier?: number; // Max auto-scale factor limit (e.g. 1.0 to 3.0, default 2.0)\n  maxAutoFontSize?: number;    // Cap auto-scaled lyrics font size in pt (0 = no limit)", "  maxScaleMultiplier?: number;\n  maxAutoFontSize?: number;\n  maxFontSizePx?: number;")

with open("src/types.ts", "w") as f:
    f.write(content)
