import JSZip from 'jszip';
import { Song, SongbookData } from '../types';
import { normalizeSingleSong, safeParseSongbookJson } from '../utils';

export interface ExtractedProject {
  slug: string;
  name: string;
  description?: string;
  songs: Song[];
  songCount: number;
}

export interface ZipParseResult {
  songbook: SongbookData;
  projects: ExtractedProject[];
  totalSongs: number;
  selectedProjectSlug: string;
}

/**
 * Checks if a given file or buffer is a ZIP archive.
 */
export function isZipFile(file: File | Blob): boolean {
  const isZipType = file.type === 'application/zip' || 
                    file.type === 'application/x-zip-compressed';
  const hasZipName = 'name' in file && typeof (file as File).name === 'string' && (file as File).name.toLowerCase().endsWith('.zip');
  return isZipType || hasZipName;
}

/**
 * Parses a Kytario account export ZIP file (or any zip containing song JSONs).
 * Reconstructs full SongbookData from `projects/{slug}/project.json` and `projects/{slug}/songs/*.json`.
 * Respects the explicit song order defined in `project.json` songbooks.
 */
export async function parseKytarioZip(fileOrBuffer: File | Blob | ArrayBuffer): Promise<ZipParseResult> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileOrBuffer);

  const projectsMap = new Map<string, {
    projectJson?: any;
    songMap: Map<string, Song>;
    fallbackSongs: Song[];
  }>();

  const looseSongs: Song[] = [];

  // Iterate over all files in the ZIP archive
  const fileEntries = Object.keys(loadedZip.files);

  for (const relativePath of fileEntries) {
    const entry = loadedZip.files[relativePath];
    if (entry.dir) continue;

    const lowerPath = relativePath.toLowerCase();

    // 1. Project metadata: projects/{slug}/project.json
    const projectJsonMatch = relativePath.match(/^projects\/([^\/]+)\/project\.json$/i);
    if (projectJsonMatch) {
      const slug = projectJsonMatch[1];
      try {
        const text = await entry.async('text');
        const parsed = JSON.parse(text);
        if (!projectsMap.has(slug)) {
          projectsMap.set(slug, { songMap: new Map(), fallbackSongs: [] });
        }
        projectsMap.get(slug)!.projectJson = parsed;
      } catch (e) {
        console.warn(`Failed to parse ${relativePath}:`, e);
      }
      continue;
    }

    // 2. Project songs: projects/{slug}/songs/{songSlug}.json
    const songMatch = relativePath.match(/^projects\/([^\/]+)\/songs\/([^\/]+)\.json$/i);
    if (songMatch) {
      const slug = songMatch[1];
      const songSlug = songMatch[2];
      try {
        const text = await entry.async('text');
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          if (!projectsMap.has(slug)) {
            projectsMap.set(slug, { songMap: new Map(), fallbackSongs: [] });
          }
          const projData = projectsMap.get(slug)!;
          const song = normalizeSingleSong(parsed);
          projData.songMap.set(songSlug, song);
          projData.fallbackSongs.push(song);
        }
      } catch (e) {
        console.warn(`Failed to parse song ${relativePath}:`, e);
      }
      continue;
    }

    // 3. Fallback: Any other JSON file that might contain songs or songbook
    if (lowerPath.endsWith('.json') && !lowerPath.includes('personal-data') && !lowerPath.includes('manifest')) {
      try {
        const text = await entry.async('text');
        const parsed = JSON.parse(text);
        if (parsed) {
          const { data } = safeParseSongbookJson(text);
          if (data && data.songs && data.songs.length > 0) {
            looseSongs.push(...data.songs);
          } else if (parsed.name || parsed.title) {
            looseSongs.push(normalizeSingleSong(parsed));
          }
        }
      } catch {}
    }
  }

  // Assemble list of extracted projects
  const extractedProjects: ExtractedProject[] = [];

  for (const [slug, data] of projectsMap.entries()) {
    const songbooks = data.projectJson?.songbooks;
    let songbookName = '';
    if (Array.isArray(songbooks) && songbooks.length > 0) {
      const sb = songbooks.find((s: any) => s.urlToken === slug) || songbooks[0];
      songbookName = sb?.name || sb?.title;
    }
    const projectName = data.projectJson?.project?.name || data.projectJson?.project?.title || data.projectJson?.name || data.projectJson?.title;
    const name = songbookName || projectName || slug.toUpperCase();
    
    // Determine song order from projectJson.songbooks[0].songs (or songbooks matching project)
    let orderedSongs: Song[] = [];
    if (Array.isArray(songbooks) && songbooks.length > 0) {
      const songbook = songbooks.find((sb: any) => sb.urlToken === slug) || songbooks[0];
      if (Array.isArray(songbook?.songs) && songbook.songs.length > 0) {
        const seenSlugs = new Set<string>();
        for (const item of songbook.songs) {
          const token = item.urlToken;
          if (token && data.songMap.has(token)) {
            orderedSongs.push(data.songMap.get(token)!);
            seenSlugs.add(token);
          }
        }
        // Append any songs present in folder but not explicitly listed in songbook.songs
        for (const [sSlug, songObj] of data.songMap.entries()) {
          if (!seenSlugs.has(sSlug)) {
            orderedSongs.push(songObj);
          }
        }
      }
    }

    if (orderedSongs.length === 0) {
      orderedSongs = data.fallbackSongs;
    }

    // Sort by createdAt (chronological creation order in project/songbook) to preserve original project order
    orderedSongs.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    // Re-normalize indices so originalIndex / position is correct (0, 1, 2, ...)
    orderedSongs = orderedSongs.map((s, idx) => normalizeSingleSong(s, idx));

    extractedProjects.push({
      slug,
      name,
      description: data.projectJson?.description,
      songs: orderedSongs,
      songCount: orderedSongs.length,
    });
  }

  // Sort projects so the one with the most songs is first
  extractedProjects.sort((a, b) => b.songCount - a.songCount);

  if (extractedProjects.length === 0 && looseSongs.length > 0) {
    looseSongs.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
    // If no projects/ structure found, wrap loose songs
    extractedProjects.push({
      slug: 'imported-songs',
      name: 'Imported Kytario Songs',
      songs: looseSongs.map((s, idx) => normalizeSingleSong(s, idx)),
      songCount: looseSongs.length,
    });
  }

  if (extractedProjects.length === 0) {
    throw new Error('No songs or projects found in the uploaded ZIP file.');
  }

  // Pick the project with the highest song count as the primary songbook
  const primary = extractedProjects[0];

  const songbook: SongbookData = {
    title: primary.name,
    name: primary.name,
    urlToken: primary.slug,
    slug: primary.slug,
    songs: primary.songs,
    indexSortOrder: 'original',
  };

  const totalSongs = extractedProjects.reduce((acc, p) => acc + p.songCount, 0);

  return {
    songbook,
    projects: extractedProjects,
    totalSongs,
    selectedProjectSlug: primary.slug,
  };
}
