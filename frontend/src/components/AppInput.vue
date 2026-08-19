<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    modelValue?: string
    type?: string
    placeholder?: string
    size?: 'sm' | 'md'
    block?: boolean
  }>(),
  { modelValue: '', type: 'text', placeholder: '', size: 'md', block: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const attrs = useAttrs()

const sizeClass = { sm: 'h-8 text-xs', md: 'h-9 text-sm' }[props.size]
const wrapperClass = computed(() => [
  'flex items-center gap-2 px-3 bg-input border border-border shadow-hard-muted focus-within:border-ring focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--ring)_22%,transparent),2px_2px_0px_0px_hsl(0_0%0%_/.5)]',
  props.block ? 'w-full' : '',
])

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <label :class="wrapperClass">
    <slot name="prefix" />
    <input
      v-bind="attrs"
      :type="type"
      :placeholder="placeholder"
      :value="modelValue"
      class="w-full border-0 bg-transparent p-0 outline-none placeholder:text-muted-foreground text-foreground"
      :class="sizeClass"
      @input="onInput"
    />
    <slot name="suffix" />
  </label>
</template>
