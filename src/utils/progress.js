// 学习进度存储（localStorage）

import { reactive } from 'vue'
import { STAGES } from './stages'

const KEY = 'math-kids-progress-v1'

function defaultData() {
  return {
    // 每个阶段每关的星星数（0-3）
    stars: {},
    // 总星星
    totalStars: 0,
    // 语音开关
    voice: true,
    // 音效音量（0-1）
    sfxVolume: 0.8,
    // 背景音乐开关
    bgm: true,
    // 各模式完成记录
    lessons: {},
    songs: {},
    traces: {}
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...defaultData(), ...JSON.parse(raw) }
  } catch (e) { /* 忽略解析错误 */ }
  return defaultData()
}

export const progress = reactive(load())

function save() {
  localStorage.setItem(KEY, JSON.stringify(progress))
}

export function starKey(stageId, levelIdx) {
  return `${stageId}-${levelIdx}`
}

/** 记录关卡星星（只保留最高） */
export function recordStars(stageId, levelIdx, stars) {
  const key = starKey(stageId, levelIdx)
  if (stars > (progress.stars[key] || 0)) {
    progress.stars[key] = stars
    recomputeTotal()
    save()
  }
}

function recomputeTotal() {
  progress.totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0)
}

/** 阶段已解锁判断：上一阶段至少每关 1 星 */
export function isStageUnlocked(stageId) {
  stageId = Number(stageId)
  if (stageId === 1) return true
  const prev = STAGES.find((s) => s.id === stageId - 1)
  return prev.games.every((_, i) => (progress.stars[starKey(stageId - 1, i)] || 0) > 0)
}

/** 关卡是否可玩：第一关默认开放，之后需上一关有星 */
export function isLevelUnlocked(stageId, levelIdx) {
  if (levelIdx === 0) return true
  return (progress.stars[starKey(stageId, levelIdx - 1)] || 0) > 0
}

export function stageStars(stageId) {
  const stage = STAGES.find((s) => s.id === Number(stageId))
  return stage.games.reduce((sum, _, i) => sum + (progress.stars[starKey(stageId, i)] || 0), 0)
}

export function setVoice(v) {
  progress.voice = v
  save()
}

export function setBgm(v) {
  progress.bgm = v
  save()
}

export function setSfxVolume(v) {
  progress.sfxVolume = Math.min(1, Math.max(0, Number(v) || 0))
  save()
}

/* ---------- 冒险故事模式进度 ---------- */

export function advStarKey(theme, stageId, levelIdx) {
  return `adv-${theme}-${stageId}-${levelIdx}`
}

/** 记录冒险关卡星星（只保留最高） */
export function recordAdvStars(theme, stageId, levelIdx, stars) {
  const key = advStarKey(theme, stageId, levelIdx)
  if (stars > (progress.stars[key] || 0)) {
    progress.stars[key] = stars
    recomputeTotal()
    save()
  }
}

/** 冒险关卡是否可玩：第一关默认开放，之后需上一关有星 */
export function isAdvLevelUnlocked(theme, stageId, levelIdx) {
  if (levelIdx === 0) return true
  return (progress.stars[advStarKey(theme, stageId, levelIdx - 1)] || 0) > 0
}

export function resetAll() {
  Object.assign(progress, defaultData())
  save()
}

recomputeTotal()
