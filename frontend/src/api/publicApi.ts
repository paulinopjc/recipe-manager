import axios from 'axios'
import type { Recipe, RecipeFilters } from '@/types/recipe'
import type { Category, HomepageSection } from '@/types/category'
import type { NavItem } from '@/types/navItem'

// Separate axios instance — no auth token needed for public routes
const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4003',
})

export interface RecipeListResponse {
  data: Recipe[]
  total: number
  page: number
  pageSize: number
}

export interface CategoryPageResponse {
  category: Category
  children: { id: number; name: string; slug: string }[]
  data: Recipe[]
  total: number
  page: number
  pageSize: number
}

export const publicApi = {
  listFeatured(): Promise<Recipe[]> {
    return publicClient.get('/api/v1/public/recipes/featured').then(r => r.data.data)
  },

  mostViewed(limit = 6): Promise<Recipe[]> {
    return publicClient.get('/api/v1/public/recipes/most-viewed', { params: { limit } }).then(r => r.data.data)
  },

  list(filters?: RecipeFilters): Promise<RecipeListResponse> {
    return publicClient.get('/api/v1/public/recipes', { params: filters }).then(r => r.data)
  },

  find(slug: string): Promise<Recipe> {
    return publicClient.get(`/api/v1/public/recipes/${slug}`).then(r => r.data.data)
  },

  homepage(): Promise<HomepageSection[]> {
    return publicClient.get('/api/v1/public/homepage').then(r => r.data.data)
  },

  categories(): Promise<Category[]> {
    return publicClient.get('/api/v1/public/categories').then(r => r.data.data)
  },

  categoryPage(slug: string, filters?: RecipeFilters): Promise<CategoryPageResponse> {
    return publicClient
      .get(`/api/v1/public/categories/${slug}`, { params: filters })
      .then(r => r.data)
  },

  nav(): Promise<NavItem[]> {
    return publicClient.get('/api/v1/public/nav').then(r => r.data.data)
  },
}
