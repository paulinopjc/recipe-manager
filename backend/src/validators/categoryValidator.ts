import { z } from 'zod'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const baseCategorySchema = z.object({
  parent_id:         z.number().int().positive().nullable().optional(),
  name:              z.string().min(1, 'Name is required').max(100),
  slug:              z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only').optional(),
  description:       z.string().max(2000).nullable().optional(),
  image_url:         z.string().url('Must be a valid URL').max(2000).nullable().optional(),
  is_active:         z.boolean().optional(),
  show_on_homepage:  z.boolean().optional(),
  homepage_style:    z.enum(['slider', 'grid']).optional(),
  homepage_items:    z.number().int().min(1).max(20).optional(),
  homepage_position: z.number().int().min(0).max(100).optional(),
})

export const createCategorySchema = baseCategorySchema.transform(data => ({
  ...data,
  slug: data.slug ?? slugify(data.name),
}))

export const updateCategorySchema = baseCategorySchema.partial().transform(data => ({
  ...data,
  ...(data.slug === undefined && data.name !== undefined ? { slug: slugify(data.name) } : {}),
}))
