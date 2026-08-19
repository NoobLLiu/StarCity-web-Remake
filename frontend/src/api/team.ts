import { http } from './http'
import type {
  TeamApplication,
  TeamDetail,
  TeamFundLog,
  TeamFundsInfo,
  TeamMeInfo,
  TeamMember,
  TeamMessage,
  TeamMessageState,
  TeamOnlineMate,
  TeamPaginated,
  TeamSummary,
} from '@/types'

export interface TeamSearchResult {
  teams: TeamSummary[]
  total?: number
}

export const teamApi = {
  // ===== 只读 =====
  /** 公开团队排行榜（分页）。 */
  list(page = 1, pageSize = 20, query = '') {
    return http.get<TeamPaginated<TeamSummary>>('/team', {
      params: { page, page_size: pageSize, query },
    })
  },
  /** 搜索团队（包含私密按 ID 精确命中的基本信息，但详情不可见）。 */
  search(query: string) {
    return http.get<TeamSearchResult>('/team/search', { params: { query } })
  },
  /** 扁平「我的团队」：{in_team:false} 或 {in_team:true, tid,name,my_role,members,...} */
  me() {
    return http.get<TeamMeInfo>('/team/me')
  },
  /** 团队详情（仅成员可见）。 */
  detail(tid: string | number) {
    return http.get<TeamDetail>(`/team/${encodeURIComponent(tid)}`)
  },
  /** 成员列表（数组；仅成员可见；operator 在前）。 */
  members(tid: string | number) {
    return http.get<TeamMember[]>(`/team/${encodeURIComponent(tid)}/members`)
  },
  /** 申请列表（数组；仅 operator 可见）。 */
  applications(tid: string | number) {
    return http.get<TeamApplication[]>(`/team/${encodeURIComponent(tid)}/applications`)
  },
  /** 团队资金余额（仅成员可见）。 */
  funds(tid: string | number) {
    return http.get<TeamFundsInfo>(`/team/${encodeURIComponent(tid)}/funds`)
  },
  /** 资金流水（分页；仅 operator 可见）。 */
  logs(tid: string | number, page = 1, pageSize = 50) {
    return http.get<TeamPaginated<TeamFundLog>>(`/team/${encodeURIComponent(tid)}/logs`, {
      params: { page, page_size: pageSize },
    })
  },
  /** 留言列表（分页，最新在前；仅成员可见）。 */
  messages(tid: string | number, page = 1, pageSize = 10) {
    return http.get<TeamPaginated<TeamMessage>>(`/team/${encodeURIComponent(tid)}/messages`, {
      params: { page, page_size: pageSize },
    })
  },
  /** 未读留言/公告状态（仅成员可见）。 */
  messageState(tid: string | number) {
    return http.get<TeamMessageState>(`/team/${encodeURIComponent(tid)}/message_state`)
  },
  /** 在线队友（信息性展示，无传送；仅成员可见）。 */
  onlineTeammates() {
    return http.get<TeamOnlineMate[]>('/team/online-teammates')
  },

  // ===== 写操作 =====
  /** 创建团队（未加入）。 */
  create(name: string) {
    return http.post<TeamMeInfo>('/team/create', { name })
  },
  /** 申请加入（未加入）。 */
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
  /** 普通成员退出（operator 需先降级）。 */
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
  /** 存入（全员）。 */
  fundsDeposit(tid: string | number, amount: number) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/funds/deposit`, { amount })
  },
  /** 取出（仅 operator）。 */
  fundsWithdraw(tid: string | number, amount: number) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/funds/withdraw`, { amount })
  },
  /** 发布留言（≤100 字，冷却控制由后端返回中文提示）。 */
  message(tid: string | number, content: string) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/message`, { content })
  },
  /** 标记留言已读（允许离线）。 */
  markMessageRead(tid: string | number) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/message/read`)
  },
  /** 标记公告已读（允许离线）。 */
  markNoticeRead(tid: string | number) {
    return http.post<unknown>(`/team/${encodeURIComponent(tid)}/notice/read`)
  },
}
