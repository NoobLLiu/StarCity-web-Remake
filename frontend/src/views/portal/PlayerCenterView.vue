<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Mail, ShieldCheck, Hash, User, Loader2 } from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import StateView from '@/components/StateView.vue'
import { useAuthStore } from '@/stores/auth'
import { marketApi } from '@/api/market'
import { teamApi } from '@/api/team'
import { ticketApi } from '@/api/ticket'
import { ApiError } from '@/api/http'
import { formatNumber } from '@/utils/normalize'

const auth = useAuthStore()

const marketWarehouse = ref<{ money: number } | null>(null)
const myTeam = ref<{ name?: string } | null>(null)
const openTickets = ref<number | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const results = await Promise.allSettled([
      marketApi.warehouse(),
      teamApi.me(),
      ticketApi.list(),
    ])
    if (results[0].status === 'fulfilled') marketWarehouse.value = results[0].value as { money: number }
    if (results[1].status === 'fulfilled') myTeam.value = results[1].value as { name?: string }
    if (results[2].status === 'fulfilled') {
      const list = results[2].value
      openTickets.value = Array.isArray(list) ? list.filter((t) => t.status === 'OPEN').length : 0
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="flex-1 p-4 lg:p-5 space-y-4 min-w-0">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h2 class="text-lg font-bold tracking-tight">玩家中心</h2>
      <AppButton variant="muted" size="sm" @click="load">刷新</AppButton>
    </div>

    <StateView :loading="loading" :error="error" @retry="load">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article class="bg-card border border-border shadow-hard-muted p-4 space-y-2">
          <div class="flex items-center gap-2 text-muted-foreground">
            <User :size="14" /><span class="text-[11px] uppercase tracking-wider">玩家名</span>
          </div>
          <strong class="text-2xl leading-none block">{{ auth.player || '—' }}</strong>
        </article>
        <article class="bg-card border border-border shadow-hard-muted p-4 space-y-2">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Mail :size="14" /><span class="text-[11px] uppercase tracking-wider">邮箱</span>
          </div>
          <strong class="text-base block truncate">{{ auth.email || '—' }}</strong>
        </article>
        <article class="bg-card border border-border shadow-hard-muted p-4 space-y-2">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Hash :size="14" /><span class="text-[11px] uppercase tracking-wider">UUID</span>
          </div>
          <strong class="text-xs block break-all font-mono">{{ auth.playerUuid || '—' }}</strong>
        </article>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <article class="bg-card border border-border shadow-hard-muted p-4 space-y-2">
          <span class="text-[11px] uppercase tracking-wider text-muted-foreground">市场仓库资金</span>
          <strong class="text-2xl leading-none block">{{ formatNumber(marketWarehouse?.money ?? 0) }} SC</strong>
          <RouterLink to="/portal/market" class="text-xs text-accent underline">前往市场</RouterLink>
        </article>
        <article class="bg-card border border-border shadow-hard-muted p-4 space-y-2">
          <span class="text-[11px] uppercase tracking-wider text-muted-foreground">我的团队</span>
          <strong class="text-2xl leading-none block">{{ myTeam?.name || '未加入' }}</strong>
          <RouterLink to="/portal/team" class="text-xs text-accent underline">前往团队</RouterLink>
        </article>
        <article class="bg-card border border-border shadow-hard-muted p-4 space-y-2">
          <span class="text-[11px] uppercase tracking-wider text-muted-foreground">未结工单</span>
          <strong class="text-2xl leading-none block">{{ openTickets ?? '—' }}</strong>
          <RouterLink to="/portal/tickets" class="text-xs text-accent underline">前往工单</RouterLink>
        </article>
      </div>

      <article v-if="auth.isOp" class="bg-card border border-border shadow-hard-muted p-4 space-y-2">
        <div class="flex items-center gap-2">
          <ShieldCheck :size="18" class="text-chart-1" />
          <h3 class="text-sm font-bold tracking-tight">OP 权限</h3>
        </div>
        <p class="text-xs text-muted-foreground">你的账号拥有 OP 权限，可直接访问管理后台工单收件箱。</p>
        <RouterLink to="/admin/tickets" class="inline-block">
          <AppButton variant="primary" size="sm">进入管理后台</AppButton>
        </RouterLink>
      </article>
    </StateView>

    <div v-if="loading" class="hidden">
      <Loader2 :size="16" class="animate-spin" />
    </div>
  </section>
</template>
