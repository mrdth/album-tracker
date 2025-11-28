/**
 * Vue Router Configuration
 *
 * Routes for Album Tracker application
 */

import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Lazy-loaded page components
const HomePage = () => import('../pages/HomePage.vue');
const ArtistDetailPage = () => import('../pages/ArtistDetailPage.vue');
const CollectionPage = () => import('../pages/CollectionPage.vue');
const SettingsPage = () => import('../pages/SettingsPage.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: {
      title: 'Home - Album Tracker'
    }
  },
  {
    path: '/artist/:artistId',
    name: 'ArtistDetail',
    component: ArtistDetailPage,
    meta: {
      title: 'Artist Detail - Album Tracker'
    }
  },
  {
    path: '/collection',
    name: 'Collection',
    component: CollectionPage,
    meta: {
      title: 'Collection - Album Tracker'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsPage,
    meta: {
      title: 'Settings - Album Tracker'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Update document title on route change
router.beforeEach((to, _from, next) => {
  document.title = (to.meta.title as string) || 'Album Tracker';
  next();
});

export default router;
