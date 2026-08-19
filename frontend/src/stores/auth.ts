import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { setToken, clearToken, getToken } from '@/api/http'
import type { AuthInfo, MeInfo } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const player = ref<string>('')
  const playerUuid = ref<string>('')
  const email = ref<string>('')
  const isOp = ref<boolean>(false)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const initials = computed(() => (player.value ? player.value.slice(0, 2).toUpperCase() : 'SC'))

  function applyAuth(info: AuthInfo) {
    token.value = info.token
    player.value = info.player
    playerUuid.value = info.player_uuid
    email.value = info.email
    isOp.value = !!info.is_op
    setToken(info.token, 3600)
  }

  function applyMe(me: MeInfo) {
    player.value = me.player
    playerUuid.value = me.player_uuid
    email.value = me.email
    isOp.value = !!me.is_op
  }

  async function login(emailAddr: string, password: string) {
    loading.value = true
    try {
      const info = await authApi.login({ email: emailAddr, password })
      applyAuth(info)
      return info
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return null
    try {
      const me = await authApi.me()
      applyMe(me)
      return me
    } catch {
      logout()
      return null
    }
  }

  function logout() {
    token.value = null
    player.value = ''
    playerUuid.value = ''
    email.value = ''
    isOp.value = false
    clearToken()
  }

  return {
    token,
    player,
    playerUuid,
    email,
    isOp,
    loading,
    isLoggedIn,
    initials,
    applyAuth,
    applyMe,
    login,
    fetchMe,
    logout,
  }
})
