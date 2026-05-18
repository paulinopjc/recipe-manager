<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-5">
        {{ initial ? 'Edit nav item' : 'New nav item' }}
      </h2>

      <form @submit.prevent="submit" class="space-y-4">
        <!-- Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select v-model="form.type" @change="onTypeChange"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="category">Category</option>
            <option value="recipe">Recipe</option>
            <option value="custom">Custom URL</option>
          </select>
        </div>

        <!-- Category picker -->
        <div v-if="form.type === 'category'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select v-model="form.category_id" @change="onCategoryChange"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option :value="null">— Select category —</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <!-- Recipe ID -->
        <div v-if="form.type === 'recipe'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Recipe ID</label>
          <input v-model.number="form.recipe_id" type="number" min="1"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter recipe ID" />
        </div>

        <!-- Custom URL -->
        <div v-if="form.type === 'custom'">
          <label class="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input v-model="form.url" type="text"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="/path or https://..." />
        </div>

        <!-- Label -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input v-model="form.label" type="text" required maxlength="100"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Display text in menu" />
        </div>

        <!-- Parent -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Parent (dropdown)</label>
          <select v-model="form.parent_id"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option :value="null">— No parent (top-level) —</option>
            <option v-for="p in topLevelItems" :key="p.id" :value="p.id">{{ p.label }}</option>
          </select>
        </div>

        <!-- Position + Active -->
        <div class="flex gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input v-model.number="form.position" type="number" min="0"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div class="flex items-end pb-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="form.is_active" type="checkbox"
                class="w-4 h-4 accent-indigo-600" />
              <span class="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="$emit('close')"
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button type="submit" :disabled="saving"
            class="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { navItemApi } from '@/api/navItemApi'
import { categoryApi } from '@/api/categoryApi'
import type { NavItem, NavItemType } from '@/types/navItem'
import type { Category } from '@/types/category'

const props = defineProps<{
  initial: NavItem | null
  presetParentId: number | null
  allItems: NavItem[]
}>()
const emit = defineEmits<{ (e: 'save'): void; (e: 'close'): void }>()

const saving = ref(false)
const error  = ref<string | null>(null)
const categories = ref<Category[]>([])

const form = reactive({
  type:        (props.initial?.type ?? 'custom') as NavItemType,
  label:       props.initial?.label ?? '',
  parent_id:   props.initial?.parent_id ?? props.presetParentId ?? null,
  category_id: props.initial?.category_id ?? null,
  recipe_id:   props.initial?.recipe_id ?? null,
  url:         props.initial?.url ?? '',
  position:    props.initial?.position ?? 0,
  is_active:   props.initial?.is_active ?? true,
})

// Only top-level items can be parents (no nesting beyond 2 levels)
const topLevelItems = computed(() =>
  props.allItems.filter(i => i.parent_id === null && i.id !== props.initial?.id)
)

onMounted(async () => {
  const all = await categoryApi.list()
  categories.value = all.filter(c => !c.is_home && c.is_active)
})

function onTypeChange() {
  form.category_id = null
  form.recipe_id   = null
  form.url         = ''
}

function onCategoryChange() {
  const cat = categories.value.find(c => c.id === form.category_id)
  if (cat && !form.label) form.label = cat.name
}

async function submit() {
  saving.value = true
  error.value  = null
  try {
    const payload = {
      type:        form.type,
      label:       form.label,
      parent_id:   form.parent_id,
      category_id: form.type === 'category' ? form.category_id : null,
      recipe_id:   form.type === 'recipe'   ? form.recipe_id   : null,
      url:         form.type === 'custom'   ? form.url || null  : null,
      position:    form.position,
      is_active:   form.is_active,
    }
    if (props.initial) await navItemApi.update(props.initial.id, payload)
    else               await navItemApi.create(payload)
    emit('save')
  } catch {
    error.value = 'Failed to save. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>
