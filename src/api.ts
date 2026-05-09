import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL,
});

export function withAuthHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export function mediaSrc(mediaUrl?: string | null) {
  if (!mediaUrl) return '';
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl;
  }
  return `${baseURL}${mediaUrl}`;
}

export function isVideoMedia(mediaType?: string | null, mediaUrl?: string | null) {
  const normalizedType = (mediaType || '').toLowerCase();
  if (normalizedType.startsWith('video')) {
    return true;
  }

  const normalizedUrl = (mediaUrl || '').toLowerCase();
  return /\.(mp4|webm|mov|m4v|avi|mkv)(\?|#|$)/.test(normalizedUrl);
}

export function isImageMedia(mediaType?: string | null, mediaUrl?: string | null) {
  if (isVideoMedia(mediaType, mediaUrl)) {
    return false;
  }

  const normalizedType = (mediaType || '').toLowerCase();
  if (normalizedType.startsWith('image')) {
    return true;
  }

  const normalizedUrl = (mediaUrl || '').toLowerCase();
  return /\.(png|jpe?g|webp|gif|bmp|svg|heic|heif)(\?|#|$)/.test(normalizedUrl);
}
