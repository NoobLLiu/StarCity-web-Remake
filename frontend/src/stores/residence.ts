import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { residenceApi, type RentSettingsPayload, type ResidenceListParams } from '@/api/residence'
import type {
  FlagCategory,
  FlagState,
  ResidenceDetail,
  ResidenceFlags,
  ResidenceMarketItem,
  ResidenceMarketPaginated,
  ResidencePlayerFlags,
  ResidenceRent,
  ResidenceSummary,
} from '@/types'


export const useResidenceStore = defineStore('residence', () => {
  // ===== 列表 =====
  const list = ref<ResidenceSummary[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ===== 详情 =====
  const current = ref<ResidenceDetail | null>(null)
  const currentLoading = ref(false)
  const currentError = ref<string | null>(null)
  const flags = ref<ResidenceFlags | null>(null)

  // ===== 市场 =====
  const marketItems = ref<ResidenceMarketItem[]>([])
  const marketTotal = ref(0)
  const marketPage = ref(1)
  const marketPageSize = ref(20)
  const marketLoading = ref(false)
  const marketError = ref<string | null>(null)
  const marketEconomyEnabled = ref(true)
  const marketRentEnabled = ref(true)

  // ===== 我的租用 =====
  const myRents = ref<ResidenceRent[]>([])
  const rentsLoading = ref(false)
  const rentsError = ref<string | null>(null)

  // ===== 玩家权限 =====
  const playerFlags = ref<ResidencePlayerFlags | null>(null)
  const playerFlagsLoading = ref(false)

  // ===== 派生 =====
  const canManage = computed(() => !!current.value?.can_manage)
  const isOwner = computed(() => {
    const c = current.value
    if (!c) return false
    return !!c.can_manage
  })

  /** 从 flags 中提取分类列表（优先 categories，兜底 possible_flags）。 */
  const flagCategories = computed<FlagCategory[]>(() => {
    const f = flags.value
    if (!f) return []
    if (f.categories && Array.isArray(f.categories)) return f.categories
    // 兜底：把 possible_flags / flags 平铺为一个“全部”分类
    const possible = (f.possible_flags ?? []) as string[]
    const raw = (f.flags ?? {}) as Record<string, string | boolean>
    const items = possible.map((flag) => ({
      flag,
      value: raw[flag] === undefined ? null : raw[flag] === true || raw[flag] === 'true',
      default: raw[flag],
    }))
    return items.length ? [{ key: 'all', name: '全部权限', flags: items }] : []
  })

  const playerFlagCategories = computed<FlagCategory[]>(() => {
    const f = playerFlags.value
    if (!f) return []
    if (f.categories && Array.isArray(f.categories)) return f.categories
    const possible = (f.possible_flags ?? []) as string[]
    const raw = (f.flags ?? {}) as Record<string, string | boolean>
    const items = possible.map((flag) => ({
      flag,
      value: raw[flag] === undefined ? null : raw[flag] === true || raw[flag] === 'true',
      default: raw[flag],
    }))
    return items.length ? [{ key: 'all', name: '全部权限', flags: items }] : []
  })

  // ========== actions ==========
  async function fetchList(params: ResidenceListParams = {}) {
    loading.value = true
    error.value = null
    try {
      const raw = await residenceApi.list({ page: page.value, page_size: pageSize.value, ...params })
      if (Array.isArray(raw)) {
        list.value = raw as ResidenceSummary[]
        total.value = raw.length
      } else if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>
        list.value = (r.residences ?? r.items ?? []) as ResidenceSummary[]
        total.value = Number(r.total ?? list.value.length)
        page.value = Number(r.page ?? page.value)
        pageSize.value = Number(r.page_size ?? pageSize.value)
      } else {
        list.value = []
        total.value = 0
      }
    } catch (e) {
      error.value = (e as Error).message
      list.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchDetail(name: string) {
    currentLoading.value = true
    currentError.value = null
    current.value = null
    flags.value = null
    playerFlags.value = null
    try {
      current.value = await residenceApi.detail(name)
      try {
        flags.value = await residenceApi.flags(name)
      } catch {
        flags.value = null
      }
    } catch (e) {
      currentError.value = (e as Error).message
    } finally {
      currentLoading.value = false
    }
  }

  async function fetchPlayerFlags(name: string, player: string) {
    playerFlagsLoading.value = true
    try {
      playerFlags.value = await residenceApi.playerFlags(name, player)
    } catch {
      playerFlags.value = null
    } finally {
      playerFlagsLoading.value = false
    }
  }

  // ===== 写操作 =====
  async function setFlag(name: string, flag: string, state: FlagState) {
    await residenceApi.setFlag(name, flag, state)
    await fetchDetail(name)
  }

  async function setPlayerFlag(name: string, player: string, flag: string, state: FlagState) {
    await residenceApi.setPlayerFlag(name, player, flag, state)
    if (playerFlags.value) await fetchPlayerFlags(name, player)
  }

  async function removePlayerFlag(name: string, player: string, flag: string) {
    await residenceApi.removePlayerFlag(name, player, flag)
    if (playerFlags.value) await fetchPlayerFlags(name, player)
  }

  async function clearPlayer(name: string, player: string) {
    await residenceApi.clearPlayer(name, player)
    playerFlags.value = null
    await fetchDetail(name)
  }

  async function applyDefaults(name: string) {
    await residenceApi.applyDefaults(name)
    await fetchDetail(name)
  }

  async function setMessage(name: string, type: 'enter' | 'leave', message: string) {
    await residenceApi.setMessage(name, type, message)
    await fetchDetail(name)
  }

  async function rename(name: string, newName: string) {
    await residenceApi.rename(name, newName)
    await fetchDetail(newName)
  }

  async function mirror(name: string, source: string) {
    await residenceApi.mirror(name, source)
    await fetchDetail(name)
  }

  async function deleteResidence(name: string, confirmName?: string) {
    await residenceApi.delete(name, confirmName)
    current.value = null
    await fetchList({})
  }

  async function sell(name: string, price: number) {
    await residenceApi.sell(name, price)
    await fetchDetail(name)
  }

  async function unlistSell(name: string) {
    await residenceApi.unlistSell(name)
    await fetchDetail(name)
  }

  async function rentSettings(name: string, payload: RentSettingsPayload) {
    await residenceApi.rentSettings(name, payload)
    await fetchDetail(name)
  }

  async function unlistRent(name: string) {
    await residenceApi.unlistRent(name)
    await fetchDetail(name)
  }

  async function buy(name: string) {
    await residenceApi.buy(name)
    await fetchDetail(name)
  }

  async function rent(name: string, autoPay?: boolean) {
    await residenceApi.rent(name, autoPay)
    await fetchDetail(name)
  }

  async function unrent(name: string) {
    await residenceApi.unrent(name)
    await fetchDetail(name)
  }

  async function payRent(name: string) {
    await residenceApi.payRent(name)
  }

  async function transfer(name: string, target: string) {
    await residenceApi.transfer(name, target)
    await fetchDetail(name)
  }

  // ===== 市场 =====
  async function fetchMarket(p = 1, ps = 20) {
    marketLoading.value = true
    marketError.value = null
    try {
      const raw = await residenceApi.market(p, ps)
      const r = (raw ?? {}) as ResidenceMarketPaginated
      marketItems.value = (r.items ?? []) as ResidenceMarketItem[]
      marketTotal.value = Number(r.total ?? marketItems.value.length)
      marketPage.value = Number(r.page ?? p)
      marketPageSize.value = Number(r.page_size ?? ps)
      marketEconomyEnabled.value = r.economy_enabled !== false
      marketRentEnabled.value = r.rent_system_enabled !== false
    } catch (e) {
      marketError.value = (e as Error).message
      marketItems.value = []
    } finally {
      marketLoading.value = false
    }
  }

  // ===== 我的租用 =====
  async function fetchRents() {
    rentsLoading.value = true
    rentsError.value = null
    try {
      const raw = await residenceApi.myRents()
      myRents.value = ((raw as Record<string, unknown>)?.rents ?? []) as ResidenceRent[]
    } catch (e) {
      rentsError.value = (e as Error).message
      myRents.value = []
    } finally {
      rentsLoading.value = false
    }
  }

  async function refreshList() {
    await fetchList({})
  }

  return {
    // state
    list,
    total,
    page,
    pageSize,
    loading,
    error,
    current,
    currentLoading,
    currentError,
    flags,
    playerFlags,
    playerFlagsLoading,
    marketItems,
    marketTotal,
    marketPage,
    marketPageSize,
    marketLoading,
    marketError,
    marketEconomyEnabled,
    marketRentEnabled,
    myRents,
    rentsLoading,
    rentsError,
    // computed
    canManage,
    isOwner,
    flagCategories,
    playerFlagCategories,
    // actions
    fetchList,
    fetchDetail,
    fetchPlayerFlags,
    fetchMarket,
    fetchRents,
    refreshList,
    setFlag,
    setPlayerFlag,
    removePlayerFlag,
    clearPlayer,
    applyDefaults,
    setMessage,
    rename,
    mirror,
    deleteResidence,
    sell,
    unlistSell,
    rentSettings,
    unlistRent,
    buy,
    rent,
    unrent,
    payRent,
    transfer,
  }
})
