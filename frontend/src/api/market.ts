import { http } from './http'
import type {
  CreateOrderPayload,
  ExchangePayload,
  MarketBalance,
  MarketInfo,
  MarketItem,
  MarketItemDetail,
  MarketItemsPaginated,
  MarketOrder,
  MarketTradesPaginated,
  MarketTradePayload,
  MarketWarehouse,
  Orderbook,
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
  /** 商品列表（分页）。 */
  items(params: ItemListParams = {}) {
    return http.get<MarketItemsPaginated>('/market/items', { params: toParams(params) })
  },
  /** 品种详情（含挂单列表/供货计划/停牌状态/快捷操作可用性）。 */
  item(itemId: string, params: ItemListParams = {}) {
    return http.get<MarketItemDetail>(`/market/items/${encodeURIComponent(itemId)}`, {
      params: toParams(params),
    })
  },
  /** 盘口（聚合档位 + 原始挂单）。 */
  orderbook(itemId: string) {
    return http.get<Orderbook>(`/market/orderbook/${encodeURIComponent(itemId)}`)
  },
  /** 市场信息（公告/税率/兑换/价格区间等）。 */
  info() {
    return http.get<MarketInfo>('/market/info')
  },
  /** 我的挂单（数组）。 */
  myOrders() {
    return http.get<MarketOrder[]>('/market/me/orders')
  },
  /** 我的成交（分页）。 */
  myTrades(page = 1, size = 20) {
    return http.get<MarketTradesPaginated>('/market/me/trades', {
      params: { page, size },
    })
  },
  /** 我的仓库（含余额/币种/经济可用性/物品列表）。 */
  warehouse() {
    return http.get<MarketWarehouse>('/market/me/warehouse')
  },
  /** 轻量余额接口。 */
  myBalance() {
    return http.get<MarketBalance>('/market/me/balance')
  },
  /** 挂买单/卖单（走仓库）。 */
  createOrder(payload: CreateOrderPayload) {
    return http.post<unknown>('/market/order', payload)
  },
  /** 撤单（本人；admin 可撤他人）。 */
  cancelOrder(orderId: string | number, admin = false) {
    return http.post<unknown>(`/market/order/${encodeURIComponent(orderId)}/cancel`, { admin })
  },
  /** 市价交易/快速上架。 */
  trade(payload: MarketTradePayload) {
    return http.post<unknown>('/market/trade', payload)
  },
  /** 存入仓库（money 存入星光点 / hand 手持物品，后者需在线）。 */
  warehouseDeposit(payload: WarehouseDepositType) {
    return http.post<unknown>('/market/warehouse/deposit', payload)
  },
  /** 提取（all 一键 / money 提取星光点 / item 提取指定物品，均需在线）。 */
  warehouseWithdraw(payload: WarehouseWithdrawType) {
    return http.post<unknown>('/market/warehouse/withdraw', payload)
  },
  /** 钻石 <-> 星光点兑换。 */
  exchange(payload: ExchangePayload) {
    return http.post<unknown>('/market/exchange', payload)
  },
}

export type { MarketItem }
