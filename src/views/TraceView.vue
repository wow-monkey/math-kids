<script setup>
// 描一描：Canvas 描红数字，沿虚线描，描完数字"活"过来（3D 庆祝）
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { makeNumberBlock } from '@/three/objects'
import { celebrate } from '@/three/particles'
import { tween, Ease } from '@/utils/tween'
import { speak, stopSpeak } from '@/utils/speech'
import { ding, fanfare, wrong } from '@/utils/sound'
import { getStage } from '@/utils/stages'
import { toChinese } from '@/utils/numbers'

const route = useRoute()
const router = useRouter()
const stage = getStage(route.params.stageId)

const canvas = ref(null)
const celebContainer = ref(null)
const current = ref(stage.range[0])
const progressPct = ref(0)
const success = ref(false)
const hint = ref('沿着灰色数字描一描')

let ctx = null
let W = 0
let H = 0
let drawing = false
let lastPt = null
// 描红判定：粗网格覆盖
let grid = null
let gridCols = 0
let gridRows = 0
let totalCells = 0
let coveredCells = 0
let celebSm = null
let disposed = false

const CELL = 14 // 网格单元像素大小
// 描红用标准数字字形：艺术中文字体的 0 会被画成空心方框，不适合教认读
const NUM_FONT = '"Baloo 2", "Nunito", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'

