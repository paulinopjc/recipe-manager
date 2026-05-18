<template>
  <div v-if="loading" class="flex justify-center py-12"><LoadingSpinner /></div>

  <div v-else-if="error" class="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
    {{ error }}
  </div>

  <div v-else-if="recipe" class="max-w-2xl mx-auto">
    <!-- Cover image -->
    <img v-if="recipe.cover_image_url" :src="recipe.cover_image_url" :alt="recipe.title"
      class="w-full h-64 object-cover rounded-lg mb-6" />

    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span v-if="recipe.difficulty"
            :class="difficultyClass"
            class="text-xs font-medium px-2 py-0.5 rounded-full capitalize">
            {{ recipe.difficulty }}
          </span>
          <span v-if="recipe.is_featured" class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Featured</span>
        </div>
        <h1 class="text-2xl font-semibold">{{ recipe.title }}</h1>
      </div>
      <div class="flex items-center gap-3 ml-4 shrink-0">
        <!-- Quick public toggle -->
        <button
          v-if="canEdit"
          @click="togglePublic"
          :disabled="toggling"
          :class="recipe.is_public
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
          class="text-xs font-medium px-2.5 py-1 rounded-full transition-colors disabled:opacity-50">
          {{ toggling ? '…' : (recipe.is_public ? 'Public' : 'Private') }}
        </button>
        <span v-else-if="recipe.is_public" class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Public</span>

        <!-- View on site -->
        <RouterLink
          :to="`/recipes/${recipe.id}`"
          target="_blank"
          :class="recipe.is_public
            ? 'text-emerald-600 hover:text-emerald-800'
            : 'text-gray-400 hover:text-gray-600'"
          class="text-sm flex items-center gap-1"
          :title="recipe.is_public ? 'View on public site' : 'Recipe is private — make it public first'">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View on site
        </RouterLink>

        <RouterLink v-if="canEdit"
          :to="`/${ADMIN_PREFIX}/recipes/${recipe.id}/edit`"
          class="text-sm text-indigo-600 hover:underline">
          Edit
        </RouterLink>
      </div>
    </div>

    <p v-if="recipe.description" class="text-gray-600 mb-4">{{ recipe.description }}</p>

    <!-- Meta row -->
    <div class="flex gap-6 text-sm text-gray-500 mb-6">
      <span v-if="recipe.prep_minutes">Prep: {{ recipe.prep_minutes }} min</span>
      <span v-if="recipe.cook_minutes">Cook: {{ recipe.cook_minutes }} min</span>
      <span v-if="totalMinutes" class="font-medium text-gray-700">Total: {{ totalMinutes }} min</span>
    </div>

    <!-- Video player -->
    <div v-if="recipe.video_url" class="mb-6">
      <VideoPlayer :url="recipe.video_url" :title="recipe.title" />
    </div>

    <!-- Servings scaler -->
    <div v-if="recipe.servings" class="mb-6 bg-indigo-50 rounded-lg p-4">
      <ServingSlider v-model="targetServings" :min="1" :max="20" />
      <p v-if="targetServings !== recipe.servings" class="text-xs text-gray-400 mt-2">
        Original: {{ recipe.servings }} servings
      </p>
    </div>

    <!-- Flat mode -->
    <template v-if="recipe.sections.length === 0">
      <section class="mb-6">
        <h2 class="text-lg font-semibold mb-3">Ingredients</h2>
        <ul class="space-y-1">
          <li v-for="ing in scaledIngredients" :key="ing.id" class="text-sm text-gray-700">
            {{ formatAmount(ing.amount) }} {{ ing.unit ?? '' }} {{ ing.name }}
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg font-semibold mb-3">Instructions</h2>
        <ol class="space-y-3 list-decimal list-inside">
          <li v-for="step in recipe.instructions" :key="step.id" class="text-sm text-gray-700">
            {{ step.text }}
          </li>
        </ol>
      </section>
    </template>

    <!-- Sectioned mode -->
    <template v-else>
      <div v-for="section in recipe.sections" :key="section.id" class="mb-8">
        <h2 class="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
          {{ section.name }}
        </h2>
        <section class="mb-4">
          <h3 class="text-sm font-semibold text-gray-600 mb-2">Ingredients</h3>
          <ul class="space-y-1">
            <li v-for="ing in scaledSectionIngredients(section)" :key="ing.id" class="text-sm text-gray-700">
              {{ formatAmount(ing.amount) }} {{ ing.unit ?? '' }} {{ ing.name }}
            </li>
          </ul>
        </section>
        <section>
          <h3 class="text-sm font-semibold text-gray-600 mb-2">Instructions</h3>
          <ol class="space-y-2 list-decimal list-inside">
            <li v-for="step in section.instructions" :key="step.id" class="text-sm text-gray-700">
              {{ step.text }}
            </li>
          </ol>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { recipeApi } from '@/api/recipeApi'
import type { Recipe, Ingredient, RecipeSection } from '@/types/recipe'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import VideoPlayer from '@/components/shared/VideoPlayer.vue'
import ServingSlider from '@/components/shared/ServingSlider.vue'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_PREFIX } from '@/config'

const auth = useAuthStore()

const route          = useRoute()
const recipe         = ref<Recipe | null>(null)
const loading        = ref(true)
const error          = ref<string | null>(null)
const targetServings = ref(1)
const toggling       = ref(false)

onMounted(async () => {
  try {
    recipe.value = await recipeApi.find(Number(route.params.id))
    targetServings.value = recipe.value.servings ?? 1
  } catch {
    error.value = 'Recipe not found.'
  } finally {
    loading.value = false
  }
})

async function togglePublic() {
  if (!recipe.value) return
  toggling.value = true
  try {
    recipe.value = await recipeApi.update(recipe.value.id, { is_public: !recipe.value.is_public })
  } finally {
    toggling.value = false
  }
}

function scale(ing: Ingredient): Ingredient {
  const base = recipe.value?.servings
  if (!base || base === 0) return ing
  const multiplier = targetServings.value / base
  return { ...ing, amount: Math.round(ing.amount * multiplier * 100) / 100 }
}

const scaledIngredients = computed(() =>
  (recipe.value?.ingredients ?? []).map(scale)
)

function scaledSectionIngredients(section: RecipeSection): Ingredient[] {
  return section.ingredients.map(scale)
}

function formatAmount(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

const totalMinutes = computed(() => {
  const prep = recipe.value?.prep_minutes ?? 0
  const cook = recipe.value?.cook_minutes ?? 0
  return prep + cook || null
})

const canEdit = computed(() =>
  !!recipe.value && (auth.isAdmin || auth.user?.id === recipe.value.user_id)
)

const difficultyClass = computed(() => ({
  'bg-green-100 text-green-700': recipe.value?.difficulty === 'easy',
  'bg-yellow-100 text-yellow-700': recipe.value?.difficulty === 'medium',
  'bg-red-100 text-red-700': recipe.value?.difficulty === 'hard',
}))
</script>
