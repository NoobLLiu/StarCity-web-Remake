<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  Search,
  Loader2,
  Plus,
  Pencil,
  LogOut,
  Users,
  Wallet,
  MessageSquare,
  Settings,
  Shield,
  Crown,
  Bell,
  CircleDot,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Lock,
  Globe,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import AppBadge from '@/components/AppBadge.vue'
import AppModal from '@/components/AppModal.vue'
import StateView from '@/components/StateView.vue'
import Pagination from '@/components/Pagination.vue'
import { useTeamStore } from '@/stores/team'
import { useAuthStore } from '@/stores/auth'
import { useNotifyStore } from '@/stores/notify'
import { ApiError } from '@/api/http'
import { formatNumber, formatTime, str, toNumber } from '@/utils/normalize'

const store = useTeamStore()
const auth = useAuthStore()
const notify = useNotifyStore()

// 已加入态的主 Tab
type InTeamTab = 'home' | 'messages' | 'funds' | 'manage'
const inTeamTab = ref<InTeamTab>('home')

// 管理页子 Tab
type ManageTab = 'members' | 'applications' | 'notice' | 'settings' | 'danger'
const manageTab = ref<ManageTab>('members')

// ===== 未加入态：公开排行榜 + 搜索 =====
const publicQuery = ref('')
const teamsPageSize = 20
const searchQuery = ref('')
const searchFocused = ref(false)

// ===== 已加入态：子页面数据 =====
const submitting = ref(false)
const messageText = ref('')
const messageMaxLen = 100

// ===== Modals =====
const createOpen = ref(false)
const createName = ref('')

const joinOpen = ref(false)
const joinTarget = ref<{ tid: string | number; name: string } | null>(null)

const depositOpen = ref(false)
const depositAmount = ref<number>(0)

const withdrawOpen = ref(false)
const withdrawAmount = ref<number>(0)

const disbandOpen = ref(false)
const disbandConfirm = ref('')

// 管理：编辑公告
const noticeEditText = ref('')
const noticeEditOpen = ref(false)

// 管理：改名
const renameOpen = ref(false)
const renameText = ref('')

// ========== Computed ==========
const inTeam = computed(() => store.inTeam)
const isOperator = computed(() => store.isOperator)
const me = computed(() => store.me)
const currencyName = computed(() => store.currencyName)

const membersSorted = computed(() => {
  const arr = [...store.members]
  // operator 在前
  arr.sort((a, b) => {
    const ao = a.operator || String(a.role ?? '').toUpperCase() === 'OPERATOR' ? 1 : 0
    const bo = b.operator || String(b.role ?? '').toUpperCase() === 'OPERATOR' ? 1 : 0
    if (ao !== bo) return bo - ao
    return str(a.name).localeCompare(str(b.name))
  })
  return arr
})

const hasNewMessages = computed(() => (store.messageState?.unread_messages ?? 0) > 0)
const hasNewNotice = computed(() => !!store.messageState?.unread_notice)

const roleText = computed(() => (isOperator.value ? '管理员' : '成员'))

interface InTeamTabItem {
  id: InTeamTab
  label: string
  icon: unknown
  dot?: boolean
  badge?: string
}

const inTeamTabs = computed<InTeamTabItem[]>(() => {
  const tabs: InTeamTabItem[] = [
    { id: 'home', label: '我的团队', icon: Users },
    {
      id: 'messages',
      label: '留言板',
      icon: MessageSquare,
      dot: hasNewMessages.value,
      badge: hasNewNotice.value ? '新公告' : undefined,
    },
    { id: 'funds', label: '团队资金', icon: Wallet },
  ]
  if (isOperator.value) {
    tabs.push({ id: 'manage', label: '管理', icon: Settings })
  }
  return tabs
})

// ========== 加载 ==========
async function initPage() {
  await store.fetchMe()
  if (inTeam.value) {
    await store.refreshMemberTabs()
  } else {
    await store.fetchTeams(1, teamsPageSize, publicQuery.value)
  }
}

onMounted(initPage)

// Tab 切换时触发对应加载与已读标记
watch(inTeamTab, async (t) => {
  if (!inTeam.value) return
  if (t === 'messages') {
    await store.fetchMessages(1, store.messagesPageSize).catch((e) => {
      notify.error(e instanceof ApiError ? e.message : '加载留言失败')
    })
    // 进入留言板 → 标记留言已读 + 公告已读（公告在主页也有，统一进留言板时更新）
    store.markMessagesRead().catch(() => {})
  } else if (t === 'funds') {
    await Promise.allSettled([
      store.loadFunds(store.myTid).catch((e) => notify.error(e instanceof ApiError ? e.message : '加载资金失败')),
      isOperator.value
        ? store.fetchLogs(1, store.logsPageSize).catch((e) => notify.error(e instanceof ApiError ? e.message : '加载流水失败'))
        : Promise.resolve(),
    ])
  } else if (t === 'manage' && isOperator.value) {
    // 进入管理页：刷新成员 + 申请 + 公告
    const tid = store.myTid
    await Promise.allSettled([
      store
        .loadMembers(tid)
        .catch((e) => notify.error(e instanceof ApiError ? e.message : '加载成员失败')),
      store
        .loadApplications(tid)
        .catch((e) => notify.error(e instanceof ApiError ? e.message : '加载申请失败')),
    ])
    noticeEditText.value = str(me.value.notice)
  }
})

// ========== 未加入态：公开团队 / 搜索 ==========
async function onSearchPublic() {
  try {
    await store.fetchTeams(1, teamsPageSize, publicQuery.value.trim())
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '搜索失败')
  }
}

