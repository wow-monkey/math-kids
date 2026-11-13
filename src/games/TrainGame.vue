<script setup>
// 数字小火车：车厢缺数字，从站台上选正确的数字块装上去
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { removeAndDispose } from '@/three/dispose'
import { makeLocomotive, makeWagon, makeNumberBlock, makeGround, makeCloud } from '@/three/objects'
import { burst, celebrate } from '@/three/particles'
import { tween, Ease } from '@/utils/tween'
import { later, clearLater } from '@/utils/timers'
import { speak, stopSpeak } from '@/utils/speech'
import { ding, wrong, cheer, whistle, whoosh } from '@/utils/sound'
import { getStage } from '@/utils/stages'
import { randomInt, toChinese } from '@/utils/numbers'
import { useGameRound } from '@/composables/useGameRound'

const props = defineProps({ stageId: { type: Number, required: true } })
const emit = defineEmits(['round', 'finish'])

const stage = getStage(props.stageId)
const { round, stars, start, addMistake, nextRound } = useGameRound(4)
const WAGON_COLORS = ['#FFD93D', '#FF9F43', '#7ED957', '#B983FF']

const container = ref(null)
const hint = ref('')

let sm = null
let train = null // { loco, wagons: [{group, slot, value, filled}] }
let platformBlocks = [] // 站台数字块
let currentWagonIdx = 0
let busy = false
let disposeCelebration = null

function clearScene() {
  if (train) {
    removeAndDispose(sm.scene, train.loco)
    train.wagons.forEach((w) => removeAndDispose(sm.scene, w.group))
  }
  platformBlocks.forEach((b) => removeAndDispose(sm.scene, b.group))
  train = null
  platformBlocks = []
  sm.pickables = []
  disposeCelebration?.()
}

function setupRound() {
  clearScene()
  busy = false
  currentWagonIdx = 0
  emit('round', round.value)

  const [min, max] = stage.range
  const wagonCount = stage.id <= 2 ? 3 : 4
  // 生成连续数字序列（从范围内随机起点）
  const startN = randomInt(min, Math.max(min, max - wagonCount))
  const sequence = Array.from({ length: wagonCount }, (_, i) => startN + i)
  // 每回合随机挖空 2-3 节车厢的数字
  const holeCount = Math.min(wagonCount, stage.id <= 2 ? 2 : 3)
  const holeIdxs = [...Array(wagonCount).keys()].sort(() => Math.random() - 0.5).slice(0, holeCount).sort((a, b) => a - b)

  hint.value = '帮小火车把缺的数字装上去！'
  speak('小火车的数字不见了，帮它装上去吧')

  const { w, h } = sm.visibleSize()
  const trainY = -h * 0.16
  const wagonGap = 1.55
  const totalLen = 1.4 + wagonCount * wagonGap

  // 火车（车头朝右）
  train = { loco: makeLocomotive(), wagons: [] }
  const startX = -totalLen / 2 + 0.7
  train.loco.position.set(startX + wagonCount * wagonGap + 0.6, trainY, 0)
  train.loco.scale.setScalar(Math.min(1, h * 0.09))
  sm.scene.add(train.loco)

  sequence.forEach((n, i) => {
    const wagon = makeWagon(WAGON_COLORS[i % WAGON_COLORS.length])
    const x = startX + i * wagonGap
    wagon.position.set(x, trainY, 0)
    wagon.scale.setScalar(Math.min(1, h * 0.09))
    sm.scene.add(wagon)
    const w = { group: wagon, value: n, filled: !holeIdxs.includes(i), slot: null, x }
    if (holeIdxs.includes(i)) {
      // 空槽：虚线框效果（半透明灰色块）
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.72, 0.42),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
      )
      slot.position.set(0, 0.55, 0.25)
      wagon.add(slot)
      w.slot = slot
    } else {
      const block = makeNumberBlock(n, { size: 0.72 })
      block.position.set(0, 0.55, 0.25)
      wagon.add(block)
    }
    train.wagons.push(w)
  })

  // 站台数字块（挖空的数字 + 1 个干扰项）
  const missing = holeIdxs.map((i) => sequence[i])
  const distractor = randomInt(min, max)
  const blockValues = [...missing]
  if (!blockValues.includes(distractor)) blockValues.push(distractor)
  blockValues.sort(() => Math.random() - 0.5)

  const platY = -h * 0.42
  const bw = w * 0.8 / blockValues.length
  const blockSize = Math.min(1.3, bw * 0.55)
  blockValues.forEach((n, i) => {
    const block = makeNumberBlock(n, { size: blockSize, color: '#7fd4ff' })
    block.position.set(-w * 0.4 + bw * (i + 0.5), platY, 0.5)
    block.userData.pickRoot = block
    block.userData.value = n
    block.userData.blockSize = blockSize
    block.userData.baseY = platY
    block.userData.phase = Math.random() * Math.PI * 2
    block.scale.setScalar(0.01)
    tween(block.scale, { x: 1, y: 1, z: 1 }, { duration: 400, delay: 300 + i * 120, ease: Ease.outBack })
    sm.scene.add(block)
    platformBlocks.push({ group: block, value: n })
    sm.pickables.push(block)
  })
}

