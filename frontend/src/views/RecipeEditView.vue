<template>
  <div class="max-w-xl mx-auto">
    <h1 class="text-2xl font-semibold mb-6">Edit Recipe</h1>
    <LoadingSpinner v-if="loading" />
    <RecipeForm v-else-if="recipe" :initial="recipe" :saving="saving" :error="error" @submit="onUpdate" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { recipeApi } from '@/api/recipeApi'
import type { Recipe, CreateRecipeInput } from '@/types/recipe'
import RecipeForm from '@/components/recipes/RecipeForm.vue'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'
import { ADMIN_PREFIX } from '@/config'

const route = useRoute()
const router = useRouter()
const recipe = ref<Recipe | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    recipe.value = await recipeApi.find(Number(route.params.id))
  } finally {
    loading.value = false
  }
})

async function onUpdate(input: CreateRecipeInput) {
  saving.value = true
  error.value = null
  try {
    await recipeApi.update(Number(route.params.id), input)
    router.push(`/${ADMIN_PREFIX}/recipes/${route.params.id}`)
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err.message || 'Failed to save recipe.'
  } finally {
    saving.value = false
  }
}
</script>