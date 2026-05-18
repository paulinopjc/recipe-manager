import express, { Request, Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import authRouter from './routes/auth'
import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'
import adminRouter from './routes/admin'
import recipesRouter from './routes/recipes'
import uploadRouter from './routes/upload'
import publicRouter from './routes/public'
import categoriesRouter from './routes/categories'
import navItemsRouter from './routes/navItems'
import homepageSpecialsRouter from './routes/homepageSpecials'
import { authLimiter, apiLimiter } from './middleware/rateLimiter'

export function createApp() {
    const app = express()

    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
      .split(',').map(o => o.trim())
    // always allow the Vite preview port alongside the dev server
    if (!allowedOrigins.includes('http://localhost:4173')) {
      allowedOrigins.push('http://localhost:4173')
    }
    app.use(helmet())
    app.use(cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
        cb(new Error(`CORS: origin ${origin} not allowed`))
      },
    }))
    app.use(morgan('dev'))
    app.use(express.json())
    app.use('/api/v1/auth', authLimiter)
    app.use('/api/v1', apiLimiter)

    app.get('/', (_req: Request, res: Response) => {
        res.json({ message: 'Recipe Manager API is running' })
    })

    app.use('/api/v1/auth', authRouter)
    app.use('/api/v1/recipes', recipesRouter)
    app.use('/api/v1/admin', adminRouter)
    app.use('/api/v1/upload', uploadRouter)
    app.use('/api/v1/public', publicRouter)
    app.use('/api/v1/categories', categoriesRouter)
    app.use('/api/v1/nav-items', navItemsRouter)
    app.use('/api/v1/homepage-specials', homepageSpecialsRouter)
    app.use(notFound)
    app.use(errorHandler)

    return app
}