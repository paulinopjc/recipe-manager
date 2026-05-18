import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_PREFIX } from '@/config'

const A = `/${ADMIN_PREFIX}`

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Public site ──────────────────────────────────────────────────────────
    { path: '/',                            component: () => import('@/views/public/HomeView.vue') },
    { path: '/recipes',                     component: () => import('@/views/public/RecipeListView.vue') },
    { path: '/recipes/category/:slug',      component: () => import('@/views/public/CategoryView.vue') },
    { path: '/recipes/featured',            component: () => import('@/views/public/FeaturedView.vue') },
    { path: '/recipes/most-viewed',         component: () => import('@/views/public/MostViewedView.vue') },
    { path: '/recipes/:slug',               component: () => import('@/views/public/RecipeDetailView.vue') },

    // ── Backoffice ────────────────────────────────────────────────────────────
    { path: A,                        redirect: `${A}/recipes` },
    { path: `${A}/login`,             component: () => import('@/views/LoginView.vue'),         meta: { guestOnly: true } },
    { path: `${A}/recipes`,           component: () => import('@/views/RecipeListView.vue'),    meta: { requiresAuth: true } },
    { path: `${A}/recipes/new`,       component: () => import('@/views/RecipeCreateView.vue'),  meta: { requiresAuth: true } },
    { path: `${A}/recipes/:id`,       component: () => import('@/views/RecipeDetailView.vue'),  meta: { requiresAuth: true } },
    { path: `${A}/recipes/:id/edit`,  component: () => import('@/views/RecipeEditView.vue'),    meta: { requiresAuth: true } },
    { path: `${A}/categories`,         component: () => import('@/views/categories/CategoriesView.vue'), meta: { requiresAuth: true } },
    { path: `${A}/nav-items`,          component: () => import('@/views/navItems/NavItemsView.vue'),                       meta: { requiresAuth: true } },
    { path: `${A}/homepage-sections`, component: () => import('@/views/homepage/HomepageSpecialsView.vue'), meta: { requiresAuth: true } },
    { path: `${A}/admin/users`,        component: () => import('@/views/admin/UsersView.vue'),   meta: { requiresAuth: true, requiresAdmin: true } },

    // Legacy redirect so any old /login bookmark still works
    { path: '/login', redirect: `${A}/login` },

    // Unknown backoffice paths → redirect to dashboard
    { path: `${A}/:pathMatch(.*)*`, redirect: `${A}/recipes` },

    // Everything else → 404
    { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFoundView.vue') },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: `${A}/login`, query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return `${A}/recipes`
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return `${A}/recipes`
  }
})

export default router
