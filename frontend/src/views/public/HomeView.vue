<template>
  <PublicLayout>
    <!-- Hero -->
    <section class="bg-indigo-700 text-white py-20 px-[15px] text-center">
      <h1 class="text-4xl md:text-5xl font-bold mb-4">Discover Great Recipes</h1>
      <p class="text-indigo-200 text-lg mb-8 max-w-xl mx-auto">
        Browse our collection of home-cooked meals, from quick weeknight dinners to weekend feasts.
      </p>
      <RouterLink to="/recipes"
        class="inline-block bg-white text-indigo-700 font-semibold px-8 py-3 rounded-full hover:bg-indigo-50 transition-colors">
        Browse Recipes
      </RouterLink>
    </section>

    <!-- Dynamic homepage sections -->
    <div v-if="loading" class="flex justify-center py-16"><LoadingSpinner /></div>

    <template v-else>
      <section
        v-for="section in sections"
        :key="section.label"
        class="max-w-7xl mx-auto px-[15px] py-12">

        <!-- Section header -->
        <div class="flex items-center justify-between mb-6">
          <RouterLink v-if="section.view_all_url" :to="section.view_all_url"
            class="text-2xl font-bold text-gray-900 hover:text-indigo-600 transition-colors">
            {{ section.label }}
          </RouterLink>
          <span v-else class="text-2xl font-bold text-gray-900">{{ section.label }}</span>
          <RouterLink v-if="section.view_all_url" :to="section.view_all_url"
            class="text-sm text-indigo-600 hover:underline">
            View all →
          </RouterLink>
        </div>

        <!-- Grid layout -->
        <div v-if="section.style === 'grid'" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <RecipeCard v-for="r in section.recipes" :key="r.id" :recipe="r" />
        </div>

        <!-- Slider layout -->
        <SliderRow v-else>
          <div v-for="r in section.recipes" :key="r.id"
            class="snap-start shrink-0 w-64">
            <RecipeCard :recipe="r" />
          </div>
        </SliderRow>
      </section>

      <!-- Error state -->
      <section v-if="error" class="max-w-7xl mx-auto px-[15px] py-14 text-center text-red-400">
        {{ error }}
      </section>

      <!-- Fallback if no homepage sections configured -->
      <section v-else-if="sections.length === 0" class="max-w-7xl mx-auto px-[15px] py-14 text-center text-gray-400">
        No homepage sections configured yet. Add categories with "Show on homepage" enabled.
      </section>
    </template>
  </PublicLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { publicApi } from '@/api/publicApi'
import type { HomepageSection } from '@/types/category'
import PublicLayout from '@/components/layout/PublicLayout.vue'
import RecipeCard from '@/components/public/RecipeCard.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import SliderRow from '@/components/shared/SliderRow.vue'

const sections = ref<HomepageSection[]>([])
const loading  = ref(true)
const error    = ref<string | null>(null)

onMounted(async () => {
  try {
    sections.value = await publicApi.homepage()
  } catch (e) {
    error.value = 'Failed to load homepage sections.'
    console.error('Homepage sections error:', e)
  } finally {
    loading.value = false
  }
})
</script>
