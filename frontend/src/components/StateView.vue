<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    loading?: boolean
    error?: string | null
    empty?: boolean
    emptyText?: string
    loadingText?: string
  }>(),
  {
    loading: false,
    error: null,
    empty: false,
    emptyText: '暂无数据',
    loadingText: '加载中…',
  },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    v-if="loading"
    class="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground"
  >
    <Loader2 :size="22" class="animate-spin" />
    <span class="text-sm">{{ loadingText }}</span>
  </div>
  <div
    v-else-if="error"
    class="flex flex-col items-center justify-center gap-3 py-12 text-center"
  >
    <p class="text-sm text-destructive max-w-md">{{ error }}</p>
    <button
      type="button"
      class="h-9 px-4 text-sm bg-muted text-foreground border border-ring shadow-hard-muted transition-transform hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px"
      @click="$emit('retry')"
    >
      重试
    </button>
  </div>
  <div
    v-else-if="empty"
    class="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground"
  >
    <p class="text-sm">{{ emptyText }}</p>
  </div>
  <template v-else><slot /></template>
</template>
