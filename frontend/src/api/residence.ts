import { http } from './http'
import type {
  FlagState,
  Paginated,
  ResidenceDetail,
  ResidenceFlags,
  ResidencePlayerFlags,
  ResidenceSummary,
} from '@/types'

export interface ResidenceListParams {
  page?: number
  page_size?: number
  query?: string
  owner?: string
  mine?: boolean
}

export const residenceApi = {
  list(params: ResidenceListParams = {}) {
    return http.get<Paginated<ResidenceSummary> | ResidenceSummary[]>('/residences', {
      params: {
        page: params.page,
        page_size: params.page_size,
        query: params.query,
        owner: params.owner,
        mine: params.mine === undefined ? undefined : String(params.mine),
      },
    })
  },
  detail(residence: string) {
    return http.get<ResidenceDetail>(`/residences/${encodeURIComponent(residence)}`)
  },
  flags(residence: string) {
    return http.get<ResidenceFlags>(`/residences/${encodeURIComponent(residence)}/flags`)
  },
  playerFlags(residence: string, player: string) {
    return http.get<ResidencePlayerFlags>(
      `/residences/${encodeURIComponent(residence)}/players/${encodeURIComponent(player)}/flags`,
    )
  },
  setFlag(residence: string, flag: string, state: FlagState) {
    return http.post<unknown>(`/residences/${encodeURIComponent(residence)}/flags`, { flag, state })
  },
  setPlayerFlag(residence: string, player: string, flag: string, state: FlagState) {
    return http.post<unknown>(
      `/residences/${encodeURIComponent(residence)}/players/${encodeURIComponent(player)}/flags`,
      { flag, state },
    )
  },
  removePlayerFlag(residence: string, player: string, flag: string) {
    return http.post<unknown>(
      `/residences/${encodeURIComponent(residence)}/players/${encodeURIComponent(player)}/remove`,
      { flag },
    )
  },
  clearPlayer(residence: string, player: string) {
    return http.post<unknown>(
      `/residences/${encodeURIComponent(residence)}/players/${encodeURIComponent(player)}/clear`,
    )
  },
  applyDefaults(residence: string) {
    return http.post<unknown>(`/residences/${encodeURIComponent(residence)}/apply-defaults`)
  },
  setMessage(residence: string, type: 'enter' | 'leave', message: string) {
    return http.post<unknown>(`/residences/${encodeURIComponent(residence)}/message`, { type, message })
  },
}
