<script setup>
// 冒险故事：选择数字范围（复用 4 个数字岛）
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { STAGES } from '@/utils/stages'
import { getTheme } from '@/utils/adventures'
import { speak } from '@/utils/speech'
import { click } from '@/utils/sound'

const route = useRoute()
const router = useRouter()
const theme = computed(() => getTheme(route.params.theme))

function go(stage) {
  click()
  speak(stage.name)
  router.push(`/adventure/${theme.value.id}/${stage.id}`)
}
</script>

<template>
  <div class="adv-stage">
    <div class="sky-bg"></div>
    <button class="btn-back" @click="router.push('/adventure')">🗺️</button>
    <h2 class="page-title">{{ theme.emoji }} {{ theme.name }} · 选一个数字小岛</h2>

    <div class="islands">
      <button
        v-for="(s, i) in STAGES"
        :key="s.id"
        class="island anim-bounce"
        :style="{ '--island-color': s.color, animationDelay: `${i * 0.12}s` }"
        @click="go(s)"
      >
        <span class="island-emoji">{{ s.emoji }}</span>
        <span class="island-name">{{ s.name }}</span>
        <span class="island-range">{{ s.desc }}</span>
      </button>
    </div>

    <div class="grass"></div>
  </div>
</template>

<style scoped>
.adv-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.islands {
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 3vw, 32px);
  width: min(92vw, 820px);
  margin-top: 40px;
}
@media (min-width: 900px) {
  .islands {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.island {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: clamp(20px, 3.5vh, 36px) 14px;
  background: var(--cream);
  border: 6px solid var(--island-color);
  border-radius: 40px 40px 46px 46px;
  box-shadow: 0 12px 0 color-mix(in srgb, var(--island-color) 40%, transparent), 0 16px 30px rgba(0, 0, 0, 0.12);
  transition: transform 0.15s ease;
}
.island:active {
  transform: translateY(8px) scale(0.97);
}
.island-emoji {
  font-size: clamp(52px, 9vw, 90px);
  line-height: 1;
  animation: floaty 3s ease-in-out infinite;
}
.island-name {
  font-size: clamp(24px, 3.6vw, 34px);
  color: var(--brown);
}
.island-range {
  font-size: clamp(15px, 2.2vw, 20px);
  color: rgba(91, 58, 30, 0.65);
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
