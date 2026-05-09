import axios from 'axios';
import { ref } from 'vue';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL,
  timeout: 12000,
});

// Reactive flag to indicate backend is currently waking (e.g. Render cold start)
export const backendWaking = ref(false);

let _probeTimer: number | null = null;
function stopProbe() {
  if (_probeTimer) {
    clearInterval(_probeTimer);
    _probeTimer = null;
  }
}

function startProbe() {
  if (_probeTimer) return;
  // poll a lightweight endpoint periodically until success
  _probeTimer = window.setInterval(async () => {
    try {
      // pick a safe, public endpoint that exists on the API
      await api.get('/atelier/profile', { timeout: 8000 });
      backendWaking.value = false;
      stopProbe();
    } catch (e) {
      // keep polling
    }
  }, 3000);
}

export function withAuthHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}


// Axios interceptors to detect backend wake-up / network errors
api.interceptors.response.use(
  (resp) => {
    // successful response -> backend is up
    if (backendWaking.value) backendWaking.value = false;
    stopProbe();
    return resp;
  },
  (err) => {
    const shouldTreatAsWaking =
      !err.response ||
      [502, 503, 504].includes(err.response?.status) ||
      err.code === 'ECONNABORTED';

    if (shouldTreatAsWaking) {
      backendWaking.value = true;
      startProbe();
    }

    return Promise.reject(err);
  },
);

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