async function onSearchTeams() {
  try {
    await store.fetchSearch(searchQuery.value.trim())
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '搜索失败')
  }
}

async function onChangeTeamsPage(p: number) {
  try {
    await store.fetchTeams(p, teamsPageSize, publicQuery.value.trim())
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '加载失败')
  }
}

function openJoinDialog(t: { tid: string | number; name: string }) {
  joinTarget.value = t
  joinOpen.value = true
}

// ========== 创建团队 ==========
async function onCreate() {
  const name = createName.value.trim()
  if (!name) {
    notify.error('请填写团队名')
    return
  }
  submitting.value = true
  try {
    await store.create(name)
    notify.success('团队创建成功')
    createOpen.value = false
    createName.value = ''
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '创建失败')
  } finally {
    submitting.value = false
  }
}

// ========== 申请加入 ==========
async function onJoin() {
  if (!joinTarget.value) return
  submitting.value = true
  try {
    await store.join(joinTarget.value.tid)
    notify.success('已提交申请，等待管理员审批')
    joinOpen.value = false
    joinTarget.value = null
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '申请失败')
  } finally {
    submitting.value = false
  }
}

// ========== 退出团队 ==========
async function onQuit() {
  if (!confirm('确认退出当前团队？OPERATOR 需要先降级为成员才能退出。')) return
  try {
    await store.quitTeam()
    notify.success('已退出团队')
    // 回到公开列表
    inTeamTab.value = 'home'
    store.fetchTeams(1, teamsPageSize, publicQuery.value).catch(() => {})
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '退出失败')
  }
}

// ========== 留言板 ==========
async function onSendMessage() {
  const content = messageText.value.trim()
  if (!content) return
  if (content.length > messageMaxLen) {
    notify.error(`留言不得超过 ${messageMaxLen} 字`)
    return
  }
  submitting.value = true
  try {
    await store.sendMessage(content)
    messageText.value = ''
    notify.success('留言已发布')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '发送失败')
  } finally {
    submitting.value = false
  }
}

async function onChangeMessagesPage(p: number) {
  try {
    await store.fetchMessages(p, store.messagesPageSize)
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '加载失败')
  }
}

// ========== 资金 ==========
async function onDeposit() {
  const amount = toNumber(depositAmount.value)
  if (amount <= 0) {
    notify.error('请输入大于 0 的金额')
    return
  }
  submitting.value = true
  try {
    await store.deposit(amount)
    notify.success(`已存入 ${formatNumber(amount)} ${currencyName.value}`)
    depositOpen.value = false
    depositAmount.value = 0
    if (isOperator.value) await store.fetchLogs(1, store.logsPageSize).catch(() => {})
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '存入失败')
  } finally {
    submitting.value = false
  }
}

async function onWithdraw() {
  if (!isOperator.value) {
    notify.error('需要管理员权限')
    return
  }
  const amount = toNumber(withdrawAmount.value)
  if (amount <= 0) {
    notify.error('请输入大于 0 的金额')
    return
  }
  submitting.value = true
  try {
    await store.withdraw(amount)
    notify.success(`已取出 ${formatNumber(amount)} ${currencyName.value}`)
    withdrawOpen.value = false
    withdrawAmount.value = 0
    await store.fetchLogs(1, store.logsPageSize).catch(() => {})
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '取出失败')
  } finally {
    submitting.value = false
  }
}

async function onChangeLogsPage(p: number) {
  try {
    await store.fetchLogs(p, store.logsPageSize)
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '加载失败')
  }
}

