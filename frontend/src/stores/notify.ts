import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

let seed = 0

export const useNotifyStore = defineStore('notify', () => {
  const toasts = ref<ToastItem[]>([])

  function push(message: string, kind: ToastKind = 'info', ttl = 3200) {
    const id = ++seed
    toasts.value.push({ id, kind, message })
    if (ttl > 0) {
      window.setTimeout(() => dismiss(id), ttl)
    }
    return id
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  const success = (m: string) => push(m, 'success')
  const error = (m: string) => push(m, 'error')
  const info = (m: string) => push(m, 'info')

  return { toasts, push, dismiss, success, error, info }
})
