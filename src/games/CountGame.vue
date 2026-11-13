<script setup>
// 数一数：点一个数一个。小数逐个点数，大数先点整捆（十个十个数）再点零散
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { removeAndDispose } from '@/three/dispose'
import { makeEmojiSprite, makeBundle, makeGround, makeCloud } from '@/three/objects'
import { plainNumberTexture } from '@/three/textures'
import { burst, celebrate } from '@/three/particles'
import { tween, Ease } from '@/utils/tween'
import { later, clearLater } from '@/utils/timers'
import { speak, stopSpeak } from '@/utils/speech'
import { ding, cheer, wrong } from '@/utils/sound'
import { getStage } from '@/utils/stages'
import { randomInt, toChinese } from '@/utils/numbers'
import { useGameRound } from '@/composables/useGameRound'

const props = defineProps({
  stageId: { type: Number, required: true },
  emojis: { type: Array, default: () => ['🍎', '🍊', '🍓', '🍌', '🍇', '🍑', '🥝', '🍒'] }
})
const emit = defineEmits(['round', 'finish'])

const stage = getStage(props.stageId)
const { round, stars, start, nextRound } = useGameRound(5)
const EMOJIS = props.emojis

const container = ref(null)
const countedDisplay = ref(0)
const hint = ref('')

let sm = null
let items = [] // { root, counted, type: 'single'|'bundle', value }
let target = 0
let counted = 0
let busy = false
let disposeCelebration = null

function pickTarget() {
  const [min, max] = stage.range
  return randomInt(Math.max(1, min), max)
}

function clearItems() {
  items.forEach((it) => removeAndDispose(sm.scene, it.root))
  items = []
  sm.pickables = []
  disposeCelebration?.()
}

function addLabel(obj, n, offsetY = 0.9) {
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: plainNumberTexture(n, { fg: '#FF6B81' }), transparent: true, depthTest: false })
  )
  label.scale.set(0.9, 0.9, 1)
  label.position.set(0, offsetY, 0.3)
  label.renderOrder = 10
  obj.add(label)
  label.scale.set(0.1, 0.1, 1)
  tween(label.scale, { x: 0.9, y: 0.9 }, { duration: 350, ease: Ease.outBack })
}

function gridPositions(n, w, h, cx = 0, cy = 0) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * (w / Math.max(h, 0.1)))))
  const rows = Math.max(1, Math.ceil(n / cols))
  const sx = w / (cols + 0.5)
  const sy = h / (rows + 0.5)
  const pos = []
  for (let i = 0; i < n; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    pos.push([cx - w / 2 + sx * (c + 0.75), cy + h / 2 - sy * (r + 0.75)])
  }
  return { pos, cell: Math.min(sx, sy) }
}

function setupRound() {
  clearItems()
  busy = false
  counted = 0
  countedDisplay.value = 0
  target = pickTarget()
  emit('round', round.value)

  const { w, h } = sm.visibleSize()
  const playW = w * 0.92
  const playH = h * 0.62
  const cy = -h * 0.06

  if (target <= 20) {
    // 逐个点数
    hint.value = '点一下水果，我们一起数！'
    speak('点一下水果，我们一起数吧')
    const emoji = EMOJIS[randomInt(0, EMOJIS.length - 1)]
    const { pos, cell } = gridPositions(target, playW, playH, 0, cy)
    const size = Math.min(1.4, cell * 0.82)
    pos.forEach(([x, y], i) => {
      const s = makeEmojiSprite(emoji, size)
      s.position.set(x, y, 0)
      s.userData.pickRoot = s
      s.scale.set(0.01, 0.01, 1)
      tween(s.scale, { x: size, y: size }, { duration: 400, delay: i * 45, ease: Ease.outBack })
      sm.scene.add(s)
      items.push({ root: s, counted: false, type: 'single', value: 1, size })
      sm.pickables.push(s)
    })
  } else {
    // 大数：整捆 + 零散
    hint.value = '先点大捆（一捆是 10），再点零散的！'
    speak('先数大捆，一捆是十个，再数零散的')
    const bundles = Math.floor(target / 10)
    const singles = target % 10
    const bArea = gridPositions(bundles, playW, playH * 0.58, 0, cy + playH * 0.18)
    bArea.pos.forEach(([x, y], i) => {
      const b = makeBundle()
      b.position.set(x, y - 0.4, 0)
      b.userData.pickRoot = b
      b.scale.setScalar(0.01)
      tween(b.scale, { x: 1, y: 1, z: 1 }, { duration: 400, delay: i * 60, ease: Ease.outBack })
      sm.scene.add(b)
      items.push({ root: b, counted: false, type: 'bundle', value: 10 })
      sm.pickables.push(b)
    })
    if (singles > 0) {
      const emoji = EMOJIS[randomInt(0, EMOJIS.length - 1)]
      const sArea = gridPositions(singles, playW * 0.6, playH * 0.3, 0, cy - playH * 0.32)
      const size = Math.min(1.1, sArea.cell * 0.8)
      sArea.pos.forEach(([x, y], i) => {
        const s = makeEmojiSprite(emoji, size)
        s.position.set(x, y, 0.2)
        s.userData.pickRoot = s
        s.scale.set(0.01, 0.01, 1)
        tween(s.scale, { x: size, y: size }, { duration: 400, delay: 300 + i * 60, ease: Ease.outBack })
        sm.scene.add(s)
        items.push({ root: s, counted: false, type: 'single', value: 1, size })
        sm.pickables.push(s)
      })
    }
  }
}

