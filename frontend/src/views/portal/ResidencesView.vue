<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Search, Loader2, RotateCcw, Home, Store, KeyRound, MapPin, Users, MessageSquare,
  Settings, Trash2, ArrowRightLeft, Tag, Ban, Shield, ShieldCheck, Crown, Box, Clock, Pencil,
} from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import AppBadge from '@/components/AppBadge.vue'
import AppModal from '@/components/AppModal.vue'
import StateView from '@/components/StateView.vue'
import Pagination from '@/components/Pagination.vue'
import { useResidenceStore } from '@/stores/residence'
import { useNotifyStore } from '@/stores/notify'
import { ApiError } from '@/api/http'
import { formatNumber, formatTime, str, toNumber } from '@/utils/normalize'
import type { FlagState, ResidenceDetail, ResidenceSummary } from '@/types'

const store = useResidenceStore()
const notify = useNotifyStore()

// ===== 主视图切换 =====
type MainView = 'list' | 'detail' | 'market' | 'rents'
const mainView = ref<MainView>('list')

// ===== 列表 =====
const mineOnly = ref(false)
const query = ref('')
const selectedName = ref<string | null>(null)

// ===== 管理页子 Tab =====
type ManageTab = 'basic' | 'flags' | 'player' | 'advanced' | 'market' | 'danger'
const manageTab = ref<ManageTab>('basic')

// ===== 玩家权限 =====
const selectedPlayer = ref<string>('')
const playerInput = ref('')

// ===== Modals =====
const renameOpen = ref(false)
const renameValue = ref('')
const enterMsg = ref('')
const leaveMsg = ref('')

const sellOpen = ref(false)
const sellPrice = ref<number>(0)

const rentSettingsOpen = ref(false)
const rentCost = ref<number>(0)
const rentDays = ref<number>(7)
const rentRenew = ref(true)
const rentStayMarket = ref(true)
const rentAutoPay = ref(false)

const mirrorOpen = ref(false)
const mirrorSource = ref('')

const deleteOpen = ref(false)
const deleteConfirm = ref('')

const transferOpen = ref(false)
const transferTarget = ref('')

const buyOpen = ref(false)
const buyTarget = ref<string>('')

const rentOpen = ref(false)
const rentTarget = ref<string>('')
const rentAutoPayChoice = ref(false)

const submitting = ref(false)

// ===== 派生 =====
const flagCats = computed(() => store.flagCategories)
const playerFlagCats = computed(() => store.playerFlagCategories)
const canManage = computed(() => store.canManage)
const economyEnabled = computed(() => store.current?.economy_enabled !== false)
const rentSystemEnabled = computed(() => store.current?.rent_system_enabled !== false)

const areasList = computed(() => {
  const c = store.current
  if (!c) return []
  const areas = c.areas_detail ?? (c.areas as unknown)
  if (Array.isArray(areas)) return areas
  if (areas && typeof areas === 'object') {
    // areas may be { name: {low, high} }
    return Object.entries(areas).map(([name, val]) => ({ name, ...(val as Record<string, unknown>) }))
  }
  return []
})

const subzonesList = computed(() => {
  const c = store.current
  if (!c) return []
  return (c.subzones_detail ?? c.subzones ?? []) as ResidenceSummary[]
})

const trustedPlayers = computed(() => {
  const c = store.current
  return (c?.trusted_players ?? []) as string[]
})

// ===== 加载 =====
async function loadList() {
  await store.fetchList({ mine: mineOnly.value, query: query.value })
}

onMounted(async () => {
  await loadList()
})

watch(mineOnly, () => loadList())

let searchTimer: number | undefined
function onSearchInput() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => loadList(), 350)
}

async function onPageChange(p: number) {
  store.page = p
  await loadList()
}

async function selectResidence(name: string) {
  selectedName.value = name
  mainView.value = 'detail'
  await store.fetchDetail(name)
  if (canManage.value) manageTab.value = 'basic'
}

async function goBackToList() {
  mainView.value = 'list'
  await loadList()
}

// ===== 详情 -> 管理 / 市场 / 租用 =====
async function onBuy() {
  if (!buyTarget.value) return
  submitting.value = true
  try {
    await store.buy(buyTarget.value)
    notify.success('购买成功')
    buyOpen.value = false
    await store.fetchMarket()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '购买失败')
  } finally {
    submitting.value = false
  }
}

async function onRent() {
  if (!rentTarget.value) return
  submitting.value = true
  try {
    await store.rent(rentTarget.value, rentAutoPayChoice.value)
    notify.success('租用成功')
    rentOpen.value = false
    await store.fetchMarket()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '租用失败')
  } finally {
    submitting.value = false
  }
}

// ===== 管理：基本 =====
function openRename() {
  renameValue.value = str(store.current?.name)
  renameOpen.value = true
}

async function onRename() {
  if (!selectedName.value) return
  const name = renameValue.value.trim()
  if (!name) {
    notify.error('请输入新名称')
    return
  }
  submitting.value = true
  try {
    await store.rename(selectedName.value, name)
    notify.success('领地已重命名')
    selectedName.value = name
    renameOpen.value = false
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '重命名失败')
  } finally {
    submitting.value = false
  }
}

async function onSaveMessages() {
  if (!selectedName.value) return
  submitting.value = true
  try {
    await store.setMessage(selectedName.value, 'enter', enterMsg.value)
    await store.setMessage(selectedName.value, 'leave', leaveMsg.value)
    notify.success('提示语已保存')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '保存失败')
  } finally {
    submitting.value = false
  }
}

// ===== 管理：全局权限 =====
async function onSetFlag(flag: string, state: FlagState) {
  if (!selectedName.value) return
  try {
    await store.setFlag(selectedName.value, flag, state)
    notify.success(`已设置 ${flag} = ${state === 'remove' ? '默认' : state}`)
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '设置失败')
  }
}

// ===== 管理：玩家权限 =====
async function onSelectPlayer(player: string) {
  selectedPlayer.value = player
  if (selectedName.value) {
    await store.fetchPlayerFlags(selectedName.value, player)
  }
}

