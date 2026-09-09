import sys

with open("src/components/SongDisplay.tsx", "r") as f:
    content = f.read()

target = """                const isFirstNonEmpty = i === firstNonEmptyIndex;
                const { chunks, hasChords } = lineData;
                const isRep = lineData.isRepetitionLine;
                return (
                  <div 
                    key={i} 
                    className={`relative song-line grid items-end ${isChordsOnly ? 'mb-0' : 'mb-[5px]'}`} """

replacement = """                const isFirstNonEmpty = i === firstNonEmptyIndex;
                const { chunks, hasChords } = lineData;
                const isRep = lineData.isRepetitionLine;
                const isChordsOnly = isRep || (!chunks || !chunks.some((c: any) => c.text && c.text.trim().length > 0 && !c.isSectionRef));
                return (
                  <div 
                    key={i} 
                    className={`relative song-line grid items-end ${isChordsOnly ? 'mb-0' : 'mb-[5px]'}`} """

content = content.replace(target, replacement)

# Do it for the other occurrence too (if it exists)
target2 = """                const isFirstNonEmpty = i === firstNonEmptyIndex;
                const { chunks, hasChords } = lineData;
                return (
                  <div 
                    key={i} 
                    className={`relative song-line grid items-end ${isChordsOnly ? 'mb-0' : 'mb-[5px]'}`} """

replacement2 = """                const isFirstNonEmpty = i === firstNonEmptyIndex;
                const { chunks, hasChords } = lineData;
                const isChordsOnly = lineData.isRepetitionLine || (!chunks || !chunks.some((c: any) => c.text && c.text.trim().length > 0 && !c.isSectionRef));
                return (
                  <div 
                    key={i} 
                    className={`relative song-line grid items-end ${isChordsOnly ? 'mb-0' : 'mb-[5px]'}`} """

content = content.replace(target2, replacement2)

with open("src/components/SongDisplay.tsx", "w") as f:
    f.write(content)

