<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import AppShell from '@/layouts/AppShell.vue'

const route = useRoute()
const title = computed(() => (route.meta.title as string) || 'StarCity')
</script>

<template>
  <AppShell scope="portal" :title="title" />
</template>
