import jwt from 'jsonwebtoken'
import type { UserRole } from '../types/user'

export interface TokenPayLoad {
    userId: number
    role: UserRole
}

const EXPIRES_IN = '1d'

function getSecret(): string {
    const secret = process.env.JWT_SECRET

    if(!secret || secret.length < 16) {
        throw new Error('JWT_SECRET must be set and at least 16 characters long')
    }
    return secret
}

export const tokenService = {
    sign(payload: TokenPayLoad): string {
        return jwt.sign(payload, getSecret(), { expiresIn: EXPIRES_IN })
    },

    verify(token: string): TokenPayLoad {
        const decoded = jwt.verify(token, getSecret())
        if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
            throw new Error('Invalid token payload')
        }
        return {
            userId: (decoded as {userId: number}).userId,
            role: (decoded as {role: UserRole}).role,
        }
    },
}