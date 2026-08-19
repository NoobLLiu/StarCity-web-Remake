<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Send, Loader2 } from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import AppBadge from '@/components/AppBadge.vue'
import AppModal from '@/components/AppModal.vue'
import StateView from '@/components/StateView.vue'
import { useTicketStore } from '@/stores/ticket'
import { useNotifyStore } from '@/stores/notify'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/http'
import { formatTime } from '@/utils/normalize'
import type { TicketStatus } from '@/types'

const store = useTicketStore()
const notify = useNotifyStore()
const auth = useAuthStore()

const filter = ref<'ALL' | TicketStatus>('ALL')
const selectedId = ref<string | number | null>(null)
const createOpen = ref(false)
const replyText = ref('')
const subject = ref('')
const content = ref('')
const submitting = ref(false)
const replying = ref(false)

const filtered = computed(() =>
  store.list.filter((t) => filter.value === 'ALL' || t.status === filter.value),
)

const current = computed(() => store.current)

async function select(id: string | number) {
  selectedId.value = id
  await store.fetchDetail(id)
}

async function onCreate() {
  if (!subject.value.trim() || !content.value.trim()) {
    notify.error('请填写主题和内容')
    return
  }
  submitting.value = true
  try {
    await store.create({ subject: subject.value.trim(), content: content.value.trim() })
    notify.success('工单已创建')
    createOpen.value = false
    subject.value = ''
    content.value = ''
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '创建失败')
  } finally {
    submitting.value = false
  }
}

async function onReply() {
  if (!current.value || !replyText.value.trim()) return
  replying.value = true
  try {
    await store.reply(current.value.id, replyText.value.trim())
    replyText.value = ''
    notify.success('回复成功')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '回复失败')
  } finally {
    replying.value = false
  }
}

function statusVariant(s?: TicketStatus) {
  return s === 'OPEN' ? 'accent' : 'muted'
}

onMounted(async () => {
  await store.fetchList()
  const first = store.list[0]
  if (first) await select(first.id)
})

watch(filter, () => {
  const first = filtered.value[0]
  if (first) select(first.id)
})
</script>

<template>
  <!-- Page toolbar -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 lg:px-5 py-3 bg-card border-b border-border">
    <div class="flex flex-wrap gap-2" role="tablist" aria-label="工单筛选">
      <button
        v-for="f in (['ALL', 'OPEN', 'CLOSED'] as const)"
        :key="f"
        type="button"
        class="px-3 py-1.5 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px"
        :class="
          filter === f
            ? 'bg-primary text-primary-foreground border-transparent'
            : 'bg-card text-card-foreground border-border hover:bg-muted'
        "
        @click="filter = f"
      >
        {{ f === 'ALL' ? '全部' : f === 'OPEN' ? '处理中' : '已关闭' }}
      </button>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-sm text-muted-foreground">{{ filtered.length }} 条记录</span>
      <AppButton variant="primary" size="md" @click="createOpen = true">
        <Plus :size="14" /> 新建工单
      </AppButton>
    </div>
  </div>

  <section class="flex-1 p-4 lg:p-5 min-w-0">
    <div class="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
      <!-- List -->
      <article class="bg-card border border-border shadow-hard-muted p-4 space-y-3">
        <h2 class="text-lg font-bold tracking-tight">工单列表</h2>
        <StateView
          :loading="store.loading && !store.list.length"
          :error="store.error"
          :empty="!filtered.length"
          empty-text="没有工单"
          @retry="store.fetchList()"
        >
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground">主题</th>
                  <th class="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground">状态</th>
                  <th class="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground">最后更新</th>
                  <th class="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr
                  v-for="t in filtered"
                  :key="t.id"
                  class="hover:bg-muted cursor-pointer"
                  :class="selectedId === t.id ? 'bg-sidebar-accent' : ''"
                  @click="select(t.id)"
                >
                  <td class="px-3 py-2">{{ t.subject }}</td>
                  <td class="px-3 py-2">
                    <AppBadge :variant="statusVariant(t.status)">{{ t.status }}</AppBadge>
                  </td>
                  <td class="px-3 py-2 text-muted-foreground">{{ formatTime(t.updated_at ?? t.created_at) }}</td>
                  <td class="px-3 py-2">
                    <button type="button" class="text-sm text-accent underline">查看</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </StateView>
      </article>

      <!-- Detail -->
      <article class="bg-card border border-border shadow-hard-muted p-4 space-y-4">
        <div>
          <h2 class="text-lg font-bold tracking-tight">工单详情</h2>
          <span v-if="current" class="text-xs text-muted-foreground">#{{ current.id }}</span>
        </div>

        <StateView
          :loading="store.loading && !current"
          :error="store.error"
          :empty="!current"
          empty-text="选择左侧工单查看详情"
        >
          <div v-if="current" class="space-y-3">
            <div class="border border-border bg-background p-3 space-y-1">
              <div class="flex items-center gap-2">
                <AppBadge :variant="statusVariant(current.status)">{{ current.status }}</AppBadge>
                <span class="text-sm font-semibold">{{ current.subject }}</span>
              </div>
              <p class="text-xs text-muted-foreground">{{ current.player || auth.player }} · {{ formatTime(current.created_at) }}</p>
              <p class="text-sm whitespace-pre-wrap">{{ current.content }}</p>
            </div>

            <div
              v-for="(r, i) in current.replies || []"
              :key="i"
              class="border-l-4 p-3 space-y-1 bg-background"
              :class="r.is_admin ? 'border-primary' : 'border-accent'"
            >
              <div class="text-xs text-muted-foreground">
                {{ r.is_admin ? '管理员' : '玩家' }} · {{ formatTime(r.time) }}
              </div>
              <p class="text-sm whitespace-pre-wrap">{{ r.content }}</p>
            </div>

            <form class="flex gap-2 items-stretch" @submit.prevent="onReply">
              <input
                v-model="replyText"
                type="text"
                placeholder="输入回复..."
                aria-label="回复内容"
                :disabled="current.status === 'CLOSED'"
                class="flex-1 h-10 px-3 bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-ring"
              />
              <AppButton type="submit" variant="primary" :disabled="replying || current.status === 'CLOSED'">
                <Send v-if="!replying" :size="14" />
                <Loader2 v-else :size="14" class="animate-spin" />
                {{ replying ? '发送中' : '发送' }}
              </AppButton>
            </form>
            <p v-if="current.status === 'CLOSED'" class="text-xs text-muted-foreground">该工单已关闭，无法继续回复。</p>
          </div>
        </StateView>
      </article>
    </div>
  </section>

  <!-- Create modal -->
  <AppModal :open="createOpen" title="新建工单" width="max-w-lg" @update:open="(v) => (createOpen = v)">
    <div class="space-y-3">
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">主题</span>
        <input
          v-model="subject"
          type="text"
          class="w-full h-10 px-3 bg-input border border-border text-foreground text-sm outline-none focus:border-ring"
          placeholder="简要描述问题"
        />
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">内容</span>
        <textarea
          v-model="content"
          rows="5"
          class="w-full px-3 py-2 bg-input border border-border text-foreground text-sm outline-none focus:border-ring resize-none"
          placeholder="详细说明遇到的问题、坐标、时间等"
        />
      </label>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="createOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="submitting" @click="onCreate">
        <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 提交
      </AppButton>
    </template>
  </AppModal>
</template>
