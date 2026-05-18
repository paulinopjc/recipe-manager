import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { homepageSpecialService } from '../services/homepageSpecialService'
import { HttpError } from '../middleware/httpError'

const updateSchema = z.object({
  label:     z.string().min(1).max(100).optional(),
  style:     z.enum(['slider', 'grid']).optional(),
  items:     z.number().int().min(1).max(20).optional(),
  position:  z.number().int().min(0).max(999).optional(),
  is_active: z.boolean().optional(),
})

const VALID_TYPES = ['featured', 'most_viewed'] as const

export const homepageSpecialController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await homepageSpecialService.list()
      res.json({ data })
    } catch (e) { next(e) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const type = req.params.type as string
      if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
        throw new HttpError(400, 'Invalid type — must be featured or most_viewed')
      }
      const parsed = updateSchema.safeParse(req.body)
      if (!parsed.success) throw new HttpError(422, 'Validation failed', parsed.error.flatten())
      const item = await homepageSpecialService.update(type, parsed.data)
      if (!item) throw new HttpError(404, 'Homepage special not found')
      res.json({ data: item })
    } catch (e) { next(e) }
  },
}
