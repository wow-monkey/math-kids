<script setup>
// 首页：玩具柜式学习模式选择
import { useRouter } from 'vue-router'
import { progress, setBgm } from '@/utils/progress'
import { setBgmEnabled } from '@/utils/bgm'
import { speak } from '@/utils/speech'
import { click } from '@/utils/sound'

const router = useRouter()

const modes = [
  { key: 'game', emoji: '🎮', name: '游戏互动', desc: '闯关小游戏', color: '#FF6B81', route: '/stage/game' },
  { key: 'lesson', emoji: '📖', name: '动画课堂', desc: '看动画学数字', color: '#54A0FF', route: '/stage/lesson' },
  { key: 'song', emoji: '🎵', name: '数字儿歌', desc: '唱儿歌磨耳朵', color: '#FF9F43', route: '/stage/song' },
  { key: 'trace', emoji: '✏️', name: '描一描', desc: '描红学写数字', color: '#7ED957', route: '/stage/trace' }
]

function go(mode) {
  click()
  speak(mode.name)
  router.push(mode.route)
}

function goAdventure() {
  click()
  speak('冒险故事')
  router.push('/adventure')
}

/** 背景音乐开关（原先模板绑定了未定义的 toggleBgm，按钮点了没反应） */
function toggleBgm() {
  const next = !progress.bgm
  setBgm(next)
  setBgmEnabled(next)
  click()
}

// 长按 2 秒进入家长模式
let pressTimer = null
function parentDown() {
  pressTimer = setTimeout(() => {
    click()
    router.push('/parent')
  }, 2000)
}
function parentUp() {
  clearTimeout(pressTimer)
}
</script>

<template>
  <div class="home">
    <div class="sky-bg"></div>

    <!-- 装饰 -->
    <div class="deco sun">🌞</div>
    <div class="deco cloud c1">☁️</div>
    <div class="deco cloud c2">☁️</div>
    <div class="deco cloud c3">☁️</div>

    <!-- 星星罐 -->
    <div class="star-jar anim-pop">
      <span class="jar-star">⭐</span>
      <span class="jar-count num-font">{{ progress.totalStars }}</span>
    </div>

    <!-- 家长入口（长按 2 秒） -->
    <button
      class="parent-gear"
      title="家长模式：长按 2 秒进入"
      @pointerdown="parentDown"
      @pointerup="parentUp"
      @pointerleave="parentUp"
    >
      ⚙️
    </button>

    <!-- 背景音乐开关 -->
    <button class="bgm-btn" :class="{ off: !progress.bgm }" @click.stop="toggleBgm">
      {{ progress.bgm ? '🔊' : '🔇' }}
    </button>

    <h1 class="title anim-bounce">数学小乐园</h1>
    <p class="subtitle">0 - 100 数字启蒙 · 选一个喜欢的玩法吧！</p>

    <!-- 冒险故事入口 -->
    <button class="adventure-entry anim-bounce" @click="goAdventure">
      <span class="adv-emoji">🐵</span>
      <span class="adv-text">
        <span class="adv-name">🗺️ 冒险故事</span>
        <span class="adv-desc">西游记 · 格林童话 · 20 个故事关卡</span>
      </span>
    </button>

    <!-- 模式卡片 -->
    <div class="mode-grid">
      <button
        v-for="(m, i) in modes"
        :key="m.key"
        class="mode-card anim-bounce"
        :style="{ '--card-color': m.color, animationDelay: `${0.15 + i * 0.12}s` }"
        @click="go(m)"
      >
        <span class="mode-emoji anim-float" :style="{ animationDelay: `${i * 0.4}s` }">{{ m.emoji }}</span>
        <span class="mode-name">{{ m.name }}</span>
        <span class="mode-desc">{{ m.desc }}</span>
      </button>
    </div>

    <div class="grass"></div>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.deco {
  position: absolute;
  z-index: 1;
  pointer-events: none;
}
.sun {
  top: 4%;
  right: 6%;
  font-size: clamp(56px, 10vw, 110px);
  animation: wiggle 6s ease-in-out infinite;
}
.cloud {
  font-size: clamp(40px, 7vw, 80px);
  opacity: 0.9;
  animation: floaty 5s ease-in-out infinite;
}
.c1 { top: 8%; left: 8%; }
.c2 { top: 20%; left: 40%; animation-delay: 1.2s; }
.c3 { top: 6%; left: 65%; animation-delay: 2.1s; }

.star-jar {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  left: max(16px, env(safe-area-inset-left));
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.92);
  border: 4px solid var(--sun);
  border-radius: 999px;
  padding: 8px 20px;
  font-size: clamp(20px, 3vw, 28px);
  color: var(--brown);
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.1);
}
.jar-star {
  font-size: clamp(24px, 3.5vw, 34px);
  animation: wiggle 2s ease-in-out infinite;
}

