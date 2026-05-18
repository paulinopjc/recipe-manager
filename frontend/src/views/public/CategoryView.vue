<template>
  <PublicLayout>
    <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner /></div>

    <div v-else-if="error" class="max-w-2xl mx-auto px-[15px] py-12 text-center text-gray-500">
      {{ error }}
    </div>

    <template v-else-if="category">
      <!-- Category header banner -->
      <div class="relative bg-gray-800 text-white"
        :style="category.image_url ? `background-image: url('${category.image_url}'); background-size: cover; background-position: center;` : ''">
        <div class="absolute inset-0 bg-black/50" v-if="category.image_url" />
        <div class="relative max-w-7xl mx-auto px-[15px] py-14">
          <!-- Breadcrumb -->
          <nav class="flex flex-wrap items-center gap-1 text-sm text-white/70 mb-4">
            <RouterLink to="/recipes" class="hover:text-white">Recipes</RouterLink>
            <template v-for="ancestor in category.ancestors" :key="ancestor.id">
              <span>/</span>
              <RouterLink :to="`/recipes/category/${ancestor.slug}`" class="hover:text-white">
                {{ ancestor.name }}
              </RouterLink>
            </template>
            <span>/</span>
            <span class="text-white font-medium">{{ category.name }}</span>
          </nav>
          <h1 class="text-3xl font-bold">{{ category.name }}</h1>
          <p v-if="category.description" class="mt-2 text-white/80 max-w-2xl">
            {{ category.description }}
          </p>
        </div>
      </div>

      <!-- Filters + results -->
      <div class="max-w-7xl mx-auto px-[15px] py-10">
        <!-- Subcategory pills -->
        <div v-if="subcategories.length > 0" class="flex flex-wrap gap-2 mb-6">
          <button
            @click="selectSub(null)"
            :class="selectedSub === null
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors">
            All {{ category.name }}
          </button>
          <button
            v-for="sub in subcategories" :key="sub.id"
            @click="selectSub(sub)"
            :class="selectedSub?.id === sub.id
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors">
            {{ sub.name }}
          </button>
        </div>

        <!-- Filter bar -->
        <div class="flex flex-wrap gap-3 mb-8">
          <input v-model="q" type="search" placeholder="Search recipes…"
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

        <div v-if="recipesLoading" class="flex justify-center py-12"><LoadingSpinner /></div>

        <template v-else>
          <p class="text-sm text-gray-400 mb-6">{{ total }} recipe{{ total !== 1 ? 's' : '' }}</p>

          <div v-if="recipes.length === 0" class="text-center py-12 text-gray-400">
            No recipes found in this category.
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
    </template>
  </PublicLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { publicApi } from '@/api/publicApi'
import type { Category } from '@/types/category'
import type { Recipe } from '@/types/recipe'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import RecipeCard from '@/components/public/RecipeCard.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'

const route = useRoute()
const slug  = computed(() => route.params.slug as string)

const loading        = ref(true)
const recipesLoading = ref(false)
const error          = ref<string | null>(null)
const category       = ref<Category | null>(null)
const subcategories  = ref<{ id: number; name: string; slug: string }[]>([])
const selectedSub    = ref<{ id: number; name: string; slug: string } | null>(null)
const recipes        = ref<Recipe[]>([])
const total          = ref(0)
const page           = ref(1)
const pageSize       = 18
const q              = ref('')
const difficulty     = ref('')

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)

// The active slug to query: selected subcategory or current category
const activeSlug = computed(() => selectedSub.value?.slug ?? slug.value)

async function loadCategory() {
  loading.value = true
  selectedSub.value = null
  q.value = ''
  difficulty.value = ''
  try {
    const res = await publicApi.categoryPage(slug.value, { page: 1, pageSize })
    category.value     = res.category
    subcategories.value = res.children ?? []
    recipes.value      = res.data
    total.value        = res.total
    page.value         = 1
  } catch {
    error.value = 'Category not found.'
  } finally {
    loading.value = false
  }
}

function selectSub(sub: { id: number; name: string; slug: string } | null) {
  selectedSub.value = sub
  page.value = 1
  loadRecipes()
}

function search() {
  page.value = 1
  loadRecipes()
}

async function loadRecipes() {
  recipesLoading.value = true
  try {
    const res = await publicApi.categoryPage(activeSlug.value, {
      page: page.value,
      pageSize,
      q:          q.value || undefined,
      difficulty: (difficulty.value as any) || undefined,
    })
    recipes.value = res.data
    total.value   = res.total
  } finally {
    recipesLoading.value = false
  }
}

async function goPage(p: number) {
  page.value = p
  await loadRecipes()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(loadCategory)
watch(slug, loadCategory)
</script>
