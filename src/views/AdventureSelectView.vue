<script setup>
// 冒险故事：选择主题（西游记 / 格林童话）
import { useRouter } from 'vue-router'
import { ADVENTURE_THEMES } from '@/utils/adventures'
import { speak } from '@/utils/speech'
import { click } from '@/utils/sound'

const router = useRouter()

function go(theme) {
  click()
  speak(theme.name)
  router.push(`/adventure/${theme.id}`)
}
</script>

<template>
  <div class="adv-select">
    <div class="sky-bg"></div>

    <!-- 漂浮氛围装饰 -->
    <span class="deco d1">☁️</span>
    <span class="deco d2">☁️</span>
    <span class="deco d3">✨</span>
    <span class="deco d4">🎈</span>
    <span class="deco d5">⭐</span>

    <button class="btn-back" @click="router.push('/')">🏠</button>
    <h2 class="page-title">🗺️ 冒险故事</h2>
    <p class="hint"><span class="anim-wiggle">👆 点一个主题，开始冒险吧！</span></p>

    <div class="themes">
      <!-- 包裹层做入场动画，卡片本体做 hover/active 交互（避免 transform 冲突） -->
      <div
        v-for="(t, i) in ADVENTURE_THEMES"
        :key="t.id"
        class="card-wrap"
        :class="i === 0 ? 'slide-left' : 'slide-right'"
      >
        <button
          class="theme-card"
          :style="{ '--theme-color': t.color }"
          @click="go(t)"
        >
          <span class="badge">{{ t.levels.length }} 关</span>
          <span class="theme-emoji anim-float">{{ t.emoji }}</span>
          <span class="theme-name">{{ t.name }}</span>
          <span class="theme-desc">{{ t.desc }}</span>
          <!-- 关卡预览 -->
          <span class="level-preview">
            <span v-for="(lv, k) in t.levels.slice(0, 5)" :key="k">{{ lv.emoji }}</span>
            <span class="more">…</span>
          </span>
          <span class="go-btn">出发 ➜</span>
        </button>
      </div>
    </div>

    <div class="grass"></div>
  </div>
</template>

<style scoped>
.adv-select {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 漂浮装饰 */
.deco {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  animation: floaty 5s ease-in-out infinite;
}
.d1 { top: 12%; left: 6%; font-size: clamp(40px, 6vw, 72px); }
.d2 { top: 20%; right: 8%; font-size: clamp(34px, 5vw, 60px); animation-delay: 1.2s; }
.d3 { bottom: 22%; left: 9%; font-size: clamp(28px, 4vw, 48px); animation-delay: 0.6s; }
.d4 { bottom: 26%; right: 9%; font-size: clamp(30px, 4.5vw, 52px); animation: wiggle 4s ease-in-out infinite; }
.d5 { top: 34%; left: 45%; font-size: clamp(24px, 3.5vw, 40px); animation-delay: 2s; }

/* 引导提示 */
.hint {
  position: absolute;
  top: calc(max(14px, env(safe-area-inset-top)) + 62px);
  left: 0;
  right: 0;
  text-align: center;
  z-index: 20;
}
.hint span {
  display: inline-block;
  font-size: clamp(15px, 2.4vw, 22px);
  color: var(--brown);
  background: rgba(255, 255, 255, 0.8);
  padding: 6px 22px;
  border-radius: 999px;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.08);
}

.themes {
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(20px, 4vw, 48px);
  width: min(92vw, 760px);
  margin-top: clamp(60px, 10vh, 100px);
}

/* 入场动画由全局 .anim-bounce 提供（与其他页面一致） */

.theme-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: clamp(26px, 4.5vh, 46px) 16px clamp(20px, 3.5vh, 34px);
  background: linear-gradient(165deg, var(--cream) 55%, color-mix(in srgb, var(--theme-color) 18%, var(--cream)));
  border: 6px solid var(--theme-color);
  border-radius: 40px;
  box-shadow: 0 12px 0 color-mix(in srgb, var(--theme-color) 40%, transparent), 0 16px 30px rgba(0, 0, 0, 0.12);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
/* hover：上浮 + 加深阴影 */
.theme-card:hover {
  transform: translateY(-10px) scale(1.03);
  box-shadow: 0 20px 0 color-mix(in srgb, var(--theme-color) 40%, transparent), 0 28px 44px rgba(0, 0, 0, 0.16);
}
/* active：按压下沉 */
.theme-card:active {
  transform: translateY(6px) scale(0.97);
  box-shadow: 0 4px 0 color-mix(in srgb, var(--theme-color) 40%, transparent), 0 8px 16px rgba(0, 0, 0, 0.12);
}
/* hover 光泽扫过 */
.theme-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: -80%;
  width: 60%;
  height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  transform: skewX(-20deg);
  transition: left 0.5s ease;
  pointer-events: none;
}
.theme-card:hover::after {
  left: 120%;
}

.badge {
  position: absolute;
  top: 14px;
  right: 14px;
  background: var(--sun);
  color: var(--brown);
  font-size: clamp(13px, 1.8vw, 16px);
  padding: 4px 12px;
  border-radius: 999px;
  border: 2px solid var(--white);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
}

.theme-emoji {
  font-size: clamp(64px, 11vw, 110px);
  line-height: 1;
}
/* hover 时大 emoji 摇摆 */
.theme-card:hover .theme-emoji {
  animation: wiggle 0.6s ease-in-out infinite;
}

.theme-name {
  font-size: clamp(26px, 4vw, 38px);
  color: var(--brown);
}
.theme-desc {
  font-size: clamp(14px, 2.1vw, 19px);
  color: rgba(91, 58, 30, 0.6);
}

.level-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: clamp(18px, 2.6vw, 26px);
  background: rgba(255, 255, 255, 0.65);
  padding: 6px 16px;
  border-radius: 999px;
  margin-top: 4px;
}
/* 小动物轮流跳动：此起彼伏 */
.level-preview > span {
  display: inline-block;
  animation: animal-hop 2.4s ease-in-out infinite;
}
.level-preview > span:nth-child(1) { animation-delay: 0s; }
.level-preview > span:nth-child(2) { animation-delay: 0.3s; }
.level-preview > span:nth-child(3) { animation-delay: 0.6s; }
.level-preview > span:nth-child(4) { animation-delay: 0.9s; }
.level-preview > span:nth-child(5) { animation-delay: 1.2s; }
.level-preview .more {
  color: rgba(91, 58, 30, 0.5);
  font-weight: 700;
  animation: none;
}
@keyframes animal-hop {
  0%, 55%, 100% { transform: translateY(0) scale(1); }
  65% { transform: translateY(-8px) scale(1.12); }
  75% { transform: translateY(0) scale(0.94); }
  85% { transform: translateY(-4px) scale(1.06); }
}

.go-btn {
  margin-top: 8px;
  padding: 8px 28px;
  background: var(--theme-color);
  color: var(--white);
  font-size: clamp(16px, 2.4vw, 22px);
  border-radius: 999px;
  box-shadow: 0 4px 0 color-mix(in srgb, var(--theme-color) 60%, black);
  transition: transform 0.15s ease;
}
.theme-card:hover .go-btn {
  transform: scale(1.08);
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
