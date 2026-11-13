<script setup>
// 认数字：语音说一个数字，从悬浮的数字积木中点出正确的
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { removeAndDispose } from '@/three/dispose'
import { makeNumberBlock, makeCloud } from '@/three/objects'
import { burst } from '@/three/particles'
import { tween, Ease } from '@/utils/tween'
import { later, clearLater } from '@/utils/timers'
import { speak, stopSpeak } from '@/utils/speech'
import { ding, wrong, cheer } from '@/utils/sound'
import { getStage } from '@/utils/stages'
import { randomInt, makeDistractors, shuffle, toChinese } from '@/utils/numbers'
import { useGameRound } from '@/composables/useGameRound'

const props = defineProps({
  stageId: { type: Number, required: true },
  emojis: { type: Array, default: () => [] }
})
const emit = defineEmits(['round', 'finish'])

const stage = getStage(props.stageId)
const { round, stars, start, addMistake, nextRound } = useGameRound(5)
const COLORS = ['#FFD93D', '#FF9F43', '#FF6B81', '#54A0FF', '#7ED957', '#B983FF']

const container = ref(null)
const hint = ref('')

let sm = null
let blocks = []
let target = 0
let busy = false
let wobblers = []

function clearBlocks() {
  blocks.forEach((b) => removeAndDispose(sm.scene, b.group))
  blocks = []
  sm.pickables = []
  wobblers = []
}

function setupRound() {
  clearBlocks()
  busy = false
  emit('round', round.value)

  const [min, max] = stage.range
  target = randomInt(min, max)
  const optionCount = stage.id <= 2 ? 3 : 4
  const options = shuffle([target, ...makeDistractors(target, optionCount - 1, min, max)])

  hint.value = `点一点「${target}」在哪里`
  speak(`小朋友，点一点 ${toChinese(target)} 在哪里`)

  const { w, h } = sm.visibleSize()
  const playW = w * 0.86
  const playH = h * 0.52
  const cy = -h * 0.05
  const cols = options.length
  const sx = playW / cols
  const size = Math.min(2.2, sx * 0.62, playH * 0.55)

  options.forEach((n, i) => {
    const color = COLORS[i % COLORS.length]
    const group = makeNumberBlock(n, { color, size })
    const x = -playW / 2 + sx * (i + 0.5)
    const y = cy + (i % 2 === 0 ? playH * 0.12 : -playH * 0.12)
    group.position.set(x, y, 0)
    group.userData.pickRoot = group
    group.userData.value = n
    group.userData.baseY = y
    group.userData.phase = Math.random() * Math.PI * 2
    group.scale.setScalar(0.01)
    tween(group.scale, { x: 1, y: 1, z: 1 }, { duration: 450, delay: i * 120, ease: Ease.outBack })
    sm.scene.add(group)
    blocks.push({ group, value: n })
    sm.pickables.push(group)
  })

  // 悬浮摇摆动画
  wobblers = blocks.map((b) => b.group)
}

function onPick(root) {
  if (busy) return
  const block = blocks.find((b) => b.group === root)
  if (!block) return

  if (block.value === target) {
    busy = true
    hint.value = ''
    ding()
    speak(`对啦！这就是 ${toChinese(target)}`)
    burst(sm.scene, root.position.clone(), { count: 45, speed: 4.5, star: true })
    // 正确积木旋转放大庆祝
    tween(root.scale, { x: 1.4, y: 1.4, z: 1.4 }, { duration: 400, ease: Ease.outBack })
    tween(root.rotation, { y: root.rotation.y + Math.PI * 2 }, { duration: 800, ease: Ease.outQuad })
    later(() => {
      cheer()
      if (nextRound()) setupRound()
      else emit('finish', stars.value)
    }, 1300)
  } else {
    addMistake()
    wrong()
    speak('再找找看哦')
    // 错误积木摇头晃脑
    const g = root
    const rz = g.rotation.z
    tween(g.rotation, { z: rz + 0.35 }, {
      duration: 120,
      onComplete: () => tween(g.rotation, { z: rz - 0.35 }, {
        duration: 120,
        onComplete: () => tween(g.rotation, { z: rz }, { duration: 150 })
      })
    })
  }
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0x8fd9ff, cameraZ: 12 })
  const { w, h } = sm.visibleSize()
  const cloud1 = makeCloud(1.2)
  cloud1.position.set(-w / 2 + 1.8, h / 2 - 1, -3)
  const cloud2 = makeCloud(0.9)
  cloud2.position.set(w / 2 - 1.5, h / 2 - 2, -3)
  sm.scene.add(cloud1, cloud2)
  sm.addUpdater((dt, t) => {
    // 积木悬浮摇摆
    wobblers.forEach((g) => {
      g.position.y = g.userData.baseY + Math.sin(t * 1.6 + g.userData.phase) * 0.18
      g.rotation.y = Math.sin(t * 0.9 + g.userData.phase) * 0.25
    })
  })
  sm.onPick = onPick
  start()
  setupRound()
})

onBeforeUnmount(() => {
  clearLater()
  stopSpeak()
  sm?.dispose()
})
</script>

<template>
  <div class="recognize-game">
    <div ref="container" class="scene-container"></div>
    <div v-if="hint" class="game-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.recognize-game {
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
  border: 4px solid var(--orange);
  border-radius: 999px;
  padding: 10px 26px;
  font-size: clamp(18px, 2.8vw, 26px);
  color: var(--brown);
  white-space: nowrap;
  animation: bounce-in 0.5s both;
}
</style>
