<script setup>
// 冒险故事闯关地图：主题的 10 个故事关卡路径
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStage } from '@/utils/stages'
import { getTheme } from '@/utils/adventures'
import { isAdvLevelUnlocked, advStarKey, progress } from '@/utils/progress'
import { speak } from '@/utils/speech'
import { click, wrong } from '@/utils/sound'

const route = useRoute()
const router = useRouter()
const theme = computed(() => getTheme(route.params.theme))
const stage = computed(() => getStage(route.params.stageId))

function play(idx) {
  if (!isAdvLevelUnlocked(theme.value.id, stage.value.id, idx)) {
    wrong()
    speak('先通过上一关哦')
    return
  }
  click()
  router.push(`/adventure-play/${theme.value.id}/${stage.value.id}/${idx}`)
}

function starsOf(idx) {
  return progress.stars[advStarKey(theme.value.id, stage.value.id, idx)] || 0
}
</script>

<template>
  <div class="adv-map">
    <div class="sky-bg"></div>
    <button class="btn-back" @click="router.push(`/adventure/${theme.id}`)">🏝️</button>
    <h2 class="page-title">{{ theme.emoji }} {{ theme.name }} · 冒险地图</h2>

    <div class="path scroll-area">
      <div
        v-for="(lv, i) in theme.levels"
        :key="i"
        class="node-wrap"
        :style="{ animationDelay: `${i * 0.1}s` }"
      >
        <div v-if="i > 0" class="connector" :class="{ on: isAdvLevelUnlocked(theme.id, stage.id, i) }"></div>
        <button
          class="level-node anim-bounce"
          :class="{ locked: !isAdvLevelUnlocked(theme.id, stage.id, i) }"
          :style="{ '--node-color': theme.color, animationDelay: `${i * 0.1}s` }"
          @click="play(i)"
        >
          <span class="node-emoji">{{ isAdvLevelUnlocked(theme.id, stage.id, i) ? lv.emoji : '🔒' }}</span>
          <span class="node-name">{{ lv.name }}</span>
          <span class="node-stars">
            <template v-for="k in 3" :key="k">{{ starsOf(i) >= k ? '⭐' : '☆' }}</template>
          </span>
        </button>
      </div>
    </div>

    <div class="grass"></div>
  </div>
</template>

<style scoped>
.adv-map {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.path {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 2vw, 22px);
  padding: 110px 24px 100px;
}
.node-wrap {
  display: flex;
  align-items: center;
}
.connector {
  width: clamp(18px, 2.5vw, 40px);
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.5);
  margin-right: clamp(10px, 2vw, 22px);
}
.connector.on {
  background: var(--sun);
}
.level-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: clamp(120px, 18vw, 190px);
  padding: clamp(16px, 2.5vh, 26px) 10px;
  background: var(--cream);
  border: 5px solid var(--node-color);
  border-radius: 30px;
  box-shadow: 0 9px 0 color-mix(in srgb, var(--node-color) 40%, transparent), 0 12px 24px rgba(0, 0, 0, 0.12);
  transition: transform 0.15s ease;
}
.level-node:active {
  transform: translateY(7px) scale(0.97);
}
.level-node.locked {
  filter: grayscale(0.65);
  opacity: 0.85;
}
.node-emoji {
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1;
  animation: floaty 3s ease-in-out infinite;
}
.node-name {
  font-size: clamp(17px, 2.4vw, 24px);
  color: var(--brown);
}
.node-stars {
  font-size: clamp(14px, 2vw, 18px);
  letter-spacing: 2px;
}
.grass {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: clamp(40px, 8vh, 90px);
  background: var(--grass);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  z-index: 2;
}
</style>
