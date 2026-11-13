// 粒子系统：烟花、星星雨、泡泡破裂水珠

import * as THREE from 'three'
import { dotTexture, starTexture } from './textures'

/**
 * 爆发粒子
 * @param scene
 * @param origin THREE.Vector3
 * @param opts { count, colors, speed, gravity, life, size, star }
 * @returns dispose 函数
 */
export function burst(scene, origin, opts = {}) {
  const {
    count = 40,
    colors = ['#FFD93D', '#FF6B81', '#54A0FF', '#7ED957', '#FF9F43'],
    speed = 4,
    gravity = 5,
    life = 1.1,
    size = 0.28,
    star = false
  } = opts

  const positions = new Float32Array(count * 3)
  const colorsArr = new Float32Array(count * 3)
  const vels = []
  const col = new THREE.Color()

  for (let i = 0; i < count; i++) {
    positions[i * 3] = origin.x
    positions[i * 3 + 1] = origin.y
    positions[i * 3 + 2] = origin.z
    col.set(colors[i % colors.length])
    colorsArr[i * 3] = col.r
    colorsArr[i * 3 + 1] = col.g
    colorsArr[i * 3 + 2] = col.b
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const s = speed * (0.4 + Math.random() * 0.8)
    vels.push(new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * s,
      Math.abs(Math.cos(phi)) * s * 0.9 + speed * 0.3,
      Math.sin(phi) * Math.sin(theta) * s * 0.5
    ))
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colorsArr, 3))

  const tex = star ? starTexture() : dotTexture()
  const mat = new THREE.PointsMaterial({
    size,
    map: tex,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const points = new THREE.Points(geo, mat)
  scene.add(points)

  let elapsed = 0
  let raf = 0
  let last = performance.now()

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    elapsed += dt
    const pos = geo.attributes.position.array
    for (let i = 0; i < count; i++) {
      vels[i].y -= gravity * dt
      pos[i * 3] += vels[i].x * dt
      pos[i * 3 + 1] += vels[i].y * dt
      pos[i * 3 + 2] += vels[i].z * dt
    }
    geo.attributes.position.needsUpdate = true
    mat.opacity = Math.max(0, 1 - elapsed / life)
    if (elapsed >= life) {
      dispose()
      return
    }
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  function dispose() {
    cancelAnimationFrame(raf)
    scene.remove(points)
    geo.dispose()
    mat.map?.dispose()
    mat.dispose()
  }
  return dispose
}

/** 全屏庆祝：连续多波烟花（返回的取消函数会同时清理未触发的波次） */
export function celebrate(scene, { waves = 3, area = 6 } = {}) {
  const disposes = []
  const timers = []
  let cancelled = false
  for (let w = 0; w < waves; w++) {
    timers.push(
      setTimeout(() => {
        if (cancelled) return
        disposes.push(
          burst(scene, new THREE.Vector3((Math.random() - 0.5) * area, Math.random() * 2 + 1, 0), {
            count: 50,
            speed: 5,
            star: w % 2 === 0
          })
        )
      }, w * 450)
    )
  }
  return () => {
    cancelled = true
    timers.forEach((id) => clearTimeout(id))
    disposes.forEach((d) => d())
  }
}
