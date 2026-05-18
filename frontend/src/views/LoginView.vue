<template>
  <div class="max-w-sm mx-auto py-12">
    <div class="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
      <h1 class="text-xl font-semibold text-gray-900 mb-1">Sign in</h1>
      <p class="text-sm text-gray-500 mb-6">Sign in with your authorised Google account.</p>

      <div v-if="errorMessage" class="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2">
        {{ errorMessage }}
      </div>

      <button @click="signIn"
        class="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-2.5
               text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      <p class="text-xs text-center text-gray-400 mt-6">
        Don't have access? Ask an administrator to add your Gmail to the allow list.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const errorMessage = computed(() => {
  const e = route.query.error
  if (e === 'unauthorized') return 'This email is not authorised. Ask an administrator to add you.'
  if (e === 'disabled')     return 'Your account has been disabled.'
  if (e === 'auth_failed')  return 'Sign-in failed. Please try again.'
  return null
})

function signIn() {
  window.location.href = `${import.meta.env.VITE_API_URL}/api/v1/auth/google/redirect`
}
</script>
