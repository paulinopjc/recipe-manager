import { Router } from 'express'
import { publicController } from '../controllers/publicController'

const router = Router()

// Static recipe routes BEFORE /:id to avoid matching strings as IDs
router.get('/recipes/featured',    publicController.featured)
router.get('/recipes/most-viewed', publicController.mostViewed)
router.get('/recipes',             publicController.list)
router.get('/recipes/:slug',        publicController.show)

// Homepage sections
router.get('/homepage', publicController.homepage)

// Navigation menu
router.get('/nav', publicController.nav)

// Category browse
router.get('/categories',       publicController.categories)
router.get('/categories/:slug', publicController.categoryRecipes)

export default router
