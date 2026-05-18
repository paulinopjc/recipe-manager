export const HOMEPAGE_STYLES = ['slider', 'grid'] as const
export type HomepageStyle = typeof HOMEPAGE_STYLES[number]

export interface Category {
  id: number
  parent_id: number | null
  name: string
  slug: string
  description: string | null
  image_url: string | null
  is_home: boolean
  is_active: boolean
  show_on_homepage: boolean
  homepage_style: HomepageStyle
  homepage_items: number
  homepage_position: number
  created_at: string
  updated_at: string
  children?: Category[]
  ancestors?: CategoryAncestor[]
  recipe_count?: number
}

export interface CategoryAncestor {
  id: number
  name: string
  slug: string
}

export interface CreateCategoryInput {
  parent_id?: number | null
  name: string
  slug?: string
  description?: string | null
  image_url?: string | null
  is_active?: boolean
  show_on_homepage?: boolean
  homepage_style?: HomepageStyle
  homepage_items?: number
  homepage_position?: number
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

export interface HomepageSection {
  category: Category
  recipes: unknown[]
  style: HomepageStyle
  items: number
}
