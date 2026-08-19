<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import AppShell from '@/layouts/AppShell.vue'

const route = useRoute()
const title = computed(() => (route.meta.title as string) || '管理后台')
</script>

<template>
  <AppShell scope="admin" :title="title" />
</template>
