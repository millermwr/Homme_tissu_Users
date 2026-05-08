<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';

const router = useRouter();
const email = ref('');
const password = ref('');
const bootstrapMode = ref(false);
const loading = ref(false);
const message = ref('');
const error = ref('');
const adminExists = ref(false);
const checkingAdmin = ref(true);

async function checkAdminExists() {
  try {
    const response = await api.get<{ exists: boolean }>('/admin/auth/exists');
    adminExists.value = response.data.exists;
    bootstrapMode.value = !response.data.exists;
  } catch {
    adminExists.value = false;
  } finally {
    checkingAdmin.value = false;
  }
}

onMounted(checkAdminExists);

async function submit() {
  loading.value = true;
  message.value = '';
  error.value = '';

  try {
    if (bootstrapMode.value) {
      await api.post('/admin/auth/bootstrap', {
        email: email.value,
        password: password.value,
      });
      message.value = 'Administrateur créé avec succès. Connectez-vous maintenant.';
      bootstrapMode.value = false;
      email.value = '';
      password.value = '';
      return;
    }

    const response = await api.post('/admin/auth/login', {
      email: email.value,
      password: password.value,
    });
    localStorage.setItem('atelier_admin_token', response.data.token);
    await router.push('/admin');
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Authentification impossible';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="admin-box">
    <div v-if="!checkingAdmin" style="text-align: center; margin-bottom: 2rem">
      <h1 style="margin: 0 0 0.5rem 0; font-size: 1.75rem">
        {{ adminExists 
          ? '🔓 Accès Admin' 
          : (bootstrapMode ? '🔐 Création Admin' : '🔓 Accès Admin') }}
      </h1>
      <p style="color: var(--text-secondary); margin: 0">
        {{ adminExists 
          ? 'Connectez-vous pour gérer votre galerie' 
          : (bootstrapMode ? 'Créez votre compte administrateur' : 'Connectez-vous pour gérer votre galerie') }}
      </p>
    </div>
    <div v-else style="text-align: center; padding: 2rem">
      <p style="color: var(--text-secondary)">⏳ Vérification de l'administrateur...</p>
    </div>

    <form v-if="!checkingAdmin" class="form" @submit.prevent="submit">
      <div class="form-group">
        <label>Email</label>
        <input v-model="email" type="email" placeholder="admin@atelier.fr" required />
      </div>

      <div class="form-group">
        <label>Mot de passe</label>
        <input
          v-model="password"
          type="password"
          :placeholder="bootstrapMode ? 'Minimum 6 caractères' : 'Votre mot de passe'"
          :minlength="bootstrapMode ? 6 : 1"
          required
        />
      </div>

      <button class="btn" :disabled="loading" style="width: 100%; margin-top: 1rem">
        {{ loading ? '⏳ Traitement...' : bootstrapMode ? '➕ Créer admin' : '➜ Se connecter' }}
      </button>
    </form>

    <div v-if="!checkingAdmin && message" style="margin-top: 1rem; padding: 1rem; background: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px; color: #047857">
      ✓ {{ message }}
    </div>

    <div v-if="!checkingAdmin && error" style="margin-top: 1rem; padding: 1rem; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px; color: #991b1b">
      ✗ {{ error }}
    </div>

    <div v-if="!checkingAdmin" style="margin-top: 1.5rem; text-align: center">
      <button v-if="!adminExists" class="ghost" @click="bootstrapMode = !bootstrapMode" style="width: 100%">
        {{ bootstrapMode ? '← Retour à la connexion' : 'Premier lancement ? Créer admin →' }}
      </button>
      <p v-else style="color: var(--text-secondary); margin: 0">
        ✓ Administrateur enregistré — Veuillez vous connecter
      </p>
    </div>
  </section>
</template>
