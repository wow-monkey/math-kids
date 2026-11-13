<script setup>
// 数字配对：数字卡片 ↔ 数量（水果或整捆小棒）配对
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { SceneManager } from '@/three/SceneManager'
import { removeAndDispose } from '@/three/dispose'
import { makeNumberCard, makeEmojiSprite, makeBundle, makeGround } from '@/three/objects'
import { burst, celebrate } from '@/three/particles'
import { tween, Ease } from '@/utils/tween'
import { later, clearLater } from '@/utils/timers'
import { speak, stopSpeak } from '@/utils/speech'
import { ding, wrong, cheer, click } from '@/utils/sound'
import { getStage } from '@/utils/stages'
import { randomInt, sample, toChinese } from '@/utils/numbers'
import { useGameRound } from '@/composables/useGameRound'

const props = defineProps({
  stageId: { type: Number, required: true },
  emojis: { type: Array, default: () => ['🍎', '🍊', '🍓', '🍌', '🍇', '🐤', '🐰', '🐸'] }
})
const emit = defineEmits(['round', 'finish'])

const stage = getStage(props.stageId)
const { round, stars, start, addMistake, nextRound } = useGameRound(4)
const EMOJIS = props.emojis
const CARD_COLORS = ['#54A0FF', '#FF6B81', '#FF9F43', '#7ED957']

const container = ref(null)
const hint = ref('')

let sm = null
let cards = [] // 数字卡片
let quantities = [] // 数量组
let selectedCard = null
let matched = 0
let pairCount = 3
let busy = false
let disposeCelebration = null

function clearAll() {
  ;[...cards, ...quantities].forEach((o) => removeAndDispose(sm.scene, o.root))
  cards = []
  quantities = []
  sm.pickables = []
  selectedCard = null
  disposeCelebration?.()
}

/** 创建数量组：小数字用 emoji，大数字用整捆+零散 */
function makeQuantityGroup(n, cellSize) {
  const g = new THREE.Group()
  if (n <= 10) {
    const emoji = EMOJIS[randomInt(0, EMOJIS.length - 1)]
    const cols = n <= 4 ? n : Math.ceil(Math.sqrt(n))
    const size = Math.min(0.75, cellSize * 0.7 / Math.max(2, cols))
    for (let i = 0; i < n; i++) {
      const s = makeEmojiSprite(emoji, size)
      const c = i % cols
      const r = Math.floor(i / cols)
      s.position.set((c - (cols - 1) / 2) * size * 1.15, -(r * size * 1.15), 0)
      g.add(s)
    }
  } else {
    const bundles = Math.floor(n / 10)
    const singles = n % 10
    const scale = Math.min(1, cellSize * 0.75 / (bundles * 0.7 + 0.5))
    for (let i = 0; i < bundles; i++) {
      const b = makeBundle()
      b.position.set((i - (bundles - 1) / 2) * 0.62 * scale, singles > 0 ? 0.25 * scale : 0, 0)
      b.scale.setScalar(scale)
      g.add(b)
    }
    if (singles > 0) {
      const emoji = EMOJIS[randomInt(0, EMOJIS.length - 1)]
      for (let i = 0; i < singles; i++) {
        const s = makeEmojiSprite(emoji, 0.42 * scale + 0.2)
        s.position.set((i - (singles - 1) / 2) * 0.5, -0.55 * scale, 0.2)
        g.add(s)
      }
    }
  }
  return g
}

