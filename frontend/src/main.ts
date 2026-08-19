import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { registerUnauthorizedHandler } from './api/http'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'
import './assets/styles/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Register the 401 handler so the interceptor can clear auth + bounce to login.
registerUnauthorizedHandler(() => {
  const auth = useAuthStore()
  if (auth.isLoggedIn) {
    auth.logout()
  }
  const current = router.currentRoute.value
  if (current.name !== 'login') {
    router.replace({ name: 'login', query: { redirect: current.fullPath } })
  }
})

// Initialise theme + restore user session before mounting.
useThemeStore()
const auth = useAuthStore()
if (auth.isLoggedIn) {
  // Fire and forget; the app mounts regardless so users see the UI quickly.
  void auth.fetchMe()
}

app.use(router)
app.mount('#app')
