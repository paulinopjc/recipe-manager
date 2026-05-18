import { Router } from 'express'
import { authRequired } from '../middleware/authMiddleware'
import { navItemController } from '../controllers/navItemController'

const router = Router()

router.use(authRequired)

router.get('/',      navItemController.list)
router.post('/',     navItemController.create)
router.get('/:id',   navItemController.show)
router.patch('/:id', navItemController.update)
router.delete('/:id',navItemController.destroy)

export default router
