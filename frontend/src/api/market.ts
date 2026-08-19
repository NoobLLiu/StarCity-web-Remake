import { http } from './http'
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
  Paginated,
  WarehouseDepositType,
  WarehouseWithdrawType,
} from '@/types'

export interface ItemListParams {
  buy_page?: boolean
  query?: string
  page?: number
  page_size?: number
}

function toParams(p: ItemListParams): Record<string, string> {
  const out: Record<string, string> = {}
  if (p.buy_page !== undefined) out.buy_page = String(p.buy_page)
  if (p.query) out.query = p.query
  if (p.page !== undefined) out.page = String(p.page)
  if (p.page_size !== undefined) out.page_size = String(p.page_size)
  return out
}

export const marketApi = {
  items(params: ItemListParams = {}) {
    return http.get<Paginated<MarketItem> | MarketItem[]>('/market/items', { params: toParams(params) })
  },
  item(itemId: string, params: ItemListParams = {}) {
    return http.get<MarketItem>(`/market/items/${encodeURIComponent(itemId)}`, {
      params: toParams(params),
    })
  },
  orderbook(itemId: string) {
    return http.get<Orderbook>(`/market/orderbook/${encodeURIComponent(itemId)}`)
  },
  info() {
    return http.get<MarketInfo>('/market/info')
  },
  myOrders() {
    return http.get<MarketOrder[]>('/market/me/orders')
  },
  myTrades(page = 1, size = 20) {
    return http.get<Paginated<MarketTrade> | MarketTrade[]>('/market/me/trades', {
      params: { page, size },
    })
  },
  warehouse() {
    return http.get<MarketWarehouse>('/market/me/warehouse')
  },
  createOrder(payload: CreateOrderPayload) {
    return http.post<unknown>('/market/order', payload)
  },
  cancelOrder(orderId: string | number, admin = false) {
    return http.post<unknown>(`/market/order/${encodeURIComponent(orderId)}/cancel`, { admin })
  },
  trade(payload: MarketTradePayload) {
    return http.post<unknown>('/market/trade', payload)
  },
  warehouseDeposit(payload: WarehouseDepositType) {
    return http.post<unknown>('/market/warehouse/deposit', payload)
  },
  warehouseWithdraw(payload: WarehouseWithdrawType) {
    return http.post<unknown>('/market/warehouse/withdraw', payload)
  },
  exchange(payload: ExchangePayload) {
    return http.post<unknown>('/market/exchange', payload)
  },
}