/** 把数字画成灰色引导，并采样引导网格 */
function setupNumber(n) {
  success.value = false
  celebSm?.dispose()
  celebSm = null
  progressPct.value = 0
  coveredCells = 0
  hint.value = '沿着灰色数字描一描'
  speak(`我们来描数字 ${toChinese(n)}`)

  ctx.clearRect(0, 0, W, H)

  // 引导数字（灰色粗体）
  const fontSize = Math.min(W, H) * (String(n).length > 2 ? 0.5 : 0.68)
  ctx.font = `bold ${fontSize}px ${NUM_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 采样引导像素（低分辨率离屏）
  const off = document.createElement('canvas')
  const scale = 0.25
  off.width = Math.floor(W * scale)
  off.height = Math.floor(H * scale)
  const octx = off.getContext('2d')
  octx.font = ctx.font.replace(`${fontSize}px`, `${fontSize * scale}px`)
  octx.textAlign = 'center'
  octx.textBaseline = 'middle'
  octx.fillStyle = '#000'
  octx.fillText(String(n), off.width / 2, off.height / 2)
  const img = octx.getImageData(0, 0, off.width, off.height).data

  gridCols = Math.ceil(W / CELL)
  gridRows = Math.ceil(H / CELL)
  grid = new Uint8Array(gridCols * gridRows)
  totalCells = 0
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      // 检查该网格内是否有引导像素
      const x0 = Math.floor((gx * CELL) * scale)
      const y0 = Math.floor((gy * CELL) * scale)
      const x1 = Math.floor(((gx + 1) * CELL) * scale)
      const y1 = Math.floor(((gy + 1) * CELL) * scale)
      let hit = false
      for (let y = y0; y < y1 && !hit; y++) {
        for (let x = x0; x < x1; x++) {
          if (img[(y * off.width + x) * 4 + 3] > 100) {
            hit = true
            break
          }
        }
      }
      if (hit) {
        grid[gy * gridCols + gx] = 1
        totalCells++
      }
    }
  }

  // 画引导：实心浅灰色数字（所见即所描，宝宝用蜡笔把它涂满）
  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.fillStyle = '#8a6d4b'
  ctx.fillText(String(n), W / 2, H / 2)
  ctx.restore()
}

function getPos(e) {
  const rect = canvas.value.getBoundingClientRect()
  const t = e.touches ? e.touches[0] : e
  return { x: t.clientX - rect.left, y: t.clientY - rect.top }
}

function onStart(e) {
  if (success.value) return
  e.preventDefault()
  drawing = true
  lastPt = getPos(e)
  paint(lastPt)
}

function onMove(e) {
  if (!drawing || success.value) return
  e.preventDefault()
  const pt = getPos(e)
  // 线段插值绘制，避免快速滑动断线
  const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y)
  const steps = Math.max(1, Math.floor(dist / 6))
  for (let i = 1; i <= steps; i++) {
    paint({
      x: lastPt.x + ((pt.x - lastPt.x) * i) / steps,
      y: lastPt.y + ((pt.y - lastPt.y) * i) / steps
    })
  }
  lastPt = pt
}

function onEnd() {
  drawing = false
  lastPt = null
}

function paint(pt) {
  // 画笔（蜡笔质感：橙色圆点）
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#FF9F43'
  ctx.beginPath()
  ctx.arc(pt.x, pt.y, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.arc(pt.x - 4, pt.y - 4, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 覆盖判定
  const gx = Math.floor(pt.x / CELL)
  const gy = Math.floor(pt.y / CELL)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = gx + dx
      const cy = gy + dy
      if (cx < 0 || cy < 0 || cx >= gridCols || cy >= gridRows) continue
      const idx = cy * gridCols + cx
      if (grid[idx] === 1) {
        grid[idx] = 2
        coveredCells++
      }
    }
  }
  const pct = totalCells ? Math.min(100, Math.round((coveredCells / totalCells) * 100)) : 100
  if (pct > progressPct.value) {
    progressPct.value = pct
    if (pct % 25 === 0) ding()
  }
  if (pct >= 72 && !success.value) {
    onSuccess()
  }
}

function onSuccess() {
  success.value = true
  hint.value = ''
  fanfare()
  speak(`哇，${toChinese(current.value)} 描好啦！`)
  nextTick(showCelebration)
}

/** 3D 庆祝：数字积木跳出来 + 烟花 */
function showCelebration() {
  if (!celebContainer.value || disposed) return
  // 复用前先释放旧场景，避免每次描成功都新建一个 WebGL 上下文
  celebSm?.dispose()
  celebSm = new SceneManager(celebContainer.value, { cameraZ: 8 })
  const block = makeNumberBlock(current.value, { color: '#FFD93D', size: 2.4 })
  block.position.set(0, -3, 0)
  block.scale.setScalar(0.01)
  celebSm.scene.add(block)
  tween(block.position, { y: 0 }, { duration: 700, ease: Ease.outBack })
  tween(block.scale, { x: 1, y: 1, z: 1 }, { duration: 700, ease: Ease.outBack })
  celebSm.addUpdater((dt, t) => {
    block.rotation.y = Math.sin(t * 1.5) * 0.4
  })
  celebrate(celebSm.scene, { waves: 3, area: 4 })
}

function changeNumber(delta) {
  const [min, max] = stage.range
  current.value = Math.min(max, Math.max(min, current.value + delta))
  setupNumber(current.value)
}

function retrace() {
  setupNumber(current.value)
}

function resizeCanvas() {
  if (!canvas.value) return
  const rect = canvas.value.parentElement.getBoundingClientRect()
  W = rect.width
  H = rect.height
  canvas.value.width = W
  canvas.value.height = H
  ctx = canvas.value.getContext('2d')
  setupNumber(current.value)
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  disposed = true
  stopSpeak()
  window.removeEventListener('resize', resizeCanvas)
  celebSm?.dispose()
})
</script>

<template>
  <div class="trace-page">
    <div class="sky-bg"></div>
    <button class="btn-back" @click="router.push(`/stage/trace`)">🏝️</button>
    <div class="page-title">✏️ 描一描 · {{ stage.name }}</div>

    <!-- 进度条 -->
    <div class="trace-progress">
      <div class="bar" :style="{ width: progressPct + '%' }"></div>
    </div>

    <!-- 描红画布 -->
    <div class="trace-board">
      <canvas
        ref="canvas"
        class="trace-canvas"
        @pointerdown="onStart"
        @pointermove="onMove"
        @pointerup="onEnd"
        @pointerleave="onEnd"
      ></canvas>
      <div v-if="hint && !success" class="trace-hint">{{ hint }}</div>
    </div>

    <!-- 控制 -->
    <div class="trace-controls">
      <button class="ctrl-btn" @click="changeNumber(-1)">⬅️</button>
      <div class="current-num num-font">{{ current }}</div>
      <button class="ctrl-btn" @click="changeNumber(1)">➡️</button>
      <button class="btn-big small" @click="retrace">🔁 重描</button>
    </div>

    <!-- 成功弹窗（3D 庆祝） -->
    <div v-if="success" class="overlay">
      <div class="overlay-card celeb-card">
        <div ref="celebContainer" class="celeb-scene"></div>
        <p class="celeb-text">{{ current }} 描好啦！</p>
        <div class="result-btns">
          <button class="btn-big blue" @click="retrace">🔁 再描一次</button>
          <button class="btn-big" @click="changeNumber(1)">➡️ 下一个</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trace-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.trace-progress {
  position: absolute;
  top: max(76px, calc(env(safe-area-inset-top) + 68px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  width: min(70vw, 420px);
  height: 22px;
  background: rgba(255, 255, 255, 0.75);
  border: 3px solid var(--grass);
  border-radius: 999px;
  overflow: hidden;
}
.bar {
  height: 100%;
  background: linear-gradient(90deg, var(--grass), var(--sun));
  border-radius: 999px;
  transition: width 0.2s;
}
.trace-board {
  position: absolute;
  top: max(110px, calc(env(safe-area-inset-top) + 100px));
  bottom: max(110px, calc(env(safe-area-inset-bottom) + 100px));
  left: 50%;
  transform: translateX(-50%);
  width: min(92vw, 640px);
  background: var(--cream);
  border: 6px solid var(--sun);
  border-radius: 32px;
  box-shadow: 0 10px 0 rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.trace-canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}
.trace-hint {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(84, 160, 255, 0.92);
  color: white;
  border-radius: 999px;
  padding: 8px 22px;
  font-size: clamp(15px, 2.4vw, 21px);
  white-space: nowrap;
  animation: bounce-in 0.5s both;
}
.trace-controls {
  position: absolute;
  bottom: max(24px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16px;
}
.ctrl-btn {
  width: 64px;
  height: 64px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--white);
  border: 5px solid var(--blue);
  font-size: 26px;
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.12);
  transition: transform 0.15s;
}
.ctrl-btn:active {
  transform: scale(0.9);
}
.current-num {
  min-width: 96px;
  flex: 0 0 auto;
  text-align: center;
  font-size: clamp(34px, 6vw, 52px);
  color: var(--brown);
  background: rgba(255, 255, 255, 0.92);
  border: 5px solid var(--sun);
  border-radius: 22px;
  padding: 2px 18px;
}
.btn-big.small {
  font-size: clamp(16px, 2.4vw, 22px);
  padding: 12px 22px;
  flex: 0 0 auto;
  white-space: nowrap;
}
.celeb-card {
  padding: 20px 36px 30px;
}
.celeb-scene {
  width: min(70vw, 360px);
  height: min(40vh, 280px);
  margin: 0 auto;
}
.celeb-text {
  font-size: clamp(26px, 4.5vw, 40px);
  color: var(--brown);
  margin: 8px 0 18px;
}
</style>