async function onAddPlayer() {
  const name = playerInput.value.trim()
  if (!name) {
    notify.error('请输入玩家名')
    return
  }
  if (!selectedName.value) return
  await store.fetchPlayerFlags(selectedName.value, name)
  selectedPlayer.value = name
  playerInput.value = ''
}

async function onSetPlayerFlag(flag: string, state: FlagState) {
  if (!selectedName.value || !selectedPlayer.value) return
  try {
    await store.setPlayerFlag(selectedName.value, selectedPlayer.value, flag, state)
    notify.success(`已设置 ${flag} = ${state === 'remove' ? '默认' : state}`)
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '设置失败')
  }
}

async function onClearPlayer() {
  if (!selectedName.value || !selectedPlayer.value) return
  if (!confirm(`确认清空 ${selectedPlayer.value} 在此领地的全部权限？`)) return
  try {
    await store.clearPlayer(selectedName.value, selectedPlayer.value)
    selectedPlayer.value = ''
    notify.success('已清空该玩家权限')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

// ===== 管理：高级 =====
async function onApplyDefaults() {
  if (!selectedName.value) return
  if (!confirm(`确认将 ${selectedName.value} 重置为默认权限？此操作不可撤销。`)) return
  try {
    await store.applyDefaults(selectedName.value)
    notify.success('已重置为默认权限')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '重置失败')
  }
}

async function onMirror() {
  if (!selectedName.value) return
  const source = mirrorSource.value.trim()
  if (!source) {
    notify.error('请输入源领地名称')
    return
  }
  submitting.value = true
  try {
    await store.mirror(selectedName.value, source)
    notify.success('权限已镜像')
    mirrorOpen.value = false
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '镜像失败')
  } finally {
    submitting.value = false
  }
}

// ===== 管理：市场操作 =====
function openSell() {
  sellPrice.value = toNumber(store.current?.sell_price, 0)
  sellOpen.value = true
}

async function onSell() {
  if (!selectedName.value) return
  if (sellPrice.value <= 0) {
    notify.error('请输入正数价格')
    return
  }
  submitting.value = true
  try {
    await store.sell(selectedName.value, sellPrice.value)
    notify.success('已挂牌出售')
    sellOpen.value = false
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '出售挂牌失败')
  } finally {
    submitting.value = false
  }
}

async function onUnlistSell() {
  if (!selectedName.value) return
  try {
    await store.unlistSell(selectedName.value)
    notify.success('已取消出售')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '取消出售失败')
  }
}

function openRentSettings() {
  const r = store.current?.rentable
  rentCost.value = toNumber(r?.cost, 0)
  rentDays.value = toNumber(r?.days, 7)
  rentRenew.value = r?.allow_renewing !== false
  rentStayMarket.value = r?.stay_in_market !== false
  rentAutoPay.value = r?.allow_auto_pay === true
  rentSettingsOpen.value = true
}

async function onRentSettings() {
  if (!selectedName.value) return
  submitting.value = true
  try {
    await store.rentSettings(selectedName.value, {
      cost: rentCost.value,
      days: rentDays.value,
      allow_renewing: rentRenew.value,
      stay_in_market: rentStayMarket.value,
      allow_auto_pay: rentAutoPay.value,
    })
    notify.success('出租设置已保存')
    rentSettingsOpen.value = false
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '出租设置失败')
  } finally {
    submitting.value = false
  }
}

async function onUnlistRent() {
  if (!selectedName.value) return
  try {
    await store.unlistRent(selectedName.value)
    notify.success('已取消出租')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '取消出租失败')
  }
}

async function onForceUnrent() {
  if (!selectedName.value) return
  if (!confirm('确认强制退租？当前租客将失去租约。')) return
  try {
    await store.unrent(selectedName.value)
    notify.success('已强制退租')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '退租失败')
  }
}

// ===== 管理：危险操作 =====
function openTransfer() {
  transferTarget.value = ''
  transferOpen.value = true
}

async function onTransfer() {
  if (!selectedName.value) return
  const target = transferTarget.value.trim()
  if (!target) {
    notify.error('请输入目标玩家名')
    return
  }
  submitting.value = true
  try {
    await store.transfer(selectedName.value, target)
    notify.success('领地已转让')
    transferOpen.value = false
    mainView.value = 'list'
    await loadList()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '转让失败')
  } finally {
    submitting.value = false
  }
}

function openDelete() {
  deleteConfirm.value = ''
  deleteOpen.value = true
}

async function onDelete() {
  if (!selectedName.value) return
  if (deleteConfirm.value !== store.current?.name) {
    notify.error('领地名不匹配')
    return
  }
  submitting.value = true
  try {
    await store.deleteResidence(selectedName.value, deleteConfirm.value)
    notify.success('领地已删除')
    deleteOpen.value = false
    mainView.value = 'list'
    await loadList()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '删除失败')
  } finally {
    submitting.value = false
  }
}

// ===== 我的租用 =====
async function onPayRent(name: string) {
  try {
    await store.payRent(name)
    notify.success('租金已支付')
    await store.fetchRents()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '支付失败')
  }
}

async function onUnrentMyRental(name: string) {
  if (!confirm('确认退租？')) return
  try {
    await store.unrent(name)
    notify.success('已退租')
    await store.fetchRents()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '退租失败')
  }
}

// ===== 切换视图 =====
async function switchView(v: MainView) {
  mainView.value = v
  if (v === 'market') await store.fetchMarket()
  if (v === 'rents') await store.fetchRents()
  if (v === 'list') await loadList()
}

function statusFor(r: ResidenceDetail | ResidenceSummary) {
  if (r.for_sale) return { label: '出售中', variant: 'muted' as const }
  if (r.for_rent || r.rentable) return { label: '出租中', variant: 'accent' as const }
  return { label: '未出售', variant: 'primary' as const }
}

// 同步提示语
watch(
  () => store.current,
  (c) => {
    if (c) {
      enterMsg.value = str(c.enter_message)
      leaveMsg.value = str(c.leave_message)
    }
  },
  { immediate: false },
)
</script>

