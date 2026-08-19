import { http } from './http'
import type {
  Paginated,
  TeamApplication,
  TeamDetail,
  TeamFundLog,
  TeamMember,
  TeamMessage,
  TeamSummary,
} from '@/types'

export const teamApi = {
  list(page = 1, pageSize = 20, query = '') {
    return http.get<Paginated<TeamSummary> | TeamSummary[]>('/team', {
      params: { page, page_size: pageSize, query },
    })
  },
  search(query: string) {
    return http.get<TeamSummary[]>('/team/search', { params: { query } })
  },
  me() {
    return http.get<TeamDetail | null>('/team/me')
  },
  detail(tid: string | number) {
    return http.get<TeamDetail>(`/team/${encodeURIComponent(tid)}`)
  },
  members(tid: string | number) {
    return http.get<TeamMember[]>(`/team/${encodeURIComponent(tid)}/members`)
  },
  applications(tid: string | number) {
    return http.get<TeamApplication[]>(`/team/${encodeURIComponent(tid)}/applications`)
  },
  funds(tid: string | number) {
    return http.get<{ funds: number } | number>(`/team/${encodeURIComponent(tid)}/funds`)
  },
  logs(tid: string | number, page = 1, pageSize = 20) {
    return http.get<Paginated<TeamFundLog> | TeamFundLog[]>(`/team/${encodeURIComponent(tid)}/logs`, {
      params: { page, page_size: pageSize },
    })
  },
  messages(tid: string | number, page = 1, pageSize = 20) {
    return http.get<Paginated<TeamMessage> | TeamMessage[]>(`/team/${encodeURIComponent(tid)}/messages`, {
      params: { page, page_size: pageSize },
    })
  },
  create(name: string) {
    return http.post<unknown>('/team/create', { name })
  },
  join(tid: string | number) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/join`)
  },
  acceptApplication(tid: string | number, applicantUuid: string) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/application/accept`, {
      applicant_uuid: applicantUuid,
    })
  },
  rejectApplication(tid: string | number, applicantUuid: string) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/application/reject`, {
      applicant_uuid: applicantUuid,
    })
  },
  promote(tid: string | number, targetUuid: string) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/member/promote`, {
      target_uuid: targetUuid,
    })
  },
  demote(tid: string | number, targetUuid: string) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/member/demote`, {
      target_uuid: targetUuid,
    })
  },
  removeMember(tid: string | number, targetUuid: string) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/member/remove`, {
      target_uuid: targetUuid,
    })
  },
  quit() {
    return http.post<unknown>('/team/quit')
  },
  rename(tid: string | number, name: string) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/rename`, { name })
  },
  notice(tid: string | number, notice: string) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/notice`, { notice })
  },
  setPublic(tid: string | number, pub: boolean) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/public`, { public: pub })
  },
  setFriendlyFire(tid: string | number, allow: boolean) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/friendly-fire`, { allow })
  },
  disband(tid: string | number, confirmName: string) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/disband`, { confirm_name: confirmName })
  },
  fundsDeposit(tid: string | number, amount: number) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/funds/deposit`, { amount })
  },
  fundsWithdraw(tid: string | number, amount: number, admin = false) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/funds/withdraw`, { amount, admin })
  },
  message(tid: string | number, content: string) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/message`, { content })
  },
}
