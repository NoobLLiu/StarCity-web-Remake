<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Search, Loader2, Plus, TrendingUp, Wallet, Coins, ArrowDownToLine, ArrowUpFromLine, Ban, Download,
  Package, ShoppingCart, Store, Banknote, Gem, Info,
} from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import AppBadge from '@/components/AppBadge.vue'
import AppModal from '@/components/AppModal.vue'
import StateView from '@/components/StateView.vue'
import Pagination from '@/components/Pagination.vue'
import { useMarketStore } from '@/stores/market'
import { useNotifyStore } from '@/stores/notify'
import { ApiError } from '@/api/http'
import { formatNumber, formatTime, str, toNumber } from '@/utils/normalize'
import type { CreateOrderPayload, MarketItem, OrderbookLevel } from '@/types'

const store = useMarketStore()
const notify = useNotifyStore()

// ===== 我的交易子 Tab =====
const mineTab = ref<'orders' | 'trades' | 'warehouse'>('orders')

// ===== 行情列表：视角 / 搜索 =====
const buyPage = ref(false)
const query = ref('')

const selectedItem = ref<MarketItem | null>(null)

// ===== 挂单弹窗 =====
const orderOpen = ref(false)
const orderType = ref<'buy' | 'sell'>('buy')
const orderItemId = ref('')
const orderPrice = ref<number | null>(null)
const orderQty = ref<number | null>(null)
const orderBase64 = ref('')
const orderLoading = ref(false)

// ===== 市价成交弹窗 =====
const tradeOpen = ref(false)
const tradeType = ref<'market_buy' | 'market_sell' | 'quick_sell'>('market_buy')
const tradeItemId = ref('')
const tradeQty = ref<number | null>(null)
const tradeLoading = ref(false)

// ===== 仓库弹窗 =====
const whOpen = ref(false)
const whMode = ref<'deposit' | 'withdraw'>('deposit')
const whType = ref<'money' | 'hand' | 'all' | 'item'>('money')
const whAmount = ref<number | null>(null)
const whBase64 = ref('')
const whLoading = ref(false)

// ===== 兑换弹窗 =====
const exOpen = ref(false)
const exType = ref<'d2m' | 'm2d'>('d2m')
const exQty = ref<number>(1)
const exLoading = ref(false)

// ===== 派生 =====
const currency = computed(() => store.currencyName)
const noticeText = computed(() => str(store.info?.notice ?? store.info?.announcement, '暂无公告'))

const orderbookBuys = computed<OrderbookLevel[]>(() => {
  const ob = store.orderbook
  if (!ob) return []
  return (ob.buys ?? ob.bids ?? []) as OrderbookLevel[]
})
const orderbookSells = computed<OrderbookLevel[]>(() => {
  const ob = store.orderbook
  if (!ob) return []
  return (ob.sells ?? ob.asks ?? []) as OrderbookLevel[]
})
const lastPrice = computed(() => store.orderbook?.last_price ?? null)

const econBalanceText = computed(() => {
  if (!store.economyAvailable) return '—（经济不可用）'
  const b = store.economyBalance
  return b === null || b === undefined ? '—' : formatNumber(b)
})

// 兑换预计
const exchangeRate = computed(() => store.diamondToMoney)
const exchangeTax = computed(() => store.taxRate)
// d2m：每颗钻石 -> 货币，扣税
const d2mEstimate = computed(() => {
  const qty = Math.max(1, toNumber(exQty.value, 1))
  const gross = qty * exchangeRate.value
  const tax = gross * exchangeTax.value
  return { gross, tax, net: gross - tax }
})
// m2d：货币 -> 钻石，含税
const m2dEstimate = computed(() => {
  const qty = Math.max(1, toNumber(exQty.value, 1))
  const cost = qty * exchangeRate.value
  const tax = cost * exchangeTax.value
  return { cost, tax, total: cost + tax }
})

// ===== 加载 =====
async function loadItems() {
  try {
    await store.fetchItems({ buy_page: buyPage.value, query: query.value, page: store.itemsPage })
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '行情加载失败')
  }
}

async function loadAll() {
  await Promise.allSettled([store.fetchInfo(), store.fetchMine(), loadItems()])
}

onMounted(loadAll)

// 切换「我的成交」时加载分页
watch(mineTab, async (t) => {
  if (t === 'trades') {
    await store.fetchMyTrades(1, store.myTradesPageSize).catch((e) => {
      notify.error(e instanceof ApiError ? e.message : '成交加载失败')
    })
  }
})

