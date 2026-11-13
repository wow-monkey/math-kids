<script setup>
// 按顺序：把数字积木按从小到大（或从大到小）依次点出来
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { removeAndDispose } from '@/three/dispose'
import { makeNumberBlock, makeCloud } from '@/three/objects'
import { burst, celebrate } from '@/three/particles'
import { tween, Ease } from '@/utils/tween'
import { later, clearLater } from '@/utils/timers'
import { speak, stopSpeak } from '@/utils/speech'
import { ding, wrong, cheer, click } from '@/utils/sound'
import { getStage } from '@/utils/stages'
import { randomInt, shuffle, toChinese } from '@/utils/numbers'
import { useGameRound } from '@/composables/useGameRound'

const props = defineProps({
  stageId: { type: Number, required: true },
  emojis: { type: Array, default: () => [] }
})
const emit = defineEmits(['round', 'finish'])

const stage = getStage(props.stageId)
const { round, stars, start, addMistake, nextRound } = useGameRound(4)
const COLORS = ['#FFD93D', '#FF9F43', '#FF6B81', '#54A0FF', '#7ED957']

const container = ref(null)
const hint = ref('')

let sm = null
let blocks = [] // { group, value, done }
let asc = true
let step = 0 // 当前该点第几个（从 0 开始）
let busy = false
let disposeCelebration = null

function clearBlocks() {
  blocks.forEach((b) => removeAndDispose(sm.scene, b.group))
  blocks = []
  sm.pickables = []
  disposeCelebration?.()
}

function setupRound() {
  clearBlocks()
  busy = false
  step = 0
  emit('round', round.value)

  const [min, max] = stage.range
  const count = stage.id <= 2 ? 3 : 4
  const startN = randomInt(Math.max(1, min), Math.max(min, max - count + 1))
  const values = Array.from({ length: count }, (_, i) => startN + i)
  const ordered = [...values]
  asc = Math.random() < 0.5
  const display = shuffle(values)

  hint.value = asc ? '按从小到大，依次点一点' : '按从大到小，依次点一点'
  speak(asc ? '按从小到大的顺序点一点' : '按从大到小的顺序点一点')

  const { w, h } = sm.visibleSize()
  const playW = w * 0.86
  const sx = playW / count
  const size = Math.min(2.2, sx * 0.62, h * 0.32)

  display.forEach((n, i) => {
    const group = makeNumberBlock(n, { color: COLORS[i % COLORS.length], size })
    const x = -playW / 2 + sx * (i + 0.5)
    const y = (i % 2 === 0 ? 0.8 : -0.8)
    group.position.set(x, y, 0)
    group.userData.pickRoot = group
    group.userData.value = n
    group.scale.setScalar(0.01)
    tween(group.scale, { x: 1, y: 1, z: 1 }, { duration: 420, delay: i * 110, ease: Ease.outBack })
    sm.scene.add(group)
    blocks.push({ group, value: n, done: false })
    sm.pickables.push(group)
  })

  // 保存有序目标
  blocks._ordered = asc ? ordered : [...ordered].reverse()
}

function onPick(root) {
  if (busy) return
  const block = blocks.find((b) => b.group === root && !b.done)
  if (!block) return

  const expected = blocks._ordered[step]
  if (block.value === expected) {
    click()
    block.done = true
    ding()
    speak(toChinese(block.value), { interrupt: true })
    burst(sm.scene, root.position.clone(), { count: 20, speed: 3, star: true })
    tween(root.scale, { x: 0.9, y: 0.9, z: 0.9 }, {
      duration: 250,
      ease: Ease.outQuad,
      onComplete: () => tween(root.scale, { x: 1, y: 1, z: 1 }, { duration: 300, ease: Ease.outBack })
    })
    step++
    if (step >= blocks._ordered.length) {
      busy = true
      hint.value = ''
      cheer()
      speak('顺序都排对啦，太棒了！')
      disposeCelebration = celebrate(sm.scene, { waves: 2 })
      later(() => {
        if (nextRound()) setupRound()
        else emit('finish', stars.value)
      }, 1800)
    }
  } else {
    addMistake()
    wrong()
    speak('想一想下一个该点谁')
    tween(root.position, { x: root.position.x + 0.2 }, {
      duration: 90,
      onComplete: () => tween(root.position, { x: root.position.x - 0.2 }, {
        duration: 90,
        onComplete: () => tween(root.position, { x: root.position.x }, { duration: 100 })
      })
    })
  }
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0xa8d8ff, cameraZ: 12 })
  const { w, h } = sm.visibleSize()
  const cloud1 = makeCloud(1.1)
  cloud1.position.set(-w / 2 + 1.5, h / 2 - 1, -3)
  const cloud2 = makeCloud(0.8)
  cloud2.position.set(w / 2 - 1.2, h / 2 - 1.8, -3)
  sm.scene.add(cloud1, cloud2)
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
  <div class="order-game">
    <div ref="container" class="scene-container"></div>
    <div v-if="hint" class="game-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.order-game {
  position: absolute;
  inset: 0;
}
.game-hint {
  position: absolute;
  bottom: max(24px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  background: rgba(255, 255, 255, 0.92);
  border: 4px solid var(--blue);
  border-radius: 999px;
  padding: 10px 26px;
  font-size: clamp(17px, 2.6vw, 24px);
  color: var(--brown);
  white-space: nowrap;
  animation: bounce-in 0.5s both;
}
</style>
