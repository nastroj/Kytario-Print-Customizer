import sys

with open("src/utils.ts", "r") as f:
    content = f.read()

target = """        if (isChordsOnly) {
          // Repetition or chord-only line: minHeight: (chords-size + 4) + 2px margin
          const chordLineH = Math.round((cSize + 4) * 1.05 + 2);
          secH += chordLineH * visualLines;
        } else if (hasChords) {
          // Both chords and lyrics: minHeight: (chords-size + lyrics-size + 4) + 2px margin
          const chordLyricLineH = Math.round((cSize + lSize + 4) * 1.05 + 2);
          secH += chordLyricLineH * visualLines;
        } else {
          // Lyrics only: minHeight: (lyrics-size + 4) + 2px margin
          const lyricLineH = Math.round((lSize + 4) * 1.05 + 2);
          secH += lyricLineH * visualLines;
        }"""

replacement = """        if (isChordsOnly) {
          // Repetition or chord-only line: minHeight: (chords-size + 4) + 0px margin
          const chordLineH = Math.round((cSize + 4) * 1.05);
          secH += chordLineH * visualLines;
        } else if (hasChords) {
          // Both chords and lyrics: minHeight: (chords-size + lyrics-size + 4) + 5px margin
          const chordLyricLineH = Math.round((cSize + lSize + 4) * 1.05 + 5);
          secH += chordLyricLineH * visualLines;
        } else {
          // Lyrics only: minHeight: (lyrics-size + 4) + 5px margin
          const lyricLineH = Math.round((lSize + 4) * 1.05 + 5);
          secH += lyricLineH * visualLines;
        }"""

content = content.replace(target, replacement)

with open("src/utils.ts", "w") as f:
    f.write(content)
