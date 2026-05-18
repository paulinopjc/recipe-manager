import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/authApi'
import { TOKEN_KEY, USER_KEY } from '@/api/client'
import type { User } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function loadFromStorage() {
    token.value = localStorage.getItem(TOKEN_KEY)
    const stored = localStorage.getItem(USER_KEY)
    if (stored) {
      try { user.value = JSON.parse(stored) }
      catch { localStorage.removeItem(USER_KEY); user.value = null }
    }
  }

  function persist(result: { user: User; token: string }) {
    user.value = result.user
    token.value = result.token
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(USER_KEY, JSON.stringify(result.user))
  }

  function clear() {
    user.value = null
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  async function signInWithGoogle(idToken: string): Promise<boolean> {
    error.value = null
    loading.value = true
    try {
      const result = await authApi.signInWithGoogle(idToken)
      persist(result)
      return true
    } catch (e: unknown) {
      const err = e as { message?: string }
      error.value = err.message || 'Sign-in failed.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function loginWithToken(jwtToken: string): Promise<boolean> {
    try {
      localStorage.setItem(TOKEN_KEY, jwtToken)
      token.value = jwtToken
      const result = await authApi.me()
      user.value = result
      localStorage.setItem(USER_KEY, JSON.stringify(result))
      return true
    } catch {
      clear()
      return false
    }
  }

  async function logout(): Promise<void> {
    if (token.value) {
      try { await authApi.logout() } catch { /* ignore */ }
    }
    clear()
  }

  return { user, token, error, loading, isAuthenticated, isAdmin, loadFromStorage, signInWithGoogle, loginWithToken, logout }
})