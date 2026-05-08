<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { api, mediaSrc } from '../api';

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

onMounted(() => {
  loadCatalog();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'auto';
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
          style="cursor: pointer"
        >
          <img
            v-if="item.images[0].mediaType === 'image'"
            :src="mediaSrc(item.images[0].mediaUrl)"
            :alt="item.titre"
            style="width: 100%; height: 260px; object-fit: cover; display: block"
          />
          <video
            v-else
            :src="mediaSrc(item.images[0].mediaUrl)"
            preload="metadata"
            style="width: 100%; height: 260px; object-fit: cover; display: block"
          />
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
          v-if="lightboxImages[lightboxIndex]?.mediaType === 'image'"
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
</style>
