<script setup lang="ts">
import { Menu, Search, Sun, Moon, LogOut } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useNotifyStore } from '@/stores/notify'

defineProps<{ title: string; subtitle?: string }>()
const emit = defineEmits<{ menu: [] }>()

const auth = useAuthStore()
const theme = useThemeStore()
const notify = useNotifyStore()
const router = useRouter()

const search = ref('')

function onSearch() {
  const q = search.value.trim()
  if (!q) return
  notify.info(`搜索：${q}（按模块内搜索框进入对应页面筛选）`)
}

function logout() {
  auth.logout()
  router.replace({ name: 'login' })
  notify.success('已退出登录')
}
</script>

<template>
  <header class="flex items-center gap-4 px-4 lg:px-5 py-4 bg-card border-b border-border">
    <button
      type="button"
      class="lg:hidden w-9 h-9 grid place-items-center bg-muted text-foreground border border-ring shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px"
      aria-label="打开导航"
      @click="emit('menu')"
    >
      <Menu :size="18" />
    </button>

    <div class="flex-1 min-w-0">
      <h1 class="text-xl lg:text-2xl font-bold tracking-tight truncate">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-muted-foreground truncate">{{ subtitle }}</p>
    </div>

    <div class="flex items-center gap-3">
      <label class="hidden sm:flex items-center gap-2 h-9 px-3 bg-input border border-border shadow-hard-muted">
        <Search :size="16" class="text-muted-foreground" />
        <input
          v-model="search"
          type="text"
          placeholder="搜索..."
          class="bg-transparent border-0 outline-none text-sm w-32 lg:w-44 text-foreground placeholder:text-muted-foreground"
          @keydown.enter="onSearch"
        />
      </label>
      <button
        type="button"
        class="w-9 h-9 hidden sm:grid place-items-center bg-muted text-foreground border border-ring shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px"
        aria-label="切换主题"
        @click="theme.toggle()"
      >
        <component :is="theme.mode === 'dark' ? Sun : Moon" :size="16" />
      </button>
      <button
        type="button"
        class="w-9 h-9 hidden sm:grid place-items-center bg-muted text-foreground border border-ring shadow-hard-muted"
        aria-label="退出登录"
        @click="logout"
      >
        <LogOut :size="16" />
      </button>
      <div
        class="w-9 h-9 grid place-items-center bg-primary text-primary-foreground border border-ring shadow-hard-muted font-bold text-sm"
        aria-label="当前用户"
      >
        {{ auth.initials }}
      </div>
    </div>
  </header>
</template>
