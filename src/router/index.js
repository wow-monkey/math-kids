import { createRouter, createWebHashHistory } from 'vue-router'
import { getStage } from '@/utils/stages'
import { getTheme } from '@/utils/adventures'

const MODES = ['game', 'lesson', 'song', 'trace']

const routes = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/stage/:mode', name: 'stage-select', component: () => import('@/views/StageSelectView.vue') },
  { path: '/map/:stageId', name: 'map', component: () => import('@/views/MapView.vue') },
  { path: '/play/:stageId/:levelIdx', name: 'play', component: () => import('@/views/GameHostView.vue') },
  { path: '/lesson/:stageId', name: 'lesson', component: () => import('@/views/LessonView.vue') },
  { path: '/song/:stageId', name: 'song', component: () => import('@/views/SongView.vue') },
  { path: '/trace/:stageId', name: 'trace', component: () => import('@/views/TraceView.vue') },
  { path: '/parent', name: 'parent', component: () => import('@/views/ParentView.vue') },
  { path: '/adventure', name: 'adventure', component: () => import('@/views/AdventureSelectView.vue') },
  { path: '/adventure/:theme', name: 'adventure-theme', component: () => import('@/views/AdventureStageView.vue') },
  { path: '/adventure/:theme/:stageId', name: 'adventure-map', component: () => import('@/views/AdventureMapView.vue') },
  { path: '/adventure-play/:theme/:stageId/:levelIdx', name: 'adventure-play', component: () => import('@/views/AdventureHostView.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

/**
 * 参数校验：非法 stage / theme / level 统一回退，避免页面拿到 undefined 后整页白屏
 * （书签、手输地址、旧链接都能安全降级）
 */
router.beforeEach((to) => {
  const { mode, stageId, theme, levelIdx } = to.params

  if (mode !== undefined && !MODES.includes(mode)) return { path: '/' }
  if (stageId !== undefined && !getStage(stageId)) return { path: '/' }
  if (theme !== undefined && !getTheme(theme)) return { path: '/adventure' }

  if (levelIdx !== undefined) {
    const idx = Number(levelIdx)
    if (!Number.isInteger(idx) || idx < 0) return { path: '/' }
    const themeObj = theme ? getTheme(theme) : null
    const stage = getStage(stageId)
    const max = themeObj ? themeObj.levels.length : stage ? stage.games.length : 0
    if (idx >= max) {
      return themeObj ? { path: `/adventure/${theme}/${stageId}` } : { path: `/map/${stageId}` }
    }
  }

  return true
})

// 部署后旧 chunk 失效（动态 import 404）时刷新一次，拿新资源
router.onError((err) => {
  if (/dynamically imported module|Importing a module script failed/i.test(err?.message || '')) {
    window.location.reload()
  }
})

export default router