function setupRound() {
  clearAll()
  busy = false
  matched = 0
  emit('round', round.value)

  const [min, max] = stage.range
  pairCount = stage.id <= 2 ? 3 : 4
  const values = sample(Array.from({ length: max - min + 1 }, (_, i) => min + i).filter((n) => n > 0), pairCount)

  hint.value = '先点数字卡片，再点一样多的那组'
  speak('先点数字卡片，再点一样多的那组')

  const { w, h } = sm.visibleSize()
  const playW = w * 0.9
  const playH = h * 0.6
  const cy = -h * 0.04

  // 数字卡片在上排
  const cardW = playW / pairCount
  const cardSize = Math.min(1.7, cardW * 0.55)
  values.forEach((n, i) => {
    const card = makeNumberCard(n, { color: CARD_COLORS[i % CARD_COLORS.length], w: cardSize, h: cardSize })
    card.position.set(-playW / 2 + cardW * (i + 0.5), cy + playH * 0.28, 0)
    card.userData.pickRoot = card
    card.userData.value = n
    card.userData.baseScale = 1
    card.scale.set(0.01, 0.01, 1)
    tween(card.scale, { x: 1, y: 1 }, { duration: 400, delay: i * 100, ease: Ease.outBack })
    sm.scene.add(card)
    cards.push({ root: card, value: n, matched: false })
    sm.pickables.push(card)
  })

  // 数量组在下排（打乱顺序）
  const shuffled = [...values].sort(() => Math.random() - 0.5)
  const qW = playW / pairCount
  shuffled.forEach((n, i) => {
    const g = makeQuantityGroup(n, Math.min(qW, playH * 0.42))
    g.position.set(-playW / 2 + qW * (i + 0.5), cy - playH * 0.22, 0)
    g.userData.pickRoot = g
    g.userData.value = n
    g.scale.setScalar(0.01)
    tween(g.scale, { x: 1, y: 1, z: 1 }, { duration: 400, delay: 200 + i * 100, ease: Ease.outBack })
    sm.scene.add(g)
    quantities.push({ root: g, value: n, matched: false })
    sm.pickables.push(g)
  })
}

function onPick(root) {
  if (busy) return
  const card = cards.find((c) => c.root === root && !c.matched)
  const qty = quantities.find((q) => q.root === root && !q.matched)

  if (card) {
    click()
    speak(toChinese(card.value), { interrupt: true })
    if (selectedCard === card) {
      // 取消选中
      tween(card.root.scale, { x: 1, y: 1 }, { duration: 200 })
      selectedCard = null
      return
    }
    // 恢复上一张
    if (selectedCard) tween(selectedCard.root.scale, { x: 1, y: 1 }, { duration: 200 })
    selectedCard = card
    tween(card.root.scale, { x: 1.25, y: 1.25 }, { duration: 250, ease: Ease.outBack })
    return
  }

  if (qty) {
    if (!selectedCard) {
      speak('先点上面的数字卡片哦')
      return
    }
    if (qty.value === selectedCard.value) {
      // 配对成功
      busy = true
      const cardObj = selectedCard
      selectedCard = null
      cardObj.matched = true
      qty.matched = true
      matched++
      ding()
      speak(`对啦，${toChinese(qty.value)} 和 ${toChinese(qty.value)} 配成一对`)
      burst(sm.scene, qty.root.position.clone(), { count: 30, speed: 3.5, star: true })
      // 卡片飞向数量组并淡出
      tween(cardObj.root.position, { x: qty.root.position.x, y: qty.root.position.y + 0.6 }, {
        duration: 500,
        ease: Ease.inOutQuad,
        onComplete: () => {
          tween(cardObj.root.scale, { x: 0.6, y: 0.6 }, { duration: 250 })
        }
      })
      tween(qty.root.rotation, { z: 0.15 }, {
        duration: 150,
        onComplete: () => tween(qty.root.rotation, { z: 0 }, { duration: 300, ease: Ease.outElastic })
      })
      later(() => {
        busy = false
        if (matched >= pairCount) {
          cheer()
          speak('全部配对成功，太棒了！')
          disposeCelebration = celebrate(sm.scene, { waves: 2 })
          later(() => {
            if (nextRound()) setupRound()
            else emit('finish', stars.value)
          }, 1800)
        }
      }, 700)
    } else {
      addMistake()
      wrong()
      speak('数量不一样哦，再试试')
      const g = qty.root
      tween(g.position, { x: g.position.x + 0.2 }, {
        duration: 90,
        onComplete: () => tween(g.position, { x: g.position.x - 0.2 }, {
          duration: 90,
          onComplete: () => tween(g.position, { x: g.position.x }, { duration: 100 })
        })
      })
    }
  }
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0xb8ecff, cameraZ: 12 })
  const { h } = sm.visibleSize()
  const ground = makeGround(0x8fd97a)
  ground.position.y = -h / 2 - 2.5
  sm.scene.add(ground)
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
  <div class="match-game">
    <div ref="container" class="scene-container"></div>
    <div v-if="hint" class="game-hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.match-game {
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
