<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, isImageMedia, mediaSrc, withAuthHeaders } from '../api';
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
  isPublished: boolean;
  images: VesteImage[];
  createdAt: string;
}

interface StorageStats {
  usedMb: number;
  quotaMb: number;
  usagePercent: number;
}

interface AtelierProfile {
  name: string;
  welcomeText: string;
  description: string;
  phoneNumber: string | null;
  logoLeftUrl: string | null;
  logoRightUrl: string | null;
}

const router = useRouter();
const token = ref(localStorage.getItem('atelier_admin_token') || '');

const titre = ref('');
const description = ref('');
const selectedFiles = ref<File[]>([]);
const uploading = ref(false);
const uploadPercent = ref(0);
const info = ref('');
const error = ref('');

const items = ref<Veste[]>([]);
const stats = ref<StorageStats | null>(null);
const atelier = ref<AtelierProfile | null>(null);
const atelierName = ref('');
const atelierWelcomeText = ref('');
const atelierDescription = ref('');
const atelierPhoneNumber = ref('');
const logoLeftFile = ref<File | null>(null);
const logoRightFile = ref<File | null>(null);
const atelierSaving = ref(false);
const atelierInfo = ref('');
const atelierError = ref('');
const credentialEmail = ref('');
const credentialEmailConfirm = ref('');
const credentialPassword = ref('');
const credentialPasswordConfirm = ref('');
const credentialSaving = ref(false);
const credentialInfo = ref('');
const credentialError = ref('');
const loadingDashboard = ref(false);
const pageError = ref('');
const vestesLoadError = ref('');
const statsLoadError = ref('');
const atelierLoadError = ref('');
const editTitre = ref<Record<number, string>>({});
const editDescription = ref<Record<number, string>>({});
const editSaving = ref<Record<number, boolean>>({});
const selectedFilesPerItem = ref<Record<number, File[]>>({});
const uploadingPerItem = ref<Record<number, boolean>>({});
const uploadPercentPerItem = ref<Record<number, number>>({});

const canSubmit = computed(
  () => !!titre.value && !!description.value && !uploading.value,
);
const selectedMediaNames = computed(() =>
  selectedFiles.value.map((file) => file.name).join(', '),
);

function ensureAuth() {
  if (!token.value) {
    router.push('/admin/login');
  }
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  selectedFiles.value = target.files ? Array.from(target.files) : [];
}

function onItemFileChange(id: number, event: Event) {
  const target = event.target as HTMLInputElement;
  selectedFilesPerItem.value[id] = target.files ? Array.from(target.files) : [];
}

function onLogoLeftChange(event: Event) {
  const target = event.target as HTMLInputElement;
  logoLeftFile.value = target.files?.[0] || null;
}

function onLogoRightChange(event: Event) {
  const target = event.target as HTMLInputElement;
  logoRightFile.value = target.files?.[0] || null;
}

async function uploadLogo(fileToUpload: File) {
  const formData = new FormData();
  formData.append('logo', fileToUpload);

  const response = await api.post<{ mediaUrl: string }>(
    '/admin/atelier/upload-logo',
    formData,
    withAuthHeaders(token.value),
  );

  return response.data.mediaUrl;
}

async function submitAtelierProfile() {
  if (!token.value) return;

  atelierSaving.value = true;
  atelierInfo.value = '';
  atelierError.value = '';

  try {
    let logoLeftUrl = atelier.value?.logoLeftUrl ?? null;
    let logoRightUrl = atelier.value?.logoRightUrl ?? null;

    if (logoLeftFile.value) {
      logoLeftUrl = await uploadLogo(logoLeftFile.value);
    }

    if (logoRightFile.value) {
      logoRightUrl = await uploadLogo(logoRightFile.value);
    }

    const response = await api.patch<AtelierProfile>(
      '/admin/atelier/profile',
      {
        name: atelierName.value,
        welcomeText: atelierWelcomeText.value,
        description: atelierDescription.value,
        phoneNumber: atelierPhoneNumber.value || null,
        logoLeftUrl,
        logoRightUrl,
      },
      withAuthHeaders(token.value),
    );

    atelier.value = response.data;
    atelierName.value = response.data.name;
    atelierWelcomeText.value = response.data.welcomeText;
    atelierDescription.value = response.data.description;
    atelierPhoneNumber.value = response.data.phoneNumber || '';
    logoLeftFile.value = null;
    logoRightFile.value = null;
    atelierInfo.value = "Identite de l'atelier mise a jour avec succes.";

    await loadData();
  } catch (e: any) {
    atelierError.value =
      e?.response?.data?.message ||
      "Erreur pendant la mise a jour de l'identite atelier";
  } finally {
    atelierSaving.value = false;
  }
}

