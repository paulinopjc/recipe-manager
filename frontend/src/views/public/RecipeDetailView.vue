<template>
  <PublicLayout>
    <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner /></div>

    <div v-else-if="error" class="max-w-2xl mx-auto px-[15px] py-12 text-center text-gray-500">
      {{ error }}
    </div>

    <template v-else-if="recipe">
      <!-- Main detail content — narrow column for readability -->
      <div class="max-w-3xl mx-auto px-[15px] py-12">
        <!-- Cover image -->
        <img v-if="recipe.cover_image_url"
          :src="recipe.cover_image_url" :alt="recipe.title"
          class="w-full h-48 sm:h-72 object-cover rounded-2xl mb-8" />

        <!-- Title + meta -->
        <div class="mb-6">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span v-if="recipe.difficulty"
              :class="difficultyClass"
              class="text-xs font-medium px-2.5 py-1 rounded-full capitalize">
              {{ recipe.difficulty }}
            </span>
            <!-- Featured badge -->
            <span v-if="recipe.is_featured"
              class="bg-yellow-100 text-yellow-700 text-xs font-medium px-2.5 py-1 rounded-full capitalize">
              Featured
            </span>
            <!-- Category chips -->
            <RouterLink
              v-for="cat in recipe.categories"
              :key="cat.id"
              :to="`/recipes/category/${cat.slug}`"
              class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
              {{ cat.name }}
            </RouterLink>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{{ recipe.title }}</h1>
          <p v-if="recipe.description" class="text-gray-600 text-lg leading-relaxed">
            {{ recipe.description }}
          </p>
        </div>

        <!-- Time / servings row -->
        <div class="flex flex-wrap gap-6 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
          <span v-if="recipe.prep_minutes" class="flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Prep {{ recipe.prep_minutes }} min
          </span>
          <span v-if="recipe.cook_minutes" class="flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            Cook {{ recipe.cook_minutes }} min
          </span>
          <span v-if="totalMinutes" class="font-medium text-gray-700">
            Total {{ totalMinutes }} min
          </span>
        </div>

        <!-- Serving slider -->
        <div v-if="recipe.servings" class="mb-8 bg-indigo-50 rounded-xl p-4">
          <ServingSlider v-model="targetServings" :min="1" :max="20" />
          <p v-if="targetServings !== recipe.servings" class="text-xs text-gray-400 mt-2">
            Original recipe serves {{ recipe.servings }}
          </p>
        </div>

        <!-- Video -->
        <div v-if="recipe.video_url" class="mb-10">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Video</h2>
          <VideoPlayer :url="recipe.video_url" :title="recipe.title" />
        </div>

        <!-- Flat ingredients (no sections) -->
        <template v-if="(recipe.sections ?? []).length === 0">
          <section class="mb-10">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Ingredients</h2>
            <ul class="space-y-2">
              <li v-for="ing in scaledIngredients" :key="ing.id"
                class="flex items-start gap-2 text-sm text-gray-700">
                <span class="mt-0.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2" />
                <span>{{ formatAmount(ing.amount) }} {{ ing.unit ?? '' }} {{ ing.name }}</span>
              </li>
            </ul>
          </section>

          <section class="mb-10">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Instructions</h2>
            <ol class="space-y-4">
              <li v-for="(step, i) in recipe.instructions" :key="step.id"
                class="flex gap-4 text-sm text-gray-700">
                <span class="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  {{ i + 1 }}
                </span>
                <p class="pt-0.5 leading-relaxed">{{ step.text }}</p>
              </li>
            </ol>
          </section>
        </template>

        <!-- Sectioned (multi-dish) -->
        <template v-else>
          <div v-for="section in recipe.sections" :key="section.id" class="mb-12">
            <h2 class="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
              {{ section.name }}
            </h2>

            <section class="mb-6">
              <h3 class="text-base font-semibold text-gray-700 mb-3">Ingredients</h3>
              <ul class="space-y-2">
                <li v-for="ing in scaledSectionIngredients(section)" :key="ing.id"
                  class="flex items-start gap-2 text-sm text-gray-700">
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-2" />
                  <span>{{ formatAmount(ing.amount) }} {{ ing.unit ?? '' }} {{ ing.name }}</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 class="text-base font-semibold text-gray-700 mb-3">Instructions</h3>
              <ol class="space-y-4">
                <li v-for="(step, i) in section.instructions" :key="step.id"
                  class="flex gap-4 text-sm text-gray-700">
                  <span class="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {{ i + 1 }}
                  </span>
                  <p class="pt-0.5 leading-relaxed">{{ step.text }}</p>
                </li>
              </ol>
            </section>
          </div>
        </template>

        <!-- Print -->
        <div class="mt-10 border-t border-gray-100 pt-6">
          <button @click="print"
            class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print recipe
          </button>
        </div>
      </div>

      <!-- You may also like — full width outside the narrow column -->
      <div v-if="recipe.similar && recipe.similar.length > 0" class="max-w-7xl mx-auto px-[15px] mt-14">
        <h2 class="text-xl font-bold text-gray-900 mb-5">You may also like</h2>
        <SliderRow>
          <div v-for="r in recipe.similar" :key="r.id" class="snap-start shrink-0 w-64">
            <RecipeCard :recipe="r" />
          </div>
        </SliderRow>
      </div>

      <!-- Most viewed — full width outside the narrow column -->
      <div v-if="mostViewed.length > 0" class="max-w-7xl mx-auto px-[15px] mt-14 pb-12">
        <h2 class="text-xl font-bold text-gray-900 mb-5">Most viewed</h2>
        <SliderRow>
          <div v-for="r in mostViewed" :key="r.id" class="snap-start shrink-0 w-64">
            <RecipeCard :recipe="r" />
          </div>
        </SliderRow>
      </div>
    </template>
  </PublicLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { publicApi } from '@/api/publicApi'
import type { Recipe, Ingredient, RecipeSection } from '@/types/recipe'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import VideoPlayer from '@/components/shared/VideoPlayer.vue'
import ServingSlider from '@/components/shared/ServingSlider.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import RecipeCard from '@/components/public/RecipeCard.vue'
import SliderRow from '@/components/shared/SliderRow.vue'

const route = useRoute()
const recipe      = ref<Recipe | null>(null)
const mostViewed  = ref<Recipe[]>([])
const loading     = ref(true)
const error       = ref<string | null>(null)
const targetServings = ref(1)

async function load(slug: string) {
  loading.value = true
  error.value   = null
  recipe.value  = null
  try {
    const [r, mv] = await Promise.all([
      publicApi.find(slug),
      publicApi.mostViewed(6),
    ])
    recipe.value     = r
    mostViewed.value = mv.filter(m => m.slug !== slug)
    targetServings.value = r.servings ?? 1
  } catch {
    error.value = 'Recipe not found.'
  } finally {
    loading.value = false
  }
}

onMounted(() => load(route.params.slug as string))
watch(() => route.params.slug, slug => { if (slug) load(slug as string) })

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

const difficultyClass = computed(() => ({
  'bg-green-100 text-green-700': recipe.value?.difficulty === 'easy',
  'bg-yellow-100 text-yellow-700': recipe.value?.difficulty === 'medium',
  'bg-red-100 text-red-700': recipe.value?.difficulty === 'hard',
}))

function print() {
  window.print()
}
</script>
