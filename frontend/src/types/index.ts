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
export interface MarketItem {
  item_id: string
  name: string
  lowest_sell_price?: number | null
  highest_buy_price?: number | null
  volume?: number | null
  [k: string]: unknown
}

export interface OrderbookLevel {
  price: number
  quantity: number
}

export interface Orderbook {
  item_id: string
  buys: OrderbookLevel[]
  sells: OrderbookLevel[]
  [k: string]: unknown
}

export interface MarketInfo {
  notice?: string
  announcement?: string
  tax_rate?: number
  [k: string]: unknown
}

export interface MarketOrder {
  order_id: string | number
  type: 'buy' | 'sell'
  item_id: string
  name?: string
  price: number
  quantity: number
  status?: string
  [k: string]: unknown
}

export interface MarketTrade {
  trade_id: string | number
  type: string
  item_id: string
  name?: string
  price: number
  quantity: number
  time?: string
  [k: string]: unknown
}

export interface MarketWarehouse {
  money: number
  items: WarehouseItem[]
  [k: string]: unknown
}

export interface WarehouseItem {
  item_id: string
  name?: string
  quantity: number
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
export interface TeamSummary {
  tid: string | number
  name: string
  owner?: string
  owner_uuid?: string
  member_count?: number
  funds?: number
  public?: boolean
  [k: string]: unknown
}

export interface TeamDetail extends TeamSummary {
  notice?: string
  friendly_fire?: boolean
  created_at?: string
  my_role?: string
  [k: string]: unknown
}

export interface TeamMember {
  uuid: string
  name?: string
  role?: string
  joined_at?: string
  [k: string]: unknown
}

export interface TeamApplication {
  applicant_uuid: string
  applicant?: string
  applied_at?: string
  note?: string
  [k: string]: unknown
}

export interface TeamMessage {
  message_id?: string | number
  sender_uuid: string
  sender?: string
  content: string
  time?: string
  [k: string]: unknown
}

export interface TeamFundLog {
  log_id?: string | number
  time?: string
  type?: string
  amount: number
  note?: string
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
