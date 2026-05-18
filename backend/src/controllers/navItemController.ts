import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { navItemService } from '../services/navItemService'
import { HttpError } from '../middleware/httpError'

const idSchema = z.coerce.number().int().positive()

const createSchema = z.object({
  parent_id:   z.number().int().positive().nullable().optional(),
  label:       z.string().min(1).max(100),
  type:        z.enum(['category', 'recipe', 'custom']),
  category_id: z.number().int().positive().nullable().optional(),
  recipe_id:   z.number().int().positive().nullable().optional(),
  url:         z.string().max(2000).nullable().optional(),
  position:    z.number().int().min(0).optional(),
  is_active:   z.boolean().optional(),
})

const updateSchema = createSchema.partial()

export const navItemController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await navItemService.list()
      res.json({ data })
    } catch (e) { next(e) }
  },

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const id = idSchema.safeParse(req.params.id)
      if (!id.success) throw new HttpError(400, 'Invalid id')
      const item = await navItemService.findById(id.data)
      if (!item) throw new HttpError(404, 'Nav item not found')
      res.json({ data: item })
    } catch (e) { next(e) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createSchema.safeParse(req.body)
      if (!parsed.success) throw new HttpError(400, 'Validation error', parsed.error.flatten())
      const item = await navItemService.create(parsed.data)
      res.status(201).json({ data: item })
    } catch (e) { next(e) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = idSchema.safeParse(req.params.id)
      if (!id.success) throw new HttpError(400, 'Invalid id')
      const parsed = updateSchema.safeParse(req.body)
      if (!parsed.success) throw new HttpError(400, 'Validation error', parsed.error.flatten())
      const item = await navItemService.update(id.data, parsed.data)
      if (!item) throw new HttpError(404, 'Nav item not found')
      res.json({ data: item })
    } catch (e) { next(e) }
  },

  async destroy(req: Request, res: Response, next: NextFunction) {
    try {
      const id = idSchema.safeParse(req.params.id)
      if (!id.success) throw new HttpError(400, 'Invalid id')
      const deleted = await navItemService.delete(id.data)
      if (!deleted) throw new HttpError(404, 'Nav item not found')
      res.status(204).send()
    } catch (e) { next(e) }
  },
}
