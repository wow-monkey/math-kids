// CanvasTexture 工具：数字贴图、圆形粒子贴图、表情贴图
// 纹理按参数缓存复用（同屏多个相同数字/表情不再重复创建），缓存贴图标记 shared，释放时跳过

import * as THREE from 'three'

// 数字字形：用圆润的拉丁数字字体，避免艺术中文字体的数字被"方块化"（例如 0 画成方框）
const NUM_FONT = '"Baloo 2", "Nunito", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
// 表情贴图依赖系统彩色 emoji 字体
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'

const cache = new Map()
const MAX_CACHE = 240

/** 带缓存的纹理创建 */
function cached(key, make) {
  const hit = cache.get(key)
  if (hit) return hit
  if (cache.size >= MAX_CACHE) {
    cache.forEach((t) => t.dispose())
    cache.clear()
  }
  const tex = make()
  tex.userData.shared = true
  cache.set(key, tex)
  return tex
}

/** 圆角矩形路径 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * 数字贴图（画在积木/卡片上）
 * @param n 数字
 * @param opts { bg, fg, size, border }
 */
export function numberTexture(n, { bg = '#FFD93D', fg = '#5B3A1E', size = 256, border = '#FFFFFF' } = {}) {
  return cached(`num|${n}|${bg}|${fg}|${size}|${border}`, () => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    // 背景
    roundRect(ctx, size * 0.04, size * 0.04, size * 0.92, size * 0.92, size * 0.18)
    ctx.fillStyle = bg
    ctx.fill()
    ctx.lineWidth = size * 0.045
    ctx.strokeStyle = border
    ctx.stroke()
    // 数字
    ctx.fillStyle = fg
    ctx.font = `bold ${String(n).length > 2 ? size * 0.4 : size * 0.52}px ${NUM_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(n), size / 2, size / 2 + size * 0.03)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  })
}

/** 纯数字贴图（透明背景，用于气泡内数字） */
export function plainNumberTexture(n, { fg = '#FFFFFF', size = 256, stroke = 'rgba(0,0,0,0.25)' } = {}) {
  return cached(`plain|${n}|${fg}|${size}|${stroke}`, () => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.font = `bold ${String(n).length > 2 ? size * 0.42 : size * 0.55}px ${NUM_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = size * 0.04
    ctx.strokeStyle = stroke
    ctx.strokeText(String(n), size / 2, size / 2)
    ctx.fillStyle = fg
    ctx.fillText(String(n), size / 2, size / 2)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  })
}

/** 径向渐变圆点（粒子用） */
export function dotTexture(color = '#FFFFFF', size = 64) {
  return cached(`dot|${color}|${size}`, () => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, color)
    g.addColorStop(0.7, color)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  })
}

/** 星星贴图 */
export function starTexture(color = '#FFD93D', size = 128) {
  return cached(`star|${color}|${size}`, () => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.translate(size / 2, size / 2)
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 72 - 90) * (Math.PI / 180)
      const a2 = a1 + 36 * (Math.PI / 180)
      ctx.lineTo(Math.cos(a1) * size * 0.45, Math.sin(a1) * size * 0.45)
      ctx.lineTo(Math.cos(a2) * size * 0.2, Math.sin(a2) * size * 0.2)
    }
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = size * 0.03
    ctx.strokeStyle = '#FFF6D8'
    ctx.stroke()
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  })
}

/** 表情/物品贴图（emoji 画到 canvas） */
export function emojiTexture(emoji, size = 256) {
  return cached(`emoji|${emoji}|${size}`, () => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.font = `${size * 0.8}px ${EMOJI_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.05)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  })
}
