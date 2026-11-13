<script setup>
// 数字儿歌：3D 律动场景 + TTS 分句跟读
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { makeEmojiSprite } from '@/three/objects'
import { tween, Ease } from '@/utils/tween'
import { speak, stopSpeak } from '@/utils/speech'
import { click, ding } from '@/utils/sound'
import { later, clearLater } from '@/utils/timers'
import { getStage } from '@/utils/stages'
import { toChinese } from '@/utils/numbers'

const route = useRoute()
const router = useRouter()
const stage = getStage(route.params.stageId)

// 各阶段儿歌歌词（数字相关）
const SONGS = {
  1: ['1 像铅笔细又长', '2 像小鸭水上漂', '3 像耳朵听声音', '4 像小旗迎风飘', '5 像钩子挂东西'],
  2: ['十一，十一，拍拍手', '十二，十二，点点头', '十三，十三，弯弯腰', '十四，十四，扭一扭', '十五，十五，跳一跳'],
  3: ['二十三十手拉手', '四十五十跟着走', '整十数字排好队', '一个一个数清楚', '我们都是好朋友'],
  4: ['六十七十爬高山', '八十九十看得远', '一百是最大', '十个十就是一百', '数字世界真奇妙']
}
const lines = SONGS[stage.id] || SONGS[1]

const container = ref(null)
const currentLine = ref(0)
const followMode = ref(false) // 跟读模式

let sm = null
let dancers = []
let playing = false
let cancelled = false
let singGen = 0 // 演唱代次，重唱时作废旧循环

function setupDancers() {
  const { w } = sm.visibleSize()
  const emojis = ['🐰', '🐻', '🐱', '🐶', '🐸']
  emojis.forEach((e, i) => {
    const s = makeEmojiSprite(e, 1.5)
    s.position.set((i - 2) * Math.min(2, w * 0.18), -1.2, 0)
    s.userData.phase = i * 0.7
    s.userData.baseY = -1.2
    sm.scene.add(s)
    dancers.push(s)
  })
}

async function sing() {
  if (playing) return
  playing = true
  const gen = ++singGen
  cancelled = false
  speak('我们一起来唱数字歌吧')
  await sleep(1800)
  if (gen !== singGen) return
  for (let i = 0; i < lines.length; i++) {
    if (cancelled || gen !== singGen) break
    currentLine.value = i
    jumpDancers()
    speak(lines[i], { rate: 0.8 })
    await sleep(2600)
    if (gen !== singGen) return
    if (followMode.value && !cancelled) {
      // 跟读：等待宝宝
      speak('轮到你啦，跟我读一遍', { rate: 0.9 })
      await sleep(3500)
      if (gen !== singGen) return
    }
  }
  if (!cancelled && gen === singGen) {
    speak('唱得真好听！')
    jumpDancers()
    playing = false
  }
}

function jumpDancers() {
  dancers.forEach((d, i) => {
    tween(d.position, { y: d.userData.baseY + 0.9 }, {
      duration: 260,
      delay: i * 70,
      ease: Ease.outQuad,
      onComplete: () => tween(d.position, { y: d.userData.baseY }, { duration: 380, ease: Ease.outBounce })
    })
  })
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function toggleFollow() {
  click()
  followMode.value = !followMode.value
}

function restart() {
  click()
  cancelled = true
  stopSpeak()
  playing = false
  later(sing, 300)
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0xffe0ec, cameraZ: 12 })
  setupDancers()
  sm.addUpdater((dt, t) => {
    dancers.forEach((d) => {
      d.position.y = d.userData.baseY + Math.abs(Math.sin(t * 2.2 + d.userData.phase)) * 0.25
      d.material.rotation = Math.sin(t * 2 + d.userData.phase) * 0.12
    })
  })
  sing()
})

onBeforeUnmount(() => {
  cancelled = true
  clearLater()
  stopSpeak()
  sm?.dispose()
})
</script>

<template>
  <div class="song-page">
    <div ref="container" class="scene-container"></div>
    <button class="btn-back" @click="router.push(`/stage/song`)">🏝️</button>
    <div class="page-title">🎵 数字儿歌 · {{ stage.name }}</div>

    <!-- 歌词展示 -->
    <div class="lyrics">
      <p
        v-for="(l, i) in lines"
        :key="i"
        class="lyric-line"
        :class="{ active: i === currentLine, sung: i < currentLine }"
      >
        {{ l }}
      </p>
    </div>

    <div class="song-controls">
      <button class="btn-big blue" @click="toggleFollow">
        {{ followMode ? '🎤 跟读：开' : '🎤 跟读：关' }}
      </button>
      <button class="btn-big" @click="restart">🔁 重新唱</button>
    </div>
  </div>
</template>

<style scoped>
.song-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.lyrics {
  position: absolute;
  top: max(84px, calc(env(safe-area-inset-top) + 76px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.88);
  border: 5px solid var(--coral);
  border-radius: 28px;
  padding: 18px 30px;
  box-shadow: 0 8px 0 rgba(0, 0, 0, 0.08);
  max-width: min(90vw, 560px);
}
.lyric-line {
  font-size: clamp(18px, 3vw, 26px);
  color: rgba(91, 58, 30, 0.45);
  transition: all 0.3s;
}
.lyric-line.active {
  color: var(--coral);
  transform: scale(1.12);
  transform-origin: left center;
}
.lyric-line.sung {
  color: rgba(91, 58, 30, 0.75);
}
.song-controls {
  position: absolute;
  bottom: max(26px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
