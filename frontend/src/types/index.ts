// ===== 统一响应格式 =====
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// ===== 认证 =====
export interface LoginPayload {
  email: string
  password: string
}

export interface AuthInfo {
  token: string
  player: string
  player_uuid: string
  email: string
  is_op: boolean
}

export interface MeInfo {
  player: string
  player_uuid: string
  email: string
  is_op: boolean
}

// ===== 公共 =====
export interface HealthInfo {
  status: string
  plugin: string
  version: string
  online_players: number
}

export interface PublicSettings {
  server_name: string
  web_backend: string
  plugin_version?: string
}

// ===== 分页 =====
export interface Paginated<T> {
  items: T[]
  page: number
  page_size: number
  total: number
}

// ===== 市场 =====
/** GET /api/market/items 的行（itemView）。 */
export interface MarketItem {
  item_id: string
  name?: string
  display_name?: string
  item_name?: string
  lowest_sell_price?: number | null
  highest_buy_price?: number | null
  volume?: number | null
  volume_today?: number | null
  suspended?: boolean
  active_stock?: number | null
  change_7d_percent?: number | null
  change_30d_percent?: number | null
  material?: string
  created_by?: string
  created_at?: string
  [k: string]: unknown
}

export interface OrderbookLevel {
  price: number
  quantity: number
}

/** GET /api/market/orderbook/:item_id。 */
export interface Orderbook {
  item_id: string
  buys?: OrderbookLevel[]
  sells?: OrderbookLevel[]
  bids?: OrderbookLevel[]
  asks?: OrderbookLevel[]
  bids_raw?: MarketOrder[]
  asks_raw?: MarketOrder[]
  last_price?: number | null
  [k: string]: unknown
}

/** GET /api/market/info。 */
export interface MarketInfo {
  currency_name?: string
  tax_rate?: number
  tax_rate_percent?: number
  diamond_to_money?: number
  diamond_exchange_tax?: number
  diamond_exchange_received?: number
  diamond_exchange_cost?: number
  price_limit_enabled?: boolean
  limit_up_percent?: number
  limit_down_percent?: number
  max_order_quantity?: number
  price_tick?: number
  min_price?: number
  max_price?: number
  order_expire_days?: number
  announcements?: string
  notice?: string
  announcement?: string
  [k: string]: unknown
}

/** GET /api/market/items/:item_id 详情。 */
export interface MarketItemDetail {
  item?: MarketItem
  status?: string
  listing?: MarketOrder[]
  supply_plan?: unknown
  is_special_category?: boolean
  can_quick_sell?: boolean
  can_supply?: boolean
  can_place_buy?: boolean
  last_price?: number | null
  change_7d_percent?: number | null
  change_30d_percent?: number | null
  [k: string]: unknown
}

/** GET /api/market/me/orders 数组元素（orderView）。 */
export interface MarketOrder {
  order_id: string | number
  type: 'buy' | 'sell' | string
  item_id: string
  name?: string
  item_name?: string
  price: number
  quantity: number
  filled_qty?: number
  remaining_qty?: number
  status?: string
  created_at?: string
  player_name?: string
  own?: boolean
  [k: string]: unknown
}

/** GET /api/market/me/trades 分页元素（tradeView）。 */
export interface MarketTrade {
  trade_id: string | number
  type: string
  item_id: string
  name?: string
  price: number
  quantity: number
  total_amount?: number
  fee?: number
  time?: string
  traded_at?: string
  role?: 'BUYER' | 'SELLER' | string
  [k: string]: unknown
}

/** GET /api/market/me/warehouse。 */
export interface MarketWarehouse {
  money?: number
  money_balance?: number
  balance?: number | null
  currency_name?: string
  economy_available?: boolean
  hint?: string
  items?: WarehouseItem[]
  [k: string]: unknown
}

export interface WarehouseItem {
  item_base64?: string
  item_id: string
  name?: string
  display_name?: string
  material?: string
  quantity: number
  [k: string]: unknown
}

/** GET /api/market/me/balance。 */
export interface MarketBalance {
  uuid?: string
  balance?: number | null
  currency_name?: string
  economy_available?: boolean
  warehouse_money?: number
  [k: string]: unknown
}

/** 成交分页响应。 */
export interface MarketTradesPaginated {
  items?: MarketTrade[]
  trades?: MarketTrade[]
  page?: number
  page_size?: number
  size?: number
  total?: number
  total_pages?: number
  [k: string]: unknown
}

/** 商品列表分页响应。 */
export interface MarketItemsPaginated {
  items?: MarketItem[]
  page?: number
  page_size?: number
  total?: number
  total_pages?: number
  total_items?: number
  buy_page?: boolean
  query?: string
  [k: string]: unknown
}

export interface CreateOrderPayload {
  type: 'buy' | 'sell'
  item_id: string
  price: number
  quantity?: number
  item_base64?: string
}

