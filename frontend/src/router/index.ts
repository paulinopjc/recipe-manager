import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_PREFIX } from '@/config'

const A = `/${ADMIN_PREFIX}`

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Public site ──────────────────────────────────────────────────────────
    { path: '/',                            component: () => import('@/views/public/HomeView.vue'), meta: { title: 'Home - RecipeBook' } },
    { path: '/recipes',                     component: () => import('@/views/public/RecipeListView.vue'), meta: { title: 'Recipes' } },
    { path: '/recipes/category/:slug',      component: () => import('@/views/public/CategoryView.vue'), meta: { title: 'Category' } },
    { path: '/recipes/featured',            component: () => import('@/views/public/FeaturedView.vue'), meta: { title: 'Featured Recipes - RecipeBook' } },
    { path: '/recipes/most-viewed',         component: () => import('@/views/public/MostViewedView.vue'), meta: { title: 'Most Viewed Recipes - RecipeBook' } },
    { path: '/recipes/:slug',               component: () => import('@/views/public/RecipeDetailView.vue'), meta: { title: 'Recipe Details' } },

    // OAuth callback — must be public, outside the backoffice prefix
    { path: '/auth/callback', component: () => import('@/views/AuthCallbackView.vue'), meta: { title: 'Auth Callback' } },

    // ── Backoffice ────────────────────────────────────────────────────────────
    { path: A,                        redirect: `${A}/recipes` },
    { path: `${A}/login`,             component: () => import('@/views/LoginView.vue'),         meta: { title: 'Login - RecipeBook', guestOnly: true } },
    { path: `${A}/recipes`,           component: () => import('@/views/RecipeListView.vue'),    meta: { title: 'Recipes - RecipeBook', requiresAuth: true } },
    { path: `${A}/recipes/new`,       component: () => import('@/views/RecipeCreateView.vue'),  meta: { title: 'Create Recipe - RecipeBook', requiresAuth: true } },
    { path: `${A}/recipes/:id`,       component: () => import('@/views/RecipeDetailView.vue'),  meta: { title: 'Recipe Details - RecipeBook', requiresAuth: true } },
    { path: `${A}/recipes/:id/edit`,  component: () => import('@/views/RecipeEditView.vue'),    meta: { title: 'Edit Recipe - RecipeBook', requiresAuth: true } },
    { path: `${A}/categories`,         component: () => import('@/views/categories/CategoriesView.vue'), meta: { title: 'Categories - RecipeBook', requiresAuth: true } },
    { path: `${A}/nav-items`,          component: () => import('@/views/navItems/NavItemsView.vue'),                       meta: { title: 'Navigation Items - RecipeBook', requiresAuth: true } },
    { path: `${A}/homepage-sections`, component: () => import('@/views/homepage/HomepageSpecialsView.vue'), meta: { title: 'Homepage Sections - RecipeBook', requiresAuth: true } },
    { path: `${A}/admin/users`,        component: () => import('@/views/admin/UsersView.vue'),   meta: { title: 'Users - RecipeBook', requiresAuth: true, requiresAdmin: true } },

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

  document.title = (to.meta.title as string) ?? 'RecipeBook'

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
