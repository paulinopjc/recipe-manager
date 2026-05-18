<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Recipes</h1>
      <RouterLink :to="`/${ADMIN_PREFIX}/recipes/new`"
        class="bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700">
        New recipe
      </RouterLink>
    </div>

    <!-- Filters + view toggle -->
    <div class="flex gap-3 mb-4">
      <input v-model="q" type="search" placeholder="Search recipes..."
        class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
      <select v-model="sortBy" class="border border-gray-300 rounded px-3 py-2 text-sm">
        <option value="created_at">Date</option>
        <option value="title">Title</option>
        <option value="ingredients">Ingredients</option>
      </select>
      <select v-model="sortOrder" class="border border-gray-300 rounded px-3 py-2 text-sm">
        <option value="DESC">↓ Desc</option>
        <option value="ASC">↑ Asc</option>
      </select>
      <!-- Grid / List toggle -->
      <div class="flex border border-gray-300 rounded overflow-hidden">
        <button @click="viewMode = 'grid'"
          :class="viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          class="px-3 py-2 transition-colors" title="Grid view">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button @click="viewMode = 'list'"
          :class="viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'"
          class="px-3 py-2 transition-colors" title="List view">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
      {{ error }}
    </div>

    <template v-else>
      <p v-if="recipes.length === 0" class="text-sm text-gray-500">No recipes yet. Add one!</p>

      <!-- ── Grid view ─────────────────────────────────────────────────────── -->
      <div v-else-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="r in recipes" :key="r.id"
          class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow transition">
          <RouterLink :to="`/${ADMIN_PREFIX}/recipes/${r.id}`" class="block">
            <img v-if="r.cover_image_url" :src="r.cover_image_url" :alt="r.title"
              class="w-full h-40 object-cover" />
            <div v-else class="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              No image
            </div>
            <div class="p-4 pb-2">
              <h2 class="font-semibold text-gray-900">{{ r.title }}</h2>
              <p v-if="r.description" class="text-sm text-gray-500 mt-1 line-clamp-2">{{ r.description }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span v-if="r.difficulty" :class="difficultyClass(r.difficulty)"
                  class="text-xs font-medium px-1.5 py-0.5 rounded-full capitalize">
                  {{ r.difficulty }}
                </span>
                <span v-if="r.is_public" class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  Public
                </span>
              </div>
            </div>
          </RouterLink>
          <!-- Card action buttons -->
          <div class="flex items-center gap-1 px-4 pb-3 pt-1 border-t border-gray-100 mt-1">
            <RouterLink :to="`/${ADMIN_PREFIX}/recipes/${r.id}/edit`"
              class="flex-1 text-center text-xs text-indigo-600 hover:text-indigo-800 py-1 rounded hover:bg-indigo-50 transition-colors">
              Edit
            </RouterLink>
            <RouterLink :to="`/recipes/${r.id}`" target="_blank"
              :class="r.is_public ? 'text-emerald-600 hover:text-emerald-800' : 'text-gray-400 hover:text-gray-600'"
              class="flex-1 text-center text-xs py-1 rounded hover:bg-gray-50 transition-colors"
              :title="r.is_public ? 'View on site' : 'Private — not visible on site'">
              Preview
            </RouterLink>
            <button @click="confirmDelete(r)"
              class="flex-1 text-xs text-red-500 hover:text-red-700 py-1 rounded hover:bg-red-50 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- ── List view ─────────────────────────────────────────────────────── -->
      <div v-else class="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 font-medium text-gray-600">Title</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Difficulty</th>
              <th class="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Status</th>
              <th class="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="r in recipes" :key="r.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3">
                <RouterLink :to="`/${ADMIN_PREFIX}/recipes/${r.id}`"
                  class="font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                  {{ r.title }}
                </RouterLink>
                <p v-if="r.description" class="text-xs text-gray-400 mt-0.5 line-clamp-1">{{ r.description }}</p>
              </td>
              <td class="px-4 py-3 hidden sm:table-cell">
                <span v-if="r.difficulty" :class="difficultyClass(r.difficulty)"
                  class="text-xs font-medium px-1.5 py-0.5 rounded-full capitalize">
                  {{ r.difficulty }}
                </span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 hidden md:table-cell">
                <span v-if="r.is_public" class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  Public
                </span>
                <span v-else class="text-xs text-gray-400">Private</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-3">
                  <RouterLink :to="`/${ADMIN_PREFIX}/recipes/${r.id}/edit`"
                    class="text-indigo-600 hover:text-indigo-800 text-xs">
                    Edit
                  </RouterLink>
                  <RouterLink :to="`/recipes/${r.id}`" target="_blank"
                    :class="r.is_public ? 'text-emerald-600 hover:text-emerald-800' : 'text-gray-400 hover:text-gray-600'"
                    class="text-xs"
                    :title="r.is_public ? 'View on site' : 'Private'">
                    Preview
                  </RouterLink>
                  <button @click="confirmDelete(r)"
                    class="text-red-500 hover:text-red-700 text-xs">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between mt-6 text-sm text-gray-600">
        <span>Page {{ page }} of {{ totalPages }} ({{ total }} recipes)</span>
        <div class="flex gap-2">
          <button @click="prevPage" :disabled="page <= 1"
            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
            Previous
          </button>
          <button @click="nextPage" :disabled="page >= totalPages"
            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
            Next
          </button>
        </div>
      </div>
    </template>

    <!-- Delete confirmation modal -->
    <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Delete recipe?</h2>
        <p class="text-sm text-gray-500 mb-6">
          "<span class="font-medium text-gray-700">{{ deleteTarget.title }}</span>" will be permanently deleted.
        </p>
        <div class="flex gap-3 justify-end">
          <button @click="deleteTarget = null"
            class="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
            Cancel
          </button>
          <button @click="doDelete" :disabled="deleting"
            class="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { recipeApi } from '@/api/recipeApi'
import type { Recipe } from '@/types/recipe'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import { ADMIN_PREFIX } from '@/config'

const q        = ref('')
const sortBy    = ref<'title' | 'created_at' | 'ingredients'>('created_at')
const sortOrder = ref<'ASC' | 'DESC'>('DESC')
const recipes   = ref<Recipe[]>([])
const loading   = ref(false)
const error     = ref<string | null>(null)
const page      = ref(1)
const pageSize  = ref(12)
const total     = ref(0)
const viewMode  = ref<'grid' | 'list'>('grid')

// Delete state
const deleteTarget = ref<Recipe | null>(null)
const deleting     = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

async function load() {
  loading.value = true
  error.value = null
  try {
    const result = await recipeApi.list({
      q: q.value || undefined,
      sortBy:    sortBy.value,
      sortOrder: sortOrder.value,
      page:      page.value,
      pageSize:  pageSize.value,
    })
    recipes.value = result.data
    total.value   = result.total
  } catch {
    error.value = 'Failed to load recipes.'
  } finally {
    loading.value = false
  }
}

function prevPage() { if (page.value > 1) { page.value--; load() } }
function nextPage() { if (page.value < totalPages.value) { page.value++; load() } }

function confirmDelete(r: Recipe) {
  deleteTarget.value = r
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await recipeApi.remove(deleteTarget.value.id)
    recipes.value = recipes.value.filter(r => r.id !== deleteTarget.value!.id)
    total.value--
    deleteTarget.value = null
  } catch {
    // keep modal open on error
  } finally {
    deleting.value = false
  }
}

function difficultyClass(d: string) {
  return {
    'bg-green-100 text-green-700': d === 'easy',
    'bg-yellow-100 text-yellow-700': d === 'medium',
    'bg-red-100 text-red-700': d === 'hard',
  }
}

// Search: debounced — reset page on new term
let searchTimer: ReturnType<typeof setTimeout>
watch(q, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 300)
})

// Sort: immediate — reset page on change
watch([sortBy, sortOrder], () => { page.value = 1; load() }, { immediate: true })
</script>
