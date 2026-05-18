import { Request, Response, NextFunction } from 'express'
import { tokenService } from '../services/tokenService'
import { tokenBlocklist } from '../services/tokenBlocklist'
import { userService } from '../services/userService'
import { HttpError } from './httpError'

export async function authRequired(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('Authorization')
    if (!header || !header.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing or invalid Authorization header')
    }

    const token = header.slice('Bearer '.length).trim()
    if (!token) throw new HttpError(401, 'Empty token')

    let payload
    try {
      payload = tokenService.verify(token)
    } catch {
      throw new HttpError(401, 'Invalid or expired token')
    }

    if (tokenBlocklist.has(token)) throw new HttpError(401, 'Token has been revoked')

    const user = await userService.find(payload.userId)
    if (!user) throw new HttpError(401, 'User not found')
    if (!user.is_active) throw new HttpError(401, 'Account disabled')

    req.user = user
    next()
  } catch (e) {
    next(e)
  }
}