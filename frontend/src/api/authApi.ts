import { apiClient } from './client'
import type { AuthResponse, User } from '@/types/auth'

interface AuthEnvelope { data: AuthResponse }
interface UserEnvelope { data: User }

export const authApi = {
  async signInWithGoogle(idToken: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthEnvelope>('/api/v1/auth/google', { id_token: idToken })
    return res.data.data
  },

  async me(): Promise<User> {
    const res = await apiClient.get<UserEnvelope>('/api/v1/auth/me')
    return res.data.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/v1/auth/logout')
  },
}