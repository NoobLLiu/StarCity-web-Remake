<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search, Loader2, Plus, Pencil, LogOut, Users, Wallet, MessageSquare, ScrollText } from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import AppBadge from '@/components/AppBadge.vue'
import AppModal from '@/components/AppModal.vue'
import StateView from '@/components/StateView.vue'
import { useTeamStore } from '@/stores/team'
import { useAuthStore } from '@/stores/auth'
import { useNotifyStore } from '@/stores/notify'
import { teamApi } from '@/api/team'
import { ApiError } from '@/api/http'
import { formatNumber, formatTime, str, toNumber } from '@/utils/normalize'
import type { TeamDetail } from '@/types'

const store = useTeamStore()
const auth = useAuthStore()
const notify = useNotifyStore()

const tab = ref<'members' | 'applications' | 'messages' | 'logs'>('members')
const publicQuery = ref('')

// Modals
const createOpen = ref(false)
const createName = ref('')
const noticeOpen = ref(false)
const noticeText = ref('')
const renameOpen = ref(false)
const renameText = ref('')
const fundsOpen = ref(false)
const fundsAmount = ref(0)
const fundsMode = ref<'deposit' | 'withdraw'>('deposit')
const disbandOpen = ref(false)
const disbandConfirm = ref('')
const messageText = ref('')
const submitting = ref(false)

const myTeam = computed<TeamDetail | null>(() => store.myTeam as TeamDetail | null)

const myRole = computed(() => str(myTeam.value?.my_role, '').toLowerCase())
const canManage = computed(() => {
  const r = myRole.value
  return r === 'leader' || r === 'owner' || r === 'admin' || r === '副队长' || r === '队长'
})

function roleBadge(r: unknown): { label: string; variant: 'primary' | 'accent' | 'muted' } {
  const s = str(r).toLowerCase()
  if (s.includes('leader') || s.includes('队长') || s.includes('owner')) return { label: str(r, '队长'), variant: 'primary' }
  if (s.includes('admin') || s.includes('副')) return { label: str(r, '副队长'), variant: 'accent' }
  return { label: str(r, '成员'), variant: 'muted' }
}

async function loadAll() {
  await Promise.allSettled([store.fetchMyTeam(), store.fetchPublic(1, 50, publicQuery.value)])
  if (myTeam.value?.tid) await store.loadTeamDetail(String(myTeam.value.tid))
}

async function onSearchPublic() {
  await store.fetchPublic(1, 50, publicQuery.value)
}

async function onCreate() {
  if (!createName.value.trim()) {
    notify.error('请填写团队名')
    return
  }
  submitting.value = true
  try {
    await teamApi.create(createName.value.trim())
    notify.success('团队已创建')
    createOpen.value = false
    createName.value = ''
    await loadAll()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '创建失败')
  } finally {
    submitting.value = false
  }
}

async function onJoin(tid: string | number) {
  try {
    await teamApi.join(tid)
    notify.success('已提交申请，等待队长审批')
    await loadAll()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '申请失败')
  }
}

async function onQuit() {
  if (!confirm('确认退出当前团队？')) return
  try {
    await teamApi.quit()
    notify.success('已退出团队')
    await loadAll()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '退出失败')
  }
}

