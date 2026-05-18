<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
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
            <option value="featured">Featured Recipes</option>
            <option value="most_viewed">Most Viewed</option>
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

        <!-- Category dropdown children selector -->
        <div v-if="form.type === 'category' && form.category_id && selectedCategoryChildren.length > 0 && form.parent_id === null">
          <label class="block text-sm font-medium text-gray-700 mb-2">Dropdown children</label>
          <div class="border border-gray-200 rounded-lg p-3 space-y-2 max-h-56 overflow-y-auto bg-gray-50">
            <template v-for="child in selectedCategoryChildren" :key="child.id">
              <!-- Immediate child row -->
              <div class="flex items-center gap-2">
                <input type="checkbox" :value="child.id" v-model="selectedChildIds"
                  class="rounded w-4 h-4 accent-indigo-600 shrink-0" />
                <span class="flex-1 text-sm text-gray-800 font-medium">{{ child.name }}</span>
                <div v-if="selectedChildIds.includes(child.id)" class="flex items-center gap-1">
                  <span class="text-xs text-gray-400">pos</span>
                  <input v-model.number="childPositions[child.id]" type="number" min="0"
                    class="w-14 border border-gray-300 rounded px-2 py-0.5 text-xs text-center" />
                </div>
              </div>
              <!-- Grandchildren (children of child) -->
              <template v-if="child.children && child.children.length > 0">
                <div v-for="grandchild in child.children" :key="grandchild.id"
                  class="flex items-center gap-2 pl-5">
                  <input type="checkbox" :value="grandchild.id" v-model="selectedChildIds"
                    class="rounded w-4 h-4 accent-indigo-600 shrink-0" />
                  <span class="flex-1 text-sm text-gray-700">{{ grandchild.name }}</span>
                  <div v-if="selectedChildIds.includes(grandchild.id)" class="flex items-center gap-1">
                    <span class="text-xs text-gray-400">pos</span>
                    <input v-model.number="childPositions[grandchild.id]" type="number" min="0"
                      class="w-14 border border-gray-300 rounded px-2 py-0.5 text-xs text-center" />
                  </div>
                </div>
              </template>
            </template>
          </div>
          <p class="text-xs text-gray-400 mt-1">Checked items appear in the dropdown. Set position for ordering.</p>
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

        <!-- Parent (only show when no children are being managed via the tree) -->
        <div v-if="!(form.type === 'category' && selectedCategoryChildren.length > 0)">
          <label class="block text-sm font-medium text-gray-700 mb-1">Parent (dropdown)</label>
          <select v-model="form.parent_id"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option :value="null">— No parent (top-level) —</option>
            <option v-for="p in topLevelItems" :key="p.id" :value="p.id">
              {{ p.parent_id !== null ? '  · ' : '' }}{{ p.label }}
            </option>
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

// Children selection state (for category type with sub-categories)
const selectedChildIds = ref<number[]>([])
const childPositions   = ref<Record<number, number>>({})

// Items that can be parents: top-level and level-2 items (supports 3 levels of nesting)
// Exclude the item being edited and any of its descendants to avoid cycles
const topLevelItems = computed(() => {
  const editId = props.initial?.id
  const descendantIds = new Set<number>()
  if (editId !== undefined) {
    // collect all descendants of the item being edited
    const queue = [editId]
    while (queue.length) {
      const id = queue.shift()!
      for (const i of props.allItems) {
        if (i.parent_id === id) { descendantIds.add(i.id); queue.push(i.id) }
      }
    }
  }
  return props.allItems.filter(i =>
    i.id !== editId &&
    !descendantIds.has(i.id) &&
    // allow top-level and level-2 items (those whose parent is top-level)
    (i.parent_id === null || props.allItems.find(p => p.id === i.parent_id)?.parent_id === null)
  )
})

// Build a map of category id → category with children populated
const catMap = computed(() => {
  const map = new Map<number, Category>()
  for (const c of categories.value) map.set(c.id, { ...c, children: [] })
  for (const c of categories.value) {
    if (c.parent_id !== null && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(map.get(c.id)!)
    }
  }
  return map
})

// Immediate children (with their own children nested) of the selected category
const selectedCategoryChildren = computed(() => {
  if (!form.category_id) return []
  return catMap.value.get(form.category_id)?.children ?? []
})

onMounted(async () => {
  const all = await categoryApi.list()
  categories.value = all.filter(c => !c.is_home && c.is_active)

  // Pre-populate children selection when editing
  if (props.initial) {
    const existingChildren = props.allItems.filter(
      i => i.parent_id === props.initial!.id && i.type === 'category' && i.category_id !== null
    )
    selectedChildIds.value = existingChildren.map(c => c.category_id!)
    existingChildren.forEach(c => { childPositions.value[c.category_id!] = c.position })
  }
})

function onTypeChange() {
  form.category_id = null
  form.recipe_id   = null
  form.url         = ''
  selectedChildIds.value = []
  childPositions.value = {}
  if (form.type === 'featured'    && !form.label) form.label = 'Featured Recipes'
  if (form.type === 'most_viewed' && !form.label) form.label = 'Most Viewed'
}

function onCategoryChange() {
  const cat = categories.value.find(c => c.id === form.category_id)
  if (cat && !form.label) form.label = cat.name
  // Reset child selection when category changes
  selectedChildIds.value = []
  childPositions.value = {}
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

    let savedId: number
    if (props.initial) {
      await navItemApi.update(props.initial.id, payload)
      savedId = props.initial.id
    } else {
      const created = await navItemApi.create(payload)
      savedId = created.id
    }

    // Sync category-type children if we're managing a category with children
    if (form.type === 'category' && selectedCategoryChildren.value.length > 0) {
      // Find all category-type children currently linked to this nav item
      const existingChildren = props.allItems.filter(
        i => i.parent_id === savedId && i.type === 'category' && i.category_id !== null
      )

      // Create or update selected children
      for (const catId of selectedChildIds.value) {
        const pos = childPositions.value[catId] ?? 0
        const cat = categories.value.find(c => c.id === catId)
        const existing = existingChildren.find(e => e.category_id === catId)
        if (existing) {
          if (existing.position !== pos) {
            await navItemApi.update(existing.id, { position: pos })
          }
        } else {
          await navItemApi.create({
            parent_id:   savedId,
            type:        'category',
            category_id: catId,
            label:       cat?.name ?? '',
            position:    pos,
            is_active:   true,
          })
        }
      }

      // Remove deselected children
      for (const existing of existingChildren) {
        if (!selectedChildIds.value.includes(existing.category_id!)) {
          await navItemApi.remove(existing.id)
        }
      }
    }

    emit('save')
  } catch {
    error.value = 'Failed to save. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>
