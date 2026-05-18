import { apiClient } from './client'
import type { NavItem, CreateNavItemInput, UpdateNavItemInput } from '@/types/navItem'

export const navItemApi = {
  list(): Promise<NavItem[]> {
    return apiClient.get('/api/v1/nav-items').then(r => r.data.data)
  },

  find(id: number): Promise<NavItem> {
    return apiClient.get(`/api/v1/nav-items/${id}`).then(r => r.data.data)
  },

  create(input: CreateNavItemInput): Promise<NavItem> {
    return apiClient.post('/api/v1/nav-items', input).then(r => r.data.data)
  },

  update(id: number, input: UpdateNavItemInput): Promise<NavItem> {
    return apiClient.patch(`/api/v1/nav-items/${id}`, input).then(r => r.data.data)
  },

  remove(id: number): Promise<void> {
    return apiClient.delete(`/api/v1/nav-items/${id}`)
  },
}
