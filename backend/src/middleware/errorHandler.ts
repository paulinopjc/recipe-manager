import { Request, Response, NextFunction } from 'express'
import { HttpError } from './httpError'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof HttpError) {
        const body: Record<string, unknown> = { error: err.message }
        if (err.details)
            body.details = err.details
        res.status(err.status).json(body)
        return
    }
    console.error('Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
}