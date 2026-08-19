import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ticketApi } from '@/api/ticket'
import type { CreateTicketPayload, TicketDetail, TicketSummary } from '@/types'

export const useTicketStore = defineStore('tickets', () => {
  const list = ref<TicketSummary[]>([])
  const current = ref<TicketDetail | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchList() {
    loading.value = true
    error.value = null
    try {
      const data = await ticketApi.list()
      list.value = Array.isArray(data) ? data : []
    } catch (e) {
      error.value = (e as Error).message
      list.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchDetail(id: string | number) {
    loading.value = true
    error.value = null
    try {
      current.value = await ticketApi.detail(id)
    } catch (e) {
      error.value = (e as Error).message
      current.value = null
    } finally {
      loading.value = false
    }
  }

  async function create(payload: CreateTicketPayload) {
    await ticketApi.create(payload)
    await fetchList()
  }

  async function reply(id: string | number, content: string) {
    await ticketApi.reply(id, content)
    await fetchDetail(id)
  }

  return { list, current, loading, error, fetchList, fetchDetail, create, reply }
})
