export const USER_ROLES = ['member', 'admin'] as const

export type UserRole = typeof USER_ROLES[number]

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  is_active: boolean
  google_sub?: string | null
}

export interface AuthResponse {
  user: User
  token: string
}

export interface CreateUserInput {
  name: string
  email: string
  role: UserRole
}

export interface UserFilters {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: 'name' | 'email' | 'role' | 'created_at'
  sortOrder?: 'ASC' | 'DESC'
}