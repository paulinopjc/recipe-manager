import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { recipeService } from '../services/recipeService'
import { categoryService } from '../services/categoryService'
import { navItemService } from '../services/navItemService'
import { pool } from '../db/connection'
import { HttpError } from '../middleware/httpError'
import { flattenZodError } from '../utils/flattenZodError'
import { listFiltersSchema } from '../validators/recipeValidator'

const idSchema = z.coerce.number().int().positive()

export const publicController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = listFiltersSchema.safeParse(req.query)
      if (!parsed.success)
        throw new HttpError(400, 'Invalid query parameters', flattenZodError(parsed.error))
      const { data, total } = await recipeService.listPublic(parsed.data)
      res.json({ data, total, page: parsed.data.page ?? 1, pageSize: parsed.data.pageSize ?? 20 })
    } catch (e) { next(e) }
  },

  async featured(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recipeService.listFeatured()
      res.json({ data })
    } catch (e) { next(e) }
  },

  async mostViewed(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6))
      const data = await recipeService.mostViewed(limit)
      res.json({ data })
    } catch (e) { next(e) }
  },

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string
      const recipe = await recipeService.findPublicBySlug(slug)
      if (!recipe) throw new HttpError(404, 'Recipe not found')
      const similar = await recipeService.similar(recipe.id)
      res.json({ data: { ...recipe, similar } })
    } catch (e) { next(e) }
  },

  async homepage(req: Request, res: Response, next: NextFunction) {
    try {
      const sections = await categoryService.listForHomepage()
      res.json({ data: sections })
    } catch (e) { next(e) }
  },

  async nav(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await navItemService.listPublic()
      res.json({ data })
    } catch (e) { next(e) }
  },

  async categories(req: Request, res: Response, next: NextFunction) {
    try {
      const tree = await categoryService.tree(true)
      res.json({ data: tree })
    } catch (e) { next(e) }
  },

  async categoryRecipes(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug as string
      const category = await categoryService.findBySlug(slug)
      if (!category || !category.is_active) throw new HttpError(404, 'Category not found')

      const parsed = listFiltersSchema.safeParse(req.query)
      if (!parsed.success)
        throw new HttpError(400, 'Invalid query parameters', flattenZodError(parsed.error))

      const { data, total } = await categoryService.listRecipesByCategory(category.id, {
        q:          parsed.data.q,
        difficulty: parsed.data.difficulty,
        page:       parsed.data.page,
        pageSize:   parsed.data.pageSize,
        sortOrder:  parsed.data.sortOrder,
      })
      const { rows: children } = await pool.query(
        `SELECT id, name, slug FROM categories
         WHERE parent_id = $1 AND is_active = true ORDER BY name`,
        [category.id]
      )
      res.json({
        category,
        children,
        data,
        total,
        page:     parsed.data.page ?? 1,
        pageSize: parsed.data.pageSize ?? 20,
      })
    } catch (e) { next(e) }
  },
}