function onPick(root) {
  if (busy) return
  const item = items.find((it) => it.root === root)
  if (!item || item.counted) return

  // 大数模式下需先数整捆
  if (target > 20 && item.type === 'single' && items.some((it) => it.type === 'bundle' && !it.counted)) {
    wrong()
    speak('先数大捆哦，一捆是十个')
    return
  }

  item.counted = true
  counted += item.value
  countedDisplay.value = counted
  ding()
  speak(toChinese(counted), { interrupt: true })
  addLabel(root, counted, item.type === 'bundle' ? 1.2 : (item.size || 1.4) * 0.62 + 0.35)

  // 弹跳
  const oy = root.position.y
  tween(root.position, { y: oy + 0.5 }, {
    duration: 180,
    ease: Ease.outQuad,
    onComplete: () => tween(root.position, { y: oy }, { duration: 300, ease: Ease.outBounce })
  })

  if (counted >= target) {
    busy = true
    hint.value = ''
    cheer()
    speak(`一共是 ${toChinese(target)}，太棒了！`)
    disposeCelebration = celebrate(sm.scene, { waves: 2 })
    later(async () => {
      if (nextRound()) setupRound()
      else emit('finish', stars.value)
    }, 1900)
  }
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0xaee7ff, cameraZ: 12 })
  const { w, h } = sm.visibleSize()
  const ground = makeGround()
  ground.position.y = -h / 2 - 2.2
  sm.scene.add(ground)
  const cloud1 = makeCloud(1.1)
  cloud1.position.set(-w / 2 + 1.5, h / 2 - 0.8, -2)
  const cloud2 = makeCloud(0.8)
  cloud2.position.set(w / 2 - 1.2, h / 2 - 1.6, -2)
  sm.scene.add(cloud1, cloud2)
  sm.addUpdater((dt, t) => {
    cloud1.position.x += dt * 0.15
    if (cloud1.position.x > w / 2 + 2) cloud1.position.x = -w / 2 - 2
    cloud2.position.x -= dt * 0.1
    if (cloud2.position.x < -w / 2 - 2) cloud2.position.x = w / 2 + 2
  })
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
  <div class="count-game">
    <div ref="container" class="scene-container"></div>
    <div class="count-hud num-font anim-pop" :key="countedDisplay">{{ countedDisplay }}</div>
    <div v-if="hint" class="game-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.count-game {
  position: absolute;
  inset: 0;
}
.count-hud {
  position: absolute;
  top: max(100px, calc(env(safe-area-inset-top) + 92px));
  right: max(20px, env(safe-area-inset-right));
  z-index: 15;
  min-width: 84px;
  padding: 6px 20px;
  text-align: center;
  font-size: clamp(40px, 7vw, 64px);
  color: var(--brown);
  background: rgba(255, 255, 255, 0.92);
  border: 5px solid var(--coral);
  border-radius: 26px;
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.1);
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
