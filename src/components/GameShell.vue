<script setup>
// 游戏外壳：标题、回合进度、完成弹窗（星星 + 烟花）
import { ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { GAME_META, getStage } from '@/utils/stages'
import { recordStars } from '@/utils/progress'
import { fanfare, click } from '@/utils/sound'
import { speak, stopSpeak } from '@/utils/speech'
import { later, clearLater } from '@/utils/timers'

const props = defineProps({
  stageId: { type: Number, required: true },
  levelIdx: { type: Number, required: true },
  gameType: { type: String, required: true },
  totalRounds: { type: Number, default: 5 }
})

const emit = defineEmits(['complete'])

const router = useRouter()
const meta = GAME_META[props.gameType]
const stage = getStage(props.stageId)
const isLastLevel = props.levelIdx >= stage.games.length - 1
const showResult = ref(false)
const resultStars = ref(0)
const round = ref(1)

defineExpose({
  /** 游戏内部更新回合进度 */
  setRound(r) {
    round.value = r
  },
  /** 游戏通关时调用 */
  finish(stars) {
    resultStars.value = stars
    showResult.value = true
    recordStars(props.stageId, props.levelIdx, stars)
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
  router.push(`/map/${props.stageId}`)
}

function nextLevel() {
  click()
  if (isLastLevel) {
    goMap()
    return
  }
  router.push(`/play/${props.stageId}/${props.levelIdx + 1}`)
}
</script>

<template>
  <div class="game-shell">
    <div class="sky-bg"></div>

    <button class="btn-back" @click="goMap">🗺️</button>
    <div class="page-title">{{ meta.emoji }} {{ meta.name }}</div>

    <!-- 回合进度 -->
    <div class="round-dots">
      <span
        v-for="i in totalRounds"
        :key="i"
        class="dot"
        :class="{ active: i === round, passed: i < round }"
      ></span>
    </div>

    <!-- 游戏 3D 区域 -->
    <slot></slot>

    <!-- 完成弹窗 -->
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
