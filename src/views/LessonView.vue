<script setup>
// 动画课堂：3D 动画演示认识数字（翻卡片、整捆小棒演示、点数示范）
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { removeAndDispose } from '@/three/dispose'
import { makeNumberBlock, makeEmojiSprite, makeBundle, makeCloud } from '@/three/objects'
import { burst } from '@/three/particles'
import { tween, Ease, wait } from '@/utils/tween'
import { speak, stopSpeak } from '@/utils/speech'
import { click, ding, cheer } from '@/utils/sound'
import { getStage } from '@/utils/stages'
import { toChinese, randomInt } from '@/utils/numbers'

const route = useRoute()
const router = useRouter()
const stage = getStage(route.params.stageId)
const EMOJIS = ['🍎', '🍊', '🍓', '🍌', '🍇', '🐤', '🐰', '🐸']

const container = ref(null)
const current = ref(stage.range[0])
const phase = ref('number') // number | quantity
const playing = ref(false)

let sm = null
let contentGroup = null
let disposers = []
let lessonGen = 0 // 课程代次，切换数字时作废旧播放

function clearContent() {
  disposers.forEach((d) => d())
  disposers = []
  if (contentGroup) {
    removeAndDispose(sm.scene, contentGroup)
  }
  contentGroup = new THREE.Group()
  sm.scene.add(contentGroup)
}

/** 展示数字大积木 */
function showNumber(n) {
  clearContent()
  phase.value = 'number'
  const { h } = sm.visibleSize()
  const size = Math.min(3.2, h * 0.42)
  const block = makeNumberBlock(n, { color: '#FFD93D', size })
  block.position.set(0, 0.2, 0)
  block.rotation.y = -Math.PI
  contentGroup.add(block)
  tween(block.rotation, { y: 0 }, { duration: 800, ease: Ease.outBack })
  speak(`这是数字 ${toChinese(n)}`)
}

/** 展示数量：小数字用 emoji 逐个点数，大数字用整捆 */
async function showQuantity(n, gen) {
  clearContent()
  phase.value = 'quantity'
  const { w, h } = sm.visibleSize()

  if (n === 0) {
    speak('零，就是什么都没有哦')
    const empty = makeEmojiSprite('🕳️', 2)
    contentGroup.add(empty)
    return
  }

  if (n <= 10) {
    const emoji = EMOJIS[randomInt(0, EMOJIS.length - 1)]
    const cols = n <= 5 ? n : Math.ceil(Math.sqrt(n * 1.6))
    const size = Math.min(1.3, (w * 0.85) / cols * 0.7)
    speak(`${toChinese(n)}，就是 ${toChinese(n)} 个，我们一起数`)
    for (let i = 0; i < n; i++) {
      if (gen !== lessonGen) return
      const s = makeEmojiSprite(emoji, size)
      const c = i % cols
      const r = Math.floor(i / cols)
      s.position.set(
        (c - (Math.min(n, cols) - 1) / 2) * size * 1.2,
        0.6 - r * size * 1.2,
        0
      )
      s.scale.set(0.01, 0.01, 1)
      contentGroup.add(s)
      await wait(420)
      if (gen !== lessonGen) return
      tween(s.scale, { x: size, y: size }, { duration: 300, ease: Ease.outBack })
      ding()
      speak(toChinese(i + 1), { interrupt: true, rate: 1 })
    }
    await wait(600)
    if (gen !== lessonGen) return
    speak(`一共是 ${toChinese(n)}`)
  } else {
    // 大数：整捆 + 零散
    const bundles = Math.floor(n / 10)
    const singles = n % 10
    speak(`${toChinese(n)}，里面有 ${toChinese(bundles)} 个十${singles ? `，还有 ${toChinese(singles)} 个一` : ''}`)
    const scale = Math.min(1.1, (w * 0.8) / (bundles * 0.8 + 1))
    for (let i = 0; i < bundles; i++) {
      if (gen !== lessonGen) return
      const b = makeBundle()
      b.position.set((i - (bundles - 1) / 2) * 0.75 * scale, singles ? 0.5 : 0, 0)
      b.scale.setScalar(0.01)
      contentGroup.add(b)
      await wait(380)
      if (gen !== lessonGen) return
      tween(b.scale, { x: scale, y: scale, z: scale }, { duration: 350, ease: Ease.outBack })
      ding()
      speak(toChinese((i + 1) * 10), { interrupt: true })
    }
    if (singles > 0) {
      const emoji = EMOJIS[randomInt(0, EMOJIS.length - 1)]
      for (let i = 0; i < singles; i++) {
        if (gen !== lessonGen) return
        const s = makeEmojiSprite(emoji, 0.7)
        s.position.set((i - (singles - 1) / 2) * 0.75, -0.9, 0.3)
        s.scale.set(0.01, 0.01, 1)
        contentGroup.add(s)
        await wait(300)
        if (gen !== lessonGen) return
        tween(s.scale, { x: 0.7, y: 0.7 }, { duration: 300, ease: Ease.outBack })
        ding()
      }
    }
    await wait(500)
    if (gen !== lessonGen) return
    speak(`合起来就是 ${toChinese(n)}`)
  }
  burst(sm.scene, new THREE.Vector3(0, 1.5, 0), { count: 24, speed: 3, star: true })
}

