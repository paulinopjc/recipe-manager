import { Router } from 'express'
import { homepageSpecialController } from '../controllers/homepageSpecialController'
import { authRequired } from '../middleware/authMiddleware'

const router = Router()

router.get('/',     authRequired, homepageSpecialController.list)
router.patch('/:type', authRequired, homepageSpecialController.update)

export default router
