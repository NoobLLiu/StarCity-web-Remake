import { defineStore } from 'pinia'
import { ref } from 'vue'
import { teamApi } from '@/api/team'
import type {
  TeamApplication,
  TeamDetail,
  TeamFundLog,
  TeamMember,
  TeamMessage,
  TeamSummary,
} from '@/types'
import { normalizeList } from '@/utils/normalize'

export const useTeamStore = defineStore('team', () => {
  const myTeam = ref<TeamDetail | null>(null)
  const myTeamLoading = ref(false)
  const myTeamError = ref<string | null>(null)

  const publicTeams = ref<TeamSummary[]>([])
  const publicTotal = ref(0)
  const publicLoading = ref(false)
  const publicError = ref<string | null>(null)

  const members = ref<TeamMember[]>([])
  const applications = ref<TeamApplication[]>([])
  const messages = ref<TeamMessage[]>([])
  const logs = ref<TeamFundLog[]>([])

  async function fetchMyTeam() {
    myTeamLoading.value = true
    myTeamError.value = null
    try {
      const data = await teamApi.me()
      myTeam.value = data as TeamDetail | null
    } catch (e) {
      myTeamError.value = (e as Error).message
      myTeam.value = null
    } finally {
      myTeamLoading.value = false
    }
  }

  async function fetchPublic(page = 1, pageSize = 20, query = '') {
    publicLoading.value = true
    publicError.value = null
    try {
      const raw = await teamApi.list(page, pageSize, query)
      const norm = normalizeList<TeamSummary>(raw)
      publicTeams.value = norm.items
      publicTotal.value = norm.total
    } catch (e) {
      publicError.value = (e as Error).message
      publicTeams.value = []
    } finally {
      publicLoading.value = false
    }
  }

  async function loadTeamDetail(tid: string | number) {
    myTeamLoading.value = true
    try {
      const detail = await teamApi.detail(tid)
      myTeam.value = detail
      const [m, a, msg, l] = await Promise.allSettled([
        teamApi.members(tid),
        teamApi.applications(tid),
        teamApi.messages(tid),
        teamApi.logs(tid),
      ])
      members.value = m.status === 'fulfilled' ? ((Array.isArray(m.value) ? m.value : []) as TeamMember[]) : []
      applications.value = a.status === 'fulfilled' ? ((Array.isArray(a.value) ? a.value : []) as TeamApplication[]) : []
      const msgRaw = msg.status === 'fulfilled' ? msg.value : []
      messages.value = (Array.isArray(msgRaw) ? msgRaw : normalizeList<TeamMessage>(msgRaw).items) as TeamMessage[]
      const logRaw = l.status === 'fulfilled' ? l.value : []
      logs.value = (Array.isArray(logRaw) ? logRaw : normalizeList<TeamFundLog>(logRaw).items) as TeamFundLog[]
    } finally {
      myTeamLoading.value = false
    }
  }

  async function refreshTabs() {
    if (myTeam.value) await loadTeamDetail(String(myTeam.value.tid))
  }

  return {
    myTeam,
    myTeamLoading,
    myTeamError,
    publicTeams,
    publicTotal,
    publicLoading,
    publicError,
    members,
    applications,
    messages,
    logs,
    fetchMyTeam,
    fetchPublic,
    loadTeamDetail,
    refreshTabs,
  }
})
