<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import { api, isImageMedia, mediaSrc, backendWaking } from '../api';

interface VesteImage {
  id: number;
  vesteId: number;
  mediaUrl: string;
  mediaType: string;
  fileSize: number;
  createdAt: string;
}

interface Veste {
  id: number;
  titre: string;
  description: string;
  images: VesteImage[];
  isPublished: boolean;
  createdAt: string;
}

interface AtelierProfile {
  name: string;
  description: string;
  phoneNumber: string | null;
  logoLeftUrl: string | null;
  logoRightUrl: string | null;
}

const loading = ref(false);
const items = ref<Veste[]>([]);
const error = ref('');
const atelier = ref<AtelierProfile>({
  name: 'Homme Tissus Couture',
  description:
    'Nous creons des vestes sur mesure avec un style elegant, une finition soignee et des matieres de qualite.',
  phoneNumber: null,
  logoLeftUrl: null,
  logoRightUrl: null,
});

// Lightbox state
const showLightbox = ref(false);
const lightboxIndex = ref(0);
const lightboxImages = ref<VesteImage[]>([]);
const lightboxVeste = ref<Veste | null>(null);

// Carousel state per item (index + interval id)
const carouselIndexPerItem = ref<Record<number, number>>({});
const carouselIntervalPerItem = ref<Record<number, number | null>>({});

function startCarouselForItem(id: number, length: number) {
  if (!length || length <= 1) return;
  // initialize index
  carouselIndexPerItem.value[id] = carouselIndexPerItem.value[id] ?? 0;
  // clear existing
  stopCarouselForItem(id);
  // advance every 3s
  const iv = window.setInterval(() => {
    const current = carouselIndexPerItem.value[id] ?? 0;
    carouselIndexPerItem.value[id] = (current + 1) % length;
  }, 3000);
  carouselIntervalPerItem.value[id] = iv;
}

function stopCarouselForItem(id: number) {
  const iv = carouselIntervalPerItem.value[id];
  if (iv) {
    clearInterval(iv as number);
    carouselIntervalPerItem.value[id] = null;
  }
}

function resetAllCarousels() {
  for (const k in carouselIntervalPerItem.value) {
    const id = Number(k);
    stopCarouselForItem(id);
  }
  for (const item of items.value) {
    startCarouselForItem(item.id, item.images?.length ?? 0);
  }
}

async function loadCatalog() {
  loading.value = true;
  error.value = '';
  try {
    const [catalogResponse, atelierResponse] = await Promise.all([
      api.get<Veste[]>('/vestes'),
      api.get<AtelierProfile>('/atelier/profile'),
    ]);
    items.value = catalogResponse.data;
    if (atelierResponse.data) {
      atelier.value = atelierResponse.data;
    }
  } catch {
    error.value = 'Impossible de charger les modèles pour le moment.';
  } finally {
    loading.value = false;
  }
}

function openLightbox(veste: Veste) {
  if (!veste.images || veste.images.length === 0) {
    return;
  }
  lightboxVeste.value = veste;
  lightboxImages.value = veste.images;
  lightboxIndex.value = 0;
  showLightbox.value = true;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  showLightbox.value = false;
  document.body.style.overflow = 'auto';
}

function nextImage() {
  if (lightboxImages.value.length === 0) return;
  lightboxIndex.value = (lightboxIndex.value + 1) % lightboxImages.value.length;
}

function previousImage() {
  if (lightboxImages.value.length === 0) return;
  lightboxIndex.value =
    (lightboxIndex.value - 1 + lightboxImages.value.length) % lightboxImages.value.length;
}

function handleKeydown(e: KeyboardEvent) {
  if (!showLightbox.value) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') nextImage();
  if (e.key === 'ArrowLeft') previousImage();
}

