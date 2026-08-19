import { defineStore } from 'pinia'
import { ref } from 'vue'
import { residenceApi, type ResidenceListParams } from '@/api/residence'
import type { ResidenceDetail, ResidenceFlags, ResidenceSummary, FlagState } from '@/types'
import { normalizeList } from '@/utils/normalize'

export const useResidenceStore = defineStore('residence', () => {
  const list = ref<ResidenceSummary[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const current = ref<ResidenceDetail | null>(null)
  const currentLoading = ref(false)
  const currentError = ref<string | null>(null)

  const flags = ref<ResidenceFlags | null>(null)

  async function fetchList(params: ResidenceListParams = {}) {
    loading.value = true
    error.value = null
    try {
      const raw = await residenceApi.list({ page: page.value, page_size: pageSize.value, ...params })
      const norm = normalizeList<ResidenceSummary>(raw)
      list.value = norm.items
      total.value = norm.total
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
    try {
      const detail = await residenceApi.detail(name)
      current.value = detail
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

  async function setFlag(name: string, flag: string, state: FlagState) {
    await residenceApi.setFlag(name, flag, state)
    await fetchDetail(name)
  }

  async function setPlayerFlag(name: string, player: string, flag: string, state: FlagState) {
    await residenceApi.setPlayerFlag(name, player, flag, state)
    await fetchDetail(name)
  }

  async function clearPlayer(name: string, player: string) {
    await residenceApi.clearPlayer(name, player)
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

  return {
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
    fetchList,
    fetchDetail,
    setFlag,
    setPlayerFlag,
    clearPlayer,
    applyDefaults,
    setMessage,
  }
})
