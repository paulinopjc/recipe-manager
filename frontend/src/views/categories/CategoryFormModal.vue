<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 class="font-semibold text-gray-900">{{ initial ? 'Edit category' : 'New category' }}</h2>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>

      <form @submit.prevent="onSubmit" class="px-6 py-5 space-y-4">
        <div v-if="error" class="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">
          {{ error }}
        </div>

        <!-- Parent -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Parent category</label>
          <select v-model="form.parent_id" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            <option :value="null">— None (top-level) —</option>
            <template v-for="cat in selectableParents" :key="cat.id">
              <option :value="cat.id">{{ cat._indent }}{{ cat.name }}</option>
            </template>
          </select>
        </div>

        <!-- Name + slug -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input v-model="form.name" type="text" required maxlength="100" @input="onNameInput"
              class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Slug *</label>
            <input v-model="form.slug" type="text" required maxlength="100"
              pattern="[a-z0-9\-]+"
              class="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono" />
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea v-model="form.description" rows="2" maxlength="2000"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>

        <!-- Image URL -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
          <input v-model="form.image_url" type="url" maxlength="2000"
            placeholder="https://..."
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>

        <!-- Flags -->
        <div class="flex flex-wrap gap-5">
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input v-model="form.is_active" type="checkbox" class="rounded" />
            Active
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input v-model="form.show_on_homepage" type="checkbox" class="rounded" />
            Show on homepage
          </label>
        </div>

        <!-- Homepage options (conditional) -->
        <template v-if="form.show_on_homepage">
          <div class="grid grid-cols-3 gap-3 pl-1 border-l-2 border-purple-200">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Style</label>
              <select v-model="form.homepage_style" class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="grid">Grid</option>
                <option value="slider">Slider</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Items</label>
              <input v-model.number="form.homepage_items" type="number" min="1" max="20"
                class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Position</label>
              <input v-model.number="form.homepage_position" type="number" min="0" max="100"
                class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        </template>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="$emit('close')"
            class="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
            Cancel
          </button>
          <button type="submit" :disabled="saving"
            class="bg-indigo-600 text-white text-sm px-5 py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { categoryApi } from '@/api/categoryApi'
import type { Category } from '@/types/category'

const props = defineProps<{
  initial: Category | null
  allCategories: Category[]
}>()

const emit = defineEmits<{ save: []; close: [] }>()

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const saving = ref(false)
const error  = ref<string | null>(null)
let slugManuallyEdited = !!props.initial

const form = reactive({
  parent_id:         props.initial?.parent_id ?? null as number | null,
  name:              props.initial?.name ?? '',
  slug:              props.initial?.slug ?? '',
  description:       props.initial?.description ?? null as string | null,
  image_url:         props.initial?.image_url ?? null as string | null,
  is_active:         props.initial?.is_active ?? true,
  show_on_homepage:  props.initial?.show_on_homepage ?? false,
  homepage_style:    props.initial?.homepage_style ?? 'grid' as 'grid' | 'slider',
  homepage_items:    props.initial?.homepage_items ?? 6,
  homepage_position: props.initial?.homepage_position ?? 0,
})

function onNameInput() {
  if (!slugManuallyEdited) {
    form.slug = slugify(form.name)
  }
}

// Flat list for parent select, rendered with indent markers, excluding self and descendants
type SelectableParent = Category & { _indent: string }

const selectableParents = computed<SelectableParent[]>(() => {
  // IDs to exclude: self + all descendants of self
  const excluded = new Set<number>()
  if (props.initial) {
    excluded.add(props.initial.id)
    // collect descendants
    const queue = [props.initial.id]
    while (queue.length) {
      const id = queue.shift()!
      for (const c of props.allCategories) {
        if (c.parent_id === id) { excluded.add(c.id); queue.push(c.id) }
      }
    }
  }

  // Build ordered list with depth
  const result: SelectableParent[] = []
  function walk(parentId: number | null, depth: number) {
    for (const c of props.allCategories) {
      if (c.parent_id === parentId && !excluded.has(c.id) && !c.is_home) {
        result.push({ ...c, _indent: '·'.repeat(depth * 2) + (depth > 0 ? ' ' : '') })
        walk(c.id, depth + 1)
      }
    }
  }
  walk(null, 0)
  return result
})

async function onSubmit() {
  saving.value = true
  error.value  = null
  try {
    const payload = {
      parent_id:         form.parent_id,
      name:              form.name,
      slug:              form.slug,
      description:       form.description || null,
      image_url:         form.image_url || null,
      is_active:         form.is_active,
      show_on_homepage:  form.show_on_homepage,
      homepage_style:    form.homepage_style,
      homepage_items:    form.homepage_items,
      homepage_position: form.homepage_position,
    }
    if (props.initial) {
      await categoryApi.update(props.initial.id, payload)
    } else {
      await categoryApi.create(payload)
    }
    emit('save')
  } catch (e: any) {
    error.value = e.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>
