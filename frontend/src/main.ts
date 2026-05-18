import { createApp } from 'vue'
import { createPinia } from 'pinia'
import GoogleSignInPlugin from 'vue3-google-signin'
import router from '@/router'
import './style.css'
import App from './App.vue'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)
app.use(createPinia())

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
if (googleClientId) {
  app.use(GoogleSignInPlugin, { clientId: googleClientId })
} else {
  console.warn('VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.')
}

const auth = useAuthStore()
auth.loadFromStorage()

app.use(router)
app.mount('#app')