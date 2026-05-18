import { OAuth2Client } from 'google-auth-library'

let client: OAuth2Client | null = null

function getClient(): OAuth2Client {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if(!clientId) {
        throw new Error('GOOGLE_CLIENT_ID must be set')
    }
    if(!client)
        client = new OAuth2Client(clientId)
    return client
}

export interface GooglePayLoad {
    email: string
    emailVerified: boolean
    name: string
    sub: string
}

export const googleVerifier = {
    async verify(idToken: string): Promise<GooglePayLoad> {
        const ticket = await getClient().verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        })
        const payload = ticket.getPayload()
        if (!payload)
            throw new Error('Empty token payload')
        if(!payload.email)
            throw new Error('Token has no Email')
        if(!payload.email_verified)
            throw new Error('Email not verified')
        if(!payload.sub)
            throw new Error('Token has no sub')

        return {
            email: payload.email.toLowerCase(),
            emailVerified: payload.email_verified,
            name: payload.name ?? payload.email,
            sub: payload.sub,
        }
    },
}