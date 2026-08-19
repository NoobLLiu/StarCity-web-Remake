import { http } from './http'
import type { AuthInfo, LoginPayload, MeInfo } from '@/types'

export const authApi = {
  login(payload: LoginPayload) {
    return http.post<AuthInfo>('/auth/login', payload)
  },
  me() {
    return http.get<MeInfo>('/auth/me')
  },
}
