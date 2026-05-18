import { Request, Response, NextFunction } from 'express'
import { userService } from '../services/userService'
import { HttpError } from '../middleware/httpError'
import { listUsersSchema, createUserSchema, editUserSchema } from '../validators/userValidator'
import { flattenZodError } from '../utils/flattenZodError'

export const adminController = {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = listUsersSchema.safeParse(req.query)
      if (!parsed.success) throw new HttpError(400, 'Invalid query params')
      const { data, total } = await userService.list({
        page:      parsed.data.page,
        pageSize:  parsed.data.pageSize,
        search:    parsed.data.search,
        sortBy:    parsed.data.sortBy,
        sortOrder: parsed.data.sortOrder,
      })
      res.json({ data, total, page: parsed.data.page, pageSize: parsed.data.pageSize })
    } catch (e) {
      next(e)
    }
  },

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createUserSchema.safeParse(req.body)
      if (!parsed.success) {
        throw new HttpError(422, 'Validation failed', flattenZodError(parsed.error))
      }

      if (await userService.emailExists(parsed.data.email)) {
        throw new HttpError(409, 'Email already in use')
      }

      const user = await userService.create(parsed.data)
      res.status(201).json({ data: user })
    } catch (e) {
      next(e)
    }
  },

  async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        throw new HttpError(400, 'Invalid user id')
      }
      const user = await userService.toggleActive(id)
      if (!user) throw new HttpError(404, 'User not found')
      res.json({ data: user })
    } catch (e) {
      next(e)
    }
  },

  async editUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      if (!Number.isInteger(id) || id <= 0) {
        throw new HttpError(400, 'Invalid user id')
      }

      const parsed = editUserSchema.safeParse(req.body)
      if (!parsed.success) {
        throw new HttpError(422, 'Validation failed', flattenZodError(parsed.error))
      }

      const existing = await userService.find(id)
      if (!existing) throw new HttpError(404, 'User not found')

      if (parsed.data.email.toLowerCase() !== existing.email) {
        if (await userService.emailExists(parsed.data.email)) {
          throw new HttpError(409, 'Email already in use')
        }
      }

      const user = await userService.update(id, parsed.data)
      res.json({ data: user })
    } catch (e) {
      next(e)
    }
  },
}