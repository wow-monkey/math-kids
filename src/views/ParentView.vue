<script setup>
// 家长模式：进度查看与设置（长按齿轮 2 秒进入）
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { progress, resetAll, setVoice, setBgm, setSfxVolume, advStarKey } from '@/utils/progress'
import { STAGES, GAME_META } from '@/utils/stages'
import { ADVENTURE_THEMES } from '@/utils/adventures'
import { setVoiceEnabled } from '@/utils/speech'
import { setBgmEnabled } from '@/utils/bgm'
import { setSfxVolume as setSfxGain, click } from '@/utils/sound'

const router = useRouter()
const voice = ref(progress.voice)
const bgm = ref(progress.bgm)
const sfx = ref(progress.sfxVolume ?? 0.8)
const confirmReset = ref(false)

// 音效音量档位（儿童 App 用三档比滑块更好点）
const SFX_LEVELS = [
  { label: '小', v: 0.5 },
  { label: '中', v: 0.8 },
  { label: '大', v: 1 }
]

function toggleVoice() {
  voice.value = !voice.value
  setVoice(voice.value)
  setVoiceEnabled(voice.value)
  click()
}

function toggleBgm() {
  bgm.value = !bgm.value
  setBgm(bgm.value)
  setBgmEnabled(bgm.value)
  click()
}

function pickSfx(v) {
  sfx.value = v
  setSfxVolume(v)
  setSfxGain(v)
  click()
}

function doReset() {
  if (!confirmReset.value) {
    confirmReset.value = true
    setTimeout(() => (confirmReset.value = false), 3000)
    return
  }
  resetAll()
  confirmReset.value = false
  click()
}
</script>

<template>
  <div class="parent-page scroll-area">
    <div class="sky-bg"></div>
    <button class="btn-back" @click="router.push('/')">🏠</button>
    <h2 class="page-title">家长模式</h2>

    <div class="panel">
      <!-- 设置 -->
      <section class="section">
        <h3>设置</h3>
        <div class="row">
          <span>语音引导</span>
          <button class="switch" :class="{ on: voice }" @click="toggleVoice">
            {{ voice ? '开' : '关' }}
          </button>
        </div>
        <div class="row">
          <span>背景音乐</span>
          <button class="switch" :class="{ on: bgm }" @click="toggleBgm">
            {{ bgm ? '开' : '关' }}
          </button>
        </div>
        <div class="row">
          <span>音效音量</span>
          <div class="seg">
            <button
              v-for="lv in SFX_LEVELS"
              :key="lv.v"
              class="seg-btn"
              :class="{ on: Math.abs(sfx - lv.v) < 0.01 }"
              @click="pickSfx(lv.v)"
            >
              {{ lv.label }}
            </button>
          </div>
        </div>
        <div class="row">
          <span>重置全部进度</span>
          <button class="btn-small" :class="{ danger: confirmReset }" @click="doReset">
            {{ confirmReset ? '再点一次确认' : '重置' }}
          </button>
        </div>
      </section>

      <!-- 进度 -->
      <section class="section">
        <h3>学习进度（共 {{ progress.totalStars }} ⭐）</h3>
        <div v-for="s in STAGES" :key="s.id" class="stage-block">
          <div class="stage-head">
            <span>{{ s.emoji }} {{ s.name }}（{{ s.desc }}）</span>
          </div>
          <div class="levels">
            <div v-for="(g, i) in s.games" :key="i" class="level-item">
              <span class="lv-name">{{ GAME_META[g].emoji }} {{ GAME_META[g].name }}</span>
              <span class="lv-stars">
                <template v-for="k in 3" :key="k">
                  {{ (progress.stars[`${s.id}-${i}`] || 0) >= k ? '⭐' : '☆' }}
                </template>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 冒险故事进度 -->
      <section class="section">
        <h3>冒险故事进度</h3>
        <div v-for="t in ADVENTURE_THEMES" :key="t.id" class="stage-block">
          <div class="stage-head">{{ t.emoji }} {{ t.name }}</div>
          <div v-for="s in STAGES" :key="s.id" class="sub-stage">
            <div class="sub-head">{{ s.emoji }} {{ s.name }}（{{ s.desc }}）</div>
            <div class="levels">
              <div v-for="(lv, i) in t.levels" :key="i" class="level-item">
                <span class="lv-name">{{ lv.emoji }} {{ lv.name }}</span>
                <span class="lv-stars">
                  <template v-for="k in 3" :key="k">
                    {{ (progress.stars[advStarKey(t.id, s.id, i)] || 0) >= k ? '⭐' : '☆' }}
                  </template>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.parent-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}
.panel {
  position: relative;
  z-index: 5;
  width: min(92vw, 720px);
  margin: 90px auto 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.section {
  background: var(--cream);
  border: 5px solid var(--sun);
  border-radius: 28px;
  padding: 24px 28px;
  box-shadow: 0 8px 0 rgba(0, 0, 0, 0.08);
}
.section h3 {
  color: var(--brown);
  font-size: 24px;
  margin-bottom: 16px;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  font-size: 20px;
  color: var(--brown);
  border-bottom: 2px dashed rgba(91, 58, 30, 0.15);
}
.row:last-child {
  border-bottom: none;
}
.switch {
  min-width: 84px;
  padding: 8px 18px;
  border-radius: 999px;
  background: #ddd;
  color: #666;
  font-size: 18px;
}
.switch.on {
  background: var(--grass);
  color: white;
}
.seg {
  display: flex;
  gap: 6px;
}
.seg-btn {
  min-width: 52px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #ddd;
  color: #666;
  font-size: 17px;
}
.seg-btn.on {
  background: var(--orange);
  color: white;
}
.btn-small {
  padding: 8px 20px;
  border-radius: 999px;
  background: var(--blue);
  color: white;
  font-size: 18px;
}
.btn-small.danger {
  background: var(--coral);
  animation: wiggle 0.5s ease-in-out infinite;
}
.stage-block {
  margin-bottom: 18px;
}
.stage-head {
  font-size: 20px;
  color: var(--brown);
  margin-bottom: 8px;
}
.sub-stage {
  margin: 10px 0;
}
.sub-head {
  font-size: 16px;
  color: rgba(91, 58, 30, 0.7);
  margin: 6px 0;
}
.levels {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}
.level-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 14px;
  padding: 8px 14px;
  font-size: 16px;
  color: var(--brown);
}
.lv-stars {
  letter-spacing: 2px;
}
</style>
