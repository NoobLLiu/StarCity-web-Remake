<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotifyStore } from '@/stores/notify'
import { ApiError } from '@/api/http'

const auth = useAuthStore()
const notify = useNotifyStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const showPwd = ref(false)

async function onSubmit() {
  if (!email.value.trim() || !password.value) {
    notify.error('请填写邮箱和密码')
    return
  }
  try {
    await auth.login(email.value.trim(), password.value)
    await auth.fetchMe()
    notify.success(`欢迎回来，${auth.player}`)
    const redirect = (route.query.redirect as string) || '/portal/home'
    router.replace(redirect)
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : '登录失败，请稍后重试'
    notify.error(msg)
  }
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center p-4 bg-background">
    <section class="w-full max-w-sm border border-border bg-card p-6 shadow-hard">
      <header class="mb-6 text-center">
        <h1 class="text-2xl font-semibold tracking-tight text-card-foreground">StarCity</h1>
        <p class="mt-1 text-sm text-muted-foreground">Minecraft 服务器玩家门户</p>
      </header>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">邮箱</span>
          <span
            class="flex h-10 items-center gap-2 border border-border bg-input px-3 shadow-hard-muted focus-within:border-ring focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--ring)_22%,transparent),2px_2px_0px_0px_hsl(0_0%0%_/.5)]"
          >
            <input
              v-model="email"
              type="email"
              autocomplete="username"
              class="w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="name@example.com"
              required
            />
          </span>
        </label>

        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">密码</span>
          <span
            class="flex h-10 items-center gap-2 border border-border bg-input px-3 shadow-hard-muted focus-within:border-ring focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--ring)_22%,transparent),2px_2px_0px_0px_hsl(0_0%0%_/.5)]"
          >
            <input
              v-model="password"
              :type="showPwd ? 'text' : 'password'"
              autocomplete="current-password"
              class="w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="输入密码"
              required
            />
            <button
              type="button"
              class="text-xs text-muted-foreground hover:text-foreground shrink-0"
              @click="showPwd = !showPwd"
            >
              {{ showPwd ? '隐藏' : '显示' }}
            </button>
          </span>
        </label>

        <button
          type="submit"
          :disabled="auth.loading"
          class="mt-2 flex h-9 w-full items-center justify-center border border-transparent bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-hard transition-transform duration-150 hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px active:shadow-hard-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 disabled:translate-x-0 disabled:translate-y-0"
        >
          {{ auth.loading ? '登录中…' : '登录' }}
        </button>
      </form>

      <p class="mt-4 text-center text-xs text-muted-foreground">使用游戏内 AuthMe 注册的邮箱和密码登录</p>
      <p class="mt-2 text-center text-xs text-muted-foreground">
        <RouterLink to="#" class="underline underline-offset-2 hover:text-foreground">忘记密码请联系管理员</RouterLink>
      </p>
    </section>
  </main>
</template>
