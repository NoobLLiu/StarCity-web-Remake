<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Search, Loader2, Plus, TrendingUp, Wallet, Coins, ArrowDownToLine, ArrowUpFromLine, Ban, Download,
} from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import AppBadge from '@/components/AppBadge.vue'
import AppModal from '@/components/AppModal.vue'
import StateView from '@/components/StateView.vue'
import Pagination from '@/components/Pagination.vue'
import { useMarketStore } from '@/stores/market'
import { useNotifyStore } from '@/stores/notify'
import { ApiError } from '@/api/http'
import { formatNumber, str, toNumber } from '@/utils/normalize'
import type { CreateOrderPayload, MarketItem } from '@/types'

const store = useMarketStore()
const notify = useNotifyStore()

const mineTab = ref<'orders' | 'trades' | 'warehouse'>('orders')
const buyPage = ref(false)
const query = ref('')

const selectedItem = ref<MarketItem | null>(null)

// Order modal
const orderOpen = ref(false)
const orderType = ref<'buy' | 'sell'>('buy')
const orderItemId = ref('')
const orderPrice = ref<number | null>(null)
const orderQty = ref<number | null>(null)
const orderBase64 = ref('')
const orderLoading = ref(false)

// Trade modal
const tradeOpen = ref(false)
const tradeType = ref<'market_buy' | 'market_sell' | 'quick_sell'>('market_buy')
const tradeItemId = ref('')
const tradeQty = ref<number | null>(null)
const tradeLoading = ref(false)

// Warehouse modal
const whOpen = ref(false)
const whMode = ref<'deposit' | 'withdraw'>('deposit')
const whType = ref<'money' | 'hand' | 'all' | 'item'>('money')
const whAmount = ref<number | null>(null)
const whBase64 = ref('')
const whLoading = ref(false)

// Exchange modal
const exOpen = ref(false)
const exType = ref<'d2m' | 'm2d'>('d2m')
const exLoading = ref(false)

async function loadItems() {
  await store.fetchItems({ buy_page: buyPage.value, query: query.value, page: store.itemsPage })
}

async function loadAll() {
  await Promise.allSettled([store.fetchInfo(), store.fetchMine(), loadItems()])
}

async function onSelectItem(item: MarketItem) {
  selectedItem.value = item
  try {
    await store.fetchOrderbook(item.item_id)
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '盘口加载失败')
  }
}

async function onPageChange(p: number) {
  await store.fetchItems({ buy_page: buyPage.value, query: query.value, page: p })
}

function openOrderModal(item?: MarketItem) {
  orderType.value = buyPage.value ? 'buy' : 'sell'
  orderItemId.value = item?.item_id ?? ''
  orderPrice.value = item ? toNumber(buyPage.value ? item.highest_buy_price : item.lowest_sell_price) || null : null
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
    notify.success('挂单成功')
    orderOpen.value = false
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '挂单失败')
  } finally {
    orderLoading.value = false
  }
}

async function onCancelOrder(id: string | number) {
  if (!confirm('确认撤销该挂单？')) return
  try {
    await store.cancelOrder(id)
    notify.success('已撤单')
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '撤单失败')
  }
}

