<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Server, LineChart, Users, LifeBuoy, Loader2 } from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import { publicApi } from '@/api/public'
import { marketApi } from '@/api/market'
import { ticketApi } from '@/api/ticket'
import { ApiError } from '@/api/http'
import type { HealthInfo, PublicSettings, MarketInfo } from '@/types'
import { formatNumber, str } from '@/utils/normalize'

const router = useRouter()

const health = ref<HealthInfo | null>(null)
const settings = ref<PublicSettings | null>(null)
const marketInfo = ref<MarketInfo | null>(null)
const openTickets = ref<number | null>(null)
const loading = ref(true)
const errorMsg = ref<string | null>(null)

function notice(): string {
  if (!marketInfo.value) return '暂无公告'
  return str(marketInfo.value.notice ?? marketInfo.value.announcement, '暂无公告')
}

async function load() {
  loading.value = true
  errorMsg.value = null
  try {
    const [h, s, m] = await Promise.allSettled([
      publicApi.health(),
      publicApi.settings(),
      marketApi.info(),
    ])
    if (h.status === 'fulfilled') health.value = h.value
    if (s.status === 'fulfilled') settings.value = s.value
    if (m.status === 'fulfilled') marketInfo.value = m.value

    // Best-effort secondary metrics (don't block the page if they fail).
    await Promise.allSettled([
      ticketApi.list().then((list) => {
        openTickets.value = Array.isArray(list)
          ? list.filter((t) => t.status === 'OPEN').length
          : 0
      }),
    ])
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : '后端未就绪，无法加载概览'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <!-- Quick actions toolbar -->
  <div class="flex items-center justify-between gap-4 px-4 lg:px-5 py-3 border-b border-border bg-card/65">
    <span class="text-xs text-muted-foreground uppercase tracking-wider">快捷操作</span>
    <AppButton variant="primary" size="md" @click="router.push('/portal/tickets')">
      <Plus :size="14" /> 创建工单
    </AppButton>
  </div>

  <section class="flex-1 p-4 lg:p-5 space-y-4 min-w-0">
    <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
      <Loader2 :size="18" class="animate-spin" /> 加载概览…
    </div>
    <div v-else-if="errorMsg" class="flex flex-col items-center gap-3 py-12 text-center">
      <p class="text-sm text-destructive max-w-md">{{ errorMsg }}</p>
      <AppButton variant="muted" size="md" @click="load">重试</AppButton>
    </div>
    <template v-else>
      <!-- Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 space-y-2">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Users :size="14" /><span class="text-[11px] uppercase tracking-wider">在线玩家</span>
          </div>
          <strong class="text-3xl leading-none block">{{ formatNumber(health?.online_players ?? 0) }}</strong>
          <span class="text-xs font-semibold text-chart-1">{{ health?.status === 'ok' ? '服务正常' : '离线' }}</span>
        </article>
        <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 space-y-2">
          <div class="flex items-center gap-2 text-muted-foreground">
            <LineChart :size="14" /><span class="text-[11px] uppercase tracking-wider">市场</span>
          </div>
          <strong class="text-2xl leading-none block">StockExchange</strong>
          <span class="text-xs font-semibold text-muted-foreground">实时挂单交易</span>
        </article>
        <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 space-y-2">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Server :size="14" /><span class="text-[11px] uppercase tracking-wider">服务端</span>
          </div>
          <strong class="text-2xl leading-none block truncate">{{ str(settings?.server_name, 'StarCity') }}</strong>
          <span class="text-xs font-semibold text-muted-foreground">v{{ str(health?.version, '—') }}</span>
        </article>
        <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 space-y-2">
          <div class="flex items-center gap-2 text-muted-foreground">
            <LifeBuoy :size="14" /><span class="text-[11px] uppercase tracking-wider">未结工单</span>
          </div>
          <strong class="text-3xl leading-none block">{{ openTickets ?? '—' }}</strong>
          <span class="text-xs font-semibold text-destructive">{{ openTickets ? '待处理' : '无' }}</span>
        </article>
      </div>

      <!-- Announcement -->
      <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 space-y-2">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <h2 class="text-lg font-bold tracking-tight">服务器公告</h2>
          <span class="text-[11px] uppercase text-muted-foreground">GET /api/market/info</span>
        </div>
        <p class="text-sm text-muted-foreground whitespace-pre-wrap">{{ notice() }}</p>
      </article>

      <!-- Quick entries -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RouterLink
          v-for="card in [
            { to: '/portal/market', label: '交易市场', desc: '挂单与盘口' },
            { to: '/portal/team', label: '团队', desc: '我的团队与申请' },
            { to: '/portal/residences', label: '领地', desc: '权限与提示语' },
            { to: '/portal/tickets', label: '工单', desc: '提交与回复' },
          ]"
          :key="card.to"
          :to="card.to"
          class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 grid gap-1 transition-transform hover:-translate-x-px hover:-translate-y-px"
        >
          <span class="text-sm font-bold tracking-tight">{{ card.label }}</span>
          <span class="text-xs text-muted-foreground">{{ card.desc }}</span>
        </RouterLink>
      </div>
    </template>
  </section>
</template>
