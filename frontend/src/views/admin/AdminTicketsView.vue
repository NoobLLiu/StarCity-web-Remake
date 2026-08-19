<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import AppBadge from '@/components/AppBadge.vue'
import StateView from '@/components/StateView.vue'
import { adminTicketApi } from '@/api/admin'
import { useNotifyStore } from '@/stores/notify'
import { ApiError } from '@/api/http'
import { formatTime, str } from '@/utils/normalize'
import type { TicketDetail, TicketStatus, TicketSummary } from '@/types'

const route = useRoute()
const notify = useNotifyStore()

const list = ref<TicketSummary[]>([])
const current = ref<TicketDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)

const filter = ref<'ALL' | TicketStatus>('ALL')
const search = ref('')
const replyText = ref('')
const replying = ref(false)
const closing = ref(false)

const routeId = computed(() => (route.params.id as string | undefined) ?? null)

const filtered = computed(() =>
  list.value.filter((t) => {
    const matchStatus = filter.value === 'ALL' || t.status === filter.value
    const q = search.value.trim().toLowerCase()
    const matchQuery = !q || t.subject.toLowerCase().includes(q) || str(t.id).includes(q) || str(t.player).toLowerCase().includes(q)
    return matchStatus && matchQuery
  }),
)

async function fetchList() {
  loading.value = true
  error.value = null
  try {
    const data = await adminTicketApi.list()
    list.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
    list.value = []
  } finally {
    loading.value = false
  }
}

async function select(id: string | number) {
  detailLoading.value = true
  detailError.value = null
  current.value = null
  try {
    current.value = await adminTicketApi.detail(id)
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '加载失败'
  } finally {
    detailLoading.value = false
  }
}

async function onReply() {
  if (!current.value || !replyText.value.trim()) return
  replying.value = true
  try {
    await adminTicketApi.reply(current.value.id, replyText.value.trim())
    replyText.value = ''
    notify.success('回复成功')
    await select(current.value.id)
    await fetchList()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '回复失败')
  } finally {
    replying.value = false
  }
}

async function onToggleStatus() {
  if (!current.value) return
  const next: TicketStatus = current.value.status === 'OPEN' ? 'CLOSED' : 'OPEN'
  closing.value = true
  try {
    await adminTicketApi.setStatus(current.value.id, next)
    notify.success(next === 'OPEN' ? '已重新打开' : '已关闭工单')
    await select(current.value.id)
    await fetchList()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  } finally {
    closing.value = false
  }
}

function statusVariant(s?: TicketStatus) {
  return s === 'OPEN' ? 'primary' : 'muted'
}

onMounted(async () => {
  await fetchList()
  if (routeId.value) {
    await select(routeId.value)
  } else if (list.value[0]) {
    await select(list.value[0].id)
  }
})

watch(routeId, (id) => {
  if (id) select(id)
})
</script>