async function loadData() {
  ensureAuth();
  if (!token.value) return;

  loadingDashboard.value = true;
  pageError.value = '';
  vestesLoadError.value = '';
  statsLoadError.value = '';
  atelierLoadError.value = '';

  try {
    const [vestesRes, statsRes, atelierRes] = await Promise.allSettled([
      api.get<Veste[]>('/admin/vestes', withAuthHeaders(token.value)),
      api.get<StorageStats>('/admin/storage/stats', withAuthHeaders(token.value)),
      api.get<AtelierProfile>('/admin/atelier/profile', withAuthHeaders(token.value)),
    ]);

    let hasUnauthorized = false;
    let hasSuccess = false;

    if (vestesRes.status === 'fulfilled') {
      items.value = vestesRes.value.data;
      const nextEditTitre: Record<number, string> = {};
      const nextEditDescription: Record<number, string> = {};
      const nextEditSaving: Record<number, boolean> = {};
      for (const item of items.value) {
        nextEditTitre[item.id] = item.titre;
        nextEditDescription[item.id] = item.description;
        nextEditSaving[item.id] = false;
      }
      editTitre.value = nextEditTitre;
      editDescription.value = nextEditDescription;
      editSaving.value = nextEditSaving;
      hasSuccess = true;
    } else {
      vestesLoadError.value = 'Impossible de charger la liste des modeles.';
      hasUnauthorized = hasUnauthorized || vestesRes.reason?.response?.status === 401;
      console.error('Echec chargement vestes admin:', vestesRes.reason);
    }

    if (statsRes.status === 'fulfilled') {
      stats.value = statsRes.value.data;
      hasSuccess = true;
    } else {
      stats.value = null;
      statsLoadError.value = 'Impossible de charger les statistiques de stockage.';
      hasUnauthorized = hasUnauthorized || statsRes.reason?.response?.status === 401;
      console.error('Echec chargement stats stockage:', statsRes.reason);
    }

    if (atelierRes.status === 'fulfilled') {
      atelier.value = atelierRes.value.data;
      atelierName.value = atelierRes.value.data.name;
      atelierWelcomeText.value = atelierRes.value.data.welcomeText;
      atelierDescription.value = atelierRes.value.data.description;
      atelierPhoneNumber.value = atelierRes.value.data.phoneNumber || '';
      hasSuccess = true;
    } else {
      atelierLoadError.value = "Impossible de charger les informations de l'atelier.";
      hasUnauthorized = hasUnauthorized || atelierRes.reason?.response?.status === 401;
      console.error('Echec chargement profil atelier:', atelierRes.reason);
    }

    credentialEmail.value = '';
    credentialEmailConfirm.value = '';
    credentialPassword.value = '';
    credentialPasswordConfirm.value = '';

    if (hasUnauthorized) {
      localStorage.removeItem('atelier_admin_token');
      token.value = '';
      pageError.value = 'Session expirée, veuillez vous reconnecter.';
      router.push('/admin/login');
      return;
    }

    if (!hasSuccess) {
      pageError.value =
        'Le tableau de bord est indisponible pour le moment. Verifiez que le backend est demarre.';
    }
  } catch (e: any) {
    pageError.value =
      e?.response?.data?.message ||
      'Erreur inattendue pendant le chargement du tableau de bord.';
    if (e?.response?.status === 401) {
      localStorage.removeItem('atelier_admin_token');
      token.value = '';
      router.push('/admin/login');
      return;
    }
    console.error('Echec chargement dashboard admin:', e);
  } finally {
    loadingDashboard.value = false;
  }
}

