<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Search, Loader2, RotateCcw } from 'lucide-vue-next'
import AppButton from '@/components/AppButton.vue'
import AppBadge from '@/components/AppBadge.vue'
import StateView from '@/components/StateView.vue'
import { useResidenceStore } from '@/stores/residence'
import { useAuthStore } from '@/stores/auth'
import { useNotifyStore } from '@/stores/notify'
import { ApiError } from '@/api/http'
import { formatNumber, str } from '@/utils/normalize'
import type { FlagState, ResidenceDetail, ResidenceSummary } from '@/types'

const store = useResidenceStore()
const notify = useNotifyStore()
const auth = useAuthStore()

const mineOnly = ref(false)
const query = ref('')
const selectedName = ref<string | null>(null)

// Flag editor drafts
const flagDrafts = ref<Record<string, FlagState>>({})
const savingFlags = ref(false)

// Player permission form
const playerInput = ref('')
const playerFlag = ref('')
const playerState = ref<FlagState>('true')

// Messages
const enterMsg = ref('')
const leaveMsg = ref('')

const possibleFlags = computed<string[]>(
  () => store.flags?.possible_flags ?? (store.current?.flags ? Object.keys(store.current.flags) : []),
)

const currentFlags = computed<Record<string, string | boolean>>(() => {
  const fromFlags = store.flags?.flags
  if (fromFlags && typeof fromFlags === 'object') return fromFlags as Record<string, string | boolean>
  return (store.current?.flags as Record<string, string | boolean>) ?? {}
})

const isOwner = computed(() => {
  // Only the residence owner (or parent owner) may edit flags. Backend also enforces this.
  const c = store.current
  if (!c) return false
  return str(c.owner_uuid) === auth.playerUuid || str(c.owner) === auth.player
})

async function loadList() {
  await store.fetchList({ mine: mineOnly.value, query: query.value })
}

async function selectResidence(name: string) {
  selectedName.value = name
  await store.fetchDetail(name)
}

function normalizeFlagValue(v: unknown): FlagState {
  if (v === true || v === 'true') return 'true'
  if (v === false || v === 'false') return 'false'
  return 'remove'
}

function syncDrafts() {
  const c = store.current
  if (!c) return
  const drafts: Record<string, FlagState> = {}
  for (const f of possibleFlags.value) {
    drafts[f] = normalizeFlagValue(currentFlags.value[f])
  }
  flagDrafts.value = drafts
  enterMsg.value = str(c.enter_message)
  leaveMsg.value = str(c.leave_message)
}

async function onSaveFlags() {
  if (!selectedName.value) return
  savingFlags.value = true
  try {
    let changed = 0
    for (const flag of Object.keys(flagDrafts.value)) {
      const desired = flagDrafts.value[flag]
      if (desired !== normalizeFlagValue(currentFlags.value[flag])) {
        await store.setFlag(selectedName.value, flag, desired)
        changed++
      }
    }
    notify.success(changed ? `已更新 ${changed} 项权限` : '没有变更')
    syncDrafts()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '保存失败，请稍后再试')
  } finally {
    savingFlags.value = false
  }
}

async function onApplyPlayerFlag() {
  if (!selectedName.value || !playerInput.value.trim()) {
    notify.error('请填写玩家名或 UUID')
    return
  }
  if (!playerFlag.value) {
    notify.error('请选择权限项')
    return
  }
  try {
    await store.setPlayerFlag(selectedName.value, playerInput.value.trim(), playerFlag.value, playerState.value)
    notify.success('已应用玩家权限')
    playerInput.value = ''
    syncDrafts()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '应用失败')
  }
}

async function onClearPlayer() {
  if (!selectedName.value || !playerInput.value.trim()) {
    notify.error('请填写要清空权限的玩家')
    return
  }
  if (!confirm(`确认清空 ${playerInput.value} 在该领地的全部权限？`)) return
  try {
    await store.clearPlayer(selectedName.value, playerInput.value.trim())
    notify.success('已清空该玩家权限')
    playerInput.value = ''
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '操作失败')
  }
}

async function onSaveMessages() {
  if (!selectedName.value) return
  try {
    await store.setMessage(selectedName.value, 'enter', enterMsg.value)
    await store.setMessage(selectedName.value, 'leave', leaveMsg.value)
    notify.success('提示语已保存')
    syncDrafts()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '保存失败')
  }
}

async function onApplyDefaults() {
  if (!selectedName.value) return
  if (!confirm(`确认将 ${selectedName.value} 重置为默认权限？此操作不可撤销。`)) return
  try {
    await store.applyDefaults(selectedName.value)
    notify.success('已重置为默认权限')
    syncDrafts()
  } catch (e) {
    notify.error(e instanceof ApiError ? e.message : '重置失败')
  }
}

