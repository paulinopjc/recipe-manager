import { Router } from 'express'
import { uploadController } from '../controllers/uploadController'
import { authRequired } from '../middleware/authMiddleware'
import { upload } from '../middleware/upload'

const router = Router()

router.post('/cover-image', authRequired, upload.single('file'), uploadController.coverImage)

export default router