<template>
  <!-- Page toolbar -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 lg:px-5 py-3 bg-card border-b border-border">
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="v in ([
          { id: 'list', label: '领地列表', icon: Home },
          { id: 'market', label: '领地市场', icon: Store },
          { id: 'rents', label: '我的租用', icon: KeyRound },
        ] as const)"
        :key="v.id"
        type="button"
        class="h-8 px-3 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px flex items-center gap-1"
        :class="mainView === v.id ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
        @click="switchView(v.id)"
      >
        <component :is="v.icon" :size="14" />
        {{ v.label }}
      </button>
    </div>
    <div v-if="mainView === 'list'" class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="h-8 px-3 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px"
        :class="!mineOnly ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
        @click="mineOnly = false; loadList()"
      >
        所有领地
      </button>
      <button
        type="button"
        class="h-8 px-3 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px"
        :class="mineOnly ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
        @click="mineOnly = true; loadList()"
      >
        我的领地
      </button>
      <label class="flex items-center gap-2 h-9 px-3 bg-input border border-border shadow-hard-muted">
        <Search :size="16" class="text-muted-foreground" />
        <input
          v-model="query"
          type="text"
          placeholder="搜索名称/主人"
          class="bg-transparent border-0 outline-none text-sm w-36 text-foreground placeholder:text-muted-foreground"
          @input="onSearchInput"
        />
      </label>
      <AppButton variant="ghost" size="sm" @click="notify.info('创建领地需要在游戏内用木斧选区后使用 /res create 命令')">
        <Box :size="12" /> 创建领地
      </AppButton>
    </div>
  </div>

  <section class="flex-1 p-4 lg:p-5 space-y-4 min-w-0">
    <!-- ========== 领地列表 ========== -->
    <template v-if="mainView === 'list'">
      <article class="bg-card border border-border shadow-hard-muted p-4 space-y-3">
        <div class="flex items-end justify-between gap-3 flex-wrap">
          <h2 class="text-lg font-bold tracking-tight">领地列表</h2>
          <span class="text-[11px] uppercase tracking-widest text-muted-foreground">{{ store.total }} 个条目</span>
        </div>
        <StateView :loading="store.loading && !store.list.length" :error="store.error" :empty="!store.list.length" empty-text="没有领地" @retry="loadList()">
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="text-[11px] uppercase text-muted-foreground">
                  <th class="border-b border-border px-3 py-2 text-left">领地名称</th>
                  <th class="border-b border-border px-3 py-2 text-left">世界</th>
                  <th class="border-b border-border px-3 py-2 text-left">主人</th>
                  <th class="border-b border-border px-3 py-2 text-left">区域</th>
                  <th class="border-b border-border px-3 py-2 text-left">面积</th>
                  <th class="border-b border-border px-3 py-2 text-left">状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in store.list"
                  :key="r.name"
                  class="cursor-pointer hover:bg-muted/40"
                  :class="selectedName === r.name ? 'bg-sidebar-accent' : ''"
                  @click="selectResidence(r.name)"
                >
                  <td class="border-b border-border px-3 py-2 font-medium">
                    <div class="flex items-center gap-2">
                      <span>{{ r.name }}</span>
                      <AppBadge v-if="r.for_sale" variant="muted">出售</AppBadge>
                      <AppBadge v-if="r.for_rent || r.rentable" variant="accent">出租</AppBadge>
                    </div>
                  </td>
                  <td class="border-b border-border px-3 py-2">{{ str(r.world, '—') }}</td>
                  <td class="border-b border-border px-3 py-2">{{ str(r.owner, '—') }}</td>
                  <td class="border-b border-border px-3 py-2">{{ formatNumber(r.areas) }}</td>
                  <td class="border-b border-border px-3 py-2">{{ formatNumber(r.size) }}</td>
                  <td class="border-b border-border px-3 py-2">
                    <AppBadge :variant="statusFor(r).variant">{{ statusFor(r).label }}</AppBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </StateView>
        <Pagination :page="store.page" :page-size="store.pageSize" :total="store.total" @change="onPageChange" />
      </article>
    </template>

    <!-- ========== 领地详情 / 管理 ========== -->
    <template v-else-if="mainView === 'detail'">
      <div class="flex items-center gap-2 mb-2">
        <AppButton variant="ghost" size="sm" @click="goBackToList"><Home :size="12" /> 返回列表</AppButton>
      </div>
      <StateView :loading="store.currentLoading" :error="store.currentError" :empty="!store.current" empty-text="领地不存在或无权查看" @retry="selectedName && selectResidence(selectedName)">
        <article v-if="store.current" class="space-y-4">
          <!-- 基本信息 -->
          <div class="bg-card border border-border shadow-hard-muted p-4 grid gap-4">
            <div class="flex items-center gap-3 flex-wrap">
              <h2 class="text-lg font-bold tracking-tight">{{ store.current.name }}</h2>
              <AppBadge variant="primary"><Crown :size="12" /> 主人: {{ str(store.current.owner, '—') }}</AppBadge>
              <AppBadge v-if="str(store.current.world)" variant="muted"><MapPin :size="12" /> {{ store.current.world }}</AppBadge>
              <AppBadge v-if="store.current.is_server_land" variant="accent">服务器领地</AppBadge>
              <AppBadge v-if="store.current.hidden" variant="muted">隐藏</AppBadge>
              <AppBadge v-if="store.current.parent" variant="muted">父: {{ store.current.parent }}</AppBadge>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="p-3 border border-border bg-background">
                <span class="text-[10px] uppercase text-muted-foreground block">区域数</span>
                <span class="text-sm font-semibold mt-1 block">{{ formatNumber(store.current.areas ?? areasList.length) }}</span>
              </div>
              <div class="p-3 border border-border bg-background">
                <span class="text-[10px] uppercase text-muted-foreground block">子领地</span>
                <span class="text-sm font-semibold mt-1 block">{{ formatNumber(store.current.subzones ?? subzonesList.length) }}</span>
              </div>
              <div class="p-3 border border-border bg-background">
                <span class="text-[10px] uppercase text-muted-foreground block">面积</span>
                <span class="text-sm font-semibold mt-1 block">{{ formatNumber(store.current.size) }}</span>
              </div>
              <div class="p-3 border border-border bg-background">
                <span class="text-[10px] uppercase text-muted-foreground block">创建时间</span>
                <span class="text-sm font-semibold mt-1 block">{{ formatTime(store.current.created_at) || '—' }}</span>
              </div>
            </div>

            <!-- 管理入口 / 购买入口 -->
            <div class="flex flex-wrap gap-2">
              <AppButton v-if="canManage" variant="primary" size="sm" @click="manageTab = 'basic'">
                <Settings :size="12" /> 进入管理
              </AppButton>
              <template v-if="!canManage">
                <AppButton v-if="store.current.for_sale && economyEnabled" variant="primary" size="sm" @click="buyTarget = store.current?.name ?? ''; buyOpen = true">
                  <Tag :size="12" /> 购买（{{ formatNumber(store.current.sell_price) }}）
                </AppButton>
                <AppButton v-if="(store.current.for_rent || store.current.rentable) && !store.current.rented && rentSystemEnabled" variant="secondary" size="sm" @click="rentTarget = store.current?.name ?? ''; rentOpen = true">
                  <KeyRound :size="12" /> 租用
                </AppButton>
              </template>
            </div>
          </div>

          <!-- 区域边界 -->
          <div class="bg-card border border-border shadow-hard-muted p-4 grid gap-3">
            <h3 class="text-sm font-bold tracking-tight flex items-center gap-1"><MapPin :size="14" /> 区域边界</h3>
            <div v-if="areasList.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-[11px] uppercase text-muted-foreground">
                    <th class="border-b border-border px-3 py-2 text-left">名称</th>
                    <th class="border-b border-border px-3 py-2 text-left">世界</th>
                    <th class="border-b border-border px-3 py-2 text-left">low (x,y,z)</th>
                    <th class="border-b border-border px-3 py-2 text-left">high (x,y,z)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(a, i) in areasList" :key="i" class="border-b border-border">
                    <td class="px-3 py-2 font-medium">{{ str(a.name, `区域${i + 1}`) }}</td>
                    <td class="px-3 py-2">{{ str(a.world, '—') }}</td>
                    <td class="px-3 py-2 font-mono text-xs">
                      {{ a.low ? `${a.low.x}, ${a.low.y}, ${a.low.z}` : '—' }}
                    </td>
                    <td class="px-3 py-2 font-mono text-xs">
                      {{ a.high ? `${a.high.x}, ${a.high.y}, ${a.high.z}` : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-muted-foreground text-center py-4">无区域数据</p>
          </div>

          <!-- 子领地 + 受信玩家 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="bg-card border border-border shadow-hard-muted p-4 grid gap-3">
              <h3 class="text-sm font-bold tracking-tight flex items-center gap-1"><Home :size="14" /> 子领地</h3>
              <div v-if="subzonesList.length" class="space-y-1">
                <div
                  v-for="sub in subzonesList"
                  :key="sub.name"
                  class="px-3 py-2 bg-background border border-border text-sm cursor-pointer hover:bg-muted/40"
                  @click="selectResidence(sub.name)"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium">{{ sub.name }}</span>
                    <span class="text-xs text-muted-foreground">{{ str(sub.owner, '—') }}</span>
                  </div>
                </div>
              </div>
              <p v-else class="text-sm text-muted-foreground text-center py-4">无子领地</p>
            </div>

            <div class="bg-card border border-border shadow-hard-muted p-4 grid gap-3">
              <h3 class="text-sm font-bold tracking-tight flex items-center gap-1"><Users :size="14" /> 受信玩家</h3>
              <div v-if="trustedPlayers.length" class="flex flex-wrap gap-2">
                <div
                  v-for="p in trustedPlayers"
                  :key="p"
                  class="px-2.5 h-8 grid place-items-center text-sm border border-border bg-background"
                >
                  {{ p }}
                </div>
              </div>
              <p v-else class="text-sm text-muted-foreground text-center py-4">无受信玩家</p>
            </div>
          </div>

          <!-- 进出提示 -->
          <div class="bg-card border border-border shadow-hard-muted p-4 grid gap-3">
            <h3 class="text-sm font-bold tracking-tight flex items-center gap-1"><MessageSquare :size="14" /> 进出提示语</h3>
            <div class="grid gap-2">
              <div class="p-2 border border-border bg-background text-sm">
                <span class="text-[10px] uppercase text-muted-foreground block">进入提示</span>
                <span>{{ str(store.current.enter_message, '（未设置）') }}</span>
              </div>
              <div class="p-2 border border-border bg-background text-sm">
                <span class="text-[10px] uppercase text-muted-foreground block">离开提示</span>
                <span>{{ str(store.current.leave_message, '（未设置）') }}</span>
              </div>
            </div>
          </div>

          <!-- 租售状态卡 -->
          <div class="bg-card border border-border shadow-hard-muted p-4 grid gap-3">
            <h3 class="text-sm font-bold tracking-tight flex items-center gap-1"><Tag :size="14" /> 租售状态</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- 出售 -->
              <div class="p-3 border border-border bg-background">
                <span class="text-[10px] uppercase text-muted-foreground block">出售</span>
                <div v-if="store.current.for_sale" class="mt-1">
                  <span class="text-sm font-semibold text-chart-1">{{ formatNumber(store.current.sell_price) }}</span>
                  <span v-if="!canManage" class="ml-2 text-xs text-muted-foreground">可购买</span>
                </div>
                <span v-else class="text-sm text-muted-foreground mt-1 block">未挂牌</span>
              </div>
              <!-- 出租 -->
              <div class="p-3 border border-border bg-background">
                <span class="text-[10px] uppercase text-muted-foreground block">出租</span>
                <div v-if="store.current.for_rent || store.current.rentable" class="mt-1 text-sm">
                  <span class="font-semibold text-chart-1">{{ formatNumber(store.current.rentable?.cost) }}</span>
                  <span class="text-muted-foreground">/ {{ formatNumber(store.current.rentable?.days) }} 天</span>
                </div>
                <span v-else class="text-sm text-muted-foreground mt-1 block">未挂牌</span>
                <div v-if="store.current.rented_detail" class="mt-1 text-xs text-muted-foreground">
                  租客: {{ str(store.current.rented_detail.renter, '—') }}
                  · 到期: {{ formatTime(store.current.rented_detail.end_time) || '—' }}
                </div>
              </div>
            </div>
            <div v-if="!economyEnabled" class="text-xs text-destructive">
              <Ban :size="12" class="inline" /> 经济系统未启用，购买/出售功能不可用。
            </div>
            <div v-if="!rentSystemEnabled" class="text-xs text-destructive">
              <Ban :size="12" class="inline" /> 租赁系统未启用，租用/出租功能不可用。
            </div>
          </div>

          <!-- ========== 管理区（仅 can_manage） ========== -->
          <div v-if="canManage" class="bg-card border border-border shadow-hard-muted p-4 grid gap-4">
            <div class="flex flex-wrap gap-2 border-b border-border pb-3">
              <button
                v-for="t in ([
                  { id: 'basic', label: '基本设置', icon: Settings },
                  { id: 'flags', label: '全局权限', icon: Shield },
                  { id: 'player', label: '玩家权限', icon: Users },
                  { id: 'advanced', label: '高级', icon: RotateCcw },
                  { id: 'market', label: '租售', icon: Tag },
                  { id: 'danger', label: '危险操作', icon: Trash2 },
                ] as const)"
                :key="t.id"
                type="button"
                class="h-8 px-3 text-xs border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px flex items-center gap-1"
                :class="manageTab === t.id ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
                @click="manageTab = t.id"
              >
                <component :is="t.icon" :size="12" />
                {{ t.label }}
              </button>
            </div>

            <!-- 基本设置 -->
            <div v-if="manageTab === 'basic'" class="grid gap-4">
              <div class="p-3 border border-border bg-background grid gap-3">
                <span class="text-xs font-semibold uppercase text-muted-foreground">重命名</span>
                <div class="flex items-center gap-2 flex-wrap">
                  <input
                    v-model="renameValue"
                    type="text"
                    class="flex-1 min-w-[220px] h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                    placeholder="新领地名称"
                    @keydown.enter="openRename()"
                  />
                  <AppButton variant="primary" size="sm" @click="openRename()"><Pencil :size="12" /> 重命名</AppButton>
                </div>
              </div>

              <div class="p-3 border border-border bg-background grid gap-3">
                <span class="text-xs font-semibold uppercase text-muted-foreground">进出提示语</span>
                <div class="space-y-2">
                  <input
                    v-model="enterMsg"
                    type="text"
                    placeholder="进入领地提示（留空清除）"
                    class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                  />
                  <input
                    v-model="leaveMsg"
                    type="text"
                    placeholder="离开领地提示（留空清除）"
                    class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                  />
                </div>
                <div class="flex justify-end">
                  <AppButton variant="primary" size="sm" :disabled="submitting" @click="onSaveMessages">
                    <Loader2 v-if="submitting" :size="12" class="animate-spin" /> 保存提示语
                  </AppButton>
                </div>
              </div>
            </div>

            <!-- 全局权限 -->
            <div v-else-if="manageTab === 'flags'" class="grid gap-3">
              <div v-if="!flagCats.length" class="text-sm text-muted-foreground text-center py-6">暂无可编辑权限</div>
              <div v-for="cat in flagCats" :key="str(cat.key)" class="grid gap-2">
                <h4 class="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                  <ShieldCheck :size="12" /> {{ str(cat.name, '全部权限') }}
                </h4>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="text-[11px] uppercase text-muted-foreground">
                        <th class="border-b border-border px-3 py-2 text-left">权限</th>
                        <th class="border-b border-border px-3 py-2 text-left">描述</th>
                        <th class="border-b border-border px-3 py-2 text-left">默认</th>
                        <th class="border-b border-border px-3 py-2 text-left">当前</th>
                        <th class="border-b border-border px-3 py-2 text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="f in (cat.flags ?? [])" :key="f.flag" class="border-b border-border">
                        <td class="px-3 py-2 font-mono text-xs font-medium">{{ f.flag }}</td>
                        <td class="px-3 py-2 text-xs text-muted-foreground">{{ str(f.desc ?? f.description, '—') }}</td>
                        <td class="px-3 py-2 text-xs">{{ str(f.default, '—') }}</td>
                        <td class="px-3 py-2">
                          <AppBadge
                            :variant="f.value === true ? 'success' : f.value === false ? 'destructive' : 'muted'"
                          >
                            {{ f.value === true ? '允许' : f.value === false ? '拒绝' : '默认' }}
                          </AppBadge>
                        </td>
                        <td class="px-3 py-2">
                          <div v-if="f.global_editable !== false" class="flex items-center gap-1">
                            <button
                              type="button"
                              class="h-6 px-2 text-[10px] border border-ring bg-chart-1/20 text-chart-1 hover:bg-chart-1/30"
                              @click="onSetFlag(f.flag, 'true')"
                            >允许</button>
                            <button
                              type="button"
                              class="h-6 px-2 text-[10px] border border-ring bg-destructive/20 text-destructive hover:bg-destructive/30"
                              @click="onSetFlag(f.flag, 'false')"
                            >拒绝</button>
                            <button
                              type="button"
                              class="h-6 px-2 text-[10px] border border-ring bg-muted text-muted-foreground hover:bg-muted/60"
                              @click="onSetFlag(f.flag, 'remove')"
                            >默认</button>
                          </div>
                          <span v-else class="text-xs text-muted-foreground">不可编辑</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- 玩家权限 -->
            <div v-else-if="manageTab === 'player'" class="grid gap-3">
              <div class="p-3 border border-border bg-background grid gap-2">
                <span class="text-xs font-semibold uppercase text-muted-foreground">查询玩家权限</span>
                <div class="flex items-center gap-2 flex-wrap">
                  <input
                    v-model="playerInput"
                    type="text"
                    placeholder="玩家名或 UUID"
                    class="flex-1 min-w-[180px] h-9 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                    @keydown.enter="onAddPlayer"
                  />
                  <AppButton variant="muted" size="sm" @click="onAddPlayer">查询</AppButton>
                </div>
              </div>

              <!-- 受信玩家列表 -->
              <div v-if="trustedPlayers.length" class="flex flex-wrap gap-2">
                <button
                  v-for="p in trustedPlayers"
                  :key="p"
                  type="button"
                  class="h-8 px-3 text-xs border shadow-hard-muted"
                  :class="selectedPlayer === p ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
                  @click="onSelectPlayer(p)"
                >
                  {{ p }}
                </button>
              </div>

              <!-- 选中玩家的 flag 列表 -->
              <div v-if="selectedPlayer" class="grid gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase text-muted-foreground">
                    {{ selectedPlayer }} 的权限
                  </span>
                  <AppButton variant="destructive" size="sm" @click="onClearPlayer">
                    <Trash2 :size="12" /> 清空全部
                  </AppButton>
                </div>
                <StateView :loading="store.playerFlagsLoading" :empty="!playerFlagCats.length" empty-text="该玩家无可设置权限">
                  <div v-for="cat in playerFlagCats" :key="str(cat.key)" class="grid gap-2">
                    <h4 class="text-xs font-bold uppercase text-muted-foreground">{{ str(cat.name, '全部权限') }}</h4>
                    <div class="overflow-x-auto">
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="text-[11px] uppercase text-muted-foreground">
                            <th class="border-b border-border px-3 py-2 text-left">权限</th>
                            <th class="border-b border-border px-3 py-2 text-left">描述</th>
                            <th class="border-b border-border px-3 py-2 text-left">当前</th>
                            <th class="border-b border-border px-3 py-2 text-left">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="f in (cat.flags ?? [])" :key="f.flag" class="border-b border-border">
                            <td class="px-3 py-2 font-mono text-xs font-medium">{{ f.flag }}</td>
                            <td class="px-3 py-2 text-xs text-muted-foreground">{{ str(f.desc ?? f.description, '—') }}</td>
                            <td class="px-3 py-2">
                              <AppBadge
                                :variant="f.value === true ? 'success' : f.value === false ? 'destructive' : 'muted'"
                              >
                                {{ f.value === true ? '允许' : f.value === false ? '拒绝' : '默认' }}
                              </AppBadge>
                            </td>
                            <td class="px-3 py-2">
                              <div v-if="f.player_editable !== false" class="flex items-center gap-1">
                                <button
                                  type="button"
                                  class="h-6 px-2 text-[10px] border border-ring bg-chart-1/20 text-chart-1 hover:bg-chart-1/30"
                                  @click="onSetPlayerFlag(f.flag, 'true')"
                                >允许</button>
                                <button
                                  type="button"
                                  class="h-6 px-2 text-[10px] border border-ring bg-destructive/20 text-destructive hover:bg-destructive/30"
                                  @click="onSetPlayerFlag(f.flag, 'false')"
                                >拒绝</button>
                                <button
                                  type="button"
                                  class="h-6 px-2 text-[10px] border border-ring bg-muted text-muted-foreground hover:bg-muted/60"
                                  @click="onSetPlayerFlag(f.flag, 'remove')"
                                >默认</button>
                              </div>
                              <span v-else class="text-xs text-muted-foreground">不可编辑</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </StateView>
              </div>
            </div>

            <!-- 高级 -->
            <div v-else-if="manageTab === 'advanced'" class="grid gap-4">
              <div class="p-3 border border-border bg-background grid gap-3">
                <span class="text-xs font-semibold uppercase text-muted-foreground">重置默认权限</span>
                <p class="text-xs text-muted-foreground">将所有全局 flag 恢复为默认值，此操作不可撤销。</p>
                <div>
                  <AppButton variant="destructive" size="sm" @click="onApplyDefaults">
                    <RotateCcw :size="12" /> 重置为默认权限
                  </AppButton>
                </div>
              </div>

              <div class="p-3 border border-border bg-background grid gap-3">
                <span class="text-xs font-semibold uppercase text-muted-foreground">镜像权限</span>
                <p class="text-xs text-muted-foreground">从源领地复制权限到当前领地（需同时拥有两个领地）。</p>
                <div class="flex items-center gap-2 flex-wrap">
                  <input
                    v-model="mirrorSource"
                    type="text"
                    placeholder="源领地名称"
                    class="flex-1 min-w-[200px] h-9 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                  />
                  <AppButton variant="primary" size="sm" @click="mirrorOpen = true"><ArrowRightLeft :size="12" /> 镜像</AppButton>
                </div>
              </div>
            </div>

            <!-- 租售 -->
            <div v-else-if="manageTab === 'market'" class="grid gap-4">
              <!-- 出售 -->
              <div class="p-3 border border-border bg-background grid gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold uppercase text-muted-foreground">出售</span>
                  <AppBadge v-if="store.current.for_sale" variant="muted">出售中</AppBadge>
                </div>
                <div v-if="store.current.for_sale" class="flex items-center justify-between gap-2 flex-wrap">
                  <span class="text-sm">当前售价: <strong class="text-chart-1">{{ formatNumber(store.current.sell_price) }}</strong></span>
                  <AppButton variant="muted" size="sm" @click="onUnlistSell"><Ban :size="12" /> 取消出售</AppButton>
                </div>
                <div v-else class="flex items-center gap-2 flex-wrap">
                  <input
                    v-model.number="sellPrice"
                    type="number"
                    min="0"
                    step="1"
                    class="flex-1 min-w-[160px] h-9 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                    placeholder="出售价格"
                  />
                  <AppButton variant="primary" size="sm" @click="openSell()"><Tag :size="12" /> 挂牌出售</AppButton>
                </div>
              </div>

              <!-- 出租 -->
              <div class="p-3 border border-border bg-background grid gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold uppercase text-muted-foreground">出租</span>
                  <AppBadge v-if="store.current.for_rent || store.current.rentable" variant="accent">出租中</AppBadge>
                </div>

                <!-- 已租出 -->
                <div v-if="store.current.rented_detail" class="p-2 border border-dashed border-border bg-muted text-sm grid gap-1">
                  <div>租客: <strong>{{ str(store.current.rented_detail.renter, '—') }}</strong></div>
                  <div>日租金: {{ formatNumber(store.current.rented_detail.cost) }}</div>
                  <div>到期: {{ formatTime(store.current.rented_detail.end_time) || '—' }}</div>
                  <div class="mt-1">
                    <AppButton variant="destructive" size="sm" @click="onForceUnrent"><Ban :size="12" /> 强制退租（需在线）</AppButton>
                  </div>
                </div>

                <!-- 已挂牌未租出 -->
                <div v-else-if="store.current.for_rent || store.current.rentable" class="flex items-center justify-between gap-2 flex-wrap">
                  <span class="text-sm">
                    日租金: {{ formatNumber(store.current.rentable?.cost) }} / 租期: {{ formatNumber(store.current.rentable?.days) }} 天
                  </span>
                  <AppButton variant="muted" size="sm" @click="onUnlistRent"><Ban :size="12" /> 取消出租</AppButton>
                </div>

                <!-- 未挂牌 -->
                <div v-else class="flex items-center gap-2 flex-wrap">
                  <AppButton v-if="rentSystemEnabled" variant="primary" size="sm" @click="openRentSettings()">
                    <KeyRound :size="12" /> 设置出租（需在线）
                  </AppButton>
                  <span v-else class="text-xs text-destructive">租赁系统未启用</span>
                </div>
              </div>
            </div>

            <!-- 危险操作 -->
            <div v-else-if="manageTab === 'danger'" class="grid gap-4">
              <div class="p-3 border border-border bg-background grid gap-3">
                <span class="text-xs font-semibold uppercase text-muted-foreground">转让领地</span>
                <p class="text-xs text-muted-foreground">发起者与接收者都必须在线（Residence 本体要求）。</p>
                <div class="flex items-center gap-2 flex-wrap">
                  <input
                    v-model="transferTarget"
                    type="text"
                    placeholder="目标玩家名"
                    class="flex-1 min-w-[200px] h-9 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                  />
                  <AppButton variant="primary" size="sm" @click="openTransfer()"><ArrowRightLeft :size="12" /> 转让</AppButton>
                </div>
              </div>

              <div class="p-4 border border-destructive/40 bg-destructive/10 grid gap-3">
                <div class="flex items-center gap-2">
                  <Trash2 :size="18" class="text-destructive" />
                  <span class="text-sm font-semibold text-destructive">删除领地（不可逆）</span>
                </div>
                <p class="text-sm text-destructive/90">删除后领地及其所有子领地、区域数据将被永久清除。</p>
                <div>
                  <AppButton variant="destructive" size="sm" @click="openDelete()">
                    <Trash2 :size="12" /> 删除领地
                  </AppButton>
                </div>
              </div>
            </div>
          </div>
        </article>
      </StateView>
    </template>

    <!-- ========== 领地市场 ========== -->
    <template v-else-if="mainView === 'market'">
      <article class="bg-card border border-border shadow-hard-muted p-4 grid gap-4">
        <div class="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-lg font-bold tracking-tight">领地市场</h2>
            <p class="text-xs text-muted-foreground">购买和租用领地需要玩家在线。</p>
          </div>
          <div class="flex items-center gap-2">
            <AppBadge :variant="store.marketEconomyEnabled ? 'success' : 'destructive'">
              经济系统: {{ store.marketEconomyEnabled ? '已启用' : '未启用' }}
            </AppBadge>
            <AppBadge :variant="store.marketRentEnabled ? 'success' : 'destructive'">
              租赁系统: {{ store.marketRentEnabled ? '已启用' : '未启用' }}
            </AppBadge>
          </div>
        </div>
        <StateView :loading="store.marketLoading && !store.marketItems.length" :error="store.marketError" :empty="!store.marketItems.length" empty-text="暂无在售/可租领地" @retry="store.fetchMarket()">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-[11px] uppercase text-muted-foreground">
                  <th class="border-b border-border px-3 py-2 text-left">领地</th>
                  <th class="border-b border-border px-3 py-2 text-left">主人</th>
                  <th class="border-b border-border px-3 py-2 text-left">世界</th>
                  <th class="border-b border-border px-3 py-2 text-left">类型</th>
                  <th class="border-b border-border px-3 py-2 text-left">价格</th>
                  <th class="border-b border-border px-3 py-2 text-left">大小</th>
                  <th class="border-b border-border px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in store.marketItems" :key="str(item.residence ?? item.name)" class="border-b border-border">
                  <td class="px-3 py-2 font-medium">{{ item.name ?? item.residence }}</td>
                  <td class="px-3 py-2">{{ str(item.owner, '—') }}</td>
                  <td class="px-3 py-2">{{ str(item.world, '—') }}</td>
                  <td class="px-3 py-2">
                    <AppBadge :variant="String(item.type) === 'sell' ? 'muted' : 'accent'">
                      {{ String(item.type) === 'sell' ? '出售' : '出租' }}
                    </AppBadge>
                  </td>
                  <td class="px-3 py-2 text-chart-1 font-medium">{{ formatNumber(item.price) }}</td>
                  <td class="px-3 py-2">{{ formatNumber(item.size) }}</td>
                  <td class="px-3 py-2">
                    <AppButton
                      v-if="String(item.type) === 'sell' && store.marketEconomyEnabled"
                      variant="primary"
                      size="sm"
                      @click="buyTarget = str(item.residence ?? item.name); buyOpen = true"
                    >
                      <Tag :size="12" /> 购买
                    </AppButton>
                    <AppButton
                      v-else-if="String(item.type) === 'rent' && store.marketRentEnabled"
                      variant="secondary"
                      size="sm"
                      @click="rentTarget = str(item.residence ?? item.name); rentOpen = true"
                    >
                      <KeyRound :size="12" /> 租用
                    </AppButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Pagination :page="store.marketPage" :page-size="store.marketPageSize" :total="store.marketTotal" @change="(p) => store.fetchMarket(p)" />
        </StateView>
      </article>
    </template>

    <!-- ========== 我的租用 ========== -->
    <template v-else-if="mainView === 'rents'">
      <article class="bg-card border border-border shadow-hard-muted p-4 grid gap-4">
        <h2 class="text-lg font-bold tracking-tight">我的租用</h2>
        <StateView :loading="store.rentsLoading && !store.myRents.length" :error="store.rentsError" :empty="!store.myRents.length" empty-text="暂无租用记录" @retry="store.fetchRents()">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-[11px] uppercase text-muted-foreground">
                  <th class="border-b border-border px-3 py-2 text-left">领地</th>
                  <th class="border-b border-border px-3 py-2 text-left">主人</th>
                  <th class="border-b border-border px-3 py-2 text-left">世界</th>
                  <th class="border-b border-border px-3 py-2 text-left">日租金</th>
                  <th class="border-b border-border px-3 py-2 text-left">租期</th>
                  <th class="border-b border-border px-3 py-2 text-left">到期</th>
                  <th class="border-b border-border px-3 py-2 text-left">自动支付</th>
                  <th class="border-b border-border px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in store.myRents" :key="str(r.residence)" class="border-b border-border">
                  <td class="px-3 py-2 font-medium">{{ str(r.residence, '—') }}</td>
                  <td class="px-3 py-2">{{ str(r.owner, '—') }}</td>
                  <td class="px-3 py-2">{{ str(r.world, '—') }}</td>
                  <td class="px-3 py-2 text-chart-1 font-medium">{{ formatNumber(r.cost) }}</td>
                  <td class="px-3 py-2">{{ formatNumber(r.days) }} 天</td>
                  <td class="px-3 py-2 text-muted-foreground">
                    <Clock :size="11" class="inline" /> {{ formatTime(r.end_time) || '—' }}
                  </td>
                  <td class="px-3 py-2">
                    <AppBadge :variant="r.auto_pay ? 'success' : 'muted'">
                      {{ r.auto_pay ? '是' : '否' }}
                    </AppBadge>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex items-center gap-1">
                      <AppButton variant="primary" size="sm" @click="onPayRent(str(r.residence))">
                        <Tag :size="12" /> 续租
                      </AppButton>
                      <AppButton variant="destructive" size="sm" @click="onUnrentMyRental(str(r.residence))">
                        <Ban :size="12" /> 退租
                      </AppButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </StateView>
      </article>
    </template>
  </section>

  <!-- ========== Modals ========== -->

  <!-- 重命名 -->
  <AppModal :open="renameOpen" title="重命名领地" @update:open="(v) => (renameOpen = v)">
    <p class="text-sm">将领地重命名为「<strong>{{ renameValue }}</strong>」。名称需合法且未被占用。</p>
    <template #footer>
      <AppButton variant="muted" size="md" @click="renameOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="submitting" @click="onRename">
        <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 确认
      </AppButton>
    </template>
  </AppModal>

  <!-- 挂牌出售 -->
  <AppModal :open="sellOpen" title="挂牌出售" @update:open="(v) => (sellOpen = v)">
    <label class="block">
      <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">出售价格</span>
      <input v-model.number="sellPrice" type="number" min="0" step="1" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
    </label>
    <template #footer>
      <AppButton variant="muted" size="md" @click="sellOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="submitting" @click="onSell">
        <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 确认挂牌
      </AppButton>
    </template>
  </AppModal>

  <!-- 出租设置 -->
  <AppModal :open="rentSettingsOpen" title="出租设置（需在线）" width="max-w-md" @update:open="(v) => (rentSettingsOpen = v)">
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">日租金</span>
          <input v-model.number="rentCost" type="number" min="0" step="1" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">租期（天）</span>
          <input v-model.number="rentDays" type="number" min="1" step="1" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
        </label>
      </div>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="rentRenew" type="checkbox" class="h-4 w-4" />
        允许续租
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="rentStayMarket" type="checkbox" class="h-4 w-4" />
        留在市场（续租后继续挂牌）
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="rentAutoPay" type="checkbox" class="h-4 w-4" />
        允许自动支付
      </label>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="rentSettingsOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="submitting" @click="onRentSettings">
        <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 保存
      </AppButton>
    </template>
  </AppModal>

  <!-- 镜像权限 -->
  <AppModal :open="mirrorOpen" title="镜像权限" @update:open="(v) => (mirrorOpen = v)">
    <p class="text-sm">从源领地「<strong>{{ mirrorSource }}</strong>」复制权限到当前领地。你需同时拥有两个领地。</p>
    <template #footer>
      <AppButton variant="muted" size="md" @click="mirrorOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="submitting" @click="onMirror">
        <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 确认镜像
      </AppButton>
    </template>
  </AppModal>

  <!-- 购买领地 -->
  <AppModal :open="buyOpen" title="购买领地" @update:open="(v) => (buyOpen = v)">
    <p class="text-sm">确认购买领地「<strong>{{ buyTarget }}</strong>」？购买需要玩家在线。</p>
    <p class="text-xs text-muted-foreground mt-2">后端会校验余额、领地上限等规则，失败时返回中文提示。</p>
    <template #footer>
      <AppButton variant="muted" size="md" @click="buyOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="submitting" @click="onBuy">
        <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 确认购买
      </AppButton>
    </template>
  </AppModal>

  <!-- 租用领地 -->
  <AppModal :open="rentOpen" title="租用领地" @update:open="(v) => (rentOpen = v)">
    <div class="space-y-3">
      <p class="text-sm">确认租用领地「<strong>{{ rentTarget }}</strong>」？租用需要玩家在线。</p>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="rentAutoPayChoice" type="checkbox" class="h-4 w-4" />
        开启自动支付（到期自动续租）
      </label>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="rentOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="submitting" @click="onRent">
        <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 确认租用
      </AppButton>
    </template>
  </AppModal>

  <!-- 转让 -->
  <AppModal :open="transferOpen" title="转让领地" @update:open="(v) => (transferOpen = v)">
    <p class="text-sm">将领地转让给「<strong>{{ transferTarget }}</strong>」。发起者与接收者都必须在线。</p>
    <template #footer>
      <AppButton variant="muted" size="md" @click="transferOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="submitting" @click="onTransfer">
        <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 确认转让
      </AppButton>
    </template>
  </AppModal>

  <!-- 删除 -->
  <AppModal :open="deleteOpen" title="删除领地（不可逆）" @update:open="(v) => (deleteOpen = v)">
    <div class="space-y-3">
      <p class="text-sm text-destructive">此操作不可撤销！领地及其所有子领地将被永久删除。</p>
      <p class="text-sm">请输入领地名「<strong>{{ store.current?.name }}</strong>」以确认。</p>
      <input v-model="deleteConfirm" type="text" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" placeholder="输入领地名" />
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="deleteOpen = false">取消</AppButton>
      <AppButton variant="destructive" size="md" :disabled="submitting" @click="onDelete">
        <Loader2 v-if="submitting" :size="14" class="animate-spin" /> 删除
      </AppButton>
    </template>
  </AppModal>
</template>
