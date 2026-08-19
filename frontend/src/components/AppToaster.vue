<script setup lang="ts">
import { useNotifyStore } from '@/stores/notify'
import { CheckCircle2, XCircle, Info, X } from 'lucide-vue-next'

const notify = useNotifyStore()

const iconFor = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const

const styles = {
  success: 'bg-chart-3 text-white border-transparent',
  error: 'bg-destructive text-destructive-foreground border-transparent',
  info: 'bg-muted text-foreground border-border',
} as const
</script>

<template>
  <Teleport to="body">
    <div class="fixed z-[100] bottom-4 right-4 flex flex-col gap-2 w-[min(92vw,360px)]">
      <TransitionGroup name="toast">
        <div
          v-for="t in notify.toasts"
          :key="t.id"
          class="flex items-start gap-3 p-3 border shadow-hard text-sm"
          :class="styles[t.kind]"
        >
          <component :is="iconFor[t.kind]" :size="18" class="mt-0.5 shrink-0" />
          <p class="flex-1 break-words">{{ t.message }}</p>
          <button type="button" class="opacity-70 hover:opacity-100" @click="notify.dismiss(t.id)" aria-label="关闭">
            <X :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.18s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>
