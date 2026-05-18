import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { recipeService } from '../services/recipeService'
import { HttpError } from '../middleware/httpError'
import { flattenZodError } from '../utils/flattenZodError'
import { createRecipeSchema, listFiltersSchema, updateRecipeSchema } from '../validators/recipeValidator'
import { audit } from '../services/auditService'

const idSchema = z.coerce.number().int().positive()

export const recipeController = {
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user)
                throw new HttpError(401, 'unauthorized')
            const parsed = listFiltersSchema.safeParse(req.query)
            if (!parsed.success)
                throw new HttpError(400, 'Invalid query parameters', flattenZodError(parsed.error))
            const { data, total } = await recipeService.list(parsed.data)
            res.json({ data, total, page: parsed.data.page ?? 1, pageSize: parsed.data.pageSize ?? 20 })
        } catch (e) { next(e) }
    },

    async show(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user)
                throw new HttpError(401, 'Unauthorized')
            const id = idSchema.safeParse(req.params.id)
            if (!id.success)
                throw new HttpError(400, 'Invalid recipe id')
            const recipe = await recipeService.find(id.data)
            if (!recipe)
                throw new HttpError(404, 'Recipe not found')
            res.json({ data: recipe })
        } catch (e) { next(e) }
    },

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpError(401, 'Unauthorized')
            const parsed = createRecipeSchema.safeParse(req.body)
            if (!parsed.success) throw new HttpError(422, 'Validation failed', flattenZodError(parsed.error))
            const recipe = await recipeService.create(req.user.id, parsed.data)
            res.status(201).json({ data: recipe })
        } catch (e) { next(e) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpError(401, 'Unauthorized')
            const id = idSchema.safeParse(req.params.id)
            if (!id.success) throw new HttpError(400, 'Invalid recipe id')
            const parsed = updateRecipeSchema.safeParse(req.body)
            if (!parsed.success) throw new HttpError(422, 'Validation failed', flattenZodError(parsed.error))
            const recipe = await recipeService.update(id.data, null, parsed.data)
            if (!recipe) throw new HttpError(404, 'Recipe not found')
            res.json({ data: recipe })
        } catch (e) { next(e) }
  },

  async destroy(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpError(401, 'Unauthorized')
            const id = idSchema.safeParse(req.params.id)
            if (!id.success) throw new HttpError(400, 'Invalid recipe id')
            const ownerId = req.user.role === 'admin' ? null : req.user.id
            const recipe = await recipeService.find(id.data)
            if (!recipe) throw new HttpError(404, 'Recipe not found')
            const deleted = await recipeService.delete(id.data, ownerId)
            if (!deleted) throw new HttpError(404, 'Recipe not found or not owned by you')
            audit(req.user.id, 'recipe.delete', { entityType: 'recipe', entityId: id.data, metadata: { title: recipe.title }, ip: req.ip })
            res.status(204).send()
        } catch (e) { next(e) }
  },
}