async function submitCredentials() {
  if (!token.value) return;

  credentialInfo.value = '';
  credentialError.value = '';

  const nextEmail = credentialEmail.value.trim().toLowerCase();
  const confirmEmail = credentialEmailConfirm.value.trim().toLowerCase();
  const nextPassword = credentialPassword.value.trim();
  const confirmPassword = credentialPasswordConfirm.value.trim();

  if (!nextEmail || !confirmEmail || !nextPassword || !confirmPassword) {
    credentialError.value = 'Veuillez remplir tous les champs de confirmation.';
    return;
  }

  if (nextEmail !== confirmEmail) {
    credentialError.value = 'Les emails ne correspondent pas.';
    return;
  }

  if (nextPassword !== confirmPassword) {
    credentialError.value = 'Les mots de passe ne correspondent pas.';
    return;
  }

  credentialSaving.value = true;
  try {
    const response = await api.patch<{
      token: string;
      message: string;
      admin: { id: number; email: string };
    }>(
      '/admin/auth/credentials',
      {
        email: nextEmail,
        password: nextPassword,
      },
      withAuthHeaders(token.value),
    );

    token.value = response.data.token;
    localStorage.setItem('atelier_admin_token', response.data.token);
    credentialInfo.value =
      'Identifiants mis a jour. Votre session reste active pendant 48h.';
    credentialEmail.value = '';
    credentialEmailConfirm.value = '';
    credentialPassword.value = '';
    credentialPasswordConfirm.value = '';
  } catch (e: any) {
    credentialError.value =
      e?.response?.data?.message || 'Impossible de mettre a jour les identifiants.';
  } finally {
    credentialSaving.value = false;
  }
}

async function publishItem(id: number, isPublished: boolean) {
  if (!token.value) return;

  await api.patch(
    `/admin/vestes/${id}/publish`,
    { isPublished },
    withAuthHeaders(token.value),
  );
  await loadData();
}

async function deleteItem(id: number) {
  if (!token.value) return;

  await api.delete(`/admin/vestes/${id}`, withAuthHeaders(token.value));
  await loadData();
}

async function uploadSelectedFilesToVeste(vesteId: number, filesToUpload?: File[]) {
  const files = filesToUpload || selectedFiles.value;
  if (!token.value || files.length === 0) {
    return 0;
  }

  const totalFiles = files.length;
  let uploadedCount = 0;

  for (const mediaFile of files) {
    const formData = new FormData();
    formData.append('media', mediaFile);

    const uploadRes = await api.post('/admin/vestes/upload', formData, {
      ...withAuthHeaders(token.value),
      onUploadProgress: (event) => {
        if (event.total) {
          const currentFileProgress = Math.round((event.loaded * 100) / event.total);
          const globalProgress = Math.round(
            ((uploadedCount + currentFileProgress / 100) / totalFiles) * 100,
          );
          uploadPercent.value = globalProgress;
          uploadPercentPerItem.value[vesteId] = globalProgress;
        }
      },
    });

    await api.post(
      `/admin/vestes/${vesteId}/images`,
      {
        mediaUrl: uploadRes.data.mediaUrl,
        mediaType: uploadRes.data.mediaType,
        fileSize: uploadRes.data.fileSize,
      },
      withAuthHeaders(token.value),
    );

    uploadedCount += 1;
    uploadPercent.value = Math.round((uploadedCount / totalFiles) * 100);
  }

  return uploadedCount;
}

async function addImageToItem(id: number) {
  const itemFiles = selectedFilesPerItem.value[id] || [];
  if (!token.value || itemFiles.length === 0) return;

  uploadingPerItem.value[id] = true;
  uploadPercentPerItem.value[id] = 0;
  info.value = '';
  error.value = '';

  try {
    const uploadedCount = await uploadSelectedFilesToVeste(id, itemFiles);

    selectedFilesPerItem.value[id] = [];
    uploadPercentPerItem.value[id] = 0;
    info.value = `${uploadedCount} image(s) ajoutee(s) au modele.`;
    await loadData();
  } catch (e: any) {
    error.value = e?.response?.data?.message || "Erreur pendant l'ajout d'image";
  } finally {
    uploadingPerItem.value[id] = false;
  }
}

