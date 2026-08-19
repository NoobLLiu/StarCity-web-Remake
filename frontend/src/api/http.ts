import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  AxiosError,
} from 'axios'
import type { ApiResponse } from '@/types'

const TOKEN_STORAGE_KEY = 'starcity_token'
const TOKEN_TTL_KEY = 'starcity_token_exp'

/** Bearer token for the logged-in player. Persisted to localStorage. */
export function getToken(): string | null {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) return null
  const exp = Number(localStorage.getItem(TOKEN_TTL_KEY) || 0)
  if (exp && Date.now() > exp) {
    clearToken()
    return null
  }
  return token
}

export function setToken(token: string, ttlSeconds = 3600) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  localStorage.setItem(TOKEN_TTL_KEY, String(Date.now() + ttlSeconds * 1000))
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(TOKEN_TTL_KEY)
}

let onUnauthorized: (() => void) | null = null
export function registerUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

export class ApiError extends Error {
  code: number
  constructor(message: string, code: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** A minimal HTTP client whose methods resolve to the *unwrapped* `data` field. */
export interface HttpClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
}

function createInstance(headerStrategy: (config: AxiosRequestConfig) => AxiosRequestConfig): HttpClient {
  const instance: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || '/api',
    timeout: 20000,
    headers: { 'Content-Type': 'application/json' },
  })

  instance.interceptors.request.use((config) => {
    const merged = headerStrategy(config)
    // Merge any header/field updates back into the internal config.
    if (merged.headers) {
      config.headers = config.headers ?? {}
      for (const [key, value] of Object.entries(merged.headers)) {
        if (value !== undefined) (config.headers as Record<string, string>)[key] = String(value)
      }
    }
    return config
  })

  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      const payload = response.data
      if (payload && typeof payload === 'object' && 'code' in payload) {
        if (payload.code === 0) {
          // Unwrap the envelope: replace response.data with the inner data.
          response.data = payload.data as unknown as ApiResponse
          return response
        }
        if (payload.code === 401) {
          clearToken()
          onUnauthorized?.()
        }
        return Promise.reject(new ApiError(payload.message || '请求失败', payload.code))
      }
      // Non-envelope responses (e.g. /health) are returned as-is.
      return response
    },
    (error: AxiosError<ApiResponse>) => {
      const status = error.response?.status
      const body = error.response?.data
      const message =
        (body && typeof body === 'object' && 'message' in body && body.message) || error.message
      if (status === 401) {
        clearToken()
        onUnauthorized?.()
      }
      return Promise.reject(new ApiError(message || '网络错误', status ?? -1))
    },
  )

  return {
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
      return instance.get(url, config).then((r) => r.data as T)
    },
    post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
      return instance.post(url, data, config).then((r) => r.data as T)
    },
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
      return instance.delete(url, config).then((r) => r.data as T)
    },
    put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
      return instance.put(url, data, config).then((r) => r.data as T)
    },
  }
}

/** Player-facing HTTP client. Attaches `Authorization: Bearer <token>`. */
export const http: HttpClient = createInstance((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Admin HTTP client. Attaches `X-Admin-Token`. */
export const adminHttp: HttpClient = createInstance((config) => {
  const token = getAdminToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['X-Admin-Token'] = token
  }
  return config
})

const ADMIN_TOKEN_KEY = 'starcity_admin_token'

export function getAdminToken(): string | null {
  const fromEnv = import.meta.env.VITE_ADMIN_TOKEN
  return (fromEnv && String(fromEnv)) || localStorage.getItem(ADMIN_TOKEN_KEY) || null
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}
