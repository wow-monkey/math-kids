<script setup>
// 给数量：接收者头顶有个数字，从一堆物品里数出对应数量给它
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { removeAndDispose } from '@/three/dispose'
import { makeEmojiSprite, makeGround, makeCloud } from '@/three/objects'
import { plainNumberTexture } from '@/three/textures'
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
  emojis: { type: Array, default: () => ['🍎', '🍊', '🍓', '🍌', '🍇', '🍑', '🥝', '🍒'] },
  receiver: { type: String, default: '🧙' },
  receiverName: { type: String, default: '它' }
})
const emit = defineEmits(['round', 'finish'])

const stage = getStage(props.stageId)
const { round, stars, start, nextRound } = useGameRound(4)

const container = ref(null)
const hint = ref('')
const givenDisplay = ref(0)

let sm = null
let target = 0
let given = 0
let busy = false
let items = [] // { root }
let receiverObj = null
let disposeCelebration = null

function clearAll() {
  items.forEach((it) => removeAndDispose(sm.scene, it.root))
  items = []
  sm.pickables = []
  if (receiverObj) {
    removeAndDispose(sm.scene, receiverObj)
    receiverObj = null
  }
  disposeCelebration?.()
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
  clearAll()
  busy = false
  given = 0
  givenDisplay.value = 0
  emit('round', round.value)

  const [, max] = stage.range
  // 「给 N 个」适合小数量点数，大数阶段也控制在 20 以内
  target = randomInt(1, Math.min(20, max))
  const totalItems = target + 2 // 留两个「多出来」的干扰

  hint.value = `点 ${target} 个给它吧`
  speak(`${props.receiverName} 想要 ${toChinese(target)} 个，点一点给它`)

  const { w, h } = sm.visibleSize()
  const cy = -h * 0.06

  // 接收者 + 头顶数字
  receiverObj = new THREE.Group()
  const face = makeEmojiSprite(props.receiver, 2.2)
  face.position.set(0, 0, 0)
  receiverObj.add(face)
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: plainNumberTexture(target, { fg: '#FF6B81' }), transparent: true, depthTest: false })
  )
  label.scale.set(1.1, 1.1, 1)
  label.position.set(0, 1.8, 0.3)
  label.renderOrder = 10
  receiverObj.add(label)
  receiverObj.position.set(0, h * 0.26, 0)
  receiverObj.scale.setScalar(0.01)
  tween(receiverObj.scale, { x: 1, y: 1, z: 1 }, { duration: 400, ease: Ease.outBack })
  sm.scene.add(receiverObj)

  // 物品
  const emoji = props.emojis[randomInt(0, props.emojis.length - 1)]
  const { pos, cell } = gridPositions(totalItems, w * 0.9, h * 0.42, 0, cy - h * 0.18)
  const size = Math.min(1.1, cell * 0.8)
  pos.forEach(([x, y], i) => {
    const s = makeEmojiSprite(emoji, size)
    s.position.set(x, y, 0)
    s.userData.pickRoot = s
    s.scale.set(0.01, 0.01, 1)
    tween(s.scale, { x: size, y: size }, { duration: 380, delay: 200 + i * 50, ease: Ease.outBack })
    sm.scene.add(s)
    items.push({ root: s })
    sm.pickables.push(s)
  })
}

function onPick(root) {
  if (busy) return
  const item = items.find((it) => it.root === root)
  if (!item) return

  given++
  givenDisplay.value = given
  ding()
  speak(toChinese(given), { interrupt: true })

  // 物品飞向接收者
  const dest = receiverObj.position.clone()
  dest.y += 0.3
  tween(root.position, { x: dest.x, y: dest.y }, {
    duration: 350,
    ease: Ease.inQuad,
    onComplete: () => {
      removeAndDispose(sm.scene, root)
    }
  })
  tween(root.scale, { x: 0.4, y: 0.4 }, { duration: 350 })
  items = items.filter((it) => it.root !== root)
  sm.pickables = sm.pickables.filter((p) => p !== root)

  if (given >= target) {
    busy = true
    hint.value = ''
    cheer()
    speak(`给好啦，正好 ${toChinese(target)} 个，太棒了！`)
    burst(sm.scene, receiverObj.position.clone(), { count: 40, speed: 4.5, star: true })
    disposeCelebration = celebrate(sm.scene, { waves: 2 })
    later(() => {
      if (nextRound()) setupRound()
      else emit('finish', stars.value)
    }, 1800)
  }
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0xc9efff, cameraZ: 12 })
  const { h } = sm.visibleSize()
  const ground = makeGround(0x8fd97a)
  ground.position.y = -h / 2 - 2.3
  sm.scene.add(ground)
  const cloud = makeCloud(1)
  cloud.position.set(0, h / 2 - 1, -2)
  sm.scene.add(cloud)
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
  <div class="give-game">
    <div ref="container" class="scene-container"></div>
    <div class="give-hud anim-pop" :key="givenDisplay">{{ givenDisplay }}</div>
    <div v-if="hint" class="game-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.give-game {
  position: absolute;
  inset: 0;
}
.give-hud {
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
  border: 5px solid var(--purple);
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
  border: 4px solid var(--orange);
  border-radius: 999px;
  padding: 10px 26px;
  font-size: clamp(17px, 2.6vw, 24px);
  color: var(--brown);
  white-space: nowrap;
  animation: bounce-in 0.5s both;
}
</style>
