<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'muted' | 'destructive' | 'secondary' | 'ghost'
    size?: 'sm' | 'md'
    block?: boolean
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', block: false, type: 'button', disabled: false },
)

const base =
  'inline-flex items-center justify-center gap-2 border font-semibold transition-transform duration-150 hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 disabled:translate-x-0 disabled:translate-y-0'

const variants: Record<string, string> = {
  primary: 'bg-primary text-primary-foreground border-transparent shadow-hard-muted',
  muted: 'bg-muted text-foreground border-ring shadow-hard-muted',
  destructive: 'bg-destructive text-destructive-foreground border-transparent shadow-hard-muted',
  secondary: 'bg-secondary text-secondary-foreground border-transparent shadow-hard-muted',
  ghost: 'bg-transparent text-foreground border-transparent hover:bg-muted',
}

const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm' }

const classes = computed(() => [
  base,
  variants[props.variant],
  sizes[props.size],
  props.block ? 'w-full' : '',
])
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
