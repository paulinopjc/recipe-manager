import { apiClient } from './client'
import type { Recipe, CreateRecipeInput, UpdateRecipeInput, RecipeFilters } from '@/types/recipe'

export interface RecipeListResponse {
  data: Recipe[]
  total: number
  page: number
  pageSize: number
}

export const recipeApi = {
  list(filters?: RecipeFilters): Promise<RecipeListResponse> {
    return apiClient.get('/api/v1/recipes', { params: filters }).then(r => r.data)
  },
  find(id: number): Promise<Recipe> {
    return apiClient.get(`/api/v1/recipes/${id}`).then(r => r.data.data)
  },
  create(input: CreateRecipeInput): Promise<Recipe> {
    return apiClient.post('/api/v1/recipes', input).then(r => r.data.data)
  },
  update(id: number, input: UpdateRecipeInput): Promise<Recipe> {
    return apiClient.patch(`/api/v1/recipes/${id}`, input).then(r => r.data.data)
  },
  remove(id: number): Promise<void> {
    return apiClient.delete(`/api/v1/recipes/${id}`).then(() => undefined)
  },
}