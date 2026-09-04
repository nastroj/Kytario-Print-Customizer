export interface Song {
  id?: number | string;
  title?: string;
  name?: string;
  artist?: string;
  author?: string;
  interpreter?: string;
  text?: string;
  lyrics?: string;
  content?: string;
  chords?: string;
  rating?: number;
}

export interface SongbookData {
  title?: string;
  name?: string;
  songs?: Song[];
  items?: Song[];
  songbookSongs?: { song: Song }[];
}

export interface PrintSettings {
  pageFormat: 'A4' | 'A5' | 'Letter';
  orientation: 'portrait' | 'landscape';
  columns: number;
  titleColor: string;
  artistColor: string;
  lyricsColor: string;
  chordsColor: string;
  markerColor: string;
  tocColor: string;
  titleFontSize: number;
  artistFontSize: number;
  lyricsFontSize: number;
  chordsFontSize: number;
  tocFontSize: number;
  showChords: boolean;
  smartFit: boolean;
  indexSortOrder: 'original' | 'alphabetical';
}
