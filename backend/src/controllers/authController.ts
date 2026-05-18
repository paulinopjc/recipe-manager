import { Request, Response, NextFunction } from 'express'
import { userService } from '../services/userService'
import { tokenService } from '../services/tokenService'
import { googleVerifier } from '../services/googleVerifier'
import { googleSignInSchema } from '../validators/authValidator'
import { HttpError } from '../middleware/httpError'
import { flattenZodError } from '../utils/flattenZodError'

export const authController = {
  async google(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = googleSignInSchema.safeParse(req.body)
      if (!parsed.success) {
        throw new HttpError(422, 'Validation failed', flattenZodError(parsed.error))
      }

      let googlePayload
      try {
        googlePayload = await googleVerifier.verify(parsed.data.id_token)
      } catch {
        throw new HttpError(401, 'Invalid Google token')
      }

      const user = await userService.findByEmail(googlePayload.email)
      if (!user) {
        throw new HttpError(403, 'This email is not authorised. Ask an administrator to add you.')
      }
      if (!user.is_active) {
        throw new HttpError(403, 'Account disabled')
      }

      if (!user.google_sub) {
        await userService.recordGoogleSub(user.id, googlePayload.sub)
      }

      const token = tokenService.sign({ userId: user.id, role: user.role })

      res.json({ data: { user, token } })
    } catch (e) {
      next(e)
    }
  },

  me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpError(401, 'Unauthorized')
      res.json({ data: req.user })
    } catch (e) {
      next(e)
    }
  },

  logout(_req: Request, res: Response) {
    res.json({ message: 'Logged out' })
  },
}