async function onSelectItem(item: MarketItem) {
  selectedItem.value = item
  try {
    await Promise.all([
      store.fetchOrderbook(item.item_id),
      store.fetchItemDetail(item.item_id, { buy_page: buyPage.value }),
    ])
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '盘口加载失败')
  }
}

async function onPageChange(p: number) {
  try {
    await store.fetchItems({ buy_page: buyPage.value, query: query.value, page: p })
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '加载失败')
  }
}

async function onTradesPageChange(p: number) {
  try {
    await store.fetchMyTrades(p, store.myTradesPageSize)
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '加载失败')
  }
}

// ===== 挂单 =====
function openOrderModal(item?: MarketItem) {
  orderType.value = buyPage.value ? 'buy' : 'sell'
  orderItemId.value = item?.item_id ?? selectedItem.value?.item_id ?? ''
  orderPrice.value = item
    ? toNumber(buyPage.value ? item.highest_buy_price : item.lowest_sell_price) || null
    : null
  orderQty.value = null
  orderBase64.value = ''
  orderOpen.value = true
}

async function onCreateOrder() {
  if (!orderItemId.value.trim()) {
    notify.error('请填写商品 ID')
    return
  }
  if (orderPrice.value === null || orderPrice.value <= 0) {
    notify.error('请输入正数价格')
    return
  }
  const payload: CreateOrderPayload = {
    type: orderType.value,
    item_id: orderItemId.value.trim(),
    price: orderPrice.value,
  }
  if (orderQty.value && orderQty.value > 0) payload.quantity = orderQty.value
  if (orderType.value === 'sell' && orderBase64.value.trim()) payload.item_base64 = orderBase64.value.trim()

  orderLoading.value = true
  try {
    await store.createOrder(payload)
    notify.success(orderType.value === 'buy' ? '求购挂单成功' : '出售挂单成功')
    orderOpen.value = false
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '挂单失败')
  } finally {
    orderLoading.value = false
  }
}

// ===== 撤单 =====
async function onCancelOrder(id: string | number) {
  if (!confirm('确认撤销该挂单？资产会退回仓库。')) return
  try {
    await store.cancelOrder(id)
    notify.success('已撤单')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '撤单失败')
  }
}

// ===== 市价 / 快速上架 =====
function openTradeModal(item?: MarketItem, mode?: 'market_buy' | 'market_sell' | 'quick_sell') {
  tradeItemId.value = item?.item_id ?? selectedItem.value?.item_id ?? ''
  tradeQty.value = null
  if (mode) {
    tradeType.value = mode
  } else {
    tradeType.value = buyPage.value ? 'market_buy' : 'market_sell'
  }
  tradeOpen.value = true
}

async function onTrade() {
  if (!tradeItemId.value.trim()) {
    notify.error('请填写商品 ID')
    return
  }
  if (tradeType.value !== 'quick_sell' && (!tradeQty.value || tradeQty.value <= 0)) {
    notify.error('请输入正数数量')
    return
  }
  tradeLoading.value = true
  try {
    await store.trade({
      type: tradeType.value,
      item_id: tradeItemId.value.trim(),
      ...(tradeQty.value && tradeQty.value > 0 ? { quantity: tradeQty.value } : {}),
    })
    notify.success('成交成功')
    tradeOpen.value = false
    // 刷新盘口
    if (selectedItem.value) {
      await store.fetchOrderbook(selectedItem.value.item_id).catch(() => {})
    }
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '交易失败')
  } finally {
    tradeLoading.value = false
  }
}

// ===== 仓库 =====
function openWarehouse(mode: 'deposit' | 'withdraw') {
  whMode.value = mode
  whType.value = mode === 'deposit' ? 'money' : 'all'
  whAmount.value = null
  whBase64.value = ''
  whOpen.value = true
}

async function onWarehouse() {
  whLoading.value = true
  try {
    if (whMode.value === 'deposit') {
      if (whType.value === 'money') {
        if (!whAmount.value || whAmount.value <= 0) {
          notify.error('请输入正数金额')
          whLoading.value = false
          return
        }
        await store.warehouseDeposit({ type: 'money', amount: whAmount.value })
      } else {
        await store.warehouseDeposit({ type: 'hand' })
      }
    } else {
      if (whType.value === 'all') {
        await store.warehouseWithdraw({ type: 'all' })
      } else if (whType.value === 'money') {
        if (!whAmount.value || whAmount.value <= 0) {
          notify.error('请输入正数金额')
          whLoading.value = false
          return
        }
        await store.warehouseWithdraw({ type: 'money', amount: whAmount.value })
      } else {
        await store.warehouseWithdraw({ type: 'item', item_base64: whBase64.value || undefined })
      }
    }
    notify.success('仓库操作成功')
    whOpen.value = false
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  } finally {
    whLoading.value = false
  }
}

