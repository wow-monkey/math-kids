<script setup>
// 比多少：两堆物品，点出「更多/更少」的那一堆
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { removeAndDispose } from '@/three/dispose'
import { makeEmojiSprite, makeBundle, makeGround, makeCloud } from '@/three/objects'
import { burst, celebrate } from '@/three/particles'
import { tween, Ease } from '@/utils/tween'
import { later, clearLater } from '@/utils/timers'
import { speak, stopSpeak } from '@/utils/speech'
import { ding, wrong, cheer } from '@/utils/sound'
import { getStage } from '@/utils/stages'
import { randomInt, toChinese } from '@/utils/numbers'
import { useGameRound } from '@/composables/useGameRound'

const props = defineProps({
  stageId: { type: Number, required: true },
  emojis: { type: Array, default: () => ['🍎', '🍊', '🍓', '🍌', '🍇', '🍑', '🥝', '🍒'] }
})
const emit = defineEmits(['round', 'finish'])

const stage = getStage(props.stageId)
const { round, stars, start, addMistake, nextRound } = useGameRound(4)

const container = ref(null)
const hint = ref('')

let sm = null
let sides = [] // { root, value }
let askMore = true
let busy = false
let disposeCelebration = null

/** 创建一堆物品（数量 n），返回 Group */
function makeHeap(n, cell) {
  const g = new THREE.Group()
  if (n <= 12) {
    const emoji = props.emojis[randomInt(0, props.emojis.length - 1)]
    const cols = n <= 5 ? n : Math.ceil(Math.sqrt(n))
    const size = Math.min(0.9, (cell * 0.72) / Math.max(2, cols))
    for (let i = 0; i < n; i++) {
      const s = makeEmojiSprite(emoji, size)
      const c = i % cols
      const r = Math.floor(i / cols)
      s.position.set((c - (cols - 1) / 2) * size * 1.1, -(r * size * 1.1), 0)
      g.add(s)
    }
  } else {
    const bundles = Math.floor(n / 10)
    const singles = n % 10
    const scale = Math.min(0.8, (cell * 0.6) / (bundles * 0.7 + 0.5))
    for (let i = 0; i < bundles; i++) {
      const b = makeBundle()
      b.position.set((i - (bundles - 1) / 2) * 0.62 * scale, singles > 0 ? 0.25 * scale : 0, 0)
      b.scale.setScalar(scale)
      g.add(b)
    }
    if (singles > 0) {
      const emoji = props.emojis[randomInt(0, props.emojis.length - 1)]
      for (let i = 0; i < singles; i++) {
        const s = makeEmojiSprite(emoji, 0.4 * scale + 0.2)
        s.position.set((i - (singles - 1) / 2) * 0.5, -0.55 * scale, 0.2)
        g.add(s)
      }
    }
  }
  return g
}

function clearSides() {
  sides.forEach((s) => removeAndDispose(sm.scene, s.root))
  sides = []
  sm.pickables = []
  disposeCelebration?.()
}

function setupRound() {
  clearSides()
  busy = false
  emit('round', round.value)

  const [min, max] = stage.range
  const a = randomInt(Math.max(1, min), max)
  let b = randomInt(Math.max(1, min), max)
  while (b === a) b = randomInt(Math.max(1, min), max)
  // 随机问「更多」还是「更少」
  askMore = Math.random() < 0.5

  hint.value = askMore ? '点一点更多的那一堆' : '点一点更少的那一堆'
  speak(askMore ? '哪一堆更多？点一点它' : '哪一堆更少？点一点它')

  const { w, h } = sm.visibleSize()
  const playW = w * 0.86
  const playH = h * 0.6
  const cy = -h * 0.02
  const cell = Math.min(playW * 0.42, playH * 0.8)

  const data = [{ value: a }, { value: b }]
  data.forEach((d, i) => {
    const g = makeHeap(d.value, cell)
    const x = (i === 0 ? -1 : 1) * playW * 0.27
    g.position.set(x, cy, 0)
    g.userData.pickRoot = g
    g.userData.value = d.value
    g.scale.setScalar(0.01)
    tween(g.scale, { x: 1, y: 1, z: 1 }, { duration: 400, delay: i * 140, ease: Ease.outBack })
    sm.scene.add(g)
    sides.push({ root: g, value: d.value })
    sm.pickables.push(g)
  })
}

function onPick(root) {
  if (busy) return
  const side = sides.find((s) => s.root === root)
  if (!side) return

  const other = sides.find((s) => s !== side)
  const correctValue = askMore ? Math.max(side.value, other.value) : Math.min(side.value, other.value)

  if (side.value === correctValue) {
    busy = true
    hint.value = ''
    ding()
    speak(`对啦！是 ${toChinese(side.value)}`)
    burst(sm.scene, root.position.clone(), { count: 35, speed: 4, star: true })
    tween(root.scale, { x: 1.2, y: 1.2, z: 1.2 }, {
      duration: 300,
      ease: Ease.outBack,
      onComplete: () => tween(root.scale, { x: 1, y: 1, z: 1 }, { duration: 300 })
    })
    later(() => {
      cheer()
      if (nextRound()) setupRound()
      else emit('finish', stars.value)
    }, 1200)
  } else {
    addMistake()
    wrong()
    speak('再看看哪一堆哦')
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
  sm = new SceneManager(container.value, { background: 0xb8ecff, cameraZ: 12 })
  const { w, h } = sm.visibleSize()
  const ground = makeGround()
  ground.position.y = -h / 2 - 2.4
  sm.scene.add(ground)
  const cloud1 = makeCloud(1)
  cloud1.position.set(-w / 2 + 1.5, h / 2 - 1, -2)
  sm.scene.add(cloud1)
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
  <div class="compare-game">
    <div ref="container" class="scene-container"></div>
    <div v-if="hint" class="game-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.compare-game {
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
  border: 4px solid var(--purple);
  border-radius: 999px;
  padding: 10px 26px;
  font-size: clamp(17px, 2.6vw, 24px);
  color: var(--brown);
  white-space: nowrap;
  animation: bounce-in 0.5s both;
}
</style>
