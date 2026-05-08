import { createRouter, createWebHistory } from 'vue-router';
import PublicCatalogView from './views/PublicCatalogView.vue';
import AdminLoginView from './views/AdminLoginView.vue';
import AdminDashboardView from './views/AdminDashboardView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'public', component: PublicCatalogView },
    { path: '/admin/login', name: 'admin-login', component: AdminLoginView },
    { path: '/admin', name: 'admin-dashboard', component: AdminDashboardView },
  ],
});

router.beforeEach((to) => {
  const isAdminArea = to.path.startsWith('/admin') && to.path !== '/admin/login';
  const token = localStorage.getItem('atelier_admin_token');

  if (isAdminArea && !token) {
    return '/admin/login';
  }

  if (to.path === '/admin/login' && token) {
    return '/admin';
  }

  return true;
});

export default router;
