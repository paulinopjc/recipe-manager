import { Request, Response, NextFunction } from 'express'
import { storageService } from '../services/storageService'
import { HttpError } from '../middleware/httpError'

export const uploadController = {
  async coverImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new HttpError(422, 'No file uploaded')

      const url = await storageService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        `cover-images/${req.user!.id}`
      )

      res.json({ url })
    } catch (e) {
      next(e)
    }
  },
}