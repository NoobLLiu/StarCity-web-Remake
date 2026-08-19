<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { KeyRound, Loader2 } from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import { setAdminToken, getAdminToken } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useNotifyStore } from '@/stores/notify'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notify = useNotifyStore()

const token = ref(getAdminToken() ?? '')
const submitting = ref(false)

async function onEnter() {
  if (!token.value.trim()) {
    notify.error('请输入管理令牌')
    return
  }
  submitting.value = true
  setAdminToken(token.value.trim())
  // Validate by attempting to list admin tickets.
  try {
    const { adminTicketApi } = await import('@/api/admin')
    await adminTicketApi.list()
    notify.success('管理令牌有效')
    const redirect = (route.query.redirect as string) || '/admin/tickets'
    router.replace(redirect)
  } catch {
    notify.error('管理令牌无效或后端不可达')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-4 bg-background">
    <section class="w-full max-w-sm border border-border bg-card p-6 shadow-hard space-y-4">
      <header class="text-center space-y-1">
        <KeyRound class="mx-auto" :size="24" />
        <h1 class="text-xl font-bold tracking-tight">管理后台</h1>
        <p class="text-sm text-muted-foreground">输入管理令牌以访问工单收件箱</p>
      </header>

      <form class="space-y-3" @submit.prevent="onEnter">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin Token</span>
          <span
            class="flex h-10 items-center gap-2 border border-border bg-input px-3 shadow-hard-muted focus-within:border-ring"
          >
            <input
              v-model="token"
              type="password"
              autocomplete="off"
              class="w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="X-Admin-Token"
            />
          </span>
        </label>

        <AppButton type="submit" variant="primary" block :disabled="submitting">
          <Loader2 v-if="submitting" :size="14" class="animate-spin" />
          进入后台
        </AppButton>
      </form>

      <div class="border-t border-border pt-3 text-xs text-muted-foreground space-y-1">
        <p>OP 玩家可使用游戏内登录态直接访问：</p>
        <RouterLink to="/admin/tickets" class="underline hover:text-foreground">
          以玩家身份进入（需 OP）{{ auth.isOp ? ' ✓' : '' }}
        </RouterLink>
        <p class="pt-2">
          <RouterLink to="/portal/home" class="underline hover:text-foreground">返回门户</RouterLink>
        </p>
      </div>
    </section>
  </main>
</template>
