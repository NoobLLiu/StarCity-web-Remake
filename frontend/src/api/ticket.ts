import { http } from './http'
import type { CreateTicketPayload, TicketDetail, TicketSummary } from '@/types'

export const ticketApi = {
  create(payload: CreateTicketPayload) {
    return http.post<unknown>('/tickets', payload)
  },
  list() {
    return http.get<TicketSummary[]>('/tickets')
  },
  detail(id: string | number) {
    return http.get<TicketDetail>(`/tickets/${encodeURIComponent(id)}`)
  },
  reply(id: string | number, content: string) {
    return http.post<unknown>(`/tickets/${encodeURIComponent(id)}/reply`, { content })
  },
}