.parent-gear {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  right: max(16px, env(safe-area-inset-right));
  z-index: 20;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  border: 3px solid rgba(91, 58, 30, 0.25);
  font-size: 26px;
  opacity: 0.75;
  transition: transform 0.2s;
}
.parent-gear:active {
  transform: rotate(90deg) scale(0.92);
}

.bgm-btn {
  position: absolute;
  top: max(84px, calc(env(safe-area-inset-top) + 68px));
  right: max(16px, env(safe-area-inset-right));
  z-index: 20;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  border: 3px solid rgba(91, 58, 30, 0.25);
  font-size: 24px;
  opacity: 0.85;
  transition: transform 0.15s ease;
}
.bgm-btn:active {
  transform: scale(0.9);
}
.bgm-btn.off {
  filter: grayscale(1);
  opacity: 0.55;
}

.title {
  margin-top: clamp(64px, 12vh, 120px);
  z-index: 5;
  font-size: clamp(40px, 8vw, 76px);
  color: var(--brown);
  text-shadow: 0 4px 0 rgba(255, 255, 255, 0.8), 0 8px 18px rgba(0, 0, 0, 0.12);
  letter-spacing: 4px;
}
.subtitle {
  z-index: 5;
  margin-top: 10px;
  font-size: clamp(16px, 2.6vw, 24px);
  color: rgba(91, 58, 30, 0.75);
}

.adventure-entry {
  z-index: 5;
  margin-top: clamp(18px, 3vh, 30px);
  display: flex;
  align-items: center;
  gap: 16px;
  width: min(92vw, 620px);
  padding: 14px 22px;
  background: var(--cream);
  border: 5px solid var(--orange);
  border-radius: 26px;
  box-shadow: 0 10px 0 color-mix(in srgb, var(--orange) 40%, transparent), 0 14px 28px rgba(0, 0, 0, 0.12);
  transition: transform 0.15s ease;
}
.adventure-entry:active {
  transform: translateY(8px) scale(0.98);
}
.adv-emoji {
  font-size: clamp(44px, 7vw, 62px);
  line-height: 1;
}
.adv-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.adv-name {
  font-size: clamp(24px, 3.6vw, 34px);
  color: var(--brown);
  font-weight: 700;
}
.adv-desc {
  font-size: clamp(13px, 2vw, 17px);
  color: rgba(91, 58, 30, 0.65);
}

.mode-grid {
  z-index: 5;
  margin-top: clamp(20px, 4vh, 48px);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(14px, 2.5vw, 28px);
  width: min(92vw, 860px);
  padding-bottom: 90px;
}
@media (min-width: 900px) {
  .mode-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: clamp(18px, 3vh, 30px) 12px;
  background: var(--cream);
  border: 5px solid var(--card-color);
  border-radius: 32px;
  box-shadow: 0 10px 0 color-mix(in srgb, var(--card-color) 45%, transparent), 0 14px 28px rgba(0, 0, 0, 0.12);
  transition: transform 0.15s ease;
}
.mode-card:active {
  transform: translateY(8px) scale(0.97);
}
.mode-emoji {
  font-size: clamp(48px, 8vw, 84px);
  line-height: 1;
}
.mode-name {
  font-size: clamp(22px, 3.4vw, 32px);
  color: var(--brown);
}
.mode-desc {
  font-size: clamp(13px, 2vw, 17px);
  color: rgba(91, 58, 30, 0.6);
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

/* 手机横屏（矮视口）：压缩纵向间距，保证四个玩法入口在一屏内可点 */
@media (max-height: 480px) and (orientation: landscape) {
  .title {
    margin-top: 54px;
    font-size: clamp(30px, 6vw, 42px);
    letter-spacing: 2px;
  }
  .subtitle {
    display: none;
  }
  .deco {
    display: none;
  }
  .star-jar {
    padding: 4px 14px;
    font-size: 17px;
  }
  .parent-gear,
  .bgm-btn {
    width: 44px;
    height: 44px;
    font-size: 19px;
  }
  .bgm-btn {
    top: max(64px, calc(env(safe-area-inset-top) + 52px));
  }
  .adventure-entry {
    margin-top: 8px;
    width: min(96vw, 780px);
    padding: 8px 18px;
    border-width: 3px;
    border-radius: 18px;
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.1);
  }
  .adv-emoji {
    font-size: 34px;
  }
  .adv-name {
    font-size: 20px;
  }
  .adv-desc {
    font-size: 12px;
  }
  .mode-grid {
    margin-top: 12px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    width: min(96vw, 900px);
    padding-bottom: 40px;
  }
  .mode-card {
    padding: 12px 8px;
    border-width: 3px;
    border-radius: 20px;
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.1);
  }
  .mode-emoji {
    font-size: 40px;
  }
  .mode-name {
    font-size: 17px;
  }
  .mode-desc {
    display: none;
  }
  .grass {
    height: 26px;
  }
}
</style>
