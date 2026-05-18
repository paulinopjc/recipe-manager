<template>
  <form @submit.prevent="onSubmit" class="space-y-5">
    <div v-if="error" class="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Title -->
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">Title *</label>
      <input v-model="form.title" type="text" required maxlength="255"
        class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
    </div>

    <!-- Description -->
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">Description</label>
      <textarea v-model="form.description" rows="3" maxlength="2000"
        class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
    </div>

    <!-- Servings / prep / cook / difficulty -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Servings</label>
        <input v-model.number="form.servings" type="number" min="1" max="100"
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Prep (min)</label>
        <input v-model.number="form.prep_minutes" type="number" min="0" max="1440"
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Cook (min)</label>
        <input v-model.number="form.cook_minutes" type="number" min="0" max="1440"
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">Difficulty</label>
        <select v-model="form.difficulty" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
          <option :value="null">—</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </div>

    <!-- Cover image upload -->
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">Cover image</label>
      <input type="file" accept="image/*" @change="onImageSelect"
        class="text-sm text-gray-600" />
      <div v-if="imageUploading" class="text-xs text-gray-400 mt-1">Uploading...</div>
      <div v-if="imageError" class="text-xs text-red-600 mt-1">{{ imageError }}</div>
      <img v-if="imagePreview" :src="imagePreview" alt="Cover preview"
        class="mt-2 h-32 w-auto rounded object-cover" />
    </div>

    <!-- Video URL -->
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">
        Video URL <span class="text-gray-400 font-normal">(YouTube or Vimeo)</span>
      </label>
      <input v-model="form.video_url" type="url" maxlength="2000" placeholder="https://youtube.com/watch?v=..."
        class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
    </div>

    <!-- Visibility -->
    <div class="flex items-center gap-6">
      <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input v-model="form.is_public" type="checkbox" class="rounded" />
        Public (visible on website)
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input v-model="form.is_featured" type="checkbox" class="rounded" />
        Featured
      </label>
    </div>

    <!-- Categories -->
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-2">Categories</label>
      <div v-if="categoriesLoading" class="text-xs text-gray-400">Loading categories...</div>
      <div v-else class="border border-gray-200 rounded max-h-48 overflow-y-auto p-2 space-y-1">
        <template v-for="cat in categoryTree" :key="cat.id">
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
            <input type="checkbox" :value="cat.id" v-model="category_ids" class="rounded" />
            <span class="font-medium">{{ cat.name }}</span>
          </label>
          <template v-for="child in cat.children" :key="child.id">
            <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded pl-5">
              <input type="checkbox" :value="child.id" v-model="category_ids" class="rounded" />
              <span>{{ child.name }}</span>
            </label>
            <label v-for="grandchild in child.children" :key="grandchild.id"
              class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded pl-9">
              <input type="checkbox" :value="grandchild.id" v-model="category_ids" class="rounded" />
              <span>{{ grandchild.name }}</span>
            </label>
          </template>
        </template>
      </div>
    </div>

    <!-- ── FLAT mode (1 dish) ────────────────────────────────────────────── -->
    <template v-if="!useSections">
      <!-- Ingredients -->
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-2">Ingredients *</label>
        <div v-for="(ing, i) in flatIngredients" :key="i" class="flex gap-2 mb-2 items-center">
          <input v-model="ing.amount" type="number" step="0.01" min="0.01" placeholder="Qty"
            class="w-20 border border-gray-300 rounded px-2 py-1 text-sm" required />
          <input v-model="ing.unit" type="text" placeholder="Unit" maxlength="50"
            class="w-20 border border-gray-300 rounded px-2 py-1 text-sm" />
          <input v-model="ing.name" type="text" placeholder="Ingredient" maxlength="255"
            class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" required />
          <button type="button" @click="flatIngredients.splice(i, 1)"
            class="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
        </div>
        <button type="button" @click="flatIngredients.push({ name: '', amount: 0, unit: undefined })"
          class="text-sm text-indigo-600 hover:underline">+ Add ingredient</button>
      </div>

      <!-- Instructions -->
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-2">Instructions *</label>
        <div v-for="(_, i) in flatInstructions" :key="i" class="flex gap-2 mb-2 items-start">
          <span class="text-xs text-gray-400 pt-2 w-5 shrink-0">{{ i + 1 }}.</span>
          <textarea v-model="flatInstructions[i]" rows="2" maxlength="2000"
            class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" required />
          <button type="button" @click="flatInstructions.splice(i, 1)"
            class="text-red-400 hover:text-red-600 text-lg leading-none pt-1">&times;</button>
        </div>
        <button type="button" @click="flatInstructions.push('')"
          class="text-sm text-indigo-600 hover:underline">+ Add step</button>
      </div>

      <button type="button" @click="enableSections"
        class="text-sm text-indigo-600 hover:underline">
        + Split into multiple dishes/sections
      </button>
    </template>

    <!-- ── SECTIONED mode (multiple dishes) ──────────────────────────────── -->
    <template v-else>
      <div v-for="(section, si) in sections" :key="si"
        class="border border-gray-200 rounded-lg p-4 space-y-4">
        <div class="flex items-center justify-between">
          <input v-model="section.name" type="text" placeholder="Section name (e.g. Ugali)"
            maxlength="100" required
            class="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm font-medium" />
          <button type="button" @click="removeSection(si)"
            :disabled="sections.length <= 2"
            class="ml-3 text-red-400 hover:text-red-600 text-sm disabled:opacity-30">
            Remove
          </button>
        </div>

        <!-- Section ingredients -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Ingredients *</label>
          <div v-for="(ing, i) in section.ingredients" :key="i" class="flex gap-2 mb-2 items-center">
            <input v-model="ing.amount" type="number" step="0.01" min="0.01" placeholder="Qty"
              class="w-20 border border-gray-300 rounded px-2 py-1 text-sm" required />
            <input v-model="ing.unit" type="text" placeholder="Unit" maxlength="50"
              class="w-20 border border-gray-300 rounded px-2 py-1 text-sm" />
            <input v-model="ing.name" type="text" placeholder="Ingredient" maxlength="255"
              class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" required />
            <button type="button" @click="section.ingredients.splice(i, 1)"
              class="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
          </div>
          <button type="button"
            @click="section.ingredients.push({ name: '', amount: 0, unit: undefined })"
            class="text-sm text-indigo-600 hover:underline">+ Add ingredient</button>
        </div>

        <!-- Section instructions -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Instructions *</label>
          <div v-for="(_, i) in section.instructions" :key="i" class="flex gap-2 mb-2 items-start">
            <span class="text-xs text-gray-400 pt-2 w-5 shrink-0">{{ i + 1 }}.</span>
            <textarea v-model="section.instructions[i]" rows="2" maxlength="2000"
              class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" required />
            <button type="button" @click="section.instructions.splice(i, 1)"
              class="text-red-400 hover:text-red-600 text-lg leading-none pt-1">&times;</button>
          </div>
          <button type="button" @click="section.instructions.push('')"
            class="text-sm text-indigo-600 hover:underline">+ Add step</button>
        </div>
      </div>

      <div class="flex gap-4">
        <button type="button" @click="sections.push({ name: '', ingredients: [{ name: '', amount: 0 }], instructions: [''] })"
          class="text-sm text-indigo-600 hover:underline">+ Add section</button>
        <button type="button" @click="disableSections"
          class="text-sm text-gray-400 hover:underline">Use flat mode instead</button>
      </div>
    </template>

    <button type="submit" :disabled="saving || imageUploading"
      class="bg-indigo-600 text-white text-sm px-5 py-2 rounded hover:bg-indigo-700 disabled:opacity-50">
      {{ saving ? 'Saving...' : 'Save recipe' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { uploadApi } from '@/api/uploadApi'
import { categoryApi } from '@/api/categoryApi'
import type { Recipe, CreateRecipeInput, IngredientInput, RecipeSectionInput } from '@/types/recipe'
import type { Category } from '@/types/category'

const props = defineProps<{
  initial?: Recipe
  saving: boolean
  error: string | null
}>()

const emit = defineEmits<{
  submit: [input: CreateRecipeInput]
}>()

// ── Flat form fields ──────────────────────────────────────────────────────────
const form = reactive({
  title:           props.initial?.title ?? '',
  description:     props.initial?.description ?? null,
  servings:        props.initial?.servings ?? null,
  prep_minutes:    props.initial?.prep_minutes ?? null,
  cook_minutes:    props.initial?.cook_minutes ?? null,
  cover_image_url: props.initial?.cover_image_url ?? null,
  video_url:       props.initial?.video_url ?? null,
  is_public:       props.initial?.is_public   ?? false,
  is_featured:     props.initial?.is_featured ?? false,
  difficulty:      props.initial?.difficulty ?? null,
})

// ── Categories ────────────────────────────────────────────────────────────────
const category_ids = ref<number[]>(props.initial?.categories?.map(c => c.id) ?? [])
const categoriesLoading = ref(false)
const allCategories = ref<Category[]>([])

const categoryTree = computed(() => {
  const roots: (Category & { children: Category[] })[] = []
  const map = new Map<number, Category & { children: Category[] }>()
  for (const c of allCategories.value) {
    map.set(c.id, { ...c, children: [] })
  }
  for (const c of map.values()) {
    if (c.parent_id === null) {
      roots.push(c)
    } else {
      map.get(c.parent_id)?.children.push(c)
    }
  }
  return roots
})

onMounted(async () => {
  categoriesLoading.value = true
  try {
    const all = await categoryApi.list()
    allCategories.value = all.filter(c => !c.is_home)
  } catch {
    // silently ignore — categories are optional
  } finally {
    categoriesLoading.value = false
  }
})

// ── Mode detection ────────────────────────────────────────────────────────────
const useSections = ref((props.initial?.sections?.length ?? 0) >= 2)

// ── Flat arrays ───────────────────────────────────────────────────────────────
const flatIngredients = reactive<IngredientInput[]>(
  useSections.value
    ? [{ name: '', amount: 0 }]
    : props.initial?.ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit ?? undefined }))
      ?? [{ name: '', amount: 0, unit: undefined }]
)

