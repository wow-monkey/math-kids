// 轻量补间动画引擎（挂在 ticker 上）

import { subscribe } from './ticker'

export const Ease = {
  linear: (t) => t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outCubic: (t) => 1 + --t * t * t,
  outBack: (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
  outBounce: (t) => {
    const n = 7.5625, d = 2.75
    if (t < 1 / d) return n * t * t
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375
    return n * (t -= 2.625 / d) * t + 0.984375
  },
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1)
}

const active = new Set()
let started = false

function ensureLoop() {
  if (started) return
  started = true
  subscribe((dt) => {
    for (const tw of active) {
      tw.elapsed += dt * 1000
      const t = Math.min(1, Math.max(0, (tw.elapsed - tw.delay) / tw.duration))
      if (tw.elapsed < tw.delay) continue
      const k = tw.ease(t)
      for (const key in tw.to) {
        tw.target[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * k
      }
      tw.onUpdate?.(k)
      if (t >= 1) {
        active.delete(tw)
        tw.onComplete?.()
      }
    }
  })
}

/**
 * 补间动画
 * @param target 带数字属性的对象（如 mesh.position / mesh.scale）
 * @param to 目标值 { x, y, z ... }
 * @param opts { duration(ms), delay(ms), ease, onUpdate, onComplete }
 * @returns cancel 函数
 */
export function tween(target, to, opts = {}) {
  ensureLoop()
  const tw = {
    target,
    to,
    from: {},
    duration: opts.duration ?? 500,
    delay: opts.delay ?? 0,
    ease: typeof opts.ease === 'function' ? opts.ease : Ease[opts.ease ?? 'outQuad'],
    onUpdate: opts.onUpdate,
    onComplete: opts.onComplete,
    elapsed: 0
  }
  for (const key in to) tw.from[key] = target[key]
  active.add(tw)
  return () => active.delete(tw)
}

/** Promise 化的延时 */
export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** 补间完成转 Promise */
export function tweenAsync(target, to, opts = {}) {
  return new Promise((resolve) => {
    tween(target, to, { ...opts, onComplete: () => { opts.onComplete?.(); resolve() } })
  })
}