function openTradeModal(item?: MarketItem) {
  tradeItemId.value = item?.item_id ?? selectedItem.value?.item_id ?? ''
  tradeQty.value = null
  tradeType.value = buyPage.value ? 'market_buy' : 'market_sell'
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
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '交易失败')
  } finally {
    tradeLoading.value = false
  }
}

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
          notify.error('请输入正数金额'); whLoading.value = false; return
        }
        await store.warehouseDeposit({ type: 'money', amount: whAmount.value })
      } else {
        // deposit hand item; quantity optional
        await store.warehouseDeposit({ type: 'hand' })
      }
    } else {
      if (whType.value === 'all') {
        await store.warehouseWithdraw({ type: 'all' })
      } else if (whType.value === 'money') {
        if (!whAmount.value || whAmount.value <= 0) {
          notify.error('请输入正数金额'); whLoading.value = false; return
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

async function onExchange() {
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

const noticeText = computed(() => str(store.info?.notice ?? store.info?.announcement, '暂无公告'))

// Warehouse operation type options for the selector.
const whOptions = ['money', 'hand', 'all', 'item'] as const
function whLabel(opt: (typeof whOptions)[number]): string {
  return { money: '货币', hand: '手持物品', all: '全部取出', item: '指定物品' }[opt]
}

let searchTimer: number | undefined
function onSearchInput() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    store.itemsPage = 1
    loadItems()
  }, 350)
}

onMounted(loadAll)
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
          placeholder="搜索商品"
          class="bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground w-full sm:w-44"
          @input="onSearchInput"
        />
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="h-9 px-3 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px"
          :class="!buyPage ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="buyPage = false; loadItems()"
        >
          出售视角
        </button>
        <button
          type="button"
          class="h-9 px-3 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px"
          :class="buyPage ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
          @click="buyPage = true; loadItems()"
        >
          求购视角
        </button>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <AppButton variant="muted" size="md" @click="exOpen = true"><Coins :size="14" /> 钻石兑换</AppButton>
      <AppButton variant="primary" size="md" @click="openOrderModal()"><Plus :size="14" /> 我要挂单</AppButton>
    </div>
  </div>

  <section class="flex-1 p-4 lg:p-5 space-y-4 min-w-0">
    <!-- Market info -->
    <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 grid gap-2">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h2 class="text-lg font-bold tracking-tight">市场公告</h2>
        <span class="text-[11px] uppercase text-muted-foreground">GET /api/market/info</span>
      </div>
      <p class="text-sm text-muted-foreground whitespace-pre-wrap">{{ noticeText }}</p>
    </article>

    <!-- Market items -->
    <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 grid gap-3">
      <div class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 class="text-lg font-bold tracking-tight">市场行情</h2>
          <p class="text-xs text-muted-foreground">点击商品查看盘口与快捷交易</p>
        </div>
        <AppButton variant="muted" size="sm" @click="exportCsv"><Download :size="12" /> 导出 CSV</AppButton>
      </div>
      <StateView :loading="store.itemsLoading && !store.items.length" :error="store.itemsError" :empty="!store.items.length" empty-text="没有商品" @retry="loadItems()">
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-[11px] uppercase text-muted-foreground">
                <th class="text-left px-3 py-2 font-normal">商品</th>
                <th class="text-left px-3 py-2 font-normal">最低售价</th>
                <th class="text-left px-3 py-2 font-normal">最高求购</th>
                <th class="text-left px-3 py-2 font-normal">成交量</th>
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
                <td class="px-3 py-2 font-medium">{{ item.name || item.item_id }}</td>
                <td class="px-3 py-2 text-chart-1 font-medium">{{ item.lowest_sell_price != null ? formatNumber(item.lowest_sell_price) + ' SC' : '—' }}</td>
                <td class="px-3 py-2 text-muted-foreground">{{ item.highest_buy_price != null ? formatNumber(item.highest_buy_price) + ' SC' : '—' }}</td>
                <td class="px-3 py-2">{{ item.volume != null ? formatNumber(item.volume) : '—' }}</td>
                <td class="px-3 py-2">
                  <AppButton variant="secondary" size="sm" @click.stop="openTradeModal(item)">市价</AppButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </StateView>
      <Pagination :page="store.itemsPage" :page-size="store.itemsPageSize" :total="store.itemsTotal" @change="onPageChange" />
    </article>

    <!-- My trades + orderbook -->
    <div class="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
      <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 grid gap-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h2 class="text-lg font-bold tracking-tight">我的交易</h2>
          <div class="flex gap-2">
            <AppButton variant="muted" size="sm" @click="openWarehouse('deposit')"><ArrowDownToLine :size="12" /> 存仓</AppButton>
            <AppButton variant="muted" size="sm" @click="openWarehouse('withdraw')"><ArrowUpFromLine :size="12" /> 取仓</AppButton>
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
        <StateView :loading="store.mineLoading && mineTab === 'orders' && !store.myOrders.length" :empty="false">
          <!-- My orders -->
          <div v-if="mineTab === 'orders'">
            <div v-if="store.myOrders.length" class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-[11px] uppercase text-muted-foreground">
                    <th class="text-left px-3 py-2 font-normal">商品</th>
                    <th class="text-left px-3 py-2 font-normal">类型</th>
                    <th class="text-left px-3 py-2 font-normal">价格</th>
                    <th class="text-left px-3 py-2 font-normal">数量</th>
                    <th class="text-left px-3 py-2 font-normal">状态</th>
                    <th class="text-left px-3 py-2 font-normal">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr v-for="o in store.myOrders" :key="String(o.order_id)" class="bg-background">
                    <td class="px-3 py-2 font-medium">{{ o.name || o.item_id }}</td>
                    <td class="px-3 py-2 text-muted-foreground">{{ o.type === 'buy' ? '求购' : '出售' }}</td>
                    <td class="px-3 py-2 text-chart-1 font-medium">{{ formatNumber(o.price) }} SC</td>
                    <td class="px-3 py-2">{{ formatNumber(o.quantity) }}</td>
                    <td class="px-3 py-2"><AppBadge variant="primary">{{ str(o.status, '进行中') }}</AppBadge></td>
                    <td class="px-3 py-2">
                      <AppButton variant="destructive" size="sm" @click="onCancelOrder(o.order_id)"><Ban :size="12" /> 撤单</AppButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-muted-foreground py-6 text-center">暂无挂单</p>
          </div>

          <!-- My trades -->
          <div v-else-if="mineTab === 'trades'">
            <div v-if="store.myTrades.length" class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-[11px] uppercase text-muted-foreground">
                    <th class="text-left px-3 py-2 font-normal">商品</th>
                    <th class="text-left px-3 py-2 font-normal">类型</th>
                    <th class="text-left px-3 py-2 font-normal">价格</th>
                    <th class="text-left px-3 py-2 font-normal">数量</th>
                    <th class="text-left px-3 py-2 font-normal">时间</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr v-for="(t, i) in store.myTrades" :key="i" class="bg-background">
                    <td class="px-3 py-2 font-medium">{{ t.name || t.item_id }}</td>
                    <td class="px-3 py-2 text-muted-foreground">{{ str(t.type, '—') }}</td>
                    <td class="px-3 py-2 text-chart-1 font-medium">{{ formatNumber(t.price) }} SC</td>
                    <td class="px-3 py-2">{{ formatNumber(t.quantity) }}</td>
                    <td class="px-3 py-2 text-muted-foreground">{{ str(t.time, '—') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-sm text-muted-foreground py-6 text-center">暂无成交记录</p>
          </div>

          <!-- Warehouse -->
          <div v-else>
            <div v-if="store.warehouse" class="grid gap-3">
              <div class="p-3 border border-border bg-background flex items-center justify-between">
                <span class="text-[11px] uppercase text-muted-foreground">仓库资金</span>
                <strong class="text-lg">{{ formatNumber(store.warehouse.money) }} SC</strong>
              </div>
              <div v-if="store.warehouse.items && store.warehouse.items.length" class="overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead>
                    <tr class="text-[11px] uppercase text-muted-foreground">
                      <th class="text-left px-3 py-2 font-normal">商品</th>
                      <th class="text-left px-3 py-2 font-normal">数量</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    <tr v-for="(it, i) in store.warehouse.items" :key="i" class="bg-background">
                      <td class="px-3 py-2 font-medium">{{ it.name || it.item_id }}</td>
                      <td class="px-3 py-2">{{ formatNumber(it.quantity) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="text-sm text-muted-foreground text-center">仓库中没有物品</p>
            </div>
            <p v-else class="text-sm text-muted-foreground py-6 text-center">仓库信息加载失败</p>
          </div>
        </StateView>
      </article>

      <!-- Orderbook -->
      <article class="bg-card text-card-foreground border border-border shadow-hard-muted p-4 grid gap-3">
        <div class="flex items-end justify-between gap-3">
          <h2 class="text-lg font-bold tracking-tight">盘口</h2>
          <span class="text-[11px] text-muted-foreground">{{ store.orderbookItem || '未选择' }} / SC</span>
        </div>
        <StateView :loading="store.orderbookLoading" :empty="!store.orderbook" empty-text="点击左侧商品查看盘口">
          <div v-if="store.orderbook" class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <h3 class="text-[11px] uppercase text-muted-foreground">买盘</h3>
              <div class="grid grid-cols-[1fr_1fr] gap-y-1 gap-x-2 text-sm">
                <span class="text-[11px] uppercase text-muted-foreground">价格</span>
                <span class="text-[11px] uppercase text-muted-foreground text-right">数量</span>
                <template v-for="(l, i) in (store.orderbook.buys ?? [])" :key="'b' + i">
                  <span class="text-chart-1 font-medium">{{ formatNumber(l.price) }}</span>
                  <span class="text-right">{{ formatNumber(l.quantity) }}</span>
                </template>
                <span v-if="!(store.orderbook.buys && store.orderbook.buys.length)" class="col-span-2 text-xs text-muted-foreground">无</span>
              </div>
            </div>
            <div class="grid gap-2">
              <h3 class="text-[11px] uppercase text-muted-foreground">卖盘</h3>
              <div class="grid grid-cols-[1fr_1fr] gap-y-1 gap-x-2 text-sm">
                <span class="text-[11px] uppercase text-muted-foreground">价格</span>
                <span class="text-[11px] uppercase text-muted-foreground text-right">数量</span>
                <template v-for="(l, i) in (store.orderbook.sells ?? [])" :key="'s' + i">
                  <span class="text-chart-1 font-medium">{{ formatNumber(l.price) }}</span>
                  <span class="text-right">{{ formatNumber(l.quantity) }}</span>
                </template>
                <span v-if="!(store.orderbook.sells && store.orderbook.sells.length)" class="col-span-2 text-xs text-muted-foreground">无</span>
              </div>
            </div>
          </div>
        </StateView>
      </article>
    </div>
  </section>

  <!-- Create order modal -->
  <AppModal :open="orderOpen" title="挂单" width="max-w-md" @update:open="(v) => (orderOpen = v)">
    <div class="space-y-3">
      <div class="flex gap-2">
        <button type="button" class="flex-1 h-9 text-sm border" :class="orderType === 'buy' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'" @click="orderType = 'buy'">求购</button>
        <button type="button" class="flex-1 h-9 text-sm border" :class="orderType === 'sell' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'" @click="orderType = 'sell'">出售</button>
      </div>
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">商品 ID</span>
        <input v-model="orderItemId" type="text" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" placeholder="如 minecraft:diamond" />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">单价</span>
          <input v-model.number="orderPrice" type="number" min="0" step="0.01" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">数量（可选）</span>
          <input v-model.number="orderQty" type="number" min="0" step="1" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
        </label>
      </div>
      <label v-if="orderType === 'sell'" class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">手持物品 Base64（可选）</span>
        <input v-model="orderBase64" type="text" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" placeholder="出售手持物品时填写" />
      </label>
      <p class="text-xs text-muted-foreground">挂单需玩家在线；价格、数量须为正数。</p>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="orderOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="orderLoading" @click="onCreateOrder">
        <Loader2 v-if="orderLoading" :size="14" class="animate-spin" /> 确认挂单
      </AppButton>
    </template>
  </AppModal>

  <!-- Trade modal -->
  <AppModal :open="tradeOpen" title="市价成交" width="max-w-md" @update:open="(v) => (tradeOpen = v)">
    <div class="space-y-3">
      <div class="flex gap-2">
        <button
          v-for="opt in ([
            { id: 'market_buy', label: '市价买入' },
            { id: 'market_sell', label: '市价卖出' },
            { id: 'quick_sell', label: '快速出售' },
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
        <input v-model="tradeItemId" type="text" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
      </label>
      <label v-if="tradeType !== 'quick_sell'" class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">数量</span>
        <input v-model.number="tradeQty" type="number" min="0" step="1" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
      </label>
      <p class="text-xs text-muted-foreground">市价成交按盘口即时撮合，需玩家在线。</p>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="tradeOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="tradeLoading" @click="onTrade">
        <TrendingUp :size="14" /> <Loader2 v-if="tradeLoading" :size="14" class="animate-spin" /> 确认成交
      </AppButton>
    </template>
  </AppModal>

  <!-- Warehouse modal -->
  <AppModal :open="whOpen" :title="whMode === 'deposit' ? '存入仓库' : '取出仓库'" width="max-w-md" @update:open="(v) => (whOpen = v)">
    <div class="space-y-3">
      <div class="flex gap-2">
        <button type="button" class="flex-1 h-9 text-sm border" :class="whMode === 'deposit' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'" @click="whMode = 'deposit'; whType = 'money'">存入</button>
        <button type="button" class="flex-1 h-9 text-sm border" :class="whMode === 'withdraw' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'" @click="whMode = 'withdraw'; whType = 'all'">取出</button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in whOptions"
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
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">金额</span>
        <input v-model.number="whAmount" type="number" min="0" step="1" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
      </label>
      <label v-if="whMode === 'withdraw' && whType === 'item'" class="block">
        <span class="mb-1 block text-xs font-semibold uppercase text-muted-foreground">物品 Base64（可选，留空取全部该类）</span>
        <input v-model="whBase64" type="text" class="w-full h-10 px-3 bg-input border border-border text-sm outline-none focus:border-ring" />
      </label>
      <p class="text-xs text-muted-foreground">存取手持物品需要玩家在线，后端会返回中文提示。</p>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="whOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="whLoading" @click="onWarehouse">
        <Wallet :size="14" /> <Loader2 v-if="whLoading" :size="14" class="animate-spin" /> 确认
      </AppButton>
    </template>
  </AppModal>

  <!-- Exchange modal -->
  <AppModal :open="exOpen" title="钻石兑换" width="max-w-sm" @update:open="(v) => (exOpen = v)">
    <div class="space-y-3">
      <div class="flex gap-2">
        <button type="button" class="flex-1 h-9 text-sm border" :class="exType === 'd2m' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'" @click="exType = 'd2m'">钻石 → 货币</button>
        <button type="button" class="flex-1 h-9 text-sm border" :class="exType === 'm2d' ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'" @click="exType = 'm2d'">货币 → 钻石</button>
      </div>
      <p class="text-xs text-muted-foreground">兑换比率由服务端配置；兑换需玩家在线。</p>
    </div>
    <template #footer>
      <AppButton variant="muted" size="md" @click="exOpen = false">取消</AppButton>
      <AppButton variant="primary" size="md" :disabled="exLoading" @click="onExchange">
        <Coins :size="14" /> <Loader2 v-if="exLoading" :size="14" class="animate-spin" /> 确认兑换
      </AppButton>
    </template>
  </AppModal>
</template>
