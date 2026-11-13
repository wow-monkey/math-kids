<script setup>
// 泡泡乐园：海底泡泡上升，点破语音指定的数字泡泡
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { removeAndDispose } from '@/three/dispose'
import { plainNumberTexture } from '@/three/textures'
import { burst } from '@/three/particles'
import { tween, Ease } from '@/utils/tween'
import { later, clearLater } from '@/utils/timers'
import { speak, stopSpeak } from '@/utils/speech'
import { pop, wrong, cheer } from '@/utils/sound'
import { getStage } from '@/utils/stages'
import { randomInt, makeDistractors, toChinese } from '@/utils/numbers'
import { useGameRound } from '@/composables/useGameRound'

const props = defineProps({ stageId: { type: Number, required: true } })
const emit = defineEmits(['round', 'finish'])

const stage = getStage(props.stageId)
const { round, stars, start, addMistake, nextRound } = useGameRound(5)
const BUBBLE_COLORS = ['#7fd4ff', '#b3e5ff', '#a5f3e3', '#ffd6e8', '#fff3b0']

const container = ref(null)
const hint = ref('')

let sm = null
let bubbles = [] // { group, value, speed, sway, phase }
let target = 0
let busy = false
let spawnTimer = 0
let fishes = []

function makeBubble(n, radius) {
  const g = new THREE.Group()
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 24),
    new THREE.MeshPhongMaterial({
      color: BUBBLE_COLORS[randomInt(0, BUBBLE_COLORS.length - 1)],
      transparent: true,
      opacity: 0.42,
      shininess: 120,
      specular: 0xffffff
    })
  )
  // 高光
  const shine = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.18, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
  )
  shine.position.set(-radius * 0.35, radius * 0.35, radius * 0.6)
  // 数字
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: plainNumberTexture(n, { fg: '#1B4B7A', stroke: 'rgba(255,255,255,0.9)' }),
      transparent: true,
      depthTest: false
    })
  )
  label.scale.set(radius * 1.3, radius * 1.3, 1)
  label.renderOrder = 5
  g.add(sphere, shine, label)
  return g
}

function makeFish(emoji) {
  const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(emojiCanvas(emoji)), transparent: true })
  const s = new THREE.Sprite(mat)
  return s
}

function emojiCanvas(emoji) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  ctx.font = '100px "Segoe UI Emoji", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, 64, 70)
  return c
}

function clearBubbles() {
  bubbles.forEach((b) => removeAndDispose(sm.scene, b.group))
  bubbles = []
  sm.pickables = []
}

function spawnSet() {
  clearBubbles()
  const [min, max] = stage.range
  target = randomInt(min, max)
  emit('round', round.value)
  const count = stage.id <= 2 ? 4 : 5
  const options = [target, ...makeDistractors(target, count - 1, min, max)]

  hint.value = `点破数字「${target}」的泡泡`
  speak(`点破数字 ${toChinese(target)} 的泡泡`)

  const { w, h } = sm.visibleSize()
  const radius = Math.min(1.15, (w * 0.85) / count / 2.4)
  options.forEach((n, i) => {
    const g = makeBubble(n, radius)
    const x = -w * 0.42 + (w * 0.84) * (i / Math.max(1, count - 1))
    g.position.set(x, -h / 2 - radius - Math.random() * 1.5, 0)
    g.userData.pickRoot = g
    sm.scene.add(g)
    bubbles.push({
      group: g,
      value: n,
      speed: 0.55 + Math.random() * 0.25,
      sway: 0.3 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      baseX: x,
      radius
    })
    sm.pickables.push(g)
  })
}

function onPick(root) {
  if (busy) return
  const b = bubbles.find((bb) => bb.group === root)
  if (!b) return

  if (b.value === target) {
    busy = true
    hint.value = ''
    pop()
    speak(`啵！${toChinese(target)}，答对啦！`)
    burst(sm.scene, root.position.clone(), { count: 26, speed: 3, life: 0.8, size: 0.2 })
    removeAndDispose(sm.scene, root)
    bubbles = bubbles.filter((bb) => bb !== b)
    sm.pickables = sm.pickables.filter((p) => p !== root)
    later(() => {
      cheer()
      if (nextRound()) spawnSet()
      else emit('finish', stars.value)
    }, 1100)
  } else {
    addMistake()
    wrong()
    speak('不是这个哦，再找找')
    // 泡泡晃动
    tween(root.scale, { x: 1.15, y: 1.15, z: 1.15 }, {
      duration: 130,
      onComplete: () => tween(root.scale, { x: 1, y: 1, z: 1 }, { duration: 200, ease: Ease.outElastic })
    })
  }
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0x3aa7e0, cameraZ: 12 })
  const { w, h } = sm.visibleSize()

  // 背景鱼群
  const fishEmojis = ['🐠', '🐟', '🐡', '🦀']
  for (let i = 0; i < 4; i++) {
    const f = makeFish(fishEmojis[i % fishEmojis.length])
    f.scale.set(0.9, 0.9, 1)
    f.position.set((Math.random() - 0.5) * w, (Math.random() - 0.5) * h * 0.6, -3)
    f.userData.speed = 0.3 + Math.random() * 0.4
    f.userData.dir = Math.random() > 0.5 ? 1 : -1
    sm.scene.add(f)
    fishes.push(f)
  }
  // 海草
  const weedMat = new THREE.MeshToonMaterial({ color: 0x2e8b57 })
  for (let i = 0; i < 5; i++) {
    const weed = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.6 + Math.random(), 6), weedMat)
    weed.position.set(-w / 2 + (i + 0.5) * (w / 5), -h / 2 + 0.5, -1.5)
    weed.rotation.z = (Math.random() - 0.5) * 0.3
    sm.scene.add(weed)
  }

  sm.addUpdater((dt, t) => {
    // 泡泡上升 + 摇摆
    const { h: vh } = sm.visibleSize()
    bubbles.forEach((b) => {
      b.group.position.y += b.speed * dt
      b.group.position.x = b.baseX + Math.sin(t * 1.2 + b.phase) * b.sway
      if (b.group.position.y > vh / 2 + b.radius + 0.5) {
        b.group.position.y = -vh / 2 - b.radius
      }
    })
    // 鱼游动
    fishes.forEach((f) => {
      f.position.x += f.userData.speed * f.userData.dir * dt
      if (f.position.x > w / 2 + 1) f.position.x = -w / 2 - 1
      if (f.position.x < -w / 2 - 1) f.position.x = w / 2 + 1
      f.material.rotation = f.userData.dir > 0 ? 0 : Math.PI
    })
  })

  sm.onPick = onPick
  start()
  spawnSet()
})

onBeforeUnmount(() => {
  clearLater()
  stopSpeak()
  sm?.dispose()
})
</script>

<template>
  <div class="bubble-game">
    <div ref="container" class="scene-container"></div>
    <div v-if="hint" class="game-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.bubble-game {
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
  font-size: clamp(18px, 2.8vw, 26px);
  color: var(--brown);
  white-space: nowrap;
  animation: bounce-in 0.5s both;
}
</style>
