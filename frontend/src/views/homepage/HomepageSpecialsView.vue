<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Homepage Sections</h1>
      <p class="text-sm text-gray-500">Configure Featured Recipes and Most Viewed homepage sections.</p>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="s in specials"
        :key="s.type"
        class="bg-white rounded-xl border border-gray-200 p-6">

        <div class="flex items-start justify-between gap-4 mb-5">
          <div>
            <span class="inline-block text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mr-2"
              :class="s.type === 'featured' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'">
              {{ s.type === 'featured' ? 'Featured' : 'Most Viewed' }}
            </span>
          </div>
          <label class="flex items-center gap-2 cursor-pointer shrink-0">
            <input type="checkbox" :checked="s.is_active"
              @change="toggle(s)"
              class="w-4 h-4 accent-indigo-600" />
            <span class="text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Label -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Section label</label>
            <input
              v-model="edits[s.type].label"
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Display name" />
          </div>

          <!-- Style -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Layout</label>
            <select v-model="edits[s.type].style"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="slider">Slider</option>
              <option value="grid">Grid</option>
            </select>
          </div>

          <!-- Items -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Items to show</label>
            <input
              v-model.number="edits[s.type].items"
              type="number" min="1" max="20"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <!-- Position -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Position</label>
            <input
              v-model.number="edits[s.type].position"
              type="number" min="0" max="999"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div class="flex items-center justify-between mt-4">
          <p v-if="errors[s.type]" class="text-sm text-red-600">{{ errors[s.type] }}</p>
          <p v-else-if="saved[s.type]" class="text-sm text-green-600">Saved</p>
          <span v-else />
          <button @click="save(s.type)"
            :disabled="saving[s.type]"
            class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ saving[s.type] ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { homepageSpecialApi } from '@/api/homepageSpecialApi'
import type { HomepageSpecial, HomepageStyle } from '@/types/category'

const specials = ref<HomepageSpecial[]>([])
const loading  = ref(true)

type EditState = { label: string; style: HomepageStyle; items: number; position: number }
const edits:  Record<string, EditState>  = reactive({})
const saving: Record<string, boolean>    = reactive({})
const errors: Record<string, string>     = reactive({})
const saved:  Record<string, boolean>    = reactive({})

onMounted(async () => {
  try {
    specials.value = await homepageSpecialApi.list()
    for (const s of specials.value) {
      edits[s.type]  = { label: s.label, style: s.style, items: s.items, position: s.position }
      saving[s.type] = false
      errors[s.type] = ''
      saved[s.type]  = false
    }
  } finally {
    loading.value = false
  }
})

async function toggle(s: HomepageSpecial) {
  try {
    const updated = await homepageSpecialApi.update(s.type, { is_active: !s.is_active })
    const idx = specials.value.findIndex(x => x.type === s.type)
    if (idx !== -1) specials.value[idx] = updated
  } catch {
    errors[s.type] = 'Failed to update.'
  }
}

async function save(type: string) {
  saving[type] = true
  errors[type] = ''
  saved[type]  = false
  try {
    const updated = await homepageSpecialApi.update(type, edits[type])
    const idx = specials.value.findIndex(x => x.type === type)
    if (idx !== -1) specials.value[idx] = updated
    saved[type] = true
    setTimeout(() => { saved[type] = false }, 2000)
  } catch {
    errors[type] = 'Failed to save.'
  } finally {
    saving[type] = false
  }
}
</script>
