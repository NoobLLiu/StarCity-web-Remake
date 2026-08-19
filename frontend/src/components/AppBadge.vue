<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ variant?: 'primary' | 'accent' | 'muted' | 'destructive' | 'success' }>(),
  { variant: 'muted' },
)

const variants: Record<string, string> = {
  primary: 'bg-primary text-primary-foreground border-transparent',
  accent: 'bg-accent text-accent-foreground border-transparent',
  muted: 'bg-muted text-foreground border-border',
  destructive: 'bg-destructive text-destructive-foreground border-transparent',
  success: 'bg-chart-3 text-white border-transparent',
}

const classes = computed(() => [
  'inline-flex items-center px-2 py-0.5 text-[11px] font-semibold border',
  variants[props.variant],
])
</script>

<template>
  <span :class="classes"><slot /></span>
</template>
