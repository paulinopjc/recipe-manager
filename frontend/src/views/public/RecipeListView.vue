<template>
  <PublicLayout>
    <div class="max-w-7xl mx-auto px-[15px] py-12">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">{{ pageTitle }}</h1>

      <!-- Category pills -->
      <div v-if="rootCategories.length > 0" class="flex flex-wrap gap-2 mb-6">
        <button
          @click="selectCategory(null)"
          :class="selectedCategory === null
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors">
          All
        </button>
        <button
          v-for="cat in rootCategories" :key="cat.id"
          @click="selectCategory(cat)"
          :class="selectedCategory?.id === cat.id
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors">
          {{ cat.name }}
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-3 mb-8">
        <input v-model="q" type="search" placeholder="Search recipes..."
          class="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <select v-model="difficulty"
          class="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="">All levels</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select v-model="sortBy"
          class="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="created_at">Newest</option>
          <option value="title">Title A–Z</option>
          <option value="view_count">Most Viewed</option>
        </select>
      </div>

      <LoadingSpinner v-if="loading" />

      <div v-else-if="recipes.length === 0" class="text-center py-16 text-gray-400">
        No recipes found.
      </div>

      <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <RecipeCard v-for="r in recipes" :key="r.id" :recipe="r" />
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between mt-10 text-sm text-gray-600">
        <span>Page {{ page }} of {{ totalPages }}</span>
        <div class="flex gap-2">
          <button @click="prevPage" :disabled="page <= 1"
            class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 min-h-[44px]">
            Previous
          </button>
          <button @click="nextPage" :disabled="page >= totalPages"
            class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 min-h-[44px]">
            Next
          </button>
        </div>
      </div>
    </div>
  </PublicLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { publicApi } from '@/api/publicApi'
import type { Recipe } from '@/types/recipe'
import type { Category } from '@/types/category'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import RecipeCard from '@/components/public/RecipeCard.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'

const route = useRoute()

const q               = ref('')
const sortBy          = ref<'title' | 'created_at' | 'view_count'>('created_at')
const sortOrder       = ref<'ASC' | 'DESC'>('DESC')
const difficulty      = ref<'easy' | 'medium' | 'hard' | ''>('')
const isFeatured      = ref<boolean | undefined>(undefined)
const recipes         = ref<Recipe[]>([])
const loading         = ref(false)
const page            = ref(1)
const pageSize        = ref(12)
const total           = ref(0)
const rootCategories  = ref<Category[]>([])
const selectedCategory = ref<{ id: number; slug: string; name: string } | null>(null)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const pageTitle = computed(() => {
  if (isFeatured.value) return 'Featured Recipes'
  if (sortBy.value === 'view_count') return 'Most Viewed'
  return 'Recipes'
})

onMounted(async () => {
  // Apply URL query params — used by nav links like ?filter=featured
  document.title = 'Recipes - RecipeBook'
  const filter = route.query.filter as string | undefined
  if (filter === 'featured') {
    isFeatured.value = true
  }
  const qSortBy = route.query.sortBy as string | undefined
  const qSortOrder = route.query.sortOrder as string | undefined
  if (qSortBy === 'view_count') {
    sortBy.value = 'view_count'
    sortOrder.value = qSortOrder === 'ASC' ? 'ASC' : 'DESC'
  }

  try {
    const tree = await publicApi.categories()
    rootCategories.value = tree.filter(c => !c.is_home)
  } catch { /* non-critical */ }
  await load()
})

async function load() {
  loading.value = true
  try {
    const filters = {
      q:           q.value || undefined,
      sortBy:      sortBy.value,
      sortOrder:   sortOrder.value,
      difficulty:  difficulty.value || undefined,
      page:        page.value,
      pageSize:    pageSize.value,
      is_featured: isFeatured.value,
    }
    if (selectedCategory.value) {
      const result = await publicApi.categoryPage(selectedCategory.value.slug, filters)
      recipes.value = result.data
      total.value   = result.total
    } else {
      const result = await publicApi.list(filters)
      recipes.value = result.data
      total.value   = result.total
    }
  } finally {
    loading.value = false
  }
}

function selectCategory(cat: { id: number; slug: string; name: string } | null) {
  selectedCategory.value = cat
  page.value = 1
  load()
}

function prevPage() { if (page.value > 1) { page.value--; load() } }
function nextPage() { if (page.value < totalPages.value) { page.value++; load() } }

let searchTimer: ReturnType<typeof setTimeout>
watch(q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 300)
})

watch([sortBy, difficulty], () => { page.value = 1; load() })
</script>
