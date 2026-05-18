import { z } from 'zod'
import { USER_ROLES } from '../types/user'
import { USER_SORTABLE_COLUMNS } from '../constants/userColumns'

const USER_SORT_KEYS = Object.keys(USER_SORTABLE_COLUMNS) as [
  keyof typeof USER_SORTABLE_COLUMNS,
  ...Array<keyof typeof USER_SORTABLE_COLUMNS>
]

export const listUsersSchema = z.object({
  page:      z.coerce.number().int().positive().default(1),
  pageSize:  z.coerce.number().int().positive().max(100).default(20),
  search:    z.string().max(255).default(''),
  sortBy:    z.enum(USER_SORT_KEYS).default('created_at'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
})

export const createUserSchema = z.object({
  name:  z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email').max(255),
  role:  z.enum(USER_ROLES).default('member'),
})

export const editUserSchema = z.object({
  name:  z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email').max(255),
  role:  z.enum(USER_ROLES),
})