// ===== 兑换 =====
function openExchange() {
  exQty.value = 1
  exType.value = 'd2m'
  exOpen.value = true
}

async function onExchange() {
  const qty = Math.max(1, toNumber(exQty.value, 1))
  if (qty <= 0) {
    notify.error('请输入正数数量')
    return
  }
  exLoading.value = true
  try {
    await store.exchange({ type: exType.value })
    notify.success(exType.value === 'd2m' ? '钻石已兑换为货币' : '货币已兑换为钻石')
    exOpen.value = false
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '兑换失败')
  } finally {
    exLoading.value = false
  }
}

// ===== 导出 CSV =====
function exportCsv() {
  const rows = store.items
  if (!rows.length) {
    notify.info('暂无数据可导出')
    return
  }
  const header = ['item_id', 'name', 'lowest_sell_price', 'highest_buy_price', 'volume']
  const lines = rows.map((r) =>
    header
      .map((h) => {
        const v = (r as Record<string, unknown>)[h]
        const s = v === null || v === undefined ? '' : String(v)
        return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s
      })
      .join(','),
  )
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'starcity_market.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ===== 辅助 =====
const whOptions = ['money', 'hand', 'all', 'item'] as const
function whLabel(opt: (typeof whOptions)[number]): string {
  return { money: '货币', hand: '手持物品', all: '全部取出', item: '指定物品' }[opt]
}
function orderTypeLabel(t: unknown) {
  return String(t ?? '').toLowerCase() === 'buy' ? '求购' : '出售'
}
function tradeRoleLabel(r: unknown) {
  const s = String(r ?? '').toUpperCase()
  if (s === 'BUYER') return '买入'
  if (s === 'SELLER') return '卖出'
  return String(r ?? '—')
}

let searchTimer: number | undefined
function onSearchInput() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    store.itemsPage = 1
    loadItems()
  }, 350)
}

function switchView(buy: boolean) {
  buyPage.value = buy
  store.itemsPage = 1
  loadItems()
}
</script>

