import { Router } from 'express'
import { authController } from '../controllers/authController'
import { authRequired } from '../middleware/authMiddleware'

const router = Router()

router.post('/google', authController.google)
router.get('/me', authRequired, authController.me)
router.post('/logout', authRequired, authController.logout)

export default router