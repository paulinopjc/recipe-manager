<template>
  <div class="flex items-center justify-center min-h-screen">
    <p class="text-sm text-gray-400">{{ status }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_PREFIX } from '@/config'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const status = ref('Signing in…')

onMounted(async () => {
  const token = route.query.token as string
  const error = route.query.error as string

  if (error || !token) {
    await router.replace(`/${ADMIN_PREFIX}/login?error=${error ?? 'auth_failed'}`)
    return
  }

  const ok = await auth.loginWithToken(token)
  if (ok) {
    const redirect = (route.query.redirect as string) || `/${ADMIN_PREFIX}/recipes`
    await router.replace(redirect)
  } else {
    await router.replace(`/${ADMIN_PREFIX}/login?error=auth_failed`)
  }
})
</script>
