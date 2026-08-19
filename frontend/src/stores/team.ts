import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { teamApi } from '@/api/team'
import type {
  TeamApplication,
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

/** 规范化 TeamPaginated；兼容纯数组兜底。 */
function normPaged<T>(
  raw: TeamPaginated<T> | unknown,
  defaults: { page: number; page_size: number } = { page: 1, page_size: 20 },
): TeamPaginated<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw as T[],
      page: defaults.page,
      page_size: defaults.page_size,
      total_items: raw.length,
      total_pages: 1,
    }
  }
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    const items = (r.items ?? r.teams ?? r.list ?? r.data ?? []) as T[]
    return {
      items,
      page: Number(r.page ?? defaults.page) || defaults.page,
      page_size: Number(r.page_size ?? defaults.page_size) || defaults.page_size,
      total_items: Number(r.total_items ?? r.total ?? items.length),
      total_pages: Number(r.total_pages ?? Math.ceil(items.length / (Number(r.page_size) || 1))),
    }
  }
  return { items: [], page: defaults.page, page_size: defaults.page_size, total_items: 0, total_pages: 0 }
}

export const useTeamStore = defineStore('team', () => {
  // ===== 我的团队（/api/team/me 扁平对象） =====
  const me = ref<TeamMeInfo>({ in_team: false })
  const meLoading = ref(false)
  const meError = ref<string | null>(null)

  const inTeam = computed(() => !!me.value.in_team)
  const myTid = computed(() => (inTeam.value ? String(me.value.tid ?? me.value.team_id ?? '') : ''))
  const myRole = computed(() => String(me.value.my_role ?? 'MEMBER').toUpperCase())
  const isOperator = computed(() => myRole.value === 'OPERATOR')
  const currencyName = computed(() => me.value.currency_name ?? '星光点')

  // ===== 公开团队排行榜 =====
  const teams = ref<TeamSummary[]>([])
  const teamsPage = ref(1)
  const teamsPageSize = ref(20)
  const teamsTotal = ref(0)
  const teamsTotalPages = ref(1)
  const teamsLoading = ref(false)
  const teamsError = ref<string | null>(null)

  // ===== 搜索结果 =====
  const searchResults = ref<TeamSummary[]>([])
  const searchTotal = ref(0)
  const searchLoading = ref(false)

  // ===== 成员 / 申请（tid 来自 me） =====
  const members = ref<TeamMember[]>([])
  const applications = ref<TeamApplication[]>([])
  const subsLoading = ref(false) // members/applications 并行加载

  // ===== 资金 / 流水 =====
  const funds = ref<TeamFundsInfo | null>(null)
  const fundsLoading = ref(false)

  const logs = ref<TeamFundLog[]>([])
  const logsPage = ref(1)
  const logsPageSize = ref(50)
  const logsTotal = ref(0)
  const logsLoading = ref(false)

  // ===== 留言 =====
  const messages = ref<TeamMessage[]>([])
  const messagesPage = ref(1)
  const messagesPageSize = ref(10)
  const messagesTotal = ref(0)
  const messagesLoading = ref(false)

  const messageState = ref<TeamMessageState | null>(null)

  // ===== 在线队友 =====
  const onlineMates = ref<TeamOnlineMate[]>([])
  const onlineMatesLoading = ref(false)

  // ========== actions ==========
  async function fetchMe() {
    meLoading.value = true
    meError.value = null
    try {
      const data = await teamApi.me()
      me.value = data
    } catch (e) {
      meError.value = e instanceof Error ? e.message : '加载失败'
      me.value = { in_team: false }
    } finally {
      meLoading.value = false
    }
  }

  /** 公开团队列表（带搜索 query、分页）。 */
  async function fetchTeams(page = 1, pageSize = 20, query = '') {
    teamsLoading.value = true
    teamsError.value = null
    try {
      const p = normPaged<TeamSummary>(await teamApi.list(page, pageSize, query), { page, page_size: pageSize })
      teams.value = p.items
      teamsPage.value = p.page
      teamsPageSize.value = p.page_size
      teamsTotal.value = p.total_items ?? p.items.length
      teamsTotalPages.value = p.total_pages ?? 1
    } catch (e) {
      teamsError.value = e instanceof Error ? e.message : '加载失败'
      teams.value = []
    } finally {
      teamsLoading.value = false
    }
  }

  async function fetchSearch(query: string) {
    if (!query.trim()) {
      searchResults.value = []
      searchTotal.value = 0
      return
    }
    searchLoading.value = true
    try {
      const res = await teamApi.search(query.trim())
      searchResults.value = Array.isArray(res.teams) ? res.teams : []
      searchTotal.value = Number(res.total ?? searchResults.value.length)
    } catch (e) {
      searchResults.value = []
      searchTotal.value = 0
      throw e
    } finally {
      searchLoading.value = false
    }
  }

  /** 已加入态：加载成员、申请(仅operator可见/后端会拒绝)、资金、message_state、在线队友。 */
  async function refreshMemberTabs(opts: { reloadMembers?: boolean; reloadApplications?: boolean; reloadFunds?: boolean; reloadState?: boolean; reloadOnline?: boolean } = {}) {
    if (!inTeam.value || !myTid.value) return
    const tid = myTid.value
    subsLoading.value = true
    try {
      const tasks: Promise<unknown>[] = []
      if (opts.reloadMembers ?? true) tasks.push(loadMembers(tid))
      if (opts.reloadApplications ?? true) tasks.push(loadApplications(tid).catch(() => {})) // 普通成员允许 403
      if (opts.reloadFunds ?? true) tasks.push(loadFunds(tid).catch(() => {}))
      if (opts.reloadState ?? true) tasks.push(loadMessageState(tid).catch(() => {}))
      if (opts.reloadOnline ?? true) tasks.push(loadOnlineMates().catch(() => {}))
      await Promise.allSettled(tasks)
    } finally {
      subsLoading.value = false
    }
  }

  async function loadMembers(tid: string) {
    const arr = await teamApi.members(tid)
    members.value = Array.isArray(arr) ? arr : []
  }

  async function loadApplications(tid: string) {
    const arr = await teamApi.applications(tid)
    applications.value = Array.isArray(arr) ? arr : []
  }

  async function loadFunds(tid: string) {
    fundsLoading.value = true
    try {
      funds.value = await teamApi.funds(tid)
    } finally {
      fundsLoading.value = false
    }
  }

  async function fetchLogs(page = 1, pageSize = 50) {
    if (!inTeam.value || !myTid.value) return
    logsLoading.value = true
    try {
      const p = normPaged<TeamFundLog>(await teamApi.logs(myTid.value, page, pageSize), { page, page_size: pageSize })
      logs.value = p.items
      logsPage.value = p.page
      logsPageSize.value = p.page_size
      logsTotal.value = p.total_items ?? 0
    } catch (e) {
      logs.value = []
      logsTotal.value = 0
      throw e
    } finally {
      logsLoading.value = false
    }
  }

  async function fetchMessages(page = 1, pageSize = 10) {
    if (!inTeam.value || !myTid.value) return
    messagesLoading.value = true
    try {
      const p = normPaged<TeamMessage>(await teamApi.messages(myTid.value, page, pageSize), { page, page_size: pageSize })
      messages.value = p.items
      messagesPage.value = p.page
      messagesPageSize.value = p.page_size
      messagesTotal.value = p.total_items ?? 0
    } catch (e) {
      messages.value = []
      messagesTotal.value = 0
      throw e
    } finally {
      messagesLoading.value = false
    }
  }

  async function loadMessageState(tid: string) {
    messageState.value = await teamApi.messageState(tid)
  }

  async function loadOnlineMates() {
    onlineMatesLoading.value = true
    try {
      const arr = await teamApi.onlineTeammates()
      onlineMates.value = Array.isArray(arr) ? arr : []
    } catch (e) {
      onlineMates.value = []
      throw e
    } finally {
      onlineMatesLoading.value = false
    }
  }

  // ===== 写操作 =====
  async function create(name: string) {
    await teamApi.create(name)
    await fetchMe()
    if (inTeam.value) await refreshMemberTabs()
  }

  async function join(tid: string | number) {
    await teamApi.join(tid)
    await fetchMe()
  }

  async function quitTeam() {
    await teamApi.quit()
    await fetchMe()
    members.value = []
    applications.value = []
    funds.value = null
    logs.value = []
    messages.value = []
    messageState.value = null
    onlineMates.value = []
  }

  async function promote(uuid: string) {
    if (!myTid.value) return
    await teamApi.promote(myTid.value, uuid)
    await Promise.all([loadMembers(myTid.value), fetchMe()])
  }

  async function demote(uuid: string) {
    if (!myTid.value) return
    await teamApi.demote(myTid.value, uuid)
    await Promise.all([loadMembers(myTid.value), fetchMe()])
  }

  async function removeMember(uuid: string) {
    if (!myTid.value) return
    await teamApi.removeMember(myTid.value, uuid)
    await loadMembers(myTid.value)
  }

  async function acceptApplication(uuid: string) {
    if (!myTid.value) return
    await teamApi.acceptApplication(myTid.value, uuid)
    await loadApplications(myTid.value)
    await loadMembers(myTid.value)
  }

  async function rejectApplication(uuid: string) {
    if (!myTid.value) return
    await teamApi.rejectApplication(myTid.value, uuid)
    await loadApplications(myTid.value)
  }

  async function updateNotice(notice: string) {
    if (!myTid.value) return
    await teamApi.notice(myTid.value, notice)
    await fetchMe()
  }

  async function rename(name: string) {
    if (!myTid.value) return
    await teamApi.rename(myTid.value, name)
    await fetchMe()
  }

  async function setPublic(pub: boolean) {
    if (!myTid.value) return
    await teamApi.setPublic(myTid.value, pub)
    await fetchMe()
  }

  async function setFriendlyFire(allow: boolean) {
    if (!myTid.value) return
    await teamApi.setFriendlyFire(myTid.value, allow)
    await fetchMe()
  }

  async function disband(confirmName: string) {
    if (!myTid.value) return
    await teamApi.disband(myTid.value, confirmName)
    await fetchMe()
  }

  async function deposit(amount: number) {
    if (!myTid.value) return
    await teamApi.fundsDeposit(myTid.value, amount)
    await Promise.all([loadFunds(myTid.value), fetchMe()])
  }

  async function withdraw(amount: number) {
    if (!myTid.value) return
    await teamApi.fundsWithdraw(myTid.value, amount)
    await Promise.all([loadFunds(myTid.value), fetchMe()])
  }

  async function sendMessage(content: string) {
    if (!myTid.value) return
    await teamApi.message(myTid.value, content)
    await fetchMessages(1, messagesPageSize.value)
    await loadMessageState(myTid.value).catch(() => {})
  }

  async function markMessagesRead() {
    if (!myTid.value) return
    await teamApi.markMessageRead(myTid.value)
    await loadMessageState(myTid.value).catch(() => {})
  }

  async function markNoticeRead() {
    if (!myTid.value) return
    await teamApi.markNoticeRead(myTid.value)
    await loadMessageState(myTid.value).catch(() => {})
  }

  return {
    // state
    me,
    meLoading,
    meError,
    inTeam,
    myTid,
    myRole,
    isOperator,
    currencyName,

    teams,
    teamsPage,
    teamsPageSize,
    teamsTotal,
    teamsTotalPages,
    teamsLoading,
    teamsError,

    searchResults,
    searchTotal,
    searchLoading,

    members,
    applications,
    subsLoading,

    funds,
    fundsLoading,

    logs,
    logsPage,
    logsPageSize,
    logsTotal,
    logsLoading,

    messages,
    messagesPage,
    messagesPageSize,
    messagesTotal,
    messagesLoading,

    messageState,

    onlineMates,
    onlineMatesLoading,

    // actions
    fetchMe,
    fetchTeams,
    fetchSearch,
    refreshMemberTabs,
    fetchLogs,
    fetchMessages,
    loadMessageState,
    loadMembers,
    loadApplications,
    loadFunds,

    create,
    join,
    quitTeam,
    promote,
    demote,
    removeMember,
    acceptApplication,
    rejectApplication,
    updateNotice,
    rename,
    setPublic,
    setFriendlyFire,
    disband,
    deposit,
    withdraw,
    sendMessage,
    markMessagesRead,
    markNoticeRead,
  }
})
