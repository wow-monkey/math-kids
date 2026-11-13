<script setup>
// 冒险游戏外壳：标题、回合进度、完成弹窗（星星 + 烟花），记录冒险进度
import { ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { recordAdvStars } from '@/utils/progress'
import { fanfare, click } from '@/utils/sound'
import { speak, stopSpeak } from '@/utils/speech'
import { later, clearLater } from '@/utils/timers'

const props = defineProps({
  theme: { type: String, required: true },
  stageId: { type: Number, required: true },
  levelIdx: { type: Number, required: true },
  levelCount: { type: Number, required: true },
  levelName: { type: String, required: true },
  levelEmoji: { type: String, required: true },
  totalRounds: { type: Number, default: 5 }
})

const emit = defineEmits(['complete'])

const router = useRouter()
const isLastLevel = props.levelIdx >= props.levelCount - 1
const showResult = ref(false)
const resultStars = ref(0)
const round = ref(1)

defineExpose({
  setRound(r) {
    round.value = r
  },
  finish(stars) {
    resultStars.value = stars
    showResult.value = true
    recordAdvStars(props.theme, props.stageId, props.levelIdx, stars)
    fanfare()
    later(() => speak(stars === 3 ? '太棒了，全部答对！' : '真不错，继续加油！'), 600)
  }
})

onBeforeUnmount(() => {
  clearLater()
  stopSpeak()
})

function retry() {
  click()
  showResult.value = false
  emit('complete', { action: 'retry' })
}

function goMap() {
  click()
  router.push(`/adventure/${props.theme}/${props.stageId}`)
}

function nextLevel() {
  click()
  if (isLastLevel) {
    goMap()
    return
  }
  router.push(`/adventure-play/${props.theme}/${props.stageId}/${props.levelIdx + 1}`)
}
</script>

<template>
  <div class="game-shell">
    <div class="sky-bg"></div>

    <button class="btn-back" @click="goMap">🗺️</button>
    <div class="page-title">{{ levelEmoji }} {{ levelName }}</div>

    <div class="round-dots">
      <span
        v-for="i in totalRounds"
        :key="i"
        class="dot"
        :class="{ active: i === round, passed: i < round }"
      ></span>
    </div>

    <slot></slot>

    <div v-if="showResult" class="overlay">
      <div class="overlay-card">
        <div class="result-emoji anim-wiggle">🎉</div>
        <div class="stars-row">
          <span v-for="i in 3" :key="i" class="star" :class="{ on: i <= resultStars }" :style="{ animationDelay: `${i * 0.25}s` }">⭐</span>
        </div>
        <p class="result-text">{{ resultStars === 3 ? '太厉害了！' : resultStars === 2 ? '真棒！' : '完成啦！' }}</p>
        <div class="result-btns">
          <button class="btn-big blue" @click="retry">🔄 再玩一次</button>
          <button class="btn-big" @click="nextLevel">➡️ 下一关</button>
        </div>
        <button class="btn-link" @click="goMap">回到地图</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.round-dots {
  position: absolute;
  top: max(80px, calc(env(safe-area-inset-top) + 72px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  gap: 10px;
}
.dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  border: 3px solid rgba(91, 58, 30, 0.25);
  transition: all 0.3s;
}
.dot.active {
  background: var(--sun);
  border-color: var(--orange);
  transform: scale(1.3);
}
.dot.passed {
  background: var(--grass);
  border-color: #4caf50;
}
.result-emoji {
  font-size: 72px;
  margin-bottom: 8px;
}
.result-text {
  margin: 14px 0 22px;
  font-size: 30px;
  color: var(--brown);
}
.result-btns {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}
.btn-link {
  margin-top: 18px;
  background: none;
  color: rgba(91, 58, 30, 0.6);
  font-size: 18px;
  text-decoration: underline;
}
</style>