<template>
  <section class="flex-1 p-4 lg:p-5 space-y-4 min-w-0">
    <!-- Filters -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex gap-2">
        <button
          v-for="f in (['ALL', 'OPEN', 'CLOSED'] as const)"
          :key="f"
          type="button"
          class="px-3 py-1.5 text-sm border shadow-hard-muted transition-transform duration-150 hover:-translate-x-px hover:-translate-y-px"
          :class="filter === f ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-border'"
          @click="filter = f"
        >
          {{ f === 'ALL' ? '全部' : f }}
        </button>
      </div>
      <label class="flex items-center gap-2 px-3 py-2 bg-input border border-border shadow-hard-muted">
        <span class="text-muted-foreground">⌕</span>
        <input
          v-model="search"
          type="text"
          placeholder="搜索工单"
          class="bg-transparent border-0 outline-none text-foreground text-sm w-52 placeholder:text-muted-foreground"
        />
      </label>
    </div>

    <!-- Tickets table -->
    <div class="bg-card border border-border shadow-hard-muted overflow-hidden">
      <StateView :loading="loading && !list.length" :error="error" :empty="!filtered.length" empty-text="暂无工单" @retry="fetchList()">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                <th class="px-3 py-2 text-left whitespace-nowrap">工单ID</th>
                <th class="px-3 py-2 text-left whitespace-nowrap">主题</th>
                <th class="px-3 py-2 text-left whitespace-nowrap">玩家</th>
                <th class="px-3 py-2 text-left whitespace-nowrap">状态</th>
                <th class="px-3 py-2 text-left whitespace-nowrap">创建时间</th>
                <th class="px-3 py-2 text-left whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="t in filtered"
                :key="t.id"
                class="border-b border-border hover:bg-muted/30 cursor-pointer"
                :class="current?.id === t.id ? 'bg-sidebar-accent' : ''"
                @click="select(t.id)"
              >
                <td class="px-3 py-2.5 font-mono">{{ t.id }}</td>
                <td class="px-3 py-2.5">{{ t.subject }}</td>
                <td class="px-3 py-2.5">{{ t.player || '—' }}</td>
                <td class="px-3 py-2.5"><AppBadge :variant="statusVariant(t.status)">{{ t.status }}</AppBadge></td>
                <td class="px-3 py-2.5 font-mono text-xs">{{ formatTime(t.created_at) }}</td>
                <td class="px-3 py-2.5">
                  <AppButton variant="secondary" size="sm" @click.stop="select(t.id)">查看</AppButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </StateView>
    </div>

    <!-- Selected ticket detail -->
    <article v-if="current" class="bg-card border border-border shadow-hard-muted p-4 flex flex-col gap-4">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="grid gap-1">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-bold tracking-tight">{{ current.subject }}</h2>
            <span class="font-mono text-sm text-muted-foreground">#{{ current.id }}</span>
          </div>
          <div class="flex items-center gap-3 text-sm flex-wrap">
            <AppBadge :variant="statusVariant(current.status)">{{ current.status }}</AppBadge>
            <span class="text-muted-foreground">玩家: {{ current.player || '—' }}</span>
            <span class="text-muted-foreground">创建: {{ formatTime(current.created_at) }}</span>
          </div>
        </div>
        <AppButton
          variant="destructive"
          size="md"
          :disabled="closing"
          @click="onToggleStatus"
        >
          <Loader2 v-if="closing" :size="14" class="animate-spin" />
          {{ current.status === 'OPEN' ? '关闭工单' : '重新打开' }}
        </AppButton>
      </div>

      <div v-if="current.content" class="border-t border-border pt-4 flex flex-col gap-3">
        <div class="flex gap-3">
          <div class="w-8 h-8 grid place-items-center bg-muted text-foreground text-xs font-bold border border-border shrink-0">P</div>
          <div class="grid gap-1">
            <span class="text-xs text-muted-foreground">{{ current.player || '玩家' }} · {{ formatTime(current.created_at) }}</span>
            <p class="text-sm whitespace-pre-wrap">{{ current.content }}</p>
          </div>
        </div>
      </div>

      <div class="border-t border-border pt-4 flex flex-col gap-3">
        <div v-for="(r, i) in current.replies || []" :key="i" class="flex gap-3">
          <div
            class="w-8 h-8 grid place-items-center text-xs font-bold border shrink-0"
            :class="r.is_admin ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-border'"
          >
            {{ r.is_admin ? 'A' : 'P' }}
          </div>
          <div class="grid gap-1">
            <span class="text-xs text-muted-foreground">{{ r.is_admin ? 'Admin' : r.author || '玩家' }} · {{ formatTime(r.time) }}</span>
            <p class="text-sm whitespace-pre-wrap">{{ r.content }}</p>
          </div>
        </div>
        <p v-if="!(current.replies && current.replies.length)" class="text-sm text-muted-foreground">暂无回复</p>
      </div>

      <div class="border-t border-border pt-4 flex flex-col gap-2">
        <label class="text-xs uppercase text-muted-foreground">管理员回复</label>
        <textarea
          v-model="replyText"
          rows="3"
          placeholder="输入回复内容"
          class="w-full px-3 py-2 bg-input text-foreground text-sm border border-border outline-none resize-none placeholder:text-muted-foreground focus:border-ring"
        />
        <div class="flex justify-end">
          <AppButton variant="primary" size="md" :disabled="replying || !replyText.trim()" @click="onReply">
            <Loader2 v-if="replying" :size="14" class="animate-spin" />
            回复
          </AppButton>
        </div>
      </div>
    </article>

    <StateView v-else :loading="detailLoading" :error="detailError" empty empty-text="选择上方工单查看详情" />
  </section>
</template>
