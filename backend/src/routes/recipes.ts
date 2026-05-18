import { Router } from 'express'
import { recipeController } from '../controllers/recipeController'
import { authRequired } from '../middleware/authMiddleware'

const router = Router()
router.use(authRequired)

router.get('/', recipeController.list)
router.post('/', recipeController.create)
router.get('/:id', recipeController.show)
router.patch('/:id', recipeController.update)
router.delete('/:id', recipeController.destroy)

export default router