export type NavItemType = 'category' | 'recipe' | 'custom'

export interface NavItem {
  id: number
  parent_id: number | null
  label: string
  type: NavItemType
  category_id: number | null
  recipe_id: number | null
  url: string | null
  position: number
  is_active: boolean
  resolved_url: string | null
  created_at: string
  updated_at: string
  children?: NavItem[]
}

export interface CreateNavItemInput {
  parent_id?: number | null
  label: string
  type: NavItemType
  category_id?: number | null
  recipe_id?: number | null
  url?: string | null
  position?: number
  is_active?: boolean
}

export interface UpdateNavItemInput extends Partial<CreateNavItemInput> {}