const flatInstructions = reactive<string[]>(
  useSections.value
    ? ['']
    : props.initial?.instructions.map(s => s.text) ?? ['']
)

// ── Sections ──────────────────────────────────────────────────────────────────
const sections = reactive<RecipeSectionInput[]>(
  useSections.value && props.initial?.sections
    ? props.initial.sections.map(s => ({
        name: s.name,
        ingredients: s.ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit ?? undefined })),
        instructions: s.instructions.map(i => i.text),
      }))
    : [
        { name: '', ingredients: [{ name: '', amount: 0 }], instructions: [''] },
        { name: '', ingredients: [{ name: '', amount: 0 }], instructions: [''] },
      ]
)

function enableSections() {
  useSections.value = true
}

function disableSections() {
  useSections.value = false
}

function removeSection(i: number) {
  if (sections.length > 2) sections.splice(i, 1)
}

// ── Cover image upload ────────────────────────────────────────────────────────
const imagePreview   = ref<string | null>(props.initial?.cover_image_url ?? null)
const imageUploading = ref(false)
const imageError     = ref<string | null>(null)

async function onImageSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  imagePreview.value   = URL.createObjectURL(file)
  imageUploading.value = true
  imageError.value     = null
  try {
    const { url } = await uploadApi.coverImage(file)
    form.cover_image_url = url
    imagePreview.value   = url
  } catch {
    imageError.value     = 'Image upload failed. Try again.'
    imagePreview.value   = null
    form.cover_image_url = null
  } finally {
    imageUploading.value = false
  }
}

// ── Submit ────────────────────────────────────────────────────────────────────
function onSubmit() {
  const base: CreateRecipeInput = {
    title:           form.title,
    description:     form.description,
    servings:        form.servings,
    prep_minutes:    form.prep_minutes,
    cook_minutes:    form.cook_minutes,
    cover_image_url: form.cover_image_url,
    video_url:       form.video_url || null,
    is_public:       form.is_public,
    is_featured:     form.is_featured,
    difficulty:      form.difficulty,
    category_ids:    [...category_ids.value],
  }

  if (useSections.value) {
    emit('submit', { ...base, sections: sections.map(s => ({ ...s })) })
  } else {
    emit('submit', {
      ...base,
      ingredients:  flatIngredients.map(i => ({ ...i })),
      instructions: [...flatInstructions],
    })
  }
}
</script>
