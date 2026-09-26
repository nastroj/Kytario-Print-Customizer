import axios from 'axios';
import { SongbookData } from '../types';

export async function fetchSongbookFromKytario(url: string): Promise<SongbookData> {
  // Extract token from URL
  // Example URLs:
  // https://kytario.com/bodg
  // https://kytario.com/songbooks/bodg
  // kytario.com/bodg
  
  let token = url.trim();
  if (token.includes('kytario.com/')) {
    token = token.split('kytario.com/')[1];
  }
  if (token.includes('/')) {
    const parts = token.split('/');
    token = parts[parts.length - 1];
  }
  
  if (!token) {
    throw new Error('Invalid Kytario URL. Could not find songbook token.');
  }

  try {
    const response = await axios.get(`/api/proxy/kytario/${token}`);
    const data = response.data;
    
    // Normalize Kytario API response to our SongbookData format
    // Based on user hint: kytario.com/api/songbooks/bodg/sections
    // We expect sections which contain songs.
    
    const songs: any[] = [];
    
    if (Array.isArray(data)) {
      // It's directly an array of sections or songs
      data.forEach((section: any) => {
        if (section.songs && Array.isArray(section.songs)) {
          section.songs.forEach((song: any) => {
            songs.push({
              id: song.id?.toString(),
              title: song.title || song.name,
              artist: song.artist || song.author,
              content: song.content || song.text,
            });
          });
        } else if (section.title && section.content) {
          // Direct song
          songs.push({
            id: section.id?.toString(),
            title: section.title,
            artist: section.artist,
            content: section.content,
          });
        }
      });
    }
    
    return {
      title: 'Imported from Kytario',
      urlToken: token,
      songs: songs,
    };
  } catch (error: any) {
    console.error('Kytario fetch error:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch songbook from Kytario.');
  }
}
