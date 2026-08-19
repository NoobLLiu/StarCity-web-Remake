import { defineStore } from 'pinia'
import { ref } from 'vue'
import { marketApi, type ItemListParams } from '@/api/market'
import type {
  CreateOrderPayload,
  ExchangePayload,
  MarketInfo,
  MarketItem,
  MarketOrder,
  MarketTrade,
  MarketTradePayload,
  MarketWarehouse,
  Orderbook,
} from '@/types'
import { normalizeList } from '@/utils/normalize'

export const useMarketStore = defineStore('market', () => {
  const items = ref<MarketItem[]>([])
  const itemsTotal = ref(0)
  const itemsPage = ref(1)
  const itemsPageSize = ref(10)
  const itemsLoading = ref(false)
  const itemsError = ref<string | null>(null)

  const info = ref<MarketInfo | null>(null)

  const orderbook = ref<Orderbook | null>(null)
  const orderbookItem = ref<string | null>(null)
  const orderbookLoading = ref(false)

  const myOrders = ref<MarketOrder[]>([])
  const myTrades = ref<MarketTrade[]>([])
  const warehouse = ref<MarketWarehouse | null>(null)
  const mineLoading = ref(false)
  const mineError = ref<string | null>(null)

  async function fetchItems(params: ItemListParams = {}) {
    itemsLoading.value = true
    itemsError.value = null
    try {
      const raw = await marketApi.items({ page: itemsPage.value, page_size: itemsPageSize.value, ...params })
      const norm = normalizeList<MarketItem>(raw)
      items.value = norm.items
      itemsTotal.value = norm.total
      if (params.page) itemsPage.value = params.page
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

  async function fetchMine() {
    mineLoading.value = true
    mineError.value = null
    const [o, t, w] = await Promise.allSettled([
      marketApi.myOrders(),
      marketApi.myTrades(),
      marketApi.warehouse(),
    ])
    if (o.status === 'fulfilled') myOrders.value = Array.isArray(o.value) ? o.value : []
    if (t.status === 'fulfilled') {
      const raw = t.value
      myTrades.value = Array.isArray(raw) ? raw : normalizeList<MarketTrade>(raw).items
    }
    if (w.status === 'fulfilled') warehouse.value = w.value
    mineLoading.value = false
  }

  async function createOrder(payload: CreateOrderPayload) {
    await marketApi.createOrder(payload)
    await fetchMine()
  }

  async function cancelOrder(orderId: string | number) {
    await marketApi.cancelOrder(orderId)
    await fetchMine()
  }

  async function trade(payload: MarketTradePayload) {
    await marketApi.trade(payload)
    await fetchMine()
  }

  async function warehouseDeposit(payload: Parameters<typeof marketApi.warehouseDeposit>[0]) {
    await marketApi.warehouseDeposit(payload)
    await fetchMine()
  }

  async function warehouseWithdraw(payload: Parameters<typeof marketApi.warehouseWithdraw>[0]) {
    await marketApi.warehouseWithdraw(payload)
    await fetchMine()
  }

  async function exchange(payload: ExchangePayload) {
    await marketApi.exchange(payload)
    await fetchMine()
  }

  return {
    items,
    itemsTotal,
    itemsPage,
    itemsPageSize,
    itemsLoading,
    itemsError,
    info,
    orderbook,
    orderbookItem,
    orderbookLoading,
    myOrders,
    myTrades,
    warehouse,
    mineLoading,
    mineError,
    fetchItems,
    fetchInfo,
    fetchOrderbook,
    fetchMine,
    createOrder,
    cancelOrder,
    trade,
    warehouseDeposit,
    warehouseWithdraw,
    exchange,
  }
})
