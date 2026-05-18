<template>
  <div class="max-w-xl mx-auto">
    <h1 class="text-2xl font-semibold mb-6">New Recipe</h1>
    <RecipeForm :saving="saving" :error="error" @submit="onCreate" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { recipeApi } from '@/api/recipeApi'
import type { CreateRecipeInput } from '@/types/recipe'
import RecipeForm from '@/components/recipes/RecipeForm.vue'
import { ADMIN_PREFIX } from '@/config'

const router = useRouter()
const saving = ref(false)
const error = ref<string | null>(null)

async function onCreate(input: CreateRecipeInput) {
  saving.value = true
  error.value = null
  try {
    const recipe = await recipeApi.create(input)
    router.push(`/${ADMIN_PREFIX}/recipes/${recipe.id}`)
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err.message || 'Failed to save recipe.'
  } finally {
    saving.value = false
  }
}
</script>