async function onAccept(applicantUuid: string) {
  try {
    await teamApi.acceptApplication(String(myTeam.value?.tid), applicantUuid)
    notify.success('已接受申请')
    await store.refreshTabs()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onReject(applicantUuid: string) {
  try {
    await teamApi.rejectApplication(String(myTeam.value?.tid), applicantUuid)
    notify.success('已拒绝申请')
    await store.refreshTabs()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onPromote(uuid: string) {
  try {
    await teamApi.promote(String(myTeam.value?.tid), uuid)
    notify.success('已晋升')
    await store.refreshTabs()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onDemote(uuid: string) {
  try {
    await teamApi.demote(String(myTeam.value?.tid), uuid)
    notify.success('已降级')
    await store.refreshTabs()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onRemoveMember(uuid: string) {
  if (!confirm('确认移除该成员？')) return
  try {
    await teamApi.removeMember(String(myTeam.value?.tid), uuid)
    notify.success('已移除')
    await store.refreshTabs()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onSendMessage() {
  if (!messageText.value.trim()) return
  submitting.value = true
  try {
    await teamApi.message(String(myTeam.value?.tid), messageText.value.trim())
    messageText.value = ''
    await store.refreshTabs()
    notify.success('留言已发送')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '发送失败')
  } finally {
    submitting.value = false
  }
}

async function onSaveNotice() {
  try {
    await teamApi.notice(String(myTeam.value?.tid), noticeText.value)
    notify.success('公告已更新')
    noticeOpen.value = false
    await loadAll()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '更新失败')
  }
}

async function onSaveRename() {
  if (!renameText.value.trim()) {
    notify.error('请填写团队名')
    return
  }
  try {
    await teamApi.rename(String(myTeam.value?.tid), renameText.value.trim())
    notify.success('已改名')
    renameOpen.value = false
    await loadAll()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '改名失败')
  }
}

async function onTogglePublic() {
  try {
    await teamApi.setPublic(String(myTeam.value?.tid), !myTeam.value?.public)
    notify.success(myTeam.value?.public ? '已设为私有' : '已公开')
    await loadAll()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onToggleFriendlyFire() {
  try {
    await teamApi.setFriendlyFire(String(myTeam.value?.tid), !myTeam.value?.friendly_fire)
    notify.success('已更新友伤设置')
    await loadAll()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onFunds() {
  if (fundsAmount.value <= 0) {
    notify.error('请输入正数金额')
    return
  }
  try {
    if (fundsMode.value === 'deposit') {
      await teamApi.fundsDeposit(String(myTeam.value?.tid), fundsAmount.value)
    } else {
      await teamApi.fundsWithdraw(String(myTeam.value?.tid), fundsAmount.value)
    }
    notify.success('资金操作成功')
    fundsOpen.value = false
    fundsAmount.value = 0
    await store.refreshTabs()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onDisband() {
  if (disbandConfirm.value !== myTeam.value?.name) {
    notify.error('团队名不匹配')
    return
  }
  try {
    await teamApi.disband(String(myTeam.value?.tid), disbandConfirm.value)
    notify.success('团队已解散')
    disbandOpen.value = false
    disbandConfirm.value = ''
    await loadAll()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '解散失败')
  }
}

function openNotice() {
  noticeText.value = str(myTeam.value?.notice)
  noticeOpen.value = true
}
function openRename() {
  renameText.value = str(myTeam.value?.name)
  renameOpen.value = true
}

onMounted(loadAll)
</script>

<template>
  <section class="flex-1 p-4 lg:p-5 space-y-4 min-w-0">
    <!-- My team -->
    <StateView :loading="store.myTeamLoading && !store.myTeam" :error="store.myTeamError" @retry="loadAll">
      <article v-if="myTeam" class="bg-card border border-border shadow-hard-muted p-4 grid gap-4">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span class="text-[11px] uppercase text-muted-foreground tracking-wider">我的团队</span>
            <h2 class="text-xl font-bold tracking-tight mt-1">{{ myTeam.name }}</h2>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <AppButton variant="muted" size="sm" @click="openRename"><Pencil :size="12" /> 改名</AppButton>
            <AppButton variant="muted" size="sm" @click="openNotice">编辑公告</AppButton>
            <AppButton variant="muted" size="sm" @click="fundsMode = 'deposit'; fundsOpen = true"><Wallet :size="12" /> 资金</AppButton>
            <AppButton variant="destructive" size="sm" @click="onQuit"><LogOut :size="12" /> 退出</AppButton>
            <AppButton v-if="canManage" variant="destructive" size="sm" @click="disbandOpen = true">解散</AppButton>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-3 border border-border bg-background">
            <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">队长</span>
            <span class="text-sm font-semibold mt-1 block">{{ str(myTeam.owner, '—') }}</span>
          </div>
          <div class="p-3 border border-border bg-background">
            <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">我的身份</span>
            <span class="text-sm font-semibold mt-1 block">{{ str(myTeam.my_role, '成员') }}</span>
          </div>
          <div class="p-3 border border-border bg-background">
            <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">团队资金</span>
            <span class="text-sm font-semibold mt-1 block">{{ formatNumber(myTeam.funds) }} 币</span>
          </div>
          <div class="p-3 border border-border bg-background">
            <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">创建时间</span>
            <span class="text-sm font-semibold mt-1 block">{{ formatTime(myTeam.created_at) || '—' }}</span>
          </div>
        </div>
        <div class="p-3 border border-dashed border-border bg-muted">
          <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">公告</span>
          <p class="text-sm mt-1 whitespace-pre-wrap">{{ str(myTeam.notice, '暂无公告') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="!!myTeam.public" @change="onTogglePublic" />
            <span>公开</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="!!myTeam.friendly_fire" @change="onToggleFriendlyFire" />
            <span>允许友伤</span>
          </label>
        </div>
      </article>

      <article v-else class="bg-card border border-dashed border-border shadow-hard-muted p-6 grid gap-3 place-items-center text-center">
        <Users :size="28" class="text-muted-foreground" />
        <p class="text-sm text-muted-foreground">你尚未加入任何团队</p>
        <AppButton variant="primary" size="md" @click="createOpen = true"><Plus :size="14" /> 创建团队</AppButton>
      </article>
    </StateView>

    <!-- Tabs -->
    <article v-if="myTeam" class="bg-card border border-border shadow-hard-muted p-4 grid gap-4">
      <div class="flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          v-for="t in ([
            { id: 'members', label: '成员', icon: Users },
            { id: 'applications', label: '申请', icon: ScrollText },
            { id: 'messages', label: '留言', icon: MessageSquare },
            { id: 'logs', label: '资金流水', icon: Wallet },
          ] as const)"
          :key="t.id"
          type="button"
          class="h-9 px-4 text-sm grid place-items-center border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px"
          :class="tab === t.id ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="tab = t.id"
        >
          <component :is="t.icon" :size="14" class="mr-1 inline" /> {{ t.label }}
        </button>
      </div>

      <!-- Members -->
      <div v-if="tab === 'members'">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-[11px] uppercase text-muted-foreground tracking-wider text-left border-b border-border">
                <th class="py-2 pr-4">玩家</th>
                <th class="py-2 pr-4">职位</th>
                <th class="py-2 pr-4">加入时间</th>
                <th class="py-2">操作</th>
              </tr>
            </thead>
            <tbody class="align-middle">
              <tr v-for="m in store.members" :key="m.uuid" class="border-b border-border">
                <td class="py-2 pr-4 font-medium">{{ m.name || m.uuid }}</td>
                <td class="py-2 pr-4"><AppBadge :variant="roleBadge(m.role).variant">{{ roleBadge(m.role).label }}</AppBadge></td>
                <td class="py-2 pr-4 text-muted-foreground">{{ formatTime(m.joined_at) || '—' }}</td>
                <td class="py-2">
                  <div v-if="canManage && m.uuid !== auth.playerUuid" class="flex items-center gap-2">
                    <AppButton variant="muted" size="sm" @click="onPromote(m.uuid)">晋升</AppButton>
                    <AppButton variant="muted" size="sm" @click="onDemote(m.uuid)">降级</AppButton>
                    <AppButton variant="destructive" size="sm" @click="onRemoveMember(m.uuid)">移除</AppButton>
                  </div>
                  <span v-else class="text-xs text-muted-foreground">—</span>
                </td>
              </tr>
              <tr v-if="!store.members.length">
                <td colspan="4" class="py-6 text-center text-muted-foreground text-sm">暂无成员数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Applications -->
      <div v-else-if="tab === 'applications'">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-[11px] uppercase text-muted-foreground tracking-wider text-left border-b border-border">
                <th class="py-2 pr-4">申请人</th>
                <th class="py-2 pr-4">申请时间</th>
                <th class="py-2 pr-4">备注</th>
                <th class="py-2">操作</th>
              </tr>
            </thead>
            <tbody class="align-middle">
              <tr v-for="a in store.applications" :key="a.applicant_uuid" class="border-b border-border">
                <td class="py-2 pr-4 font-medium">{{ a.applicant || a.applicant_uuid }}</td>
                <td class="py-2 pr-4 text-muted-foreground">{{ formatTime(a.applied_at) || '—' }}</td>
                <td class="py-2 pr-4">{{ str(a.note, '—') }}</td>
                <td class="py-2">
                  <div v-if="canManage" class="flex items-center gap-2">
                    <AppButton variant="primary" size="sm" @click="onAccept(a.applicant_uuid)">接受</AppButton>
                    <AppButton variant="destructive" size="sm" @click="onReject(a.applicant_uuid)">拒绝</AppButton>
                  </div>
                </td>
              </tr>
              <tr v-if="!store.applications.length">
                <td colspan="4" class="py-6 text-center text-muted-foreground text-sm">暂无待处理申请</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Messages -->
      <div v-else-if="tab === 'messages'" class="grid gap-3">
        <div class="grid gap-2">
          <div v-for="(m, i) in store.messages" :key="i" class="p-3 border border-border bg-background">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="font-semibold text-sm">{{ m.sender || m.sender_uuid }}</span>
              <span class="text-[11px] text-muted-foreground">{{ formatTime(m.time) }}</span>
            </div>
            <p class="text-sm whitespace-pre-wrap">{{ m.content }}</p>
          </div>
          <div v-if="!store.messages.length" class="py-6 text-center text-muted-foreground text-sm border border-dashed border-border">暂无留言</div>
        </div>
        <form class="flex gap-2" @submit.prevent="onSendMessage">
          <input
            v-model="messageText"
            type="text"
            placeholder="发表留言..."
            class="flex-1 h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
          />
          <AppButton type="submit" variant="primary" :disabled="submitting">
            <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 发送
          </AppButton>
        </form>
      </div>

      <!-- Logs -->
      <div v-else>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-[11px] uppercase text-muted-foreground tracking-wider text-left border-b border-border">
                <th class="py-2 pr-4">时间</th>
                <th class="py-2 pr-4">类型</th>
                <th class="py-2 pr-4">备注</th>
                <th class="py-2 text-right">金额</th>
              </tr>
            </thead>
            <tbody class="align-middle">
              <tr v-for="(l, i) in store.logs" :key="i" class="border-b border-border">
                <td class="py-2 pr-4 text-muted-foreground">{{ formatTime(l.time) || '—' }}</td>
                <td class="py-2 pr-4">{{ str(l.type, '—') }}</td>
                <td class="py-2 pr-4">{{ str(l.note, '—') }}</td>
                <td class="py-2 text-right font-medium" :class="toNumber(l.amount) >= 0 ? 'text-chart-1' : 'text-destructive'">
                  {{ toNumber(l.amount) >= 0 ? '+' : '' }}{{ formatNumber(l.amount) }}
                </td>
              </tr>
              <tr v-if="!store.logs.length">
                <td colspan="4" class="py-6 text-center text-muted-foreground text-sm">暂无资金流水</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>

    <!-- Public teams -->
    <article class="bg-card border border-border shadow-hard-muted p-4 grid gap-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold tracking-tight">公开团队</h2>
          <span class="text-xs text-muted-foreground">浏览可申请加入的团队</span>
        </div>
        <label class="flex items-center gap-2 min-h-[36px] px-3 bg-input border border-border shadow-hard-muted">
          <Search :size="16" class="text-muted-foreground" />
          <input
            v-model="publicQuery"
            type="text"
            placeholder="搜索公开团队"
            class="bg-transparent border-0 outline-0 text-sm w-44"
            @keydown.enter="onSearchPublic"
          />
        </label>
      </div>
      <StateView :loading="store.publicLoading && !store.publicTeams.length" :error="store.publicError" :empty="!store.publicTeams.length" empty-text="没有公开团队" @retry="onSearchPublic">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-[11px] uppercase text-muted-foreground tracking-wider text-left border-b border-border">
                <th class="py-2 pr-4">团队名</th>
                <th class="py-2 pr-4">队长</th>
                <th class="py-2 pr-4">成员数</th>
                <th class="py-2 pr-4">资金</th>
                <th class="py-2">状态</th>
              </tr>
            </thead>
            <tbody class="align-middle">
              <tr v-for="t in store.publicTeams" :key="String(t.tid)" class="border-b border-border">
                <td class="py-2 pr-4 font-medium">{{ t.name }}</td>
                <td class="py-2 pr-4">{{ str(t.owner, '—') }}</td>
                <td class="py-2 pr-4">{{ formatNumber(t.member_count) }}</td>
                <td class="py-2 pr-4">{{ formatNumber(t.funds) }}</td>
                <td class="py-2">
                  <div v-if="t.tid === myTeam?.tid" class="flex items-center gap-2">
                    <AppBadge variant="primary">已加入</AppBadge>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <AppBadge variant="accent">可申请</AppBadge>
                    <AppButton variant="primary" size="sm" @click="onJoin(t.tid)">加入</AppButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </StateView>
    </article>

    <!-- Create modal -->
    <AppModal :open="createOpen" title="创建团队" @update:open="(v) => (createOpen = v)">
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">团队名</span>
        <input v-model="createName" type="text" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" placeholder="输入团队名称" />
      </label>
      <template #footer>
        <AppButton variant="muted" size="md" @click="createOpen = false">取消</AppButton>
        <AppButton variant="primary" size="md" :disabled="submitting" @click="onCreate">
          <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 创建
        </AppButton>
      </template>
    </AppModal>

    <!-- Notice modal -->
    <AppModal :open="noticeOpen" title="编辑公告" width="max-w-lg" @update:open="(v) => (noticeOpen = v)">
      <textarea v-model="noticeText" rows="5" class="w-full px-3 py-2 bg-input border border-border text-sm outline-none focus:border-ring resize-none" placeholder="输入团队公告"></textarea>
      <template #footer>
        <AppButton variant="muted" size="md" @click="noticeOpen = false">取消</AppButton>
        <AppButton variant="primary" size="md" @click="onSaveNotice">保存</AppButton>
      </template>
    </AppModal>

    <!-- Rename modal -->
    <AppModal :open="renameOpen" title="团队改名" @update:open="(v) => (renameOpen = v)">
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">新团队名</span>
        <input v-model="renameText" type="text" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
      </label>
      <template #footer>
        <AppButton variant="muted" size="md" @click="renameOpen = false">取消</AppButton>
        <AppButton variant="primary" size="md" @click="onSaveRename">保存</AppButton>
      </template>
    </AppModal>

    <!-- Funds modal -->
    <AppModal :open="fundsOpen" title="团队资金操作" @update:open="(v) => (fundsOpen = v)">
      <div class="space-y-3">
        <div class="flex gap-2">
          <button type="button" class="flex-1 h-9 text-sm border" :class="fundsMode === 'deposit' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'" @click="fundsMode = 'deposit'">存入</button>
          <button type="button" class="flex-1 h-9 text-sm border" :class="fundsMode === 'withdraw' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'" @click="fundsMode = 'withdraw'">取出</button>
        </div>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">金额</span>
          <input v-model.number="fundsAmount" type="number" min="0" step="1" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
        </label>
        <p class="text-xs text-muted-foreground">存取资金需要玩家在线；团队资金操作可能需要管理员权限。</p>
      </div>
      <template #footer>
        <AppButton variant="muted" size="md" @click="fundsOpen = false">取消</AppButton>
        <AppButton variant="primary" size="md" @click="onFunds">确认</AppButton>
      </template>
    </AppModal>

    <!-- Disband modal -->
    <AppModal :open="disbandOpen" title="解散团队" @update:open="(v) => (disbandOpen = v)">
      <div class="space-y-2">
        <p class="text-sm text-destructive">此操作不可撤销！请输入团队名「{{ myTeam?.name }}」以确认。</p>
        <input v-model="disbandConfirm" type="text" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" placeholder="输入团队名" />
      </div>
      <template #footer>
        <AppButton variant="muted" size="md" @click="disbandOpen = false">取消</AppButton>
        <AppButton variant="destructive" size="md" @click="onDisband">解散</AppButton>
      </template>
    </AppModal>
  </section>
</template>
