import type { Paginated } from '@/types'

/**
 * The backend may return either a bare array or a `{ items, page, ... }` envelope.
 * Normalize to a uniform shape for the UI.
 */
export function normalizeList<T>(raw: unknown): Paginated<T> {
  if (Array.isArray(raw)) {
    return { items: raw as T[], page: 1, page_size: raw.length, total: raw.length }
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const items = (obj.items ?? obj.list ?? obj.data ?? []) as T[]
    const total = Number(obj.total ?? obj.count ?? items.length)
    const page = Number(obj.page ?? obj.current ?? 1)
    const pageSize = Number(obj.page_size ?? obj.size ?? items.length)
    return { items, total: Number.isFinite(total) ? total : items.length, page, page_size: Number.isFinite(pageSize) ? pageSize : items.length }
  }
  return { items: [], page: 1, page_size: 0, total: 0 }
}

/** Coerce an arbitrary value to a number with a fallback. */
export function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Format a monetary/quantity number with thousand separators. */
export function formatNumber(v: unknown): string {
  const n = toNumber(v)
  return n.toLocaleString('en-US')
}

/** Read a string field from a loosely-typed record. */
export function str(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback
  return String(v)
}

/** Format an ISO-ish timestamp to `YYYY-MM-DD HH:mm`. */
export function formatTime(v: unknown): string {
  if (!v) return ''
  const s = String(v)
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