export interface MarketTradePayload {
  type: 'market_buy' | 'market_sell' | 'quick_sell'
  item_id: string
  quantity?: number
}

export type WarehouseDepositType = { type: 'money'; amount: number } | { type: 'hand'; quantity?: number }
export type WarehouseWithdrawType =
  | { type: 'all' }
  | { type: 'money'; amount: number }
  | { type: 'item'; item_base64?: string }

export interface ExchangePayload {
  type: 'd2m' | 'm2d'
}

// ===== 团队 =====
/** 公开团队列表/搜索返回的行。 */
export interface TeamSummary {
  tid: string | number
  name: string
  owner?: string
  owner_uuid?: string
  member_count?: number
  operator_count?: number
  funds?: number
  activity?: number
  public?: boolean
  friendly_fire?: boolean
  notice?: string
  notice_updated_at?: string
  message_count?: number
  application_count?: number
  currency_name?: string
  created_at?: string
  [k: string]: unknown
}

/** GET /api/team/me 扁平响应。 */
export interface TeamMeInfo {
  in_team: boolean
  tid?: string | number
  team_id?: string | number
  name?: string
  my_role?: 'OPERATOR' | 'MEMBER' | string
  owner?: string
  owner_uuid?: string
  member_count?: number
  operator_count?: number
  funds?: number
  activity?: number
  public?: boolean
  friendly_fire?: boolean
  notice?: string
  notice_updated_at?: string
  currency_name?: string
  created_at?: string
  members?: TeamMember[]
  [k: string]: unknown
}

/** 详情视图（成员可见） */
export interface TeamDetail extends TeamSummary {
  my_role?: 'OPERATOR' | 'MEMBER' | string
  members?: TeamMember[]
  [k: string]: unknown
}

/** GET /api/team/:tid/members 直接返回数组。 */
export interface TeamMember {
  uuid: string
  name?: string
  role?: 'OPERATOR' | 'MEMBER' | string
  operator?: boolean
  online?: boolean
  joined_at?: string | null
  [k: string]: unknown
}

/** GET /api/team/:tid/applications 直接返回数组。 */
export interface TeamApplication {
  applicant_uuid: string
  applicant?: string
  applied_at?: string
  note?: string
  [k: string]: unknown
}

export interface TeamMessage {
  sender_uuid: string
  sender?: string
  content: string
  time?: string
  timestamp?: number
  message_id?: string | number
  [k: string]: unknown
}

export interface TeamFundLog {
  type?: string
  amount: number
  change?: number
  reason?: string
  note?: string
  balance_before?: number
  balance_after?: number
  time?: string
  timestamp?: number
  log_id?: string | number
  [k: string]: unknown
}

export interface TeamFundsInfo {
  tid?: string | number
  team_id?: string | number
  funds: number
  currency_name?: string
  [k: string]: unknown
}

export interface TeamMessageState {
  unread_messages?: number
  unread_notice?: boolean
  [k: string]: unknown
}

export interface TeamOnlineMate {
  uuid?: string
  name?: string
  [k: string]: unknown
}

/** 分页响应（排行榜/流水/留言）。 */
export interface TeamPaginated<T> {
  page: number
  page_size: number
  total_pages?: number
  total_items?: number
  total?: number
  items: T[]
  [k: string]: unknown
}

// ===== 领地 =====
export interface ResidenceSummary {
  name: string
  owner?: string
  owner_uuid?: string
  world?: string
  size?: number | string
  for_sale?: boolean
  sell_price?: number | null
  for_rent?: boolean
  rentable?: boolean
  [k: string]: unknown
}

export interface ResidenceDetail extends ResidenceSummary {
  areas?: unknown
  subzones?: ResidenceSummary[]
  flags?: Record<string, string | boolean>
  player_flags?: Record<string, Record<string, string | boolean>>
  trusted_players?: string[]
  enter_message?: string
  leave_message?: string
  rented_detail?: unknown
  bank?: number | null
  created_at?: string
  [k: string]: unknown
}

export interface ResidenceFlags {
  flags?: Record<string, string | boolean>
  possible_flags?: string[]
  [k: string]: unknown
}

export interface ResidencePlayerFlags {
  flags?: Record<string, string | boolean>
  [k: string]: unknown
}

export type FlagState = 'true' | 'false' | 'remove'

// ===== 工单 =====
export type TicketStatus = 'OPEN' | 'CLOSED'

export interface TicketSummary {
  id: string | number
  subject: string
  status: TicketStatus
  player?: string
  player_uuid?: string
  created_at?: string
  updated_at?: string
  [k: string]: unknown
}

export interface TicketReply {
  reply_id?: string | number
  author?: string
  author_uuid?: string
  is_admin?: boolean
  content: string
  time?: string
  [k: string]: unknown
}

export interface TicketDetail extends TicketSummary {
  content?: string
  replies?: TicketReply[]
  [k: string]: unknown
}

export interface CreateTicketPayload {
  subject: string
  content: string
}
