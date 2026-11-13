<script setup>
// 按十数数：十格积木条逐条堆叠成塔，点亮一条报一个整十数
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { removeAndDispose } from '@/three/dispose'
import { toonMat } from '@/three/objects'
import { plainNumberTexture } from '@/three/textures'
import { burst, celebrate } from '@/three/particles'
import { tween, Ease } from '@/utils/tween'
import { later, clearLater } from '@/utils/timers'
import { speak, stopSpeak } from '@/utils/speech'
import { ding, cheer } from '@/utils/sound'
import { getStage } from '@/utils/stages'
import { toChinese } from '@/utils/numbers'
import { useGameRound } from '@/composables/useGameRound'

const props = defineProps({ stageId: { type: Number, required: true } })
const emit = defineEmits(['round', 'finish'])

const stage = getStage(props.stageId)
const { round, stars, start, nextRound } = useGameRound(3)
const ROW_COLORS = ['#FF6B81', '#FF9F43', '#FFD93D', '#7ED957', '#54A0FF', '#B983FF', '#FF8FB1', '#4ECDC4', '#F7B32B', '#8E7CF3']

const container = ref(null)
const hint = ref('')
const current = ref(0)

let sm = null
let rows = [] // 已堆叠的积木条
let nextRow = null // 待点亮的下一条
let targetRows = 0
let busy = false
let disposeCelebration = null

function clearTower() {
  rows.forEach((r) => removeAndDispose(sm.scene, r))
  if (nextRow) removeAndDispose(sm.scene, nextRow)
  rows = []
  nextRow = null
  sm.pickables = []
  disposeCelebration?.()
}

/** 一条 = 10 个小方块连成的长条 */
function makeTenRow(color, cell) {
  const g = new THREE.Group()
  const geo = new THREE.BoxGeometry(cell * 0.92, cell * 0.92, cell * 0.92)
  const mat = toonMat(color)
  for (let i = 0; i < 10; i++) {
    const cube = new THREE.Mesh(geo, mat)
    cube.position.x = (i - 4.5) * cell
    g.add(cube)
  }
  return g
}

function setupRound() {
  clearTower()
  busy = false
  current.value = 0
  emit('round', round.value)

  // 各阶段目标：数到 10/20/50/100
  const targets = { 1: 1, 2: 2, 3: 5, 4: 10 }
  targetRows = targets[stage.id] || 1

  hint.value = '点一下积木条，十个十个地数！'
  speak('点一下积木条，我们十个十个地数')

  spawnNextRow()
}

function spawnNextRow() {
  const { w, h } = sm.visibleSize()
  const rowIdx = rows.length
  const cell = Math.min(0.42, (w * 0.88) / 10)
  const rowW = cell * 10
  const baseY = -h * 0.38

  const row = makeTenRow(ROW_COLORS[rowIdx % ROW_COLORS.length], cell)
  row.userData.pickRoot = row
  row.userData.rowIndex = rowIdx
  // 从屏幕右侧飘入，悬停在塔上方
  row.position.set(w / 2 + rowW, baseY + rowIdx * cell + cell * 1.8, 0)
  sm.scene.add(row)
  nextRow = row
  sm.pickables = [row]
  tween(row.position, { x: 0 }, { duration: 700, ease: Ease.outQuad })
}

function onPick(root) {
  if (busy || root !== nextRow) return
  busy = true

  const rowIdx = root.userData.rowIndex
  const { h } = sm.visibleSize()
  const cell = Math.min(0.42, (sm.visibleSize().w * 0.88) / 10)
  const baseY = -h * 0.38
  const targetY = baseY + rowIdx * cell

  ding()
  const value = (rowIdx + 1) * 10
  current.value = value
  speak(toChinese(value), { interrupt: true })

  // 落位
  tween(root.position, { y: targetY }, {
    duration: 450,
    ease: Ease.outBounce,
    onComplete: () => {
      // 数字标签
      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: plainNumberTexture(value, { fg: '#FFFFFF', stroke: 'rgba(0,0,0,0.35)' }), transparent: true, depthTest: false })
      )
      label.scale.set(1.1, 1.1, 1)
      label.position.set(sm.visibleSize().w * 0.4, targetY, 0.5)
      label.renderOrder = 10
      sm.scene.add(label)
      rows.push(root)
      burst(sm.scene, new THREE.Vector3(0, targetY, 0.5), { count: 18, speed: 2.4, life: 0.6, size: 0.16 })
      nextRow = null
      busy = false

      if (rows.length >= targetRows) {
        // 堆到顶，放烟花
        cheer()
        speak(`数到 ${toChinese(targetRows * 10)} 啦，真棒！`)
        disposeCelebration = celebrate(sm.scene, { waves: 3 })
        later(() => {
          if (nextRound()) setupRound()
          else emit('finish', stars.value)
        }, 2200)
      } else {
        later(spawnNextRow, 400)
      }
    }
  })
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0xc9b8ff, cameraZ: 12 })
  sm.onPick = onPick
  start()
  setupRound()
})

onBeforeUnmount(() => {
  clearLater()
  stopSpeak()
  disposeCelebration?.()
  sm?.dispose()
})
</script>

<template>
  <div class="tens-game">
    <div ref="container" class="scene-container"></div>
    <div class="tens-hud anim-pop" :key="current">{{ current }}</div>
    <div v-if="hint" class="game-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.tens-game {
  position: absolute;
  inset: 0;
}
.tens-hud {
  position: absolute;
  top: max(100px, calc(env(safe-area-inset-top) + 92px));
  right: max(20px, env(safe-area-inset-right));
  z-index: 15;
  min-width: 84px;
  padding: 6px 20px;
  text-align: center;
  font-size: clamp(40px, 7vw, 64px);
  color: var(--white);
  background: var(--purple);
  border: 5px solid var(--white);
  border-radius: 26px;
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.15);
}
.game-hint {
  position: absolute;
  bottom: max(24px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  background: rgba(255, 255, 255, 0.92);
  border: 4px solid var(--purple);
  border-radius: 999px;
  padding: 10px 26px;
  font-size: clamp(17px, 2.6vw, 24px);
  color: var(--brown);
  white-space: nowrap;
  animation: bounce-in 0.5s both;
}
</style>
