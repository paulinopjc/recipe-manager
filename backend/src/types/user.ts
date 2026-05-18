import { USER_SORTABLE_COLUMNS } from '../constants/userColumns'

export const USER_ROLES = ['member', 'admin'] as const

export type UserRole = typeof USER_ROLES[number]

export interface User {
    id: number
    name: string
    email: string
    role: UserRole
    is_active: boolean | null
    google_sub: string
    created_at: string
    updated_at: string
}

export interface UserFilters {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: keyof typeof USER_SORTABLE_COLUMNS
    sortOrder?: 'ASC' | 'DESC'
}