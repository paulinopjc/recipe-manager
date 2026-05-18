import { Router } from 'express'
import { authRequired as authMiddleware } from '../middleware/authMiddleware'
import { categoryController } from '../controllers/categoryController'

const router = Router()

router.use(authMiddleware)

router.get('/',     categoryController.list)
router.post('/',    categoryController.create)
router.get('/:id',  categoryController.show)
router.patch('/:id',categoryController.update)
router.delete('/:id', categoryController.destroy)

export default router
