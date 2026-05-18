<template>
  <header v-if="auth.isAuthenticated" class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
    <span class="font-semibold text-gray-900">Recipe Manager</span>
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-600">{{ auth.user?.name }}</span>
      <button
        @click="handleLogout"
        class="text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        Logout
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_PREFIX } from '@/config'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await auth.logout()
  router.push(`/${ADMIN_PREFIX}/login`)
}
</script>