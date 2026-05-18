import { z } from 'zod'
import { RECIPE_SORTABLE_COLUMNS } from '../constants/recipeColumns'

const RECIPE_SORT_KEYS = Object.keys(RECIPE_SORTABLE_COLUMNS) as [
  keyof typeof RECIPE_SORTABLE_COLUMNS,
  ...Array<keyof typeof RECIPE_SORTABLE_COLUMNS>
]

const ALLOWED_VIDEO_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'youtu.be',
  'vimeo.com', 'www.vimeo.com',
])

const ingredientSchema = z.object({
  name: z.string().min(1).max(255),
  amount: z.number().positive().max(9999),
  unit: z.string().max(50).nullable().optional(),
})

const ingredientArray = z
  .array(ingredientSchema)
  .min(1, 'At least one ingredient is required')
  .max(50, 'At most 50 ingredients allowed')

const instructionArray = z
  .array(z.string().min(1).max(2000))
  .min(1, 'At least one instruction step is required')
  .max(50, 'At most 50 instruction steps allowed')

const videoUrlSchema = z.string().max(2000)
  .refine(val => {
    try {
      const { hostname } = new URL(val)
      return ALLOWED_VIDEO_HOSTS.has(hostname)
    } catch {
      return false
    }
  }, 'Video URL must be a YouTube or Vimeo link')
  .nullable()
  .optional()

const sectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(100),
  ingredients: ingredientArray,
  instructions: instructionArray,
})

const recipeBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).nullable().optional(),
  servings: z.number().int().min(1).max(100).nullable().optional(),
  prep_minutes: z.number().int().min(0).max(1440).nullable().optional(),
  cook_minutes: z.number().int().min(0).max(1440).nullable().optional(),
  cover_image_url: z.string().url('Must be a valid URL').max(2000).nullable().optional(),
  video_url: videoUrlSchema,
  is_public: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
  category_ids: z.array(z.number().int().positive()).max(10).optional(),
  ingredients: ingredientArray.optional(),
  instructions: instructionArray.optional(),
  sections: z.array(sectionSchema).min(2, 'Use at least 2 sections, or switch to flat mode').max(20).optional(),
})

export const createRecipeSchema = recipeBaseSchema.refine(
  data => {
    if (data.sections && data.sections.length >= 2) return true
    return !!(data.ingredients?.length && data.instructions?.length)
  },
  { message: 'Provide either sections (min 2) or both ingredients and instructions' }
)

export const updateRecipeSchema = recipeBaseSchema.partial().refine(
  data => {
    // If either sections or flat arrays are being updated, validate consistency
    if (data.sections !== undefined && data.sections.length < 2) return false
    return true
  },
  { message: 'sections must have at least 2 entries when provided' }
)

export const listFiltersSchema = z.object({
  q:          z.string().min(1).max(100).optional(),
  sortBy:     z.enum(RECIPE_SORT_KEYS).optional(),
  sortOrder:  z.enum(['ASC', 'DESC']).optional(),
  page:       z.coerce.number().int().positive().optional(),
  pageSize:   z.coerce.number().int().positive().max(50).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
})
