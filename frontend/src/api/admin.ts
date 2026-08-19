import { adminHttp } from './http'
import type { TicketDetail, TicketStatus, TicketSummary } from '@/types'

export const adminTicketApi = {
  list() {
    return adminHttp.get<TicketSummary[]>('/admin/tickets')
  },
  detail(id: string | number) {
    return adminHttp.get<TicketDetail>(`/admin/tickets/${encodeURIComponent(id)}`)
  },
  reply(id: string | number, content: string) {
    return adminHttp.post<unknown>(`/admin/tickets/${encodeURIComponent(id)}/reply`, { content })
  },
  setStatus(id: string | number, status: TicketStatus) {
    return adminHttp.post<unknown>(`/admin/tickets/${encodeURIComponent(id)}/status`, { status })
  },
}
