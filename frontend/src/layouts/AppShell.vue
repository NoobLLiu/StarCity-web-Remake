<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ scope: 'portal' | 'admin'; title: string; subtitle?: string }>()

const auth = useAuthStore()
const router = useRouter()
const drawerOpen = ref(false)

const subtitle = props.subtitle ?? (props.scope === 'admin' ? '管理员工单后台' : '玩家门户')

router.afterEach(() => {
  drawerOpen.value = false
})
</script>

<template>
  <main class="min-h-screen flex bg-background">
    <!-- Desktop sidebar -->
    <aside
      class="hidden lg:flex fixed top-0 left-0 z-30 w-[260px] h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col p-4 gap-6"
    >
      <div>
        <div class="text-[11px] uppercase tracking-widest text-muted-foreground">
          {{ scope === 'admin' ? 'ADMIN PANEL' : 'PLAYER PORTAL' }}
        </div>
        <div class="text-xl font-bold tracking-tight font-sans">StarCity</div>
      </div>
      <AppSidebar :scope="scope" />
      <div class="mt-auto text-[11px] text-muted-foreground">
        <p v-if="auth.isLoggedIn">{{ auth.player }}</p>
        <p v-if="auth.isOp" class="text-chart-1">OP</p>
      </div>
    </aside>

    <!-- Mobile drawer -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="drawerOpen" class="fixed inset-0 z-40 lg:hidden" aria-hidden="false">
          <div class="absolute inset-0 bg-black/40" @click="drawerOpen = false" />
          <aside
            class="absolute top-0 left-0 h-full w-[260px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col p-4 gap-6"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {{ scope === 'admin' ? 'ADMIN PANEL' : 'PLAYER PORTAL' }}
                </div>
                <div class="text-xl font-bold tracking-tight font-sans">StarCity</div>
              </div>
              <button
                type="button"
                class="w-9 h-9 grid place-items-center bg-muted text-foreground border border-ring shadow-hard-muted"
                aria-label="关闭导航"
                @click="drawerOpen = false"
              >
                <X :size="18" />
              </button>
            </div>
            <AppSidebar :scope="scope" />
          </aside>
        </div>
      </Transition>
    </Teleport>

    <!-- Main area -->
    <div class="flex-1 min-w-0 flex flex-col min-h-screen lg:ml-[260px]">
      <AppHeader :title="title" :subtitle="subtitle" @menu="drawerOpen = true" />
      <RouterView />
    </div>
  </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.16s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
