import { Router } from 'express'
import { adminController } from '../controllers/adminController'
import { authRequired } from '../middleware/authMiddleware'
import { adminRequired } from '../middleware/adminMiddleware'

const router = Router()

router.use(authRequired)
router.use(adminRequired)

router.get('/users', adminController.listUsers)
router.post('/users', adminController.createUser)
router.patch('/users/:id', adminController.editUser)
router.patch('/users/:id/toggle-active', adminController.toggleActive)

export default router