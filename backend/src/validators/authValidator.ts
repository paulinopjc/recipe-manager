import { z } from 'zod'

export const googleSignInSchema = z.object({ id_token: z.string({ error: 'id_token is required' }).min(1, 'id_token is required'), })

export type GoogleSignInSchema = z.infer<typeof googleSignInSchema>