function nextEmptyWagon() {
  return train.wagons.find((w) => !w.filled)
}

function onPick(root) {
  if (busy) return
  const pb = platformBlocks.find((b) => b.group === root)
  if (!pb) return

  const wagon = nextEmptyWagon()
  if (!wagon) return

  if (pb.value === wagon.value) {
    busy = true
    ding()
    speak(`${toChinese(pb.value)}，装好啦！`)
    // 数字块飞入车厢槽位
    const targetPos = new THREE.Vector3()
    wagon.group.getWorldPosition(targetPos)
    targetPos.y += 0.55 * wagon.group.scale.y
    targetPos.z = 0.25
    const block = pb.group
    sm.scene.remove(block)
    block.userData.pickRoot = null
    platformBlocks = platformBlocks.filter((b) => b !== pb)
    sm.pickables = sm.pickables.filter((p) => p !== root)
    // 重新挂到车厢下
    const localPos = wagon.group.worldToLocal(targetPos.clone())
    block.position.copy(new THREE.Vector3(0, 3, 1.5))
    wagon.group.add(block)
    // 缩放到与车厢槽位匹配
    const fitScale = 0.72 / (block.userData.blockSize || 0.72)
    tween(block.position, { x: 0, y: 0.55, z: 0.25 }, {
      duration: 550,
      ease: Ease.outBack,
      onUpdate: () => {
        block.scale.setScalar(THREE.MathUtils.lerp(block.scale.x, fitScale, 0.2))
      },
      onComplete: () => {
        block.scale.setScalar(fitScale)
        if (wagon.slot) {
          wagon.group.remove(wagon.slot)
          wagon.slot = null
        }
        wagon.filled = true
        burst(sm.scene, targetPos, { count: 22, speed: 2.6, life: 0.7, size: 0.18 })
        busy = false
        if (train.wagons.every((w) => w.filled)) {
          // 全部装好，火车开走
          whistle()
          speak('小火车修好啦，出发！')
          cheer()
          disposeCelebration = celebrate(sm.scene, { waves: 2 })
          driveAway()
        }
      }
    })
  } else {
    addMistake()
    wrong()
    speak(`这不是 ${toChinese(wagon.value)} 哦，再看看`)
    tween(root.rotation, { z: 0.3 }, {
      duration: 110,
      onComplete: () => tween(root.rotation, { z: -0.3 }, {
        duration: 110,
        onComplete: () => tween(root.rotation, { z: 0 }, { duration: 130 })
      })
    })
  }
}

function driveAway() {
  const { w } = sm.visibleSize()
  const targets = [train.loco, ...train.wagons.map((wg) => wg.group)]
  whoosh()
  targets.forEach((g, i) => {
    tween(g.position, { x: g.position.x + w + 6 }, { duration: 1600, delay: i * 60, ease: Ease.inOutQuad })
  })
  later(() => {
    if (nextRound()) setupRound()
    else emit('finish', stars.value)
  }, 2100)
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0xaee7ff, cameraZ: 12 })
  const { w, h } = sm.visibleSize()
  const ground = makeGround(0x8fd97a)
  ground.position.y = -h * 0.3
  sm.scene.add(ground)
  // 铁轨
  const railMat = new THREE.MeshToonMaterial({ color: 0x8a6d4b })
  const rail = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 0.12, 0.5), railMat)
  rail.position.set(0, -h * 0.16 - 0.02, 0)
  sm.scene.add(rail)
  const cloud = makeCloud(1)
  cloud.position.set(-w / 2 + 2, h / 2 - 1, -3)
  sm.scene.add(cloud)
  sm.addUpdater((dt, t) => {
    // 站台数字块轻微浮动
    platformBlocks.forEach((b) => {
      b.group.position.y = b.group.userData.baseY + Math.sin(t * 1.8 + b.group.userData.phase) * 0.08
    })
    cloud.position.x += dt * 0.12
    if (cloud.position.x > w / 2 + 2) cloud.position.x = -w / 2 - 2
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
  <div class="train-game">
    <div ref="container" class="scene-container"></div>
    <div v-if="hint" class="game-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.train-game {
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
  border: 4px solid var(--coral);
  border-radius: 999px;
  padding: 10px 26px;
  font-size: clamp(17px, 2.6vw, 24px);
  color: var(--brown);
  white-space: nowrap;
  animation: bounce-in 0.5s both;
}
</style>