// ========== 管理：成员 ==========
async function onPromote(uuid: string) {
  try {
    await store.promote(uuid)
    notify.success('已任命为管理员')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onDemote(uuid: string) {
  try {
    await store.demote(uuid)
    notify.success('已降级为成员')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onRemoveMember(uuid: string, name: string) {
  if (!confirm(`确认移除成员「${name || uuid}」？`)) return
  try {
    await store.removeMember(uuid)
    notify.success('已移除成员')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

// ========== 管理：申请 ==========
async function onAccept(uuid: string) {
  try {
    await store.acceptApplication(uuid)
    notify.success('已通过申请')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onReject(uuid: string) {
  try {
    await store.rejectApplication(uuid)
    notify.success('已忽略申请')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

// ========== 管理：公告 ==========
async function onSaveNotice() {
  const text = noticeEditText.value
  if (text.length > 100) {
    notify.error('公告不得超过 100 字')
    return
  }
  submitting.value = true
  try {
    await store.updateNotice(text)
    notify.success('公告已更新')
    noticeEditOpen.value = false
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '保存失败')
  } finally {
    submitting.value = false
  }
}

// ========== 管理：设置 ==========
function openRename() {
  renameText.value = str(me.value.name)
  renameOpen.value = true
}

async function onSaveRename() {
  const name = renameText.value.trim()
  if (!name) {
    notify.error('请填写团队名')
    return
  }
  submitting.value = true
  try {
    await store.rename(name)
    notify.success('团队名已更新')
    renameOpen.value = false
    renameText.value = ''
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '改名失败')
  } finally {
    submitting.value = false
  }
}

async function onTogglePublic(pub: boolean) {
  try {
    await store.setPublic(pub)
    notify.success(pub ? '已设置为公开团队' : '已设置为私密团队')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onToggleFriendlyFire(allow: boolean) {
  try {
    await store.setFriendlyFire(allow)
    notify.success(allow ? '已开启允许友伤' : '已关闭友伤')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

// ========== 管理：解散 ==========
async function onDisband() {
  if (disbandConfirm.value !== str(me.value.name)) {
    notify.error('团队名不匹配，请输入完整团队名')
    return
  }
  submitting.value = true
  try {
    await store.disband(disbandConfirm.value)
    notify.success('团队已解散')
    disbandOpen.value = false
    disbandConfirm.value = ''
    inTeamTab.value = 'home'
    store.fetchTeams(1, teamsPageSize, publicQuery.value).catch(() => {})
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '解散失败')
  } finally {
    submitting.value = false
  }
}

// ========== 组件辅助 ==========
function roleBadge(r: unknown, op?: boolean) {
  if (op) return { label: '管理员', variant: 'primary' as const }
  const s = String(r ?? '').toUpperCase()
  if (s === 'OPERATOR') return { label: '管理员', variant: 'primary' as const }
  return { label: '成员', variant: 'muted' as const }
}

function logTypeLabel(t: unknown) {
  const s = String(t ?? '').toLowerCase()
  if (s.includes('deposit') || s.includes('存')) return '存入'
  if (s.includes('withdraw') || s.includes('取')) return '取出'
  return String(t ?? '—')
}

function logIsDeposit(t: unknown) {
  const s = String(t ?? '').toLowerCase()
  if (s.includes('deposit') || s.includes('存')) return true
  if (s.includes('withdraw') || s.includes('取')) return false
  return toNumber(me.value) >= 0
}
</script>

<template>
  <section class="flex-1 p-4 lg:p-5 space-y-4 min-w-0">
    <!-- ============ 未加入态 ============ -->
    <template v-if="!inTeam">
      <!-- 状态卡：未加入 -->
      <article class="bg-card border border-dashed border-border shadow-hard-muted p-6 grid gap-3 place-items-center text-center">
        <Users :size="28" class="text-muted-foreground" />
        <p class="text-sm text-muted-foreground">你尚未加入任何团队</p>
        <div class="flex items-center gap-2 flex-wrap justify-center">
          <AppButton variant="primary" size="md" @click="createOpen = true"><Plus :size="14" /> 创建团队</AppButton>
        </div>
      </article>

      <!-- 搜索：按 ID / 名称 -->
      <article class="bg-card border border-border shadow-hard-muted p-4 grid gap-4">
        <div>
          <h2 class="text-lg font-bold tracking-tight">团队搜索</h2>
          <p class="text-xs text-muted-foreground mt-1">按团队 ID 精确查找（可找到私密团队基本信息），或按名称包含匹配公开团队。</p>
        </div>
        <label class="flex items-center gap-2 min-h-[40px] px-3 bg-input border border-border shadow-hard-muted w-full">
          <Search :size="16" class="text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="输入团队 ID 或名称"
            class="bg-transparent border-0 outline-0 text-sm flex-1"
            @focus="searchFocused = true"
            @blur="nextTick(() => (searchFocused = false))"
            @keydown.enter="onSearchTeams"
          />
          <AppButton variant="muted" size="sm" @click="onSearchTeams">搜索</AppButton>
        </label>
        <StateView
          v-if="searchQuery.trim() || (searchFocused && store.searchResults.length)"
          :loading="store.searchLoading"
          :empty="!store.searchResults.length"
          empty-text="未找到匹配的团队"
        >
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="text-[11px] uppercase text-muted-foreground tracking-wider text-left border-b border-border">
                  <th class="py-2 pr-4">团队</th>
                  <th class="py-2 pr-4">队长</th>
                  <th class="py-2 pr-4">成员</th>
                  <th class="py-2 pr-4">公开</th>
                  <th class="py-2">操作</th>
                </tr>
              </thead>
              <tbody class="align-middle">
                <tr v-for="t in store.searchResults" :key="String(t.tid)" class="border-b border-border">
                  <td class="py-2 pr-4 font-medium">
                    <div class="flex items-center gap-2">
                      <span>{{ t.name }}</span>
                      <span class="text-[11px] text-muted-foreground">ID:{{ t.tid }}</span>
                    </div>
                  </td>
                  <td class="py-2 pr-4">{{ str(t.owner, '—') }}</td>
                  <td class="py-2 pr-4">{{ formatNumber(t.member_count) }}</td>
                  <td class="py-2 pr-4">
                    <AppBadge v-if="t.public" variant="accent"><Globe :size="12" /> 公开</AppBadge>
                    <AppBadge v-else variant="muted"><Lock :size="12" /> 私密</AppBadge>
                  </td>
                  <td class="py-2">
                    <AppButton variant="primary" size="sm" @click="openJoinDialog({ tid: t.tid, name: t.name })">申请加入</AppButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </StateView>
      </article>

      <!-- 公开团队排行榜 -->
      <article class="bg-card border border-border shadow-hard-muted p-4 grid gap-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold tracking-tight">公开团队</h2>
            <span class="text-xs text-muted-foreground">浏览可申请加入的公开团队</span>
          </div>
          <label class="flex items-center gap-2 min-h-[36px] px-3 bg-input border border-border shadow-hard-muted">
            <Search :size="16" class="text-muted-foreground" />
            <input
              v-model="publicQuery"
              type="text"
              placeholder="搜索公开团队名称"
              class="bg-transparent border-0 outline-0 text-sm w-44"
              @keydown.enter="onSearchPublic"
            />
            <AppButton variant="muted" size="sm" @click="onSearchPublic">查找</AppButton>
          </label>
        </div>
        <StateView
          :loading="store.teamsLoading && !store.teams.length"
          :error="store.teamsError"
          :empty="!store.teams.length"
          empty-text="暂无公开团队"
          @retry="onSearchPublic"
        >
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="text-[11px] uppercase text-muted-foreground tracking-wider text-left border-b border-border">
                  <th class="py-2 pr-4">团队名</th>
                  <th class="py-2 pr-4">队长</th>
                  <th class="py-2 pr-4">成员数</th>
                  <th class="py-2 pr-4">团队资金</th>
                  <th class="py-2 pr-4">成长值</th>
                  <th class="py-2">操作</th>
                </tr>
              </thead>
              <tbody class="align-middle">
                <tr v-for="t in store.teams" :key="String(t.tid)" class="border-b border-border">
                  <td class="py-2 pr-4 font-medium">{{ t.name }}</td>
                  <td class="py-2 pr-4">{{ str(t.owner, '—') }}</td>
                  <td class="py-2 pr-4">{{ formatNumber(t.member_count) }}</td>
                  <td class="py-2 pr-4">{{ formatNumber(t.funds) }} {{ str(t.currency_name, currencyName) }}</td>
                  <td class="py-2 pr-4">{{ formatNumber(t.activity) }}</td>
                  <td class="py-2">
                    <AppButton variant="primary" size="sm" @click="openJoinDialog({ tid: t.tid, name: t.name })">申请加入</AppButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pt-3">
            <Pagination
              :page="store.teamsPage"
              :page-size="store.teamsPageSize"
              :total="store.teamsTotal"
              @change="onChangeTeamsPage"
            />
          </div>
        </StateView>
      </article>
    </template>

    <!-- ============ 已加入态 ============ -->
    <template v-else>
      <!-- 顶部导航 Tab -->
      <article class="bg-card border border-border shadow-hard-muted p-4 grid gap-4">
        <div class="flex flex-wrap gap-2 border-b border-border pb-3">
          <button
            v-for="t in inTeamTabs"
            :key="t.id"
            type="button"
            class="h-9 px-4 text-sm grid place-items-center border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px relative"
            :class="
              inTeamTab === t.id
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-muted text-foreground border-ring'
            "
            @click="inTeamTab = t.id"
          >
            <component :is="t.icon as never" :size="14" class="mr-1 inline" />
            {{ t.label }}
            <span
              v-if="t.dot"
              class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive border border-background"
            ></span>
            <span
              v-if="t.badge"
              class="absolute -top-2 -right-2 text-[10px] px-1.5 h-4 grid place-items-center rounded bg-destructive text-destructive-foreground border border-background"
            >
              {{ t.badge }}
            </span>
          </button>
        </div>

        <!-- ========== 主页 ========== -->
        <div v-if="inTeamTab === 'home'" class="grid gap-4">
          <!-- 信息卡 -->
          <div class="grid gap-4">
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <span class="text-[11px] uppercase text-muted-foreground tracking-wider">我的团队</span>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <h2 class="text-xl font-bold tracking-tight">{{ me.name }}</h2>
                  <AppBadge variant="muted">ID: {{ me.tid }}</AppBadge>
                  <AppBadge v-if="me.public" variant="accent"><Globe :size="12" /> 公开</AppBadge>
                  <AppBadge v-else variant="muted"><Lock :size="12" /> 私密</AppBadge>
                  <AppBadge v-if="me.friendly_fire" variant="primary"><Shield :size="12" /> 允许友伤</AppBadge>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <AppBadge :variant="isOperator ? 'primary' : 'accent'">
                  <Crown v-if="isOperator" :size="12" class="mr-1" />
                  我的身份：{{ roleText }}
                </AppBadge>
                <AppButton variant="muted" size="sm" @click="store.markNoticeRead().catch(() => notify.success('公告已标为已读'))">
                  <Eye :size="12" /> 公告已读
                </AppButton>
                <AppButton v-if="!isOperator" variant="destructive" size="sm" @click="onQuit">
                  <LogOut :size="12" /> 退出团队
                </AppButton>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="p-3 border border-border bg-background">
                <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">队长</span>
                <span class="text-sm font-semibold mt-1 block">{{ str(me.owner, '—') }}</span>
              </div>
              <div class="p-3 border border-border bg-background">
                <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">成员数</span>
                <span class="text-sm font-semibold mt-1 block">
                  {{ formatNumber(me.member_count ?? membersSorted.length) }}
                </span>
              </div>
              <div class="p-3 border border-border bg-background">
                <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">团队资金</span>
                <span class="text-sm font-semibold mt-1 block">
                  {{ formatNumber(store.funds?.funds ?? me.funds) }} {{ currencyName }}
                </span>
              </div>
              <div class="p-3 border border-border bg-background">
                <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">创建时间</span>
                <span class="text-sm font-semibold mt-1 block">{{ formatTime(me.created_at) || '—' }}</span>
              </div>
            </div>

            <div class="p-3 border border-dashed border-border bg-muted">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                  <Bell :size="12" /> 公告
                  <AppBadge v-if="hasNewNotice" variant="primary">新</AppBadge>
                </span>
              </div>
              <p class="text-sm whitespace-pre-wrap">{{ str(me.notice, '暂无公告') }}</p>
            </div>
          </div>

          <!-- 在线队友（仅展示，不提供传送） -->
          <div class="p-3 border border-border bg-background">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <CircleDot :size="12" /> 在线队友（仅信息展示）
              </span>
              <span class="text-xs text-muted-foreground">{{ store.onlineMates.length }} 人在线</span>
            </div>
            <StateView :loading="store.onlineMatesLoading && !store.onlineMates.length" :empty="!store.onlineMates.length" empty-text="暂无队友在线">
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="m in store.onlineMates"
                  :key="String(m.uuid ?? m.name)"
                  class="px-2.5 h-8 grid place-items-center text-sm border border-ring bg-card shadow-hard-muted"
                >
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-chart-2 mr-1.5" aria-hidden="true"></span>
                  {{ str(m.name, m.uuid) }}
                </div>
              </div>
            </StateView>
          </div>

          <!-- 成员列表 -->
          <div class="p-3 border border-border bg-background grid gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Users :size="12" /> 成员列表
              </span>
              <span class="text-xs text-muted-foreground">管理员在前</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="text-[11px] uppercase text-muted-foreground tracking-wider text-left border-b border-border">
                    <th class="py-2 pr-4">玩家</th>
                    <th class="py-2 pr-4">职位</th>
                    <th class="py-2 pr-4">状态</th>
                    <th class="py-2 pr-4">加入时间</th>
                    <th class="py-2"></th>
                  </tr>
                </thead>
                <tbody class="align-middle">
                  <tr v-for="m in membersSorted" :key="m.uuid" class="border-b border-border">
                    <td class="py-2 pr-4 font-medium">{{ m.name || m.uuid }}</td>
                    <td class="py-2 pr-4">
                      <AppBadge :variant="roleBadge(m.role, m.operator).variant">
                        <Crown v-if="roleBadge(m.role, m.operator).label === '管理员'" :size="12" class="mr-1" />
                        {{ roleBadge(m.role, m.operator).label }}
                      </AppBadge>
                    </td>
                    <td class="py-2 pr-4">
                      <span class="inline-flex items-center gap-1 text-xs" :class="m.online ? 'text-chart-2' : 'text-muted-foreground'">
                        <span
                          class="h-1.5 w-1.5 rounded-full"
                          :class="m.online ? 'bg-chart-2' : 'bg-muted-foreground/40'"
                        ></span>
                        {{ m.online ? '在线' : '离线' }}
                      </span>
                    </td>
                    <td class="py-2 pr-4 text-muted-foreground">{{ formatTime(m.joined_at) || '—' }}</td>
                    <td class="py-2 text-right text-xs text-muted-foreground">
                      {{ m.uuid === auth.playerUuid ? '我' : '' }}
                    </td>
                  </tr>
                  <tr v-if="!membersSorted.length">
                    <td colspan="5" class="py-6 text-center text-muted-foreground text-sm">暂无成员数据</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ========== 留言板 ========== -->
        <div v-else-if="inTeamTab === 'messages'" class="grid gap-4">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 class="text-lg font-bold tracking-tight">留言板</h3>
              <p class="text-xs text-muted-foreground mt-1">留言不得超过 100 字，两次发布之间有冷却时间。</p>
            </div>
            <div class="flex items-center gap-2">
              <AppButton variant="muted" size="sm" @click="store.markMessagesRead().then(() => notify.success('留言已标记为已读')).catch(() => {})">
                <Eye :size="12" /> 标为已读
              </AppButton>
            </div>
          </div>

          <StateView
            :loading="store.messagesLoading && !store.messages.length"
            :empty="!store.messages.length"
            empty-text="暂无留言"
          >
            <div class="grid gap-2">
              <div
                v-for="(m, i) in store.messages"
                :key="`${String(m.sender_uuid)}-${m.timestamp ?? i}`"
                class="p-3 border border-border bg-background"
              >
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="font-semibold text-sm flex items-center gap-1.5">
                    <Users :size="12" class="text-muted-foreground" />
                    {{ m.sender || m.sender_uuid }}
                  </span>
                  <span class="text-[11px] text-muted-foreground">{{ formatTime(m.time) }}</span>
                </div>
                <p class="text-sm whitespace-pre-wrap break-words">{{ m.content }}</p>
              </div>
            </div>
            <div v-if="store.messagesTotal > store.messagesPageSize" class="pt-3">
              <Pagination
                :page="store.messagesPage"
                :page-size="store.messagesPageSize"
                :total="store.messagesTotal"
                @change="onChangeMessagesPage"
              />
            </div>
          </StateView>

          <form class="grid gap-2" @submit.prevent="onSendMessage">
            <textarea
              v-model="messageText"
              :maxlength="messageMaxLen"
              rows="3"
              placeholder="发表留言..."
              class="w-full px-3 py-2 bg-input border border-border text-sm outline-none focus:border-ring resize-none"
            ></textarea>
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="text-xs text-muted-foreground">{{ messageText.length }}/{{ messageMaxLen }}</span>
              <AppButton type="submit" variant="primary" :disabled="submitting || !messageText.trim()">
                <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 发布留言
              </AppButton>
            </div>
          </form>
        </div>

        <!-- ========== 团队资金 ========== -->
        <div v-else-if="inTeamTab === 'funds'" class="grid gap-4">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 class="text-lg font-bold tracking-tight">团队资金</h3>
              <p class="text-xs text-muted-foreground mt-1">全体成员可存入；仅管理员可取出。</p>
            </div>
            <div class="flex items-center gap-2">
              <AppButton variant="muted" size="sm" @click="depositOpen = true"><Wallet :size="12" /> 存入</AppButton>
              <AppButton v-if="isOperator" variant="primary" size="sm" @click="withdrawOpen = true">取出</AppButton>
            </div>
          </div>

          <div class="p-4 border border-border bg-background grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">当前余额</span>
              <span class="text-2xl font-bold tracking-tight mt-1 block">
                {{ formatNumber(store.funds?.funds ?? me.funds) }}
                <span class="text-sm font-medium text-muted-foreground">{{ currencyName }}</span>
              </span>
            </div>
            <div>
              <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">团队</span>
              <span class="text-sm font-semibold mt-1 block">{{ me.name }} (ID: {{ me.tid }})</span>
            </div>
            <div>
              <span class="text-[11px] uppercase text-muted-foreground tracking-wider block">币种</span>
              <span class="text-sm font-semibold mt-1 block">{{ currencyName }}</span>
            </div>
          </div>

          <!-- 资金流水：仅管理员 -->
          <div v-if="isOperator" class="p-3 border border-border bg-background grid gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Shield :size="12" /> 资金流水（仅管理员可见）
              </span>
            </div>
            <StateView :loading="store.logsLoading && !store.logs.length" :empty="!store.logs.length" empty-text="暂无资金流水">
              <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                  <thead>
                    <tr class="text-[11px] uppercase text-muted-foreground tracking-wider text-left border-b border-border">
                      <th class="py-2 pr-4">时间</th>
                      <th class="py-2 pr-4">类型</th>
                      <th class="py-2 pr-4">原因</th>
                      <th class="py-2 pr-4 text-right">前余额</th>
                      <th class="py-2 pr-4 text-right">金额</th>
                      <th class="py-2 text-right">后余额</th>
                    </tr>
                  </thead>
                  <tbody class="align-middle">
                    <tr v-for="(l, i) in store.logs" :key="`${l.timestamp ?? i}`" class="border-b border-border">
                      <td class="py-2 pr-4 text-muted-foreground">{{ formatTime(l.time) || '—' }}</td>
                      <td class="py-2 pr-4">
                        <AppBadge :variant="logIsDeposit(l.type) ? 'primary' : 'destructive'">
                          <TrendingUp v-if="logIsDeposit(l.type)" :size="12" class="mr-1" />
                          <TrendingDown v-else :size="12" class="mr-1" />
                          {{ logTypeLabel(l.type) }}
                        </AppBadge>
                      </td>
                      <td class="py-2 pr-4">{{ str(l.reason ?? l.note, '—') }}</td>
                      <td class="py-2 pr-4 text-right font-mono">{{ formatNumber(l.balance_before) }}</td>
                      <td
                        class="py-2 pr-4 text-right font-medium"
                        :class="logIsDeposit(l.type) ? 'text-chart-1' : 'text-destructive'"
                      >
                        {{ logIsDeposit(l.type) ? '+' : '-' }}{{ formatNumber(l.amount) }}
                      </td>
                      <td class="py-2 text-right font-mono">{{ formatNumber(l.balance_after) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="store.logsTotal > store.logsPageSize" class="pt-3">
                <Pagination
                  :page="store.logsPage"
                  :page-size="store.logsPageSize"
                  :total="store.logsTotal"
                  @change="onChangeLogsPage"
                />
              </div>
            </StateView>
          </div>
          <div v-else class="p-4 border border-dashed border-border bg-muted text-sm text-muted-foreground text-center">
            <EyeOff :size="16" class="inline mr-1" /> 资金流水仅团队管理员可见。
          </div>
        </div>

        <!-- ========== 管理（仅 OPERATOR） ========== -->
        <div v-else-if="inTeamTab === 'manage' && isOperator" class="grid gap-4">
          <div class="flex flex-wrap gap-2 border-b border-border pb-3">
            <button
              v-for="t in ([
                { id: 'members', label: '成员管理' },
                { id: 'applications', label: '申请管理' },
                { id: 'notice', label: '公告编辑' },
                { id: 'settings', label: '团队设置' },
                { id: 'danger', label: '解散团队' },
              ] as const)"
              :key="t.id"
              type="button"
              class="h-9 px-4 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px"
              :class="
                manageTab === t.id
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'bg-muted text-foreground border-ring'
              "
              @click="manageTab = t.id"
            >
              {{ t.label }}
            </button>
          </div>

          <!-- 成员管理 -->
          <div v-if="manageTab === 'members'" class="grid gap-3">
            <div class="overflow-x-auto">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="text-[11px] uppercase text-muted-foreground tracking-wider text-left border-b border-border">
                    <th class="py-2 pr-4">玩家</th>
                    <th class="py-2 pr-4">职位</th>
                    <th class="py-2 pr-4">在线</th>
                    <th class="py-2">操作</th>
                  </tr>
                </thead>
                <tbody class="align-middle">
                  <tr v-for="m in membersSorted" :key="m.uuid" class="border-b border-border">
                    <td class="py-2 pr-4 font-medium">{{ m.name || m.uuid }}</td>
                    <td class="py-2 pr-4">
                      <AppBadge :variant="roleBadge(m.role, m.operator).variant">
                        {{ roleBadge(m.role, m.operator).label }}
                      </AppBadge>
                    </td>
                    <td class="py-2 pr-4">
                      <span :class="m.online ? 'text-chart-2' : 'text-muted-foreground'" class="text-xs">
                        {{ m.online ? '在线' : '离线' }}
                      </span>
                    </td>
                    <td class="py-2">
                      <div class="flex items-center gap-2 flex-wrap">
                        <template v-if="m.uuid !== auth.playerUuid">
                          <AppButton
                            v-if="!m.operator && String(m.role ?? '').toUpperCase() !== 'OPERATOR'"
                            variant="primary"
                            size="sm"
                            @click="onPromote(m.uuid)"
                          >
                            <Crown :size="12" /> 任命管理员
                          </AppButton>
                          <AppButton
                            v-else
                            variant="muted"
                            size="sm"
                            @click="onDemote(m.uuid)"
                          >
                            降级
                          </AppButton>
                          <AppButton variant="destructive" size="sm" @click="onRemoveMember(m.uuid, str(m.name, m.uuid))">
                            <Trash2 :size="12" /> 移出
                          </AppButton>
                        </template>
                        <span v-else class="text-xs text-muted-foreground">我</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!membersSorted.length">
                    <td colspan="4" class="py-6 text-center text-muted-foreground text-sm">暂无成员数据</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-muted-foreground">
              规则：至少保留 1 名管理员；管理员不能直接被移出或退出，需要先降级为成员。
            </p>
          </div>

          <!-- 申请管理 -->
          <div v-else-if="manageTab === 'applications'" class="grid gap-3">
            <StateView :empty="!store.applications.length" empty-text="暂无待处理申请">
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
                        <div class="flex items-center gap-2">
                          <AppButton variant="primary" size="sm" @click="onAccept(a.applicant_uuid)">
                            <CheckCircle2 :size="12" /> 通过
                          </AppButton>
                          <AppButton variant="muted" size="sm" @click="onReject(a.applicant_uuid)">
                            <XCircle :size="12" /> 忽略
                          </AppButton>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </StateView>
          </div>

          <!-- 公告编辑 -->
          <div v-else-if="manageTab === 'notice'" class="grid gap-3">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">公告内容（≤ 100 字）</span>
              <textarea
                v-model="noticeEditText"
                rows="5"
                maxlength="100"
                class="w-full px-3 py-2 bg-input border border-border text-sm outline-none focus:border-ring resize-none"
                placeholder="输入团队公告，留空即清除公告"
              ></textarea>
              <span class="text-xs text-muted-foreground mt-1 block">{{ noticeEditText.length }}/100</span>
            </label>
            <div class="flex items-center gap-2">
              <AppButton variant="primary" @click="onSaveNotice" :disabled="submitting">
                <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 保存公告
              </AppButton>
            </div>
          </div>

          <!-- 设置 -->
          <div v-else-if="manageTab === 'settings'" class="grid gap-4">
            <div class="p-3 border border-border bg-background grid gap-3">
              <span class="text-xs font-semibold uppercase text-muted-foreground">改名</span>
              <div class="flex items-center gap-2 flex-wrap">
                <input
                  v-model="renameText"
                  type="text"
                  placeholder="新团队名（2-10 字且唯一）"
                  class="flex-1 min-w-[220px] h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                />
                <AppButton variant="primary" size="sm" @click="openRename"><Pencil :size="12" /> 确认改名</AppButton>
              </div>
            </div>

            <div class="p-3 border border-border bg-background grid gap-3">
              <span class="text-xs font-semibold uppercase text-muted-foreground">可见性</span>
              <label class="flex items-center justify-between gap-2 p-2 border border-ring bg-card">
                <div>
                  <div class="text-sm font-semibold flex items-center gap-2">
                    <Globe :size="14" /> 公开团队
                  </div>
                  <div class="text-xs text-muted-foreground">公开后会出现在「公开团队」排行榜中，其他玩家可直接申请加入。</div>
                </div>
                <AppButton
                  :variant="me.public ? 'primary' : 'muted'"
                  size="sm"
                  @click="onTogglePublic(!me.public)"
                >
                  {{ me.public ? '已公开：点击设为私密' : '私密：点击设为公开' }}
                </AppButton>
              </label>
            </div>

            <div class="p-3 border border-border bg-background grid gap-3">
              <span class="text-xs font-semibold uppercase text-muted-foreground">对战规则</span>
              <label class="flex items-center justify-between gap-2 p-2 border border-ring bg-card">
                <div>
                  <div class="text-sm font-semibold flex items-center gap-2">
                    <Shield :size="14" /> 允许友伤
                  </div>
                  <div class="text-xs text-muted-foreground">开启后，团队成员之间的 PvP 伤害将不再被自动保护（具体以游戏内规则为准）。</div>
                </div>
                <AppButton
                  :variant="me.friendly_fire ? 'primary' : 'muted'"
                  size="sm"
                  @click="onToggleFriendlyFire(!me.friendly_fire)"
                >
                  {{ me.friendly_fire ? '已开启：点击关闭' : '已关闭：点击开启' }}
                </AppButton>
              </label>
            </div>
          </div>

          <!-- 解散 -->
          <div v-else-if="manageTab === 'danger'" class="grid gap-3">
            <div class="p-4 border border-destructive/40 bg-destructive/10 grid gap-3">
              <div class="flex items-center gap-2">
                <Trash2 :size="18" class="text-destructive" />
                <span class="text-sm font-semibold text-destructive">危险操作：解散团队</span>
              </div>
              <p class="text-sm text-destructive/90">
                解散后团队数据（包括所有留言、资金流水等）会被删除，成员将回到未加入状态。此操作不可撤销！
              </p>
              <AppButton variant="destructive" size="sm" class="justify-self-start" @click="disbandOpen = true">
                解散当前团队
              </AppButton>
            </div>
          </div>
        </div>
      </article>
    </template>

    <!-- ========== Modals ========== -->

    <!-- 创建团队 -->
    <AppModal :open="createOpen" title="创建团队" @update:open="(v) => (createOpen = v)">
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">团队名</span>
          <input
            v-model="createName"
            type="text"
            maxlength="10"
            class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
            placeholder="2-10 字，唯一"
          />
        </label>
        <ul class="text-xs text-muted-foreground list-disc pl-5 space-y-1">
          <li>名称长度 2-10 字且唯一。</li>
          <li>创建需要玩家在线，并扣除创建费用（默认 10000 {{ currencyName }}，以服务端实际配置为准）。</li>
          <li>创建者自动成为管理员（OPERATOR）。</li>
        </ul>
      </div>
      <template #footer>
        <AppButton variant="muted" size="md" @click="createOpen = false">取消</AppButton>
        <AppButton variant="primary" size="md" :disabled="submitting" @click="onCreate">
          <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 创建
        </AppButton>
      </template>
    </AppModal>

    <!-- 申请加入 -->
    <AppModal :open="joinOpen" title="申请加入团队" @update:open="(v) => (joinOpen = v)">
      <div class="space-y-3">
        <p class="text-sm">
          你正在申请加入团队
          <span class="font-semibold">「{{ joinTarget?.name }}」(ID: {{ joinTarget?.tid }})</span>。
        </p>
        <p class="text-xs text-muted-foreground">
          提交后团队管理员会收到申请；若你已加入其它团队，需要先退出才能申请。
        </p>
      </div>
      <template #footer>
        <AppButton variant="muted" size="md" @click="joinOpen = false">取消</AppButton>
        <AppButton variant="primary" size="md" :disabled="submitting" @click="onJoin">
          <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 提交申请
        </AppButton>
      </template>
    </AppModal>

    <!-- 存入资金 -->
    <AppModal :open="depositOpen" title="存入团队资金" @update:open="(v) => (depositOpen = v)">
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">存入金额（{{ currencyName }}）</span>
          <input
            v-model.number="depositAmount"
            type="number"
            min="1"
            step="1"
            class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
            placeholder="请输入正整数"
          />
        </label>
        <p class="text-xs text-muted-foreground">
          该操作要求玩家在线；金额必须为正整数。存入后管理员会收到提醒，并写入资金流水。
        </p>
      </div>
      <template #footer>
        <AppButton variant="muted" size="md" @click="depositOpen = false">取消</AppButton>
        <AppButton variant="primary" size="md" :disabled="submitting" @click="onDeposit">
          <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 确认存入
        </AppButton>
      </template>
    </AppModal>

    <!-- 取出资金 -->
    <AppModal :open="withdrawOpen" title="取出团队资金（仅管理员）" @update:open="(v) => (withdrawOpen = v)">
      <div class="space-y-3">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">取出金额（{{ currencyName }}）</span>
          <input
            v-model.number="withdrawAmount"
            type="number"
            min="1"
            step="1"
            class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
            placeholder="请输入正整数"
          />
        </label>
        <p class="text-xs text-muted-foreground">
          当前团队余额：
          <span class="font-semibold">{{ formatNumber(store.funds?.funds ?? me.funds) }} {{ currencyName }}</span>。
          取出金额不得超过团队余额；操作要求玩家在线。
        </p>
      </div>
      <template #footer>
        <AppButton variant="muted" size="md" @click="withdrawOpen = false">取消</AppButton>
        <AppButton variant="primary" size="md" :disabled="submitting" @click="onWithdraw">
          <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 确认取出
        </AppButton>
      </template>
    </AppModal>

    <!-- 编辑公告（管理页中打开二次确认式弹窗） -->
    <AppModal :open="noticeEditOpen" title="编辑公告" width="max-w-lg" @update:open="(v) => (noticeEditOpen = v)">
      <textarea
        v-model="noticeEditText"
        rows="5"
        maxlength="100"
        class="w-full px-3 py-2 bg-input border border-border text-sm outline-none focus:border-ring resize-none"
        placeholder="输入团队公告，留空即清除公告"
      ></textarea>
      <span class="text-xs text-muted-foreground mt-1 block">{{ noticeEditText.length }}/100</span>
      <template #footer>
        <AppButton variant="muted" size="md" @click="noticeEditOpen = false">取消</AppButton>
        <AppButton variant="primary" size="md" :disabled="submitting" @click="onSaveNotice">
          <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 保存
        </AppButton>
      </template>
    </AppModal>

    <!-- 改名 -->
    <AppModal :open="renameOpen" title="团队改名" @update:open="(v) => (renameOpen = v)">
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">新团队名</span>
        <input
          v-model="renameText"
          type="text"
          maxlength="10"
          class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
          placeholder="2-10 字且唯一"
        />
      </label>
      <template #footer>
        <AppButton variant="muted" size="md" @click="renameOpen = false">取消</AppButton>
        <AppButton variant="primary" size="md" :disabled="submitting" @click="onSaveRename">
          <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 保存
        </AppButton>
      </template>
    </AppModal>

    <!-- 解散 -->
    <AppModal :open="disbandOpen" title="解散团队" @update:open="(v) => (disbandOpen = v)">
      <div class="space-y-3">
        <p class="text-sm text-destructive">
          此操作不可撤销！解散后团队、留言、资金流水将全部删除。
        </p>
        <p class="text-sm">请输入团队名「{{ me.name }}」以确认。</p>
        <input
          v-model="disbandConfirm"
          type="text"
          class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
          placeholder="输入团队名"
        />
      </div>
      <template #footer>
        <AppButton variant="muted" size="md" @click="disbandOpen = false">取消</AppButton>
        <AppButton variant="destructive" size="md" :disabled="submitting" @click="onDisband">
          <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 解散
        </AppButton>
      </template>
    </AppModal>
  </section>
</template>
