import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getAdminToken } from '@/api/http'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/portal/home' },

  // ----- Portal (player) -----
  {
    path: '/portal/login',
    name: 'login',
    component: () => import('@/views/portal/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/portal',
    component: () => import('@/layouts/PortalLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/portal/home' },
      {
        path: 'home',
        name: 'home',
        component: () => import('@/views/portal/HomeView.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'player-center',
        name: 'player-center',
        component: () => import('@/views/portal/PlayerCenterView.vue'),
        meta: { title: '玩家中心' },
      },
      {
        path: 'market',
        name: 'market',
        component: () => import('@/views/portal/MarketView.vue'),
        meta: { title: '交易市场' },
      },
      {
        path: 'team',
        name: 'team',
        component: () => import('@/views/portal/TeamView.vue'),
        meta: { title: '团队' },
      },
      {
        path: 'residences',
        name: 'residences',
        component: () => import('@/views/portal/ResidencesView.vue'),
        meta: { title: '领地' },
      },
      {
        path: 'tickets',
        name: 'tickets',
        component: () => import('@/views/portal/TicketsView.vue'),
        meta: { title: '工单' },
      },
    ],
  },

  // ----- Admin (tickets only) -----
  {
    path: '/admin/access',
    name: 'admin-access',
    component: () => import('@/views/admin/AdminAccessView.vue'),
    meta: { requiresAuth: true, title: '管理后台访问' },
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/tickets' },
      {
        path: 'tickets',
        name: 'admin-tickets',
        component: () => import('@/views/admin/AdminTicketsView.vue'),
        meta: { title: '工单收件箱' },
      },
      {
        path: 'tickets/:id',
        name: 'admin-ticket-detail',
        component: () => import('@/views/admin/AdminTicketsView.vue'),
        meta: { title: '工单详情' },
      },
    ],
  },

  { path: '/:pathMatch(.*)*', redirect: '/portal/home' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Guard: routes requiring a logged-in player.
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Guard: admin area requires is_op OR an admin token.
  if (to.meta.requiresAdmin && !auth.isOp && !getAdminToken()) {
    return { name: 'admin-access', query: { redirect: to.fullPath } }
  }

  // Already logged-in users shouldn't see the login page.
  if (to.name === 'login' && auth.isLoggedIn) {
    return { path: '/portal/home' }
  }
})

router.afterEach((to) => {
  const base = import.meta.env.VITE_SITE_TITLE || 'StarCity'
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
