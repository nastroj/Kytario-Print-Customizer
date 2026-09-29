import axios from 'axios';
import { SongbookData } from '../types';

/**
 * Robustly extracts the songbook slug / code from any Kytario URL, link, or path format.
 */
export function extractKytarioSlug(input: string): string {
  if (!input) return '';
  let str = input.trim();
  str = str.split('#')[0].split('?')[0].trim();
  str = str.replace(/\/+$/, '');

  const noProto = str.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  
  let segments: string[] = [];
  if (noProto.includes('kytario.com')) {
    const afterDomain = noProto.split('kytario.com')[1] || '';
    segments = afterDomain.split('/').filter(Boolean);
  } else {
    segments = noProto.split('/').filter(Boolean);
  }

  if (segments.length === 0) return '';

  const ignore = new Set([
    'api', 'v1', 'v2', 'public', 
    'songbook', 'songbooks', 'zpevnik', 'zpevniky', 
    'project', 'projects', 'sections', 'export', 
    'shared', 'cs', 'en', 'sk', 'de', 'user', 'users'
  ]);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i].toLowerCase();
    if ((seg === 'songbooks' || seg === 'songbook' || seg === 'zpevnik' || seg === 'zpevniky' || seg === 'projects' || seg === 'project') && i + 1 < segments.length) {
      const next = segments[i + 1];
      if (!ignore.has(next.toLowerCase())) {
        return next;
      }
    }
  }

  const valid = segments.filter(s => !ignore.has(s.toLowerCase()));
  if (valid.length > 0) {
    return valid[valid.length - 1];
  }

  return '';
}

export async function fetchSongbookFromKytario(url: string): Promise<any> {
  const cleanUrl = url.trim();
  const token = extractKytarioSlug(cleanUrl);
  
  if (!token && !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Please enter a valid Kytario songbook URL or code (e.g. "bodg" or "https://kytario.com/bodg").');
  }

  try {
    const targetParam = token || cleanUrl;
    const response = await axios.get(`/api/proxy/kytario/${encodeURIComponent(targetParam)}`, {
      params: { url: cleanUrl, token }
    });
    return response.data;
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message || 'Failed to fetch songbook from Kytario.';
    throw new Error(msg);
  }
}

