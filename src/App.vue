<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from './api';

interface AtelierProfile {
  welcomeText: string;
}

const welcomeText = ref('Bienvenue chez Homme Tissus Couture');

const welcomeLines = computed(() => {
  const words = welcomeText.value.split(' ');
  const middle = Math.ceil(words.length / 2);
  return {
    line1: words.slice(0, middle).join(' '),
    line2: words.slice(middle).join(' ')
  };
});

async function loadWelcomeText() {
  try {
    const response = await api.get<AtelierProfile>('/atelier/profile');
    if (response.data?.welcomeText) {
      welcomeText.value = response.data.welcomeText;
    }
  } catch {
    // Keep default text when API is unavailable.
  }
}

onMounted(loadWelcomeText);
</script>

<template>
  <header class="topbar">
    <div class="welcome-container">
      <p class="welcome-line">{{ welcomeLines.line1.toUpperCase() }}</p>
      <p class="welcome-line">{{ welcomeLines.line2.toUpperCase() }}</p>
    </div>
    <nav>
      <RouterLink to="/">📸 Catalogue</RouterLink>
      <RouterLink to="/admin/login">🔐 Admin</RouterLink>
    </nav>
  </header>
  <main class="container">
    <RouterView />
  </main>
</template>