async function playLesson() {
  if (playing.value) return
  playing.value = true
  const gen = ++lessonGen
  showNumber(current.value)
  await wait(2200)
  if (gen !== lessonGen) return
  await showQuantity(current.value, gen)
  if (gen === lessonGen) playing.value = false
}

function changeNumber(delta) {
  if (playing.value) return
  click()
  stopSpeak()
  const [min, max] = stage.range
  current.value = Math.min(max, Math.max(min, current.value + delta))
  playLesson()
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0xfff3d6, cameraZ: 12 })
  const { w, h } = sm.visibleSize()
  const cloud = makeCloud(1)
  cloud.position.set(-w / 2 + 1.5, h / 2 - 1, -3)
  sm.scene.add(cloud)
  sm.addUpdater((dt) => {
    cloud.position.x += dt * 0.1
    if (cloud.position.x > w / 2 + 2) cloud.position.x = -w / 2 - 2
  })
  contentGroup = new THREE.Group()
  sm.scene.add(contentGroup)
  playLesson()
})

onBeforeUnmount(() => {
  stopSpeak()
  sm?.dispose()
})
</script>

<template>
  <div class="lesson-page">
    <div ref="container" class="scene-container"></div>
    <button class="btn-back" @click="router.push(`/stage/lesson`)">🏝️</button>
    <div class="page-title">📖 动画课堂 · {{ stage.name }}</div>

    <!-- 数字切换 -->
    <div class="lesson-controls">
      <button class="ctrl-btn" @click="changeNumber(-1)">⬅️</button>
      <div class="current-num num-font">{{ current }}</div>
      <button class="ctrl-btn" @click="changeNumber(1)">➡️</button>
    </div>

    <button class="btn-big replay" :disabled="playing" @click="playLesson">
      {{ playing ? '播放中…' : '🔁 再看一遍' }}
    </button>
  </div>
</template>

<style scoped>
.lesson-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.lesson-controls {
  position: absolute;
  bottom: max(28px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 20px;
}
.ctrl-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--white);
  border: 5px solid var(--blue);
  font-size: 30px;
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.12);
  transition: transform 0.15s;
}
.ctrl-btn:active {
  transform: scale(0.9);
}
.current-num {
  min-width: 110px;
  text-align: center;
  font-size: clamp(40px, 7vw, 62px);
  color: var(--brown);
  background: rgba(255, 255, 255, 0.92);
  border: 5px solid var(--sun);
  border-radius: 26px;
  padding: 4px 22px;
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.1);
}
.replay {
  position: absolute;
  bottom: max(120px, calc(env(safe-area-inset-bottom) + 100px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  font-size: clamp(18px, 2.6vw, 24px);
  padding: 12px 28px;
}
.replay:disabled {
  opacity: 0.6;
}
</style>
