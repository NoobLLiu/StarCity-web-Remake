<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  page: number
  pageSize: number
  total: number
}>()
const emit = defineEmits<{ change: [page: number] }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / Math.max(1, props.pageSize))))
const canPrev = computed(() => props.page > 1)
const canNext = computed(() => props.page < totalPages.value)

function go(p: number) {
  if (p < 1 || p > totalPages.value || p === props.page) return
  emit('change', p)
}
</script>

<template>
  <div class="flex items-center justify-between gap-3 flex-wrap text-sm">
    <span class="text-xs text-muted-foreground">共 {{ total }} 条 · 第 {{ page }}/{{ totalPages }} 页</span>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="h-9 w-9 grid place-items-center bg-muted text-foreground border border-ring shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px disabled:opacity-40 disabled:translate-x-0 disabled:translate-y-0"
        :disabled="!canPrev"
        @click="go(page - 1)"
        aria-label="上一页"
      >
        <ChevronLeft :size="16" />
      </button>
      <button
        type="button"
        class="h-9 w-9 grid place-items-center bg-muted text-foreground border border-ring shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px disabled:opacity-40 disabled:translate-x-0 disabled:translate-y-0"
        :disabled="!canNext"
        @click="go(page + 1)"
        aria-label="下一页"
      >
        <ChevronRight :size="16" />
      </button>
    </div>
  </div>
</template>
