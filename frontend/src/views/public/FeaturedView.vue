<template>
  <PublicLayout>
    <!-- Header banner -->
    <div class="bg-gray-800 text-white">
      <div class="max-w-7xl mx-auto px-[15px] py-14">
        <nav class="flex flex-wrap items-center gap-1 text-sm text-white/70 mb-4">
          <RouterLink to="/recipes" class="hover:text-white">Recipes</RouterLink>
          <span>/</span>
          <span class="text-white font-medium">Featured</span>
        </nav>
        <h1 class="text-3xl font-bold">Featured Recipes</h1>
        <p class="mt-2 text-white/80">A hand-picked selection of our best recipes.</p>
      </div>
    </div>

    <!-- Filters + results -->
    <div class="max-w-7xl mx-auto px-[15px] py-10">
      <!-- Filter bar -->
      <div class="flex flex-wrap gap-3 mb-8">
        <input v-model="q" type="search" placeholder="Search featured recipes…"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-0 sm:flex-none sm:w-56 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          @keyup.enter="search" />
        <select v-model="difficulty" @change="search"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button @click="search"
          class="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 min-h-[44px]">
          Search
        </button>
      </div>

      <div v-if="loading" class="flex justify-center py-12"><LoadingSpinner /></div>

      <template v-else>
        <p class="text-sm text-gray-400 mb-6">{{ total }} recipe{{ total !== 1 ? 's' : '' }}</p>

        <div v-if="recipes.length === 0" class="text-center py-12 text-gray-400">
          No featured recipes found.
        </div>

        <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <RecipeCard v-for="r in recipes" :key="r.id" :recipe="r" />
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-10">
          <button v-for="p in totalPages" :key="p"
            @click="goPage(p)"
            :class="[
              'px-3 py-1.5 rounded text-sm',
              p === page
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            ]">
            {{ p }}
          </button>
        </div>
      </template>
    </div>
  </PublicLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { publicApi } from '@/api/publicApi'
import type { Recipe } from '@/types/recipe'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import RecipeCard from '@/components/public/RecipeCard.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'

const recipes  = ref<Recipe[]>([])
const total    = ref(0)
const page     = ref(1)
const pageSize = 18
const q        = ref('')
const difficulty = ref('')
const loading  = ref(true)

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

async function load() {
  loading.value = true
  try {
    const res = await publicApi.list({
      is_featured: true,
      page:        page.value,
      pageSize,
      q:           q.value || undefined,
      difficulty:  (difficulty.value as any) || undefined,
      sortBy:      'created_at',
      sortOrder:   'DESC',
    })
    recipes.value = res.data
    total.value   = res.total
  } finally {
    loading.value = false
  }
}

function search() { page.value = 1; load() }

async function goPage(p: number) {
  page.value = p
  await load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(load)
</script>
