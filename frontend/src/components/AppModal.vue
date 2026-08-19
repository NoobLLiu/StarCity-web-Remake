<script setup lang="ts">
import { watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: string
  }>(),
  { title: '', width: 'max-w-md' },
)
const emit = defineEmits<{ 'update:open': [value: boolean]; confirm: []; cancel: [] }>()

watch(
  () => props.open,
  (open) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = open ? 'hidden' : ''
    }
  },
)

function close() {
  emit('update:open', false)
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div class="absolute inset-0 bg-black/40" @click="close" />
        <div
          class="relative w-full bg-card text-card-foreground border border-border shadow-hard p-5 grid gap-4"
          :class="width"
        >
          <div v-if="title || $slots.header" class="flex items-center justify-between gap-3">
            <h3 class="text-lg font-bold tracking-tight">
              <slot name="header">{{ title }}</slot>
            </h3>
            <button type="button" class="text-muted-foreground hover:text-foreground" @click="close" aria-label="关闭">
              <X :size="18" />
            </button>
          </div>
          <div class="text-sm text-muted-foreground">
            <slot />
          </div>
          <div v-if="$slots.footer" class="flex justify-end gap-2 pt-1">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.16s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
