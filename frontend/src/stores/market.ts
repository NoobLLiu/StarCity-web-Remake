import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { marketApi, type ItemListParams } from '@/api/market'
import type {
  CreateOrderPayload,
  ExchangePayload,
  MarketBalance,
  MarketInfo,
  MarketItem,
  MarketItemDetail,
  MarketItemsPaginated,
  MarketOrder,
  MarketTrade,
  MarketTradePayload,
  MarketWarehouse,
  Orderbook,
  WarehouseDepositType,
  WarehouseWithdrawType,
} from '@/types'

/** 规范化商品列表分页。 */
function normItems(raw: MarketItemsPaginated | unknown): { items: MarketItem[]; total: number; page: number; pageSize: number } {
  if (Array.isArray(raw)) {
    return { items: raw as MarketItem[], total: raw.length, page: 1, pageSize: raw.length }
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    const items = (r.items ?? []) as MarketItem[]
    return {
      items,
      total: Number(r.total ?? r.total_items ?? items.length),
      page: Number(r.page ?? 1),
      pageSize: Number(r.page_size ?? items.length),
    }
  }
  return { items: [], total: 0, page: 1, pageSize: 0 }
}

export const useMarketStore = defineStore('market', () => {
  // ===== 商品列表 =====
  const items = ref<MarketItem[]>([])
  const itemsTotal = ref(0)
  const itemsPage = ref(1)
  const itemsPageSize = ref(35)
  const itemsLoading = ref(false)
  const itemsError = ref<string | null>(null)

  // ===== 市场信息 =====
  const info = ref<MarketInfo | null>(null)

  // ===== 品种详情 / 盘口 =====
  const itemDetail = ref<MarketItemDetail | null>(null)
  const orderbook = ref<Orderbook | null>(null)
  const orderbookItem = ref<string | null>(null)
  const orderbookLoading = ref(false)

  // ===== 我的挂单 / 成交 / 仓库 / 余额 =====
  const myOrders = ref<MarketOrder[]>([])
  const myTrades = ref<MarketTrade[]>([])
  const myTradesTotal = ref(0)
  const myTradesPage = ref(1)
  const myTradesPageSize = ref(20)
  const warehouse = ref<MarketWarehouse | null>(null)
  const balance = ref<MarketBalance | null>(null)
  const mineLoading = ref(false)
  const mineError = ref<string | null>(null)

  // ===== 派生 =====
  const currencyName = computed(() => info.value?.currency_name || warehouse.value?.currency_name || 'SC')
  const taxRate = computed(() => {
    const t = info.value?.tax_rate ?? info.value?.tax_rate_percent
    return typeof t === 'number' ? t : 0
  })
  const diamondToMoney = computed(() => Number(info.value?.diamond_to_money ?? 0))
  const economyAvailable = computed(() => {
    if (balance.value) return balance.value.economy_available !== false
    if (warehouse.value) return warehouse.value.economy_available !== false
    return true
  })
  const economyBalance = computed(() => {
    if (balance.value) return balance.value.balance ?? null
    if (warehouse.value) return warehouse.value.balance ?? null
    return null
  })
  const warehouseMoney = computed(() => {
    if (warehouse.value) return Number(warehouse.value.money ?? warehouse.value.money_balance ?? 0)
    if (balance.value) return Number(balance.value.warehouse_money ?? 0)
    return 0
  })

  // ========== actions ==========
  async function fetchItems(params: ItemListParams = {}) {
    itemsLoading.value = true
    itemsError.value = null
    try {
      const raw = await marketApi.items({ page: itemsPage.value, page_size: itemsPageSize.value, ...params })
      const norm = normItems(raw)
      items.value = norm.items
      itemsTotal.value = norm.total
      itemsPage.value = norm.page
      itemsPageSize.value = norm.pageSize
    } catch (e) {
      itemsError.value = (e as Error).message
      items.value = []
    } finally {
      itemsLoading.value = false
    }
  }

  async function fetchInfo() {
    try {
      info.value = await marketApi.info()
    } catch {
      info.value = null
    }
  }

  async function fetchItemDetail(itemId: string, params: ItemListParams = {}) {
    try {
      itemDetail.value = await marketApi.item(itemId, params)
    } catch {
      itemDetail.value = null
    }
  }

  async function fetchOrderbook(itemId: string) {
    orderbookItem.value = itemId
    orderbookLoading.value = true
    try {
      orderbook.value = await marketApi.orderbook(itemId)
    } catch (e) {
      orderbook.value = null
      orderbookItem.value = null
      throw e
    } finally {
      orderbookLoading.value = false
    }
  }

  /** 加载我的挂单（数组）+ 仓库 + 余额（并行，任一失败不阻塞其他）。 */
  async function fetchMine() {
    mineLoading.value = true
    mineError.value = null
    const [o, w, b] = await Promise.allSettled([
      marketApi.myOrders(),
      marketApi.warehouse(),
      marketApi.myBalance(),
    ])
    if (o.status === 'fulfilled') myOrders.value = Array.isArray(o.value) ? o.value : []
    if (w.status === 'fulfilled') warehouse.value = w.value
    if (b.status === 'fulfilled') balance.value = b.value
    mineLoading.value = false
  }

  /** 加载我的成交（分页）。 */
  async function fetchMyTrades(page = 1, size = 20) {
    try {
      const raw = await marketApi.myTrades(page, size)
      const r = raw as Record<string, unknown>
      myTrades.value = (r.items ?? r.trades ?? []) as MarketTrade[]
      myTradesTotal.value = Number(r.total ?? myTrades.value.length)
      myTradesPage.value = Number(r.page ?? page)
      myTradesPageSize.value = Number(r.page_size ?? r.size ?? size)
    } catch (e) {
      myTrades.value = []
      myTradesTotal.value = 0
      throw e
    }
  }

  async function createOrder(payload: CreateOrderPayload) {
    await marketApi.createOrder(payload)
    await fetchMine()
  }

  async function cancelOrder(orderId: string | number, admin = false) {
    await marketApi.cancelOrder(orderId, admin)
    await fetchMine()
  }

  async function trade(payload: MarketTradePayload) {
    await marketApi.trade(payload)
    await fetchMine()
  }

  async function warehouseDeposit(payload: WarehouseDepositType) {
    await marketApi.warehouseDeposit(payload)
    await fetchMine()
  }

  async function warehouseWithdraw(payload: WarehouseWithdrawType) {
    await marketApi.warehouseWithdraw(payload)
    await fetchMine()
  }

  async function exchange(payload: ExchangePayload) {
    await marketApi.exchange(payload)
    await fetchMine()
  }

  async function refreshBalance() {
    try {
      balance.value = await marketApi.myBalance()
    } catch {
      // 静默
    }
  }

  return {
    // state
    items,
    itemsTotal,
    itemsPage,
    itemsPageSize,
    itemsLoading,
    itemsError,
    info,
    itemDetail,
    orderbook,
    orderbookItem,
    orderbookLoading,
    myOrders,
    myTrades,
    myTradesTotal,
    myTradesPage,
    myTradesPageSize,
    warehouse,
    balance,
    mineLoading,
    mineError,
    // computed
    currencyName,
    taxRate,
    diamondToMoney,
    economyAvailable,
    economyBalance,
    warehouseMoney,
    // actions
    fetchItems,
    fetchInfo,
    fetchItemDetail,
    fetchOrderbook,
    fetchMine,
    fetchMyTrades,
    refreshBalance,
    createOrder,
    cancelOrder,
    trade,
    warehouseDeposit,
    warehouseWithdraw,
    exchange,
  }
})
