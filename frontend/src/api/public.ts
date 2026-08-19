import { http } from './http'
import type { HealthInfo, PublicSettings } from '@/types'

export const publicApi = {
  health() {
    return http.get<HealthInfo>('/health')
  },
  settings() {
    return http.get<PublicSettings>('/settings/public')
  },
}
