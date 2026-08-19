import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'starcity-theme'

function detectInitial(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (saved === 'light' || saved === 'dark') return saved
  // Design defaults to light.
  return 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(detectInitial())

  function apply(next: ThemeMode) {
    mode.value = next
    const html = document.documentElement
    html.classList.toggle('dark', next === 'dark')
    html.classList.toggle('light', next === 'light')
    html.dataset.theme = next
    localStorage.setItem(STORAGE_KEY, next)
  }

  function toggle() {
    apply(mode.value === 'dark' ? 'light' : 'dark')
  }

  // Apply on store creation.
  apply(mode.value)

  watch(mode, () => {})

  return { mode, apply, toggle }
})
