<template>
  <div @click="router.push(`/recipes/${recipe.slug}`)" role="link" tabindex="0"
    @keydown.enter="router.push(`/recipes/${recipe.slug}`)"
    class="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
    <!-- Cover image -->
    <div class="relative h-48 bg-gray-100 overflow-hidden">
      <img v-if="recipe.cover_image_url"
        :src="recipe.cover_image_url" :alt="recipe.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <!-- Difficulty badge -->
      <span v-if="recipe.difficulty"
        :class="difficultyClass"
        class="absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
        {{ recipe.difficulty }}
      </span>
    </div>

    <!-- Card body -->
    <div class="p-4">
      <h3 class="font-semibold text-gray-900 truncate">{{ recipe.title }}</h3>

      <!-- Category chips (first 2 + overflow count) -->
      <div v-if="recipe.categories?.length" class="flex flex-wrap gap-1 mt-1.5" @click.stop>
        <RouterLink
          v-for="cat in recipe.categories.slice(0, 2)"
          :key="cat.id"
          :to="`/recipes/category/${cat.slug}`"
          class="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
          {{ cat.name }}
        </RouterLink>
        <span v-if="recipe.categories.length > 2"
          class="text-xs text-gray-400">
          +{{ recipe.categories.length - 2 }} more
        </span>
      </div>

      <p v-if="recipe.description" class="text-sm text-gray-500 mt-1">
        {{ truncatedDescription }}
      </p>
      <!-- Time badge -->
      <div v-if="totalMinutes" class="mt-3 flex items-center gap-1 text-xs text-gray-400">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ totalMinutes }} min
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Recipe } from '@/types/recipe'

const props = defineProps<{ recipe: Recipe }>()
const router = useRouter()

const truncatedDescription = computed(() => {
  const d = props.recipe.description ?? ''
  return d.length > 30 ? d.slice(0, 30) + '...' : d
})

const totalMinutes = computed(() => {
  const prep = props.recipe.prep_minutes ?? 0
  const cook = props.recipe.cook_minutes ?? 0
  return prep + cook || null
})

const difficultyClass = computed(() => ({
  'bg-green-100 text-green-700': props.recipe.difficulty === 'easy',
  'bg-yellow-100 text-yellow-700': props.recipe.difficulty === 'medium',
  'bg-red-100 text-red-700': props.recipe.difficulty === 'hard',
}))
</script>
