import multer from 'multer'
import { HttpError } from './httpError'
import { Request } from 'express'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter(_req: Request, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new HttpError(422, 'Only JPEG, PNG, WebP, and GIF images are allowed') as unknown as null, false)
    }
  },
})