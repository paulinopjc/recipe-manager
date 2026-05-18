import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { categoryService } from '../services/categoryService'
import { HttpError } from '../middleware/httpError'
import { flattenZodError } from '../utils/flattenZodError'
import { createCategorySchema, updateCategorySchema } from '../validators/categoryValidator'

const idSchema = z.coerce.number().int().positive()

export const categoryController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'Unauthorized')
      const categories = await categoryService.list()
      res.json({ data: categories })
    } catch (e) { next(e) }
  },

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'Unauthorized')
      const id = idSchema.safeParse(req.params.id)
      if (!id.success) throw new HttpError(400, 'Invalid category id')
      const category = await categoryService.findById(id.data)
      if (!category) throw new HttpError(404, 'Category not found')
      res.json({ data: category })
    } catch (e) { next(e) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'Unauthorized')
      const parsed = createCategorySchema.safeParse(req.body)
      if (!parsed.success) throw new HttpError(422, 'Validation failed', flattenZodError(parsed.error))
      const category = await categoryService.create(parsed.data)
      res.status(201).json({ data: category })
    } catch (e) { next(e) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'Unauthorized')
      const id = idSchema.safeParse(req.params.id)
      if (!id.success) throw new HttpError(400, 'Invalid category id')
      const parsed = updateCategorySchema.safeParse(req.body)
      if (!parsed.success) throw new HttpError(422, 'Validation failed', flattenZodError(parsed.error))
      const category = await categoryService.update(id.data, parsed.data)
      if (!category) throw new HttpError(404, 'Category not found')
      res.json({ data: category })
    } catch (e) { next(e) }
  },

  async destroy(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'Unauthorized')
      const id = idSchema.safeParse(req.params.id)
      if (!id.success) throw new HttpError(400, 'Invalid category id')
      const deleted = await categoryService.delete(id.data)
      if (!deleted) throw new HttpError(404, 'Category not found')
      res.status(204).send()
    } catch (e) { next(e) }
  },
}