async function saveItemChanges(id: number) {
  if (!token.value) return;

  const nextTitre = (editTitre.value[id] || '').trim();
  const nextDescription = (editDescription.value[id] || '').trim();

  if (!nextTitre || !nextDescription) {
    error.value = 'Le titre et la description sont requis pour modifier le modele.';
    return;
  }

  editSaving.value = { ...editSaving.value, [id]: true };
  info.value = '';
  error.value = '';

  try {
    await api.patch(
      `/admin/vestes/${id}`,
      {
        titre: nextTitre,
        description: nextDescription,
      },
      withAuthHeaders(token.value),
    );
    info.value = 'Modele modifie avec succes.';
    await loadData();
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || 'Erreur pendant la modification du modele.';
  } finally {
    editSaving.value = { ...editSaving.value, [id]: false };
  }
}

async function submitItem() {
  if (!token.value) return;

  uploading.value = true;
  uploadPercent.value = 0;
  info.value = '';
  error.value = '';

  try {
    const created = await api.post<Veste>(
      '/admin/vestes',
      {
        titre: titre.value,
        description: description.value,
      },
      withAuthHeaders(token.value),
    );

    const uploadedCount = await uploadSelectedFilesToVeste(created.data.id);

    titre.value = '';
    description.value = '';
    selectedFiles.value = [];
    uploadPercent.value = 0;
    info.value =
      uploadedCount > 0
        ? `Modele cree avec ${uploadedCount} image(s) importee(s).`
        : 'Modele cree sans image. Ajoutez des images avant publication.';
    await loadData();
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Erreur pendant la creation du modele';
  } finally {
    uploading.value = false;
  }
}

function logout() {
  localStorage.removeItem('atelier_admin_token');
  router.push('/admin/login');
}

onMounted(loadData);
</script>