function statusFor(r: ResidenceDetail | ResidenceSummary) {
  if (r.for_sale) return { label: '出售中', variant: 'muted' as const }
  if (r.for_rent) return { label: '出租中', variant: 'accent' as const }
  return { label: '未出售', variant: 'primary' as const }
}

onMounted(async () => {
  await loadList()
  const first = store.list[0]
  if (first) await selectResidence(first.name)
})

watch(mineOnly, () => loadList())
watch(() => store.current, syncDrafts, { immediate: false })

let searchTimer: number | undefined
function onSearchInput() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => loadList(), 350)
}
</script>

<template>
  <!-- Page toolbar -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 lg:px-5 py-3 bg-card border-b border-border">
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="h-8 px-3 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px"
        :class="!mineOnly ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
        @click="mineOnly = false"
      >
        全部
      </button>
      <button
        type="button"
        class="h-8 px-3 text-sm border shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px"
        :class="mineOnly ? 'bg-primary text-primary-foreground border-transparent' : 'bg-muted text-foreground border-ring'"
        @click="mineOnly = true"
      >
        我的领地
      </button>
    </div>
    <label class="flex items-center gap-2 h-9 px-3 bg-input border border-border shadow-hard-muted">
      <Search :size="16" class="text-muted-foreground" />
      <input
        v-model="query"
        type="text"
        placeholder="搜索领地"
        class="bg-transparent border-0 outline-none text-sm w-40 text-foreground placeholder:text-muted-foreground"
        @input="onSearchInput"
      />
    </label>
  </div>

  <section class="flex-1 p-4 lg:p-5 space-y-4 min-w-0">
    <!-- Residence list -->
    <article class="bg-card border border-border shadow-hard-muted p-4 space-y-3">
      <div class="flex items-end justify-between gap-3 flex-wrap">
        <h2 class="text-lg font-bold tracking-tight">领地列表</h2>
        <span class="text-[11px] uppercase tracking-widest text-muted-foreground">{{ store.total }} 个条目</span>
      </div>
      <StateView :loading="store.loading && !store.list.length" :error="store.error" :empty="!store.list.length" empty-text="没有领地" @retry="loadList()">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th class="border border-border px-3 py-2 text-left text-xs uppercase text-muted-foreground bg-background">领地名称</th>
                <th class="border border-border px-3 py-2 text-left text-xs uppercase text-muted-foreground bg-background">世界</th>
                <th class="border border-border px-3 py-2 text-left text-xs uppercase text-muted-foreground bg-background">主人</th>
                <th class="border border-border px-3 py-2 text-left text-xs uppercase text-muted-foreground bg-background">面积</th>
                <th class="border border-border px-3 py-2 text-left text-xs uppercase text-muted-foreground bg-background">出售/租赁状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in store.list"
                :key="r.name"
                class="cursor-pointer hover:bg-sidebar-accent"
                :class="selectedName === r.name ? 'bg-sidebar-accent' : ''"
                @click="selectResidence(r.name)"
              >
                <td class="border border-border px-3 py-2"><strong>{{ r.name }}</strong></td>
                <td class="border border-border px-3 py-2">{{ str(r.world, '—') }}</td>
                <td class="border border-border px-3 py-2">{{ str(r.owner, '—') }}</td>
                <td class="border border-border px-3 py-2">{{ formatNumber(r.size) }} m²</td>
                <td class="border border-border px-3 py-2"><AppBadge :variant="statusFor(r).variant">{{ statusFor(r).label }}</AppBadge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </StateView>
    </article>

    <!-- Detail -->
    <StateView :loading="store.currentLoading" :error="store.currentError" :empty="!store.current" empty-text="选择上方领地查看详情" @retry="selectedName && selectResidence(selectedName)">
      <article v-if="store.current" class="bg-card border border-border shadow-hard-muted p-4 space-y-4">
        <div class="flex items-center gap-3 flex-wrap">
          <h2 class="text-lg font-bold tracking-tight">{{ store.current.name }}</h2>
          <AppBadge variant="primary">主人: {{ str(store.current.owner, '—') }}</AppBadge>
          <AppBadge v-if="str(store.current.world)" variant="muted">{{ store.current.world }}</AppBadge>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Bounds & sub-residences -->
          <div class="bg-background border border-border p-3 space-y-4">
            <div>
              <h3 class="text-sm font-bold tracking-tight mb-2">区域边界</h3>
              <div class="space-y-1">
                <div v-if="store.current.areas && typeof store.current.areas === 'object'" class="px-3 py-2 bg-card border border-border text-sm break-all">
                  {{ JSON.stringify(store.current.areas) }}
                </div>
                <div class="px-3 py-2 bg-card border border-border text-sm">世界: {{ str(store.current.world, '—') }}</div>
                <div v-if="store.current.created_at" class="px-3 py-2 bg-card border border-border text-sm">创建于: {{ store.current.created_at }}</div>
                <div class="px-3 py-2 bg-card border border-border text-sm">面积: {{ formatNumber(store.current.size) }} m²</div>
                <div v-if="store.current.bank !== undefined && store.current.bank !== null" class="px-3 py-2 bg-card border border-border text-sm">银行: {{ formatNumber(store.current.bank) }}</div>
              </div>
            </div>
            <div>
              <h3 class="text-sm font-bold tracking-tight mb-2">子领地</h3>
              <div class="space-y-1">
                <div
                  v-for="sub in (store.current.subzones ?? [])"
                  :key="sub.name"
                  class="px-3 py-2 bg-card border border-border text-sm cursor-pointer hover:bg-muted"
                  @click="selectResidence(sub.name)"
                >
                  {{ sub.name }} — {{ formatNumber(sub.size) }} m²
                </div>
                <div v-if="!(store.current.subzones && store.current.subzones.length)" class="px-3 py-2 bg-card border border-dashed border-border text-sm text-muted-foreground">无子领地</div>
              </div>
            </div>
          </div>

          <!-- Flags editor -->
          <div class="bg-background border border-border p-3 space-y-4">
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <h3 class="text-sm font-bold tracking-tight">Flags 编辑器</h3>
                <AppButton variant="muted" size="sm" @click="onApplyDefaults">
                  <RotateCcw :size="12" /> 默认
                </AppButton>
              </div>
              <div class="space-y-1">
                <div class="hidden sm:grid grid-cols-[1fr_auto_auto] gap-2 items-center py-2 border-b border-border text-xs uppercase text-muted-foreground">
                  <span>Flag</span>
                  <span class="w-28 text-center">值</span>
                  <span class="w-20 text-center">操作</span>
                </div>
                <div
                  v-for="flag in possibleFlags"
                  :key="flag"
                  class="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-2 border-b border-border"
                >
                  <span class="text-sm self-center font-mono break-all">{{ flag }}</span>
                  <select
                    v-model="flagDrafts[flag]"
                    class="h-9 w-28 px-2 bg-input border border-border text-sm"
                    :aria-label="`${flag} 值`"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                    <option value="remove">remove</option>
                  </select>
                  <div class="w-20 text-center">
                    <AppBadge :variant="normalizeFlagValue(currentFlags[flag]) === 'true' ? 'success' : 'muted'">
                      {{ String(currentFlags[flag] ?? '—') }}
                    </AppBadge>
                  </div>
                </div>
                <div v-if="!possibleFlags.length" class="py-4 text-sm text-muted-foreground text-center">无可编辑的 Flag</div>
              </div>
              <div class="flex justify-end mt-3">
                <AppButton variant="primary" size="md" :disabled="savingFlags || !isOwner" @click="onSaveFlags">
                  <Loader2 v-if="savingFlags" :size="14" class="animate-spin" /> 保存 Flags
                </AppButton>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-bold tracking-tight mb-2">玩家权限</h3>
              <div class="flex flex-wrap items-center gap-2">
                <input
                  v-model="playerInput"
                  type="text"
                  placeholder="玩家名或 UUID"
                  aria-label="玩家名或 UUID"
                  class="flex-1 min-w-[140px] h-9 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                />
                <select v-model="playerFlag" class="h-9 px-2 bg-input border border-border text-sm" aria-label="玩家 flag">
                  <option value="">选择 flag</option>
                  <option v-for="f in possibleFlags" :key="f" :value="f">{{ f }}</option>
                </select>
                <select v-model="playerState" class="h-9 px-2 bg-input border border-border text-sm" aria-label="玩家 flag 状态">
                  <option value="true">true</option>
                  <option value="false">false</option>
                  <option value="remove">remove</option>
                </select>
                <AppButton variant="muted" size="md" @click="onApplyPlayerFlag">应用</AppButton>
                <AppButton variant="destructive" size="md" @click="onClearPlayer">清空</AppButton>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-bold tracking-tight mb-2">提示语</h3>
              <div class="space-y-2">
                <input
                  v-model="enterMsg"
                  type="text"
                  placeholder="进入领地提示（留空清除）"
                  aria-label="进入领地提示"
                  class="w-full h-9 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                />
                <input
                  v-model="leaveMsg"
                  type="text"
                  placeholder="离开领地提示（留空清除）"
                  aria-label="离开领地提示"
                  class="w-full h-9 px-3 bg-input border border-border text-sm outline-none focus:border-ring"
                />
              </div>
              <div class="flex justify-end mt-2">
                <AppButton variant="primary" size="md" @click="onSaveMessages">保存提示语</AppButton>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-muted border border-dashed border-border p-3 text-xs text-muted-foreground">
          提示：只有领地主人/父领地主人可编辑权限；写操作由服务端主线程串行执行，遇到"该领地当前正被其他操作占用"时请稍后再试。
        </div>
      </article>
    </StateView>
  </section>
</template>