<template>
  <!-- Page toolbar -->
  <div class="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 px-4 lg:px-5 py-3 border-b border-border bg-card/65">
    <div class="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 w-full sm:w-auto">
      <label class="flex items-center gap-2 h-9 px-3 bg-input border border-border shadow-hard-muted w-full sm:w-auto">
        <Search :size="16" class="text-muted-foreground" />
        <input
          v-model="query"
          type="text"
          placeholder="搜索商品名/ID/材质"
          class="bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground w-full sm:w-44"
          @input="onSearchInput"
          @keydown.enter="loadItems"
        />
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="h-9 px-3 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px flex items-center gap-1"
          :class="!buyPage ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="switchView(false)"
        >
          <Store :size="14" /> 出售视角
        </button>
        <button
          type="button"
          class="h-9 px-3 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px flex items-center gap-1"
          :class="buyPage ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="switchView(true)"
        >
          <ShoppingCart :size="14" /> 求购视角
        </button>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <AppButton variant="muted" size="md" @click="openExchange"><Gem :size="14" /> 钻石兑换</AppButton>
      <AppButton variant="primary" size="md" @click="openOrderModal()"><Plus :size="14" /> 我要挂单</AppButton>
    </div>
  </div>

  <section class="flex-1 p-4 lg:p-5 space-y-4 min-w-0">
    <!-- 余额 + 公告条 -->
    <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 grid gap-3">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="grid gap-1">
          <div class="flex items-center gap-2">
            <Info :size="14" class="text-muted-foreground" />
            <h2 class="text-sm font-bold tracking-tight">市场公告</h2>
          </div>
          <p class="text-sm text-muted-foreground whitespace-pre-wrap">{{ noticeText }}</p>
        </div>
        <div class="grid grid-cols-2 gap-2 text-right">
          <div class="px-3 py-2 border border-border bg-background">
            <span class="text-[10px] uppercase text-muted-foreground block">经济余额</span>
            <strong class="text-sm">{{ econBalanceText }} {{ currency }}</strong>
          </div>
          <div class="px-3 py-2 border border-border bg-background">
            <span class="text-[10px] uppercase text-muted-foreground block">仓库星光点</span>
            <strong class="text-sm">{{ formatNumber(store.warehouseMoney) }} {{ currency }}</strong>
          </div>
        </div>
      </div>
    </article>

    <!-- 行情列表 -->
    <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 grid gap-3">
      <div class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 class="text-lg font-bold tracking-tight">市场行情</h2>
          <p class="text-xs text-muted-foreground">
            {{ buyPage ? '求购视角：显示最高求购价' : '出售视角：显示最低售价' }} · 点击行加载盘口
          </p>
        </div>
        <AppButton variant="muted" size="sm" @click="exportCsv"><Download :size="12" /> 导出 CSV</AppButton>
      </div>
      <StateView
        :loading="store.itemsLoading && !store.items.length"
        :error="store.itemsError"
        :empty="!store.items.length"
        empty-text="没有商品"
        @retry="loadItems()"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-[11px] uppercase text-muted-foreground">
                <th class="text-left px-3 py-2 font-normal">商品</th>
                <th class="text-left px-3 py-2 font-normal">最低售价</th>
                <th class="text-left px-3 py-2 font-normal">最高求购</th>
                <th class="text-left px-3 py-2 font-normal">成交量</th>
                <th class="text-left px-3 py-2 font-normal">涨跌(7d)</th>
                <th class="text-left px-3 py-2 font-normal">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="item in store.items"
                :key="item.item_id"
                class="bg-background cursor-pointer hover:bg-muted/40"
                :class="selectedItem?.item_id === item.item_id ? 'bg-sidebar-accent' : ''"
                @click="onSelectItem(item)"
              >
                <td class="px-3 py-2 font-medium">
                  <div class="flex items-center gap-2">
                    <span>{{ item.name || item.display_name || item.item_name || item.item_id }}</span>
                    <AppBadge v-if="item.suspended" variant="destructive">停牌</AppBadge>
                  </div>
                </td>
                <td class="px-3 py-2 text-chart-1 font-medium">
                  {{ item.lowest_sell_price != null ? formatNumber(item.lowest_sell_price) : '—' }}
                </td>
                <td class="px-3 py-2 text-muted-foreground">
                  {{ item.highest_buy_price != null ? formatNumber(item.highest_buy_price) : '—' }}
                </td>
                <td class="px-3 py-2">
                  {{ (item.volume ?? item.volume_today) != null ? formatNumber(item.volume ?? item.volume_today) : '—' }}
                </td>
                <td class="px-3 py-2">
                  <span
                    v-if="item.change_7d_percent != null"
                    :class="toNumber(item.change_7d_percent) >= 0 ? 'text-chart-1' : 'text-destructive'"
                  >
                    {{ toNumber(item.change_7d_percent) >= 0 ? '+' : '' }}{{ toNumber(item.change_7d_percent) }}%
                  </span>
                  <span v-else class="text-muted-foreground">—</span>
                </td>
                <td class="px-3 py-2">
                  <AppButton variant="secondary" size="sm" @click.stop="openTradeModal(item)">市价</AppButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </StateView>
      <Pagination
        :page="store.itemsPage"
        :page-size="store.itemsPageSize"
        :total="store.itemsTotal"
        @change="onPageChange"
      />
    </article>

    <!-- 盘口 + 我的交易 -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
      <!-- 盘口 -->
      <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 grid gap-3 order-2 lg:order-1">
        <div class="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-lg font-bold tracking-tight">盘口</h2>
            <p class="text-xs text-muted-foreground">
              {{ selectedItem ? (selectedItem.name || selectedItem.item_id) : '未选择商品' }}
            </p>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="text-muted-foreground">最新价:</span>
            <strong class="text-chart-1">{{ lastPrice != null ? formatNumber(lastPrice) : '—' }}</strong>
            <span class="text-muted-foreground">{{ currency }}</span>
          </div>
        </div>
        <StateView
          :loading="store.orderbookLoading"
          :empty="!store.orderbook"
          empty-text="点击右侧商品查看盘口"
        >
          <div v-if="store.orderbook" class="grid gap-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- 买盘（价高优先） -->
              <div class="grid gap-2">
                <div class="flex items-center gap-1 text-[11px] uppercase text-chart-1">
                  <TrendingUp :size="12" /> 买盘（价高优先）
                </div>
                <div class="grid grid-cols-[1fr_1fr] gap-y-1 gap-x-2 text-sm">
                  <span class="text-[11px] uppercase text-muted-foreground">价格</span>
                  <span class="text-[11px] uppercase text-muted-foreground text-right">数量</span>
                  <template v-for="(l, i) in orderbookBuys.slice(0, 5)" :key="'b' + i">
                    <span class="text-chart-1 font-medium">{{ formatNumber(l.price) }}</span>
                    <span class="text-right">{{ formatNumber(l.quantity) }}</span>
                  </template>
                  <span v-if="!orderbookBuys.length" class="col-span-2 text-xs text-muted-foreground py-2 text-center">无买盘</span>
                </div>
              </div>
              <!-- 卖盘（价低优先） -->
              <div class="grid gap-2">
                <div class="flex items-center gap-1 text-[11px] uppercase text-destructive">
                  <TrendingUp :size="12" class="rotate-180" /> 卖盘（价低优先）
                </div>
                <div class="grid grid-cols-[1fr_1fr] gap-y-1 gap-x-2 text-sm">
                  <span class="text-[11px] uppercase text-muted-foreground">价格</span>
                  <span class="text-[11px] uppercase text-muted-foreground text-right">数量</span>
                  <template v-for="(l, i) in orderbookSells.slice(0, 5)" :key="'s' + i">
                    <span class="text-destructive font-medium">{{ formatNumber(l.price) }}</span>
                    <span class="text-right">{{ formatNumber(l.quantity) }}</span>
                  </template>
                  <span v-if="!orderbookSells.length" class="col-span-2 text-xs text-muted-foreground py-2 text-center">无卖盘</span>
                </div>
              </div>
            </div>

            <!-- 快捷交易 -->
            <div class="flex flex-wrap gap-2 border-t border-border pt-3">
              <AppButton variant="primary" size="sm" @click="openTradeModal(undefined, 'market_buy')">
                <ShoppingCart :size="12" /> 市价买入
              </AppButton>
              <AppButton variant="secondary" size="sm" @click="openTradeModal(undefined, 'market_sell')">
                <Package :size="12" /> 市价卖出
              </AppButton>
              <AppButton variant="muted" size="sm" @click="openTradeModal(undefined, 'quick_sell')">
                <Store :size="12" /> 快速上架
              </AppButton>
              <AppButton variant="ghost" size="sm" @click="openOrderModal(selectedItem ?? undefined)">
                <Plus :size="12" /> 挂单
              </AppButton>
            </div>
            <p class="text-xs text-muted-foreground">
              市价买入按最低卖价、市价卖出按最新成交价、快速上架按最低卖价。停牌品种禁止交易。
            </p>
          </div>
        </StateView>
      </article>

      <!-- 我的交易 -->
      <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 grid gap-3 order-1 lg:order-2">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h2 class="text-lg font-bold tracking-tight">我的交易</h2>
          <div class="flex gap-2">
            <AppButton variant="muted" size="sm" @click="openWarehouse('deposit')">
              <ArrowDownToLine :size="12" /> 存仓
            </AppButton>
            <AppButton variant="muted" size="sm" @click="openWarehouse('withdraw')">
              <ArrowUpFromLine :size="12" /> 取仓
            </AppButton>
          </div>
        </div>
        <div class="flex gap-2 border-b border-border pb-2">
          <button
            v-for="t in ([
              { id: 'orders', label: '我的挂单' },
              { id: 'trades', label: '我的成交' },
              { id: 'warehouse', label: '我的仓库' },
            ] as const)"
            :key="t.id"
            type="button"
            class="h-8 px-3 text-xs border"
            :class="mineTab === t.id ? 'bg-primary text-primary-foreground border-transparent' : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground'"
            @click="mineTab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <StateView
          :loading="store.mineLoading && mineTab === 'orders' && !store.myOrders.length"
          :empty="false"
        >
          <!-- 我的挂单 -->
          <div v-if="mineTab === 'orders'">
            <div v-if="store.myOrders.length" class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-[11px] uppercase text-muted-foreground">
                    <th class="text-left px-3 py-2 font-normal">商品</th>
                    <th class="text-left px-3 py-2 font-normal">方向</th>
                    <th class="text-left px-3 py-2 font-normal">单价</th>
                    <th class="text-left px-3 py-2 font-normal">数量</th>
                    <th class="text-left px-3 py-2 font-normal">剩余</th>
                    <th class="text-left px-3 py-2 font-normal">状态</th>
                    <th class="text-left px-3 py-2 font-normal">创建</th>
                    <th class="text-left px-3 py-2 font-normal">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr v-for="o in store.myOrders" :key="String(o.order_id)" class="bg-background">
                    <td class="px-3 py-2 font-medium">{{ o.name || o.item_name || o.item_id }}</td>
                    <td class="px-3 py-2">
                      <AppBadge :variant="String(o.type).toLowerCase() === 'buy' ? 'primary' : 'accent'">
                        {{ orderTypeLabel(o.type) }}
                      </AppBadge>
                    </td>
                    <td class="px-3 py-2 text-chart-1 font-medium">{{ formatNumber(o.price) }}</td>
                    <td class="px-3 py-2">{{ formatNumber(o.quantity) }}</td>
                    <td class="px-3 py-2 text-muted-foreground">{{ formatNumber(o.remaining_qty ?? o.quantity) }}</td>
                    <td class="px-3 py-2">
                      <AppBadge variant="muted">{{ str(o.status, '进行中') }}</AppBadge>
                    </td>
                    <td class="px-3 py-2 text-muted-foreground text-xs">{{ formatTime(o.created_at) || '—' }}</td>
                    <td class="px-3 py-2">
                      <AppButton variant="destructive" size="sm" @click="onCancelOrder(o.order_id)">
                        <Ban :size="12" /> 撤单
                      </AppButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-muted-foreground py-6 text-center">暂无挂单</p>
          </div>

          <!-- 我的成交 -->
          <div v-else-if="mineTab === 'trades'">
            <div v-if="store.myTrades.length" class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-[11px] uppercase text-muted-foreground">
                    <th class="text-left px-3 py-2 font-normal">商品</th>
                    <th class="text-left px-3 py-2 font-normal">方向</th>
                    <th class="text-left px-3 py-2 font-normal">单价</th>
                    <th class="text-left px-3 py-2 font-normal">数量</th>
                    <th class="text-left px-3 py-2 font-normal">总额</th>
                    <th class="text-left px-3 py-2 font-normal">手续费</th>
                    <th class="text-left px-3 py-2 font-normal">时间</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr v-for="t in store.myTrades" :key="String(t.trade_id)" class="bg-background">
                    <td class="px-3 py-2 font-medium">{{ t.name || t.item_id }}</td>
                    <td class="px-3 py-2">
                      <AppBadge :variant="tradeRoleLabel(t.role).includes('买') ? 'primary' : 'accent'">
                        {{ tradeRoleLabel(t.role) }}
                      </AppBadge>
                    </td>
                    <td class="px-3 py-2 text-chart-1 font-medium">{{ formatNumber(t.price) }}</td>
                    <td class="px-3 py-2">{{ formatNumber(t.quantity) }}</td>
                    <td class="px-3 py-2">{{ formatNumber(t.total_amount) }}</td>
                    <td class="px-3 py-2 text-muted-foreground">{{ t.fee != null ? formatNumber(t.fee) : '—' }}</td>
                    <td class="px-3 py-2 text-muted-foreground text-xs">{{ formatTime(t.time ?? t.traded_at) || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-muted-foreground py-6 text-center">暂无成交记录</p>
            <div v-if="store.myTradesTotal > store.myTradesPageSize" class="pt-3">
              <Pagination
                :page="store.myTradesPage"
                :page-size="store.myTradesPageSize"
                :total="store.myTradesTotal"
                @change="onTradesPageChange"
              />
            </div>
          </div>

          <!-- 我的仓库 -->
          <div v-else>
            <div v-if="store.warehouse" class="grid gap-3">
              <!-- 余额展示 -->
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 border border-border bg-background">
                  <span class="text-[10px] uppercase text-muted-foreground block flex items-center gap-1">
                    <Banknote :size="11" /> 经济余额
                  </span>
                  <strong class="text-lg block mt-1">
                    {{ store.economyAvailable ? (store.economyBalance != null ? formatNumber(store.economyBalance) : '—') : '—（不可用）' }}
                    <span class="text-xs font-medium text-muted-foreground">{{ currency }}</span>
                  </strong>
                </div>
                <div class="p-3 border border-border bg-background">
                  <span class="text-[10px] uppercase text-muted-foreground block flex items-center gap-1">
                    <Wallet :size="11" /> 仓库星光点
                  </span>
                  <strong class="text-lg block mt-1">
                    {{ formatNumber(store.warehouseMoney) }}
                    <span class="text-xs font-medium text-muted-foreground">{{ currency }}</span>
                  </strong>
                </div>
              </div>
              <p v-if="store.warehouse.hint" class="text-xs text-muted-foreground">{{ str(store.warehouse.hint) }}</p>

              <!-- 物品列表 -->
              <div v-if="store.warehouse.items && store.warehouse.items.length" class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead>
                    <tr class="text-[11px] uppercase text-muted-foreground">
                      <th class="text-left px-3 py-2 font-normal">物品</th>
                      <th class="text-left px-3 py-2 font-normal">材质</th>
                      <th class="text-left px-3 py-2 font-normal">数量</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    <tr v-for="(it, i) in store.warehouse.items" :key="i" class="bg-background">
                      <td class="px-3 py-2 font-medium">{{ it.name || it.display_name || it.item_id }}</td>
                      <td class="px-3 py-2 text-muted-foreground text-xs">{{ str(it.material, '—') }}</td>
                      <td class="px-3 py-2">{{ formatNumber(it.quantity) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="text-sm text-muted-foreground text-center py-4">仓库中没有物品</p>
            </div>
            <p v-else class="text-sm text-muted-foreground py-6 text-center">仓库信息加载失败</p>
          </div>
        </StateView>
      </article>
    </div>
  </section>

  <!-- ========== Modals ========== -->

  <!-- 挂单弹窗 -->
  <AppModal :open="orderOpen" title="挂单" width="max-w-md" @update:open="(v) => (orderOpen = v)">
    <div class="space-y-3">
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 h-9 text-sm border"
          :class="orderType === 'buy' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="orderType = 'buy'"
        >
          求购（买单）
        </button>
        <button
          type="button"
          class="flex-1 h-9 text-sm border"
          :class="orderType === 'sell' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="orderType = 'sell'"
        >
          出售（卖单）
        </button>
      </div>
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">商品 ID</span>
        <input
          v-model="orderItemId"
          type="text"
          class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
          placeholder="如 minecraft:diamond"
        />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">单价</span>
          <input
            v-model.number="orderPrice"
            type="number"
            min="0"
            step="0.01"
            class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">数量（可选）</span>
          <input
            v-model.number="orderQty"
            type="number"
            min="0"
            step="1"
            class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
          />
        </label>
      </div>
      <label v-if="orderType === 'sell'" class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">手持物品 Base64（可选）</span>
        <input
          v-model="orderBase64"
          type="text"
          class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
          placeholder="出售手持物品时填写"
        />
      </label>
      <div class="text-xs text-muted-foreground space-y-1">
        <p>挂单走仓库资产，无需玩家在线。</p>
        <p v-if="store.info">
          价格须在 {{ store.info.min_price ?? '—' }}~{{ store.info.max_price ?? '—' }} 区间，步进 {{ store.info.price_tick ?? '—' }}；
          单笔上限 {{ store.info.max_order_quantity ?? '—' }}。
        </p>
      </div>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="orderOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="orderLoading" @click="onCreateOrder">
        <Loader2 v-if="orderLoading" :size="14" class="animate-spin" /> 确认挂单
      </AppButton>
    </template>
  </AppModal>

  <!-- 市价成交弹窗 -->
  <AppModal :open="tradeOpen" title="市价成交" width="max-w-md" @update:open="(v) => (tradeOpen = v)">
    <div class="space-y-3">
      <div class="flex gap-2">
        <button
          v-for="opt in ([
            { id: 'market_buy', label: '市价买入' },
            { id: 'market_sell', label: '市价卖出' },
            { id: 'quick_sell', label: '快速上架' },
          ] as const)"
          :key="opt.id"
          type="button"
          class="flex-1 h-9 text-xs border"
          :class="tradeType === opt.id ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="tradeType = opt.id"
        >
          {{ opt.label }}
        </button>
      </div>
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">商品 ID</span>
        <input
          v-model="tradeItemId"
          type="text"
          class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
        />
      </label>
      <label v-if="tradeType !== 'quick_sell'" class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">数量</span>
        <input
          v-model.number="tradeQty"
          type="number"
          min="0"
          step="1"
          class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
        />
      </label>
      <p class="text-xs text-muted-foreground">
        市价买入按最低卖价、市价卖出按最新成交价、快速上架按最低卖价；走仓库资产，无需玩家在线。停牌品种禁止交易。
      </p>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="tradeOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="tradeLoading" @click="onTrade">
        <TrendingUp :size="14" />
        <Loader2 v-if="tradeLoading" :size="14" class="animate-spin" />
        确认成交
      </AppButton>
    </template>
  </AppModal>

  <!-- 仓库弹窗 -->
  <AppModal
    :open="whOpen"
    :title="whMode === 'deposit' ? '存入仓库' : '取出仓库'"
    width="max-w-md"
    @update:open="(v) => (whOpen = v)"
  >
    <div class="space-y-3">
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 h-9 text-sm border"
          :class="whMode === 'deposit' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="whMode = 'deposit'; whType = 'money'"
        >
          存入
        </button>
        <button
          type="button"
          class="flex-1 h-9 text-sm border"
          :class="whMode === 'withdraw' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="whMode = 'withdraw'; whType = 'all'"
        >
          取出
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in whOptions.filter((o) => whMode === 'deposit' ? o !== 'all' : true)"
          :key="opt"
          type="button"
          class="h-8 px-3 text-xs border"
          :class="whType === opt ? 'bg-accent text-accent-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="whType = opt"
        >
          {{ whLabel(opt) }}
        </button>
      </div>
      <label v-if="whType === 'money'" class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">金额（{{ currency }}）</span>
        <input
          v-model.number="whAmount"
          type="number"
          min="0"
          step="1"
          class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
        />
      </label>
      <label v-if="whMode === 'withdraw' && whType === 'item'" class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">物品 Base64（可选，留空取全部该类）</span>
        <input
          v-model="whBase64"
          type="text"
          class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
        />
      </label>
      <p class="text-xs text-muted-foreground">
        存入手持物品、提取到背包/余额需要玩家在线，离线时后端返回「该操作需要玩家在线」。
      </p>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="whOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="whLoading" @click="onWarehouse">
        <Wallet :size="14" />
        <Loader2 v-if="whLoading" :size="14" class="animate-spin" />
        确认
      </AppButton>
    </template>
  </AppModal>

  <!-- 钻石兑换弹窗 -->
  <AppModal :open="exOpen" title="钻石兑换" width="max-w-md" @update:open="(v) => (exOpen = v)">
    <div class="space-y-3">
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 h-9 text-sm border flex items-center justify-center gap-1"
          :class="exType === 'd2m' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="exType = 'd2m'"
        >
          <Gem :size="14" /> 钻石 → 货币
        </button>
        <button
          type="button"
          class="flex-1 h-9 text-sm border flex items-center justify-center gap-1"
          :class="exType === 'm2d' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="exType = 'm2d'"
        >
          <Banknote :size="14" /> 货币 → 钻石
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3 text-xs">
        <div class="p-2 border border-border bg-background">
          <span class="text-muted-foreground block">汇率</span>
          <strong>1 钻石 = {{ formatNumber(exchangeRate) }} {{ currency }}</strong>
        </div>
        <div class="p-2 border border-border bg-background">
          <span class="text-muted-foreground block">税率</span>
          <strong>{{ exchangeTax * 100 }}%</strong>
        </div>
      </div>

      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">数量</span>
        <input
          v-model.number="exQty"
          type="number"
          min="1"
          step="1"
          class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
        />
      </label>

      <div v-if="exType === 'd2m'" class="p-3 border border-border bg-muted text-sm grid gap-1">
        <div class="flex justify-between"><span class="text-muted-foreground">兑换前总额</span><span>{{ formatNumber(d2mEstimate.gross) }} {{ currency }}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">扣税 ({{ exchangeTax * 100 }}%)</span><span class="text-destructive">-{{ formatNumber(d2mEstimate.tax) }}</span></div>
        <div class="flex justify-between font-semibold border-t border-border pt-1"><span>预计到手</span><span class="text-chart-1">{{ formatNumber(d2mEstimate.net) }} {{ currency }}</span></div>
      </div>
      <div v-else class="p-3 border border-border bg-muted text-sm grid gap-1">
        <div class="flex justify-between"><span class="text-muted-foreground">基础花费</span><span>{{ formatNumber(m2dEstimate.cost) }} {{ currency }}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">含税 ({{ exchangeTax * 100 }}%)</span><span class="text-destructive">+{{ formatNumber(m2dEstimate.tax) }}</span></div>
        <div class="flex justify-between font-semibold border-t border-border pt-1"><span>预计花费</span><span class="text-chart-1">{{ formatNumber(m2dEstimate.total) }} {{ currency }}</span></div>
      </div>

      <p class="text-xs text-muted-foreground">兑换走仓库资产，无需玩家在线；需要成长等级达标。余额不足/仓库无钻石时后端返回中文提示。</p>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="exOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="exLoading" @click="onExchange">
        <Coins :size="14" />
        <Loader2 v-if="exLoading" :size="14" class="animate-spin" />
        确认兑换
      </AppButton>
    </template>
  </AppModal>
</template>
