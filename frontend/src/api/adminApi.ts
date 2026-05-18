import { apiClient } from './client'
import type { User, CreateUserInput, UserFilters } from '@/types/auth'

export interface UpdateUserInput {
  name: string
  email: string
}

export interface UserListResponse {
  data: User[]
  total: number
  page: number
  pageSize: number
}

export const adminApi = {
  async listUsers(params?: UserFilters): Promise<UserListResponse> {
    const { data } = await apiClient.get('/api/v1/admin/users', { params })
    return data
  },

  async createUser(payload: CreateUserInput): Promise<User> {
    const { data } = await apiClient.post('/api/v1/admin/users', payload)
    return data.data
  },

  async updateUser(id: number, payload: UpdateUserInput): Promise<User> {
    const { data } = await apiClient.patch(`/api/v1/admin/users/${id}`, payload)
    return data.data
  },

  async toggleUserActive(id: number): Promise<User> {
    const { data } = await apiClient.patch(`/api/v1/admin/users/${id}/toggle-active`)
    return data.data
  },
}