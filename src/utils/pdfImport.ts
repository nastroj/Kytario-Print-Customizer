import { SongbookData, Song } from '../types';

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
}

export async function parseSongbookFromPdf(file: File): Promise<SongbookData> {
  // Dynamically import pdfjs-dist to avoid top-level evaluation crashes
  const pdfjs = await import('pdfjs-dist');
  
  // PDF.js worker setup using reliable jsDelivr CDN
  const pdfWorkerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const songbook: SongbookData = {
    title: 'Imported from PDF',
    songs: [],
  };

  // We'll skip the first few pages if they are index pages
  // But let's first extract everything and then try to identify songs.
  
  const allPagesText: TextItem[][] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    
    const items: TextItem[] = textContent.items.map((item: any) => {
      // transform: [scaleX, skewY, skewX, scaleY, translateX, translateY]
      const t = item.transform;
      return {
        str: item.str,
        x: t[4],
        y: viewport.height - t[5], // Flip Y coordinate to top-down
        width: item.width,
        height: item.height,
        fontName: item.fontName,
      };
    });
    
    // Sort items by Y (top to bottom) then X (left to right)
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 5) { // Same line threshold
        return a.x - b.x;
      }
      return a.y - b.y;
    });
    
    allPagesText.push(items);
  }

  // Heuristic: The first two pages in the provided PDF are index pages.
  // They have patterns like "178 - About a Girl - Nirvana"
  // Let's try to detect if a page is an index page.
  
  const songsMap = new Map<string, { title: string; artist: string }>();
  
  for (const pageItems of allPagesText) {
    for (const item of pageItems) {
      const indexMatch = item.str.match(/^(\d+)\s*-\s*(.+?)\s*-\s*(.+)$/);
      if (indexMatch) {
        songsMap.set(indexMatch[1], {
          title: indexMatch[2].trim(),
          artist: indexMatch[3].trim(),
        });
      }
    }
  }

  // Now process pages to find song content
  // A song page usually starts with a number in the top corner (the ID)
  // followed by "Title - Artist"
  
  let currentSong: Partial<Song> | null = null;
  let currentId: string | null = null;

  for (const pageItems of allPagesText) {
    // Look for song ID at the top
    const possibleId = pageItems.find(item => item.y < 100 && item.x < 100 && /^\d+$/.test(item.str));
    
    if (possibleId) {
      const id = possibleId.str;
      const metadata = songsMap.get(id);
      
      if (metadata) {
        if (currentSong && currentSong.content) {
          songbook.songs.push(currentSong as Song);
        }
        
        currentId = id;
        currentSong = {
          id: id,
          title: metadata.title,
          artist: metadata.artist,
          content: '',
        };
        
        // Group items into lines
        const lines: TextItem[][] = [];
        let currentLine: TextItem[] = [];
        let lastY = -1;
        
        // Filter out header items (ID, Title - Artist)
        const contentItems = pageItems.filter(item => {
          // Skip the ID we found
          if (item === possibleId) return false;
          // Skip anything on the same line as ID (usually Title - Artist)
          if (Math.abs(item.y - possibleId.y) < 10) return false;
          // Skip footer
          if (item.y > 750) return false;
          return true;
        });

        for (const item of contentItems) {
          if (lastY === -1 || Math.abs(item.y - lastY) > 8) {
            if (currentLine.length > 0) lines.push(currentLine);
            currentLine = [item];
            lastY = item.y;
          } else {
            currentLine.push(item);
          }
        }
        if (currentLine.length > 0) lines.push(currentLine);

        // Parse chords and lyrics
        // Format: Chords are on lines with smaller Y value (higher up)
        // If two lines are close, the top one is chords.
        
        let songContent = '';
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const nextLine = lines[i + 1];
          
          const isChordsOnly = line.every(item => /^[A-G][b#]?[maj|min|m|dim|aug|sus|2|4|5|6|7|9|11|13]*(\/[A-G][b#]?)?(\s+|$)/i.test(item.str.trim()) || item.str.trim() === '-' || item.str.trim() === '|' || item.str.trim() === ':');
          
          if (isChordsOnly && nextLine && Math.abs(nextLine[0].y - line[0].y) < 25) {
            // Merge chords into lyrics line
            const lyricsLine = nextLine;
            let mergedLine = '';
            let lastX = 0;
            
            // This is a simplified merge logic. 
            // Real implementation would calculate character offsets based on X coordinates.
            const chordsWithOffsets = line.map(item => ({ str: item.str.trim(), x: item.x }));
            const lyricsWithOffsets = lyricsLine.map(item => ({ str: item.str, x: item.x }));
            
            // Create a representation with [Chord]
            // We'll iterate through lyrics characters and insert chords
            let lyricStr = '';
            lyricsLine.forEach(item => {
              lyricStr += item.str;
            });
            
            // Sort chords by X
            chordsWithOffsets.sort((a, b) => a.x - b.x);
            
            let result = '';
            let chordIdx = 0;
            let currentLyricX = lyricsLine[0].x;
            const totalLyricWidth = lyricsLine[lyricsLine.length - 1].x + lyricsLine[lyricsLine.length - 1].width - lyricsLine[0].x;
            const charsPerPixel = lyricStr.length / totalLyricWidth;

            for (let charIdx = 0; charIdx < lyricStr.length; charIdx++) {
              const charX = currentLyricX + (charIdx / charsPerPixel);
              while (chordIdx < chordsWithOffsets.length && chordsWithOffsets[chordIdx].x <= charX + 2) {
                result += `[${chordsWithOffsets[chordIdx].str}]`;
                chordIdx++;
              }
              result += lyricStr[charIdx];
            }
            
            // Add remaining chords
            while (chordIdx < chordsWithOffsets.length) {
              result += ` [${chordsWithOffsets[chordIdx].str}]`;
              chordIdx++;
            }
            
            songContent += result + '\n';
            i++; // Skip the next line as we merged it
          } else {
            // Just a normal line (maybe verse number or just lyrics without chords)
            let lineStr = '';
            line.forEach(item => {
              lineStr += item.str;
            });
            songContent += lineStr + '\n';
          }
        }
        
        currentSong.content = songContent.trim();
      }
    }
  }

  // Push the last song
  if (currentSong && currentSong.content) {
    songbook.songs.push(currentSong as Song);
  }

  return songbook;
}
