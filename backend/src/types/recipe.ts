import { RECIPE_SORTABLE_COLUMNS } from '../constants/recipeColumns'
export interface RecipeCategoryRef {
    id: number
    name: string
    slug: string
}

export interface Ingredient {
    id: number
    name: string
    amount: number
    unit: string | null
    position: number
    section_id: number | null
}

export interface Instruction {
    id: number
    text: string
    position: number
    section_id: number | null
}

export interface RecipeSection {
    id: number
    recipe_id: number
    name: string
    position: number
    ingredients: Ingredient[]
    instructions: Instruction[]
}

export interface Recipe {
    id: number
    user_id: number
    title: string
    slug: string
    description: string | null
    servings: number | null
    prep_minutes: number | null
    cook_minutes: number | null
    cover_image_url: string | null
    video_url: string | null
    is_public: boolean
    is_featured: boolean
    difficulty: 'easy' | 'medium' | 'hard' | null
    view_count: number
    categories: RecipeCategoryRef[]
    ingredients: Ingredient[]
    instructions: Instruction[]
    sections: RecipeSection[]
    created_at: string
    updated_at: string
}

export interface IngredientInput {
    name: string
    amount: number
    unit?: string | null
}

export interface RecipeSectionInput {
    name: string
    ingredients: IngredientInput[]
    instructions: string[]
}

export interface CreateRecipeInput {
    title: string
    description?: string | null
    servings?: number | null
    prep_minutes?: number | null
    cook_minutes?: number | null
    cover_image_url?: string | null
    video_url?: string | null
    is_public?: boolean
    is_featured?: boolean
    difficulty?: 'easy' | 'medium' | 'hard' | null
    category_ids?: number[]
    // Either flat OR sections (not both)
    ingredients?: IngredientInput[]
    instructions?: string[]
    sections?: RecipeSectionInput[]
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {}

export interface RecipeFilters {
    q?: string
    sortBy?: keyof typeof RECIPE_SORTABLE_COLUMNS
    sortOrder?: 'ASC' | 'DESC'
    page?: number
    pageSize?: number
    difficulty?: 'easy' | 'medium' | 'hard'
}