function onImgError(e: Event) {
  const target = e.target as HTMLImageElement;
  if (!target) return;
  // simple inline SVG placeholder
  const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='100%' height='100%' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='24'>Image indisponible</text></svg>`);
  target.src = `data:image/svg+xml;utf8,${svg}`;
}

onMounted(() => {
  loadCatalog();
  window.addEventListener('keydown', handleKeydown);
});

watch(backendWaking, (isWaking) => {
  document.body.style.overflow = isWaking ? 'hidden' : 'auto';
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'auto';
  // clear carousels
  for (const k in carouselIntervalPerItem.value) {
    const id = Number(k);
    stopCarouselForItem(id);
  }
});

// restart carousels when items change
watch(items, async () => {
  await nextTick();
  resetAllCarousels();
});
</script>

<template>
  <section class="atelier-identity">
    <div class="atelier-logo-shell">
      <img
        v-if="atelier.logoLeftUrl"
        :src="mediaSrc(atelier.logoLeftUrl)"
        alt="Logo gauche atelier"
      />
      <div v-else class="atelier-logo-placeholder">Logo</div>
    </div>

    <div class="atelier-center-copy">
      <p class="atelier-kicker">Maison</p>
      <h2>{{ atelier.name }}</h2>
      <p v-if="atelier.phoneNumber" style="margin: 0.5rem 0; font-weight: 600; color: var(--primary); letter-spacing: 0.5px">✆ {{ atelier.phoneNumber }}</p>
      <p>{{ atelier.description }}</p>
    </div>

    <div class="atelier-logo-shell">
      <img
        v-if="atelier.logoRightUrl"
        :src="mediaSrc(atelier.logoRightUrl)"
        alt="Logo droit atelier"
      />
      <div v-else class="atelier-logo-placeholder">Logo</div>
    </div>
  </section>

  <div v-if="backendWaking" class="wake-screen" role="status" aria-live="polite" aria-label="Le serveur démarre">
    <div class="wake-card">
      <div class="wake-brand">
        <div class="wake-brand-mark">HT</div>
        <div>
          <p class="wake-kicker">Atelier Couture</p>
          <h2>Le serveur se réveille</h2>
        </div>
      </div>

      <p class="wake-copy">
        Le catalogue revient dans quelques instants. Nous préparons vos modèles et vos images.
      </p>

      <div class="wake-points">
        <span>Catalogue</span>
        <span>Images</span>
        <span>Publication</span>
      </div>

      <div class="wake-progress" aria-hidden="true">
        <span />
      </div>

      <small>
        Patientez quelques secondes, la page se rafraîchira automatiquement dès que le backend sera prêt.
      </small>
    </div>
  </div>

  <section class="catalog">
    <div v-if="loading" style="text-align: center; padding: 2rem">
      <p style="font-size: 1.1rem">⏳ Chargement du catalogue...</p>
    </div>

    <div v-else-if="error" style="text-align: center; padding: 2rem; color: var(--danger)">
      <p style="font-size: 1.1rem">❌ {{ error }}</p>
    </div>

    <div v-else-if="items.length === 0" style="text-align: center; padding: 3rem 1rem">
      <p style="font-size: 1.2rem; color: var(--text-secondary)">🎨 Aucun modèle disponible pour l'instant</p>
      <small style="color: var(--text-light)">Revenez bientôt pour découvrir nos nouvelles créations</small>
    </div>

    <div v-else class="grid">
      <article v-for="item in items" :key="item.id" class="card">
        <div 
          v-if="item.images && item.images.length > 0"
          class="card-image-container" 
          @click="openLightbox(item)"
          @mouseenter.prevent="stopCarouselForItem(item.id)"
          @mouseleave.prevent="startCarouselForItem(item.id, item.images.length)"
          style="cursor: pointer"
        >
          <template v-if="item.images && item.images.length > 0">
            <img
              v-if="isImageMedia(item.images[carouselIndexPerItem[item.id] ?? 0]?.mediaType, item.images[carouselIndexPerItem[item.id] ?? 0]?.mediaUrl)"
              :src="mediaSrc(item.images[carouselIndexPerItem[item.id] ?? 0]?.mediaUrl)"
              :alt="item.titre"
              @error="onImgError"
              style="width: 100%; height: 260px; object-fit: cover; display: block"
            />
            <video
              v-else
              :src="mediaSrc(item.images[carouselIndexPerItem[item.id] ?? 0]?.mediaUrl)"
              preload="metadata"
              muted
              autoplay
              playsinline
              loop
              style="width: 100%; height: 260px; object-fit: cover; display: block"
            />
          </template>
          <div v-if="item.images.length > 1" class="image-count">
            +{{ item.images.length - 1 }} images
          </div>
        </div>

        <div v-else class="card-image-container" style="background-color: #eee; display: flex; align-items: center; justify-content: center">
          <span style="color: #999">Aucune image</span>
        </div>

        <div class="card-body">
          <h3 style="margin: 0 0 0.75rem 0">{{ item.titre }}</h3>
          <p style="margin: 0; line-height: 1.6">{{ item.description }}</p>
        </div>
      </article>
    </div>
  </section>

  <!-- Lightbox -->
  <div v-if="showLightbox && lightboxVeste" class="lightbox-overlay" @click="closeLightbox">
    <div class="lightbox-container" @click.stop>
      <button class="lightbox-close" @click="closeLightbox">✕</button>
      <div class="lightbox-meta">
        <p class="lightbox-meta-kicker">Modele</p>
        <h3>{{ lightboxVeste.titre }}</h3>
        <p class="lightbox-meta-description">
          {{ lightboxVeste.description }}
        </p>
      </div>

      <div class="lightbox-media-stage">
        <button
          v-if="lightboxImages.length > 1"
          class="lightbox-nav prev"
          @click="previousImage"
          title="Image précédente (←)"
        >
          ←
        </button>

        <img
          v-if="isImageMedia(lightboxImages[lightboxIndex]?.mediaType, lightboxImages[lightboxIndex]?.mediaUrl)"
          :src="mediaSrc(lightboxImages[lightboxIndex]?.mediaUrl)"
          :alt="lightboxVeste.titre"
          class="lightbox-image"
        />
        <video
          v-else
          :src="mediaSrc(lightboxImages[lightboxIndex]?.mediaUrl)"
          controls
          class="lightbox-video"
        />

        <button
          v-if="lightboxImages.length > 1"
          class="lightbox-nav next"
          @click="nextImage"
          title="Image suivante (→)"
        >
          →
        </button>

        <div
          v-if="lightboxImages.length > 1"
          class="lightbox-indicator"
        >
          {{ lightboxIndex + 1 }} / {{ lightboxImages.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wake-screen {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background:
    radial-gradient(circle at top, rgba(155, 118, 83, 0.24) 0%, transparent 45%),
    linear-gradient(135deg, rgba(34, 27, 23, 0.96) 0%, rgba(70, 46, 31, 0.96) 45%, rgba(111, 78, 55, 0.94) 100%);
  backdrop-filter: blur(10px);
}

.wake-card {
  width: min(680px, 100%);
  padding: 2rem;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(180deg, rgba(255, 251, 247, 0.98) 0%, rgba(255, 246, 239, 0.94) 100%);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.32);
  color: #3d2a1f;
  text-align: left;
}

.wake-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.wake-brand-mark {
  width: 4.25rem;
  height: 4.25rem;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: white;
  background: linear-gradient(135deg, var(--primary-dark), var(--primary-light));
  box-shadow: 0 16px 30px rgba(111, 78, 55, 0.35);
}

.wake-kicker {
  margin: 0 0 0.2rem;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  font-size: 0.72rem;
  color: #8a6a53;
}

.wake-card h2 {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 3rem);
  line-height: 1.05;
  color: #2d1e16;
}

.wake-copy {
  margin: 0 0 1.25rem;
  font-size: 1.05rem;
  line-height: 1.8;
  color: #5a4639;
}

.wake-points {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.wake-points span {
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  background: rgba(111, 78, 55, 0.1);
  border: 1px solid rgba(111, 78, 55, 0.16);
  color: var(--primary-dark);
  font-weight: 700;
  font-size: 0.88rem;
}

.wake-progress {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(111, 78, 55, 0.12);
  overflow: hidden;
  margin-bottom: 0.9rem;
}

.wake-progress span {
  display: block;
  width: 40%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--primary-dark), var(--primary-light), #c79d7e);
  animation: wakeSlide 1.5s ease-in-out infinite;
}

.wake-card small {
  display: block;
  color: #7a6558;
  line-height: 1.6;
}

@keyframes wakeSlide {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(280%);
  }
}

.image-count {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.85rem;
}

.card-image-container {
  position: relative;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 720px) {
  .wake-card {
    padding: 1.5rem;
  }

  .wake-brand {
    align-items: flex-start;
  }

  .wake-brand-mark {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 14px;
  }
}
</style>
