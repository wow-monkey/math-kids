// 背景音乐播放器：多首曲目按顺序轮流播放，播完自动切下一首，整体循环

import bgmTrack1 from '@/assets/audio/bgm.mp3'
import bgmTrack2 from '@/assets/audio/bgm2.mp3'
import { progress } from './progress'

// 播放列表（按顺序轮流）
const TRACKS = [bgmTrack1, bgmTrack2]

let audio = null
let index = 0

function ensureAudio() {
  if (!audio) {
    audio = new Audio()
    audio.volume = 0.3
    // 一首播完自动切下一首
    audio.addEventListener('ended', () => {
      index = (index + 1) % TRACKS.length
      playCurrent()
    })
  }
  return audio
}

function playCurrent() {
  const a = ensureAudio()
  a.src = TRACKS[index]
  a.loop = false
  a.play().catch(() => {
    /* 浏览器自动播放策略拦截时忽略，等用户交互后重试 */
  })
}

/** 开始播放（尊重开关状态） */
export function startBgm() {
  if (!progress.bgm) return
  const a = ensureAudio()
  if (!a.src) {
    playCurrent()
    return
  }
  // 从后台切回时续播当前曲目，不要从头开始
  a.play().catch(() => {
    /* 自动播放被拦截时忽略，等用户交互后重试 */
  })
}

/** 停止播放 */
export function stopBgm() {
  if (audio) audio.pause()
}

/** 设置开关（家长模式 / 首页喇叭按钮调用） */
export function setBgmEnabled(v) {
  if (v) playCurrent()
  else stopBgm()
}
