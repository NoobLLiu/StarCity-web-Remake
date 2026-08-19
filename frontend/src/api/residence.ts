import { http } from './http'
import type {
  FlagState,
  ResidenceDetail,
  ResidenceFlags,
  ResidenceListPaginated,
  ResidenceMarketPaginated,
  ResidencePlayerFlags,
  ResidenceRentsResult,
  ResidenceSummary,
} from '@/types'

export interface ResidenceListParams {
  page?: number
  page_size?: number
  query?: string
  owner?: string
  mine?: boolean
}

export interface RentSettingsPayload {
  cost: number
  days: number
  allow_renewing?: boolean
  stay_in_market?: boolean
  allow_auto_pay?: boolean
}

function enc(v: string) {
  return encodeURIComponent(v)
}

export const residenceApi = {
  // ===== 只读 =====
  list(params: ResidenceListParams = {}) {
    return http.get<ResidenceListPaginated | ResidenceSummary[]>('/residences', {
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
    return http.get<ResidenceDetail>(`/residences/${enc(residence)}`)
  },
  flags(residence: string) {
    return http.get<ResidenceFlags>(`/residences/${enc(residence)}/flags`)
  },
  playerFlags(residence: string, player: string) {
    return http.get<ResidencePlayerFlags>(
      `/residences/${enc(residence)}/players/${enc(player)}/flags`,
    )
  },
  market(page = 1, pageSize = 20) {
    return http.get<ResidenceMarketPaginated>('/residences/market', {
      params: { page, page_size: pageSize },
    })
  },
  myRents() {
    return http.get<ResidenceRentsResult>('/residences/me/rents')
  },

  // ===== 写（不需要在线） =====
  setFlag(residence: string, flag: string, state: FlagState) {
    return http.post<unknown>(`/residences/${enc(residence)}/flags`, { flag, state })
  },
  setPlayerFlag(residence: string, player: string, flag: string, state: FlagState) {
    return http.post<unknown>(
      `/residences/${enc(residence)}/players/${enc(player)}/flags`,
      { flag, state },
    )
  },
  removePlayerFlag(residence: string, player: string, flag: string) {
    return http.post<unknown>(
      `/residences/${enc(residence)}/players/${enc(player)}/remove`,
      { flag },
    )
  },
  clearPlayer(residence: string, player: string) {
    return http.post<unknown>(
      `/residences/${enc(residence)}/players/${enc(player)}/clear`,
    )
  },
  applyDefaults(residence: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/apply-defaults`)
  },
  setMessage(residence: string, type: 'enter' | 'leave', message: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/message`, { type, message })
  },
  rename(residence: string, newName: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/rename`, { new_name: newName })
  },
  mirror(residence: string, source: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/mirror`, { source })
  },
  delete(residence: string, confirmName?: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/delete`, {
      confirm: true,
      ...(confirmName ? { confirm_name: confirmName } : {}),
    })
  },
  sell(residence: string, price: number) {
    return http.post<unknown>(`/residences/${enc(residence)}/sell`, { price })
  },
  unlistSell(residence: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/unlist-sell`)
  },
  unlistRent(residence: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/unlist-rent`)
  },

  // ===== 写（需要在线） =====
  buy(residence: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/buy`)
  },
  rentSettings(residence: string, payload: RentSettingsPayload) {
    return http.post<unknown>(`/residences/${enc(residence)}/rent-settings`, payload)
  },
  rent(residence: string, autoPay?: boolean) {
    return http.post<unknown>(`/residences/${enc(residence)}/rent`, {
      ...(autoPay !== undefined ? { auto_pay: autoPay } : {}),
    })
  },
  unrent(residence: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/unrent`)
  },
  payRent(residence: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/pay-rent`)
  },
  transfer(residence: string, target: string) {
    return http.post<unknown>(`/residences/${enc(residence)}/transfer`, { target })
  },
}