<template>
  <div
    v-if="loadingDashboard"
    style="margin-bottom: 1rem; padding: 0.9rem; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; color: #1e3a8a"
  >
    ⏳ Chargement du tableau de bord...
  </div>

  <div
    v-if="pageError"
    style="margin-bottom: 1rem; padding: 0.9rem; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px; color: #991b1b"
  >
    ✗ {{ pageError }}
  </div>

  <section class="admin-header" style="margin-bottom: 2rem">
    <div>
      <h1 style="margin: 0 0 0.5rem 0; font-size: 1.75rem">⚙️ Gestion de la Galerie</h1>
      <p style="margin: 0; color: var(--text-secondary)">Téléchargez, publiez et gérez vos modèles de vestes</p>
    </div>
    <button class="ghost" @click="logout">Se déconnecter</button>
  </section>

  <!-- Statistiques de stockage -->
  <section class="storage">
    <div class="storage-header">
      <div>
        <h3 style="margin: 0">📦 Espace de stockage</h3>
        <p style="margin: 0.35rem 0 0 0; color: var(--text-secondary)">
          Utilisation des fichiers envoyés dans l'administration.
        </p>
      </div>
      <span class="storage-badge" :class="{ warning: !!statsLoadError && !stats, loading: loadingDashboard && !stats }">
        {{
          stats
            ? `${stats.usedMb} MB / ${stats.quotaMb} MB`
            : loadingDashboard
              ? 'Chargement...'
              : statsLoadError
                ? 'Donnée indisponible'
                : 'En attente'
        }}
      </span>
    </div>

    <div class="storage-metrics">
      <div class="storage-metric">
        <span>Utilisé</span>
        <strong>{{ stats ? `${stats.usedMb} MB` : '—' }}</strong>
      </div>
      <div class="storage-metric">
        <span>Quota</span>
        <strong>{{ stats ? `${stats.quotaMb} MB` : '—' }}</strong>
      </div>
      <div class="storage-metric">
        <span>Occupation</span>
        <strong>{{ stats ? `${stats.usagePercent}%` : '—' }}</strong>
      </div>
    </div>

    <div class="progress" :aria-label="stats ? `Espace de stockage utilise a ${stats.usagePercent}%` : 'Chargement de l espace de stockage'">
      <div class="progress-value" :style="{ width: `${stats?.usagePercent ?? 0}%` }" />
    </div>

    <small v-if="stats" style="display: inline-block; margin-top: 0.5rem; color: var(--text-secondary)">
      {{ stats.usagePercent }}% utilisé
    </small>
    <small v-else-if="statsLoadError" style="display: inline-block; margin-top: 0.5rem; color: var(--warning)">
      ⚠️ {{ statsLoadError }}
    </small>
    <small v-else style="display: inline-block; margin-top: 0.5rem; color: var(--text-secondary)">
      Les statistiques apparaissent après connexion administrateur.
    </small>
  </section>

  <!-- Grille avec upload + liste -->
  <div class="admin-grid">
    <article class="panel atelier-admin-panel">
      <h2 style="margin-top: 0">🏷️ Identite de l'atelier</h2>

      <div
        v-if="atelierLoadError"
        style="margin-bottom: 1rem; padding: 0.75rem; background: #fff7ed; border-left: 4px solid #f97316; border-radius: 4px; color: #9a3412; font-size: 0.9rem"
      >
        ⚠️ {{ atelierLoadError }}
      </div>

      <form class="form" @submit.prevent="submitAtelierProfile">
        <div class="form-group">
          <label>Nom de l'atelier</label>
          <input
            v-model="atelierName"
            type="text"
            placeholder="Homme Tissus Couture"
            required
          />
        </div>

        <div class="form-group">
          <label>Mot de bienvenue (menu)</label>
          <input
            v-model="atelierWelcomeText"
            type="text"
            placeholder="Bienvenue chez Homme Tissus Couture"
            required
          />
        </div>

        <div class="form-group">
          <label>Description atelier</label>
          <textarea
            v-model="atelierDescription"
            rows="4"
            placeholder="Decrivez votre atelier, votre vision et votre savoir-faire."
            required
          />
        </div>

        <div class="form-group">
          <label>Numéro de téléphone</label>
          <input
            v-model="atelierPhoneNumber"
            type="tel"
            placeholder="+33 X XX XX XX XX ou 0X XX XX XX XX"
          />
        </div>

        <div class="atelier-admin-logos">
          <div class="form-group">
            <label>Logo gauche</label>
            <input type="file" accept="image/*" @change="onLogoLeftChange" />
            <img
              v-if="atelier?.logoLeftUrl"
              :src="mediaSrc(atelier.logoLeftUrl)"
              alt="Logo gauche"
              class="atelier-admin-logo-preview"
            />
          </div>

          <div class="form-group">
            <label>Logo droit</label>
            <input type="file" accept="image/*" @change="onLogoRightChange" />
            <img
              v-if="atelier?.logoRightUrl"
              :src="mediaSrc(atelier.logoRightUrl)"
              alt="Logo droit"
              class="atelier-admin-logo-preview"
            />
          </div>
        </div>

        <button class="btn" :disabled="atelierSaving" style="width: 100%">
          {{ atelierSaving ? '⏳ Mise a jour...' : "💾 Enregistrer l'identite atelier" }}
        </button>
      </form>

      <div
        v-if="atelierInfo"
        style="margin-top: 1rem; padding: 0.75rem; background: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px; color: #047857; font-size: 0.9rem"
      >
        ✓ {{ atelierInfo }}
      </div>

      <div
        v-if="atelierError"
        style="margin-top: 1rem; padding: 0.75rem; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px; color: #991b1b; font-size: 0.9rem"
      >
        ✗ {{ atelierError }}
      </div>
    </article>

    <article class="panel">
      <h2 style="margin-top: 0">🔐 Changer mes identifiants</h2>
      <p style="margin-top: 0; color: var(--text-secondary)">
        Saisissez les nouveaux identifiants puis confirmez-les pour eviter les erreurs.
      </p>

      <form class="form" @submit.prevent="submitCredentials">
        <div class="form-group">
          <label>Nouvel email</label>
          <input
            v-model="credentialEmail"
            type="email"
            placeholder="nouveau-admin@atelier.fr"
            required
          />
        </div>

        <div class="form-group">
          <label>Confirmer le nouvel email</label>
          <input
            v-model="credentialEmailConfirm"
            type="email"
            placeholder="Confirmez le nouvel email"
            required
          />
        </div>

        <div class="form-group">
          <label>Nouveau mot de passe</label>
          <input
            v-model="credentialPassword"
            type="password"
            minlength="6"
            placeholder="Minimum 6 caracteres"
            required
          />
        </div>

        <div class="form-group">
          <label>Confirmer le nouveau mot de passe</label>
          <input
            v-model="credentialPasswordConfirm"
            type="password"
            minlength="6"
            placeholder="Confirmez le nouveau mot de passe"
            required
          />
        </div>

        <button class="btn" :disabled="credentialSaving" style="width: 100%">
          {{ credentialSaving ? '⏳ Mise a jour...' : '💾 Enregistrer les nouveaux identifiants' }}
        </button>
      </form>

      <div
        v-if="credentialInfo"
        style="margin-top: 1rem; padding: 0.75rem; background: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px; color: #047857; font-size: 0.9rem"
      >
        ✓ {{ credentialInfo }}
      </div>

      <div
        v-if="credentialError"
        style="margin-top: 1rem; padding: 0.75rem; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px; color: #991b1b; font-size: 0.9rem"
      >
        ✗ {{ credentialError }}
      </div>
    </article>

    <!-- Panel Nouveau modèle -->
    <article class="panel">
      <h2 style="margin-top: 0">📸 Ajouter un nouveau modèle</h2>
      <form class="form" @submit.prevent="submitItem">
        <div class="form-group">
          <label>Titre du modèle</label>
          <input v-model="titre" type="text" placeholder="Ex: Veste Blazer Navy" required />
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea
            v-model="description"
            rows="3"
            placeholder="Décrivez le style, la matière, l'occasion..."
            required
          />
        </div>

        <div class="form-group">
          <label>Photos ou vidéos à importer</label>
          <input type="file" accept="image/*,video/*" multiple @change="onFileChange" />
          <small style="color: var(--text-secondary); margin-top: 0.5rem; display: block">
            Formats : JPG, PNG, WebP, MP4, WebM (max 100MB)
          </small>
          <small
            v-if="selectedFiles.length > 0"
            style="color: var(--text-secondary); margin-top: 0.5rem; display: block"
          >
            Fichiers sélectionnés : {{ selectedMediaNames }}
          </small>
        </div>

        <div v-if="uploading" style="margin: 1rem 0">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem">
            <span style="font-size: 0.9rem; font-weight: 600">Upload en cours...</span>
            <span style="font-size: 0.9rem; color: var(--primary)">{{ uploadPercent }}%</span>
          </div>
          <div class="progress">
            <div class="progress-value" :style="{ width: `${uploadPercent}%` }" />
          </div>
        </div>

        <button class="btn" :disabled="!canSubmit" style="width: 100%">
          {{ uploading ? `⏳ Upload ${uploadPercent}%` : '➕ Enregistrer le modèle' }}
        </button>
      </form>

      <div v-if="info" style="margin-top: 1rem; padding: 0.75rem; background: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px; color: #047857; font-size: 0.9rem">
        ✓ {{ info }}
      </div>
      <div v-if="error" style="margin-top: 1rem; padding: 0.75rem; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px; color: #991b1b; font-size: 0.9rem">
        ✗ {{ error }}
      </div>
    </article>

    <!-- Panel Modèles existants -->
    <article class="panel">
      <h2 style="margin-top: 0">📋 Modèles existants</h2>

      <div
        v-if="vestesLoadError"
        style="margin-bottom: 1rem; padding: 0.75rem; background: #fff7ed; border-left: 4px solid #f97316; border-radius: 4px; color: #9a3412; font-size: 0.9rem"
      >
        ⚠️ {{ vestesLoadError }}
      </div>
      <div v-if="items.length === 0" style="text-align: center; padding: 2rem; color: var(--text-secondary)">
        <p style="font-size: 1.1rem">Aucun modèle pour l'instant.</p>
        <small>Commencez par ajouter votre première veste →</small>
      </div>

      <div v-else style="display: grid; gap: 1rem">
        <div v-for="item in items" :key="item.id" class="item">
          <!-- Thumbnail + Info -->
          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 1rem; align-items: start">
            <div style="border-radius: 8px; overflow: hidden; background: var(--bg-tertiary); height: 100px">
              <img
                v-if="item.images && item.images.length > 0 && isImageMedia(item.images[0].mediaType, item.images[0].mediaUrl)"
                :src="mediaSrc(item.images[0].mediaUrl)"
                :alt="item.titre"
                style="width: 100%; height: 100%; object-fit: cover"
              />
              <video
                v-else-if="item.images && item.images.length > 0"
                :src="mediaSrc(item.images[0].mediaUrl)"
                preload="metadata"
                style="width: 100%; height: 100%; object-fit: cover"
              />
              <div v-else style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: var(--text-secondary)">
                Pas d'image
              </div>
            </div>

            <div>
              <h4 style="margin: 0 0 0.25rem 0">{{ item.titre }}</h4>
              <p style="margin: 0 0 0.5rem 0; font-size: 0.9rem; line-height: 1.4">
                {{ item.description }}
              </p>
              <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-secondary)">
                <span v-if="item.images && item.images.length > 0">📁 {{ item.images.length }} image{{ item.images.length > 1 ? 's' : '' }}</span>
                <span v-else>📁 0 images</span>
                <span v-if="item.isPublished" style="color: var(--success)">🌐 Publié</span>
                <span v-else style="color: var(--warning)">🔒 Brouillon</span>
              </div>

              <div style="margin-top: 0.75rem; display: grid; gap: 0.5rem">
                <input
                  v-model="editTitre[item.id]"
                  type="text"
                  placeholder="Modifier le titre"
                />
                <textarea
                  v-model="editDescription[item.id]"
                  rows="2"
                  placeholder="Modifier la description"
                />
                <button
                  class="btn"
                  @click="saveItemChanges(item.id)"
                  :disabled="editSaving[item.id]"
                  style="font-size: 0.9rem"
                >
                  {{ editSaving[item.id] ? '⏳ Modification...' : '💾 Modifier le modèle' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Ajout d'images pour ce modèle -->
          <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 4px">
            <div class="form-group">
              <label style="font-size: 0.9rem">📸 Ajouter des images à ce modèle</label>
              <input 
                type="file" 
                accept="image/*,video/*" 
                multiple 
                @change="onItemFileChange(item.id, $event)"
                style="font-size: 0.9rem"
              />
              <small v-if="(selectedFilesPerItem[item.id] || []).length > 0" style="color: var(--text-secondary); margin-top: 0.5rem; display: block">
                {{ (selectedFilesPerItem[item.id] || []).map(f => f.name).join(', ') }}
              </small>
            </div>

            <div v-if="uploadingPerItem[item.id]" style="margin: 0.5rem 0">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem">
                <span style="font-size: 0.85rem; font-weight: 600">Upload en cours...</span>
                <span style="font-size: 0.85rem; color: var(--primary)">{{ uploadPercentPerItem[item.id] || 0 }}%</span>
              </div>
              <div class="progress">
                <div class="progress-value" :style="{ width: `${uploadPercentPerItem[item.id] || 0}%` }" />
              </div>
            </div>

            <button
              class="btn"
              @click="addImageToItem(item.id)"
              :disabled="(selectedFilesPerItem[item.id] || []).length === 0 || uploadingPerItem[item.id]"
              style="width: 100%; font-size: 0.9rem"
            >
              {{ uploadingPerItem[item.id] ? `⏳ Upload ${uploadPercentPerItem[item.id] || 0}%` : '🖼️ Ajouter image' }}
            </button>
          </div>

          <!-- Actions -->
          <div class="item-actions" style="margin-top: 0.5rem">
            <button
              class="btn"
              @click="publishItem(item.id, !item.isPublished)"
              style="flex: 1; font-size: 0.9rem"
            >
              {{ item.isPublished ? '🔒 Dépublier' : '🌐 Publier' }}
            </button>
            <button
              class="danger"
              @click="deleteItem(item.id)"
              style="flex: 1; font-size: 0.9rem"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>
