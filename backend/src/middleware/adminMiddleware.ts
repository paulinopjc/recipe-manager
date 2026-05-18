import { Request, Response, NextFunction } from 'express'
import { HttpError } from './httpError'

export function adminRequired(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new HttpError(401, 'Unauthorized')
    if (req.user.role !== 'admin') throw new HttpError(403, 'Admin role required')
    next()
  } catch (e) {
    next(e)
  }
}