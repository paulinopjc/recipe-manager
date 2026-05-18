import { apiClient } from './client'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/category'

export const categoryApi = {
  list(): Promise<Category[]> {
    return apiClient.get('/api/v1/categories').then(r => r.data.data)
  },

  find(id: number): Promise<Category> {
    return apiClient.get(`/api/v1/categories/${id}`).then(r => r.data.data)
  },

  create(input: CreateCategoryInput): Promise<Category> {
    return apiClient.post('/api/v1/categories', input).then(r => r.data.data)
  },

  update(id: number, input: UpdateCategoryInput): Promise<Category> {
    return apiClient.patch(`/api/v1/categories/${id}`, input).then(r => r.data.data)
  },

  remove(id: number): Promise<void> {
    return apiClient.delete(`/api/v1/categories/${id}`).then(() => undefined)
  },
}
