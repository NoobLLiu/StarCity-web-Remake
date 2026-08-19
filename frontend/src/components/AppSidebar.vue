<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  /** "portal" shows the player nav; "admin" shows only the admin ticket link. */
  scope?: 'portal' | 'admin'
}>()
</script>

<template>
  <nav class="flex flex-col gap-2" aria-label="主导航">
    <RouterLink
      v-if="scope === 'portal'"
      v-for="item in [
        { to: '/portal/home', label: '首页', icon: 'home' },
        { to: '/portal/market', label: '交易市场', icon: 'market' },
        { to: '/portal/team', label: '团队', icon: 'team' },
        { to: '/portal/residences', label: '领地', icon: 'res' },
        { to: '/portal/tickets', label: '工单', icon: 'ticket' },
        { to: '/portal/player-center', label: '玩家中心', icon: 'user' },
      ]"
      :key="item.to"
      :to="item.to"
      class="w-full text-left px-3 py-2.5 bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-transform hover:-translate-x-px hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-sidebar-ring focus-visible:outline-offset-2 text-sm"
      active-class="!bg-sidebar-primary !text-sidebar-primary-foreground"
    >
      {{ item.label }}
    </RouterLink>

    <div v-if="scope === 'portal'" class="pt-3 mt-3 border-t border-sidebar-border">
      <div class="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 px-1">管理</div>
      <RouterLink
        to="/admin/tickets"
        class="w-full text-left px-3 py-2.5 bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-transform hover:-translate-x-px hover:-translate-y-px text-sm block"
        active-class="!bg-sidebar-primary !text-sidebar-primary-foreground"
      >
        管理工单
      </RouterLink>
    </div>

    <RouterLink
      v-if="scope === 'admin'"
      to="/admin/tickets"
      class="w-full text-left px-3 py-2.5 bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-transform hover:-translate-x-px hover:-translate-y-px text-sm"
      active-class="!bg-sidebar-primary !text-sidebar-primary-foreground"
    >
      工单收件箱
    </RouterLink>
    <RouterLink
      v-if="scope === 'admin'"
      to="/portal/home"
      class="w-full text-left px-3 py-2.5 bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-transform hover:-translate-x-px hover:-translate-y-px text-sm mt-3 border-t border-sidebar-border pt-3"
    >
      返回门户
    </RouterLink>
  </nav>
</template>
