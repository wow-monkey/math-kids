// 3D 卡通物体工厂：数字积木、水果、小棒捆、火车等

import * as THREE from 'three'
import { numberTexture, emojiTexture } from './textures'

const toonGradient = (() => {
  // 三阶 toon 渐变
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 1
  const ctx = c.getContext('2d')
  const colors = ['#666666', '#999999', '#CCCCCC', '#FFFFFF']
  colors.forEach((col, i) => {
    ctx.fillStyle = col
    ctx.fillRect(i, 0, 1, 1)
  })
  const tex = new THREE.CanvasTexture(c)
  // 模块级共享贴图：释放场景时跳过，避免反复销毁重建
  tex.userData.shared = true
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  return tex
})()

export function toonMat(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient })
}

/** 数字积木块：圆角盒子 + 数字贴图 */
export function makeNumberBlock(n, { color = '#FFD93D', size = 1.6, textColor = '#5B3A1E' } = {}) {
  const group = new THREE.Group()
  const geo = new THREE.BoxGeometry(size, size, size * 0.55)
  const sideMat = toonMat(color)
  const faceMat = new THREE.MeshToonMaterial({
    map: numberTexture(n, { bg: color, fg: textColor }),
    gradientMap: toonGradient
  })
  const box = new THREE.Mesh(geo, [sideMat, sideMat, sideMat, sideMat, faceMat, sideMat])
  group.add(box)
  group.userData.box = box
  return group
}

/** emoji 精灵（水果/动物等，用于数一数） */
export function makeEmojiSprite(emoji, size = 1.4) {
  const mat = new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(size, size, 1)
  return sprite
}

/** 一捆小棒（10 根圆柱体捆在一起） */
export function makeBundle({ color = '#E8A87C', stickH = 1.4, radius = 0.055 } = {}) {
  const group = new THREE.Group()
  const geo = new THREE.CylinderGeometry(radius, radius, stickH, 8)
  const mat = toonMat(color)
  const bandMat = toonMat('#FF6B81')
  // 3-4-3 排列近似圆形捆
  const positions = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const r = i < 5 ? 0.09 : 0.19
    positions.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  positions.push([0, 0])
  positions.slice(0, 10).forEach(([x, z]) => {
    const stick = new THREE.Mesh(geo, mat)
    stick.position.set(x, 0, z)
    group.add(stick)
  })
  // 捆扎带
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 24), bandMat)
  band.rotation.x = Math.PI / 2
  group.add(band)
  return group
}

/** 单根小棒 */
export function makeStick({ color = '#E8A87C', h = 1.4 } = {}) {
  return new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, h, 8), toonMat(color))
}

/** 数字卡片（平面，用于配对游戏） */
export function makeNumberCard(n, { color = '#54A0FF', w = 1.6, h = 1.6 } = {}) {
  const geo = new THREE.PlaneGeometry(w, h)
  const mat = new THREE.MeshBasicMaterial({ map: numberTexture(n, { bg: color }), transparent: true })
  return new THREE.Mesh(geo, mat)
}

/** 小火车头 */
export function makeLocomotive(color = '#FF6B81') {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 0.8), toonMat(color))
  body.position.y = 0.55
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.7), toonMat('#54A0FF'))
  cabin.position.set(-0.3, 1.3, 0)
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 10), toonMat('#5B3A1E'))
  chimney.position.set(0.4, 1.25, 0)
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16)
  const wheelMat = toonMat('#3D3D3D')
  ;[-0.4, 0.4].forEach((x) => {
    ;[0.42, -0.42].forEach((z) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat)
      w.rotation.x = Math.PI / 2
      w.position.set(x, 0.22, z)
      g.add(w)
    })
  })
  g.add(body, cabin, chimney)
  return g
}

/** 火车车厢（带数字槽） */
export function makeWagon(color = '#FFD93D') {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), toonMat(color))
  body.position.y = 0.5
  const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16)
  const wheelMat = toonMat('#3D3D3D')
  ;[-0.35, 0.35].forEach((x) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat)
    w.rotation.x = Math.PI / 2
    w.position.set(x, 0.2, 0.42)
    g.add(w)
    const w2 = w.clone()
    w2.position.z = -0.42
    g.add(w2)
  })
  g.add(body)
  g.userData.body = body
  return g
}

/** 地面（大圆平面） */
export function makeGround(color = '#7ED957', radius = 30) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), toonMat(color))
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

/** 云朵 */
export function makeCloud(scale = 1) {
  const g = new THREE.Group()
  const mat = new THREE.MeshToonMaterial({ color: '#FFFFFF', gradientMap: toonGradient, transparent: true, opacity: 0.92 })
  const parts = [
    [0, 0, 0, 0.55],
    [0.5, -0.08, 0.1, 0.4],
    [-0.5, -0.05, -0.1, 0.42],
    [0.2, 0.25, 0, 0.38]
  ]
  parts.forEach(([x, y, z, r]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), mat)
    m.position.set(x, y, z)
    g.add(m)
  })
  g.scale.setScalar(scale)
  return g
}

/** 以顶端为轴的可摆动肢体（返回 pivot Group，mesh 向下悬挂） */
function makePivot(geo, mat, length) {
  const pivot = new THREE.Group()
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.y = -length / 2
  pivot.add(mesh)
  return pivot
}

/** 金箍棒：金色棒身 + 两端红箍（竖直，底部在 y=0） */
function makeStaff() {
  const g = new THREE.Group()
  const goldMat = toonMat('#F7C948')
  const redMat = toonMat('#E63946')
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.7, 12), goldMat)
  const capGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.26, 12)
  const topCap = new THREE.Mesh(capGeo, redMat)
  topCap.position.y = 0.85
  const botCap = new THREE.Mesh(capGeo, redMat)
  botCap.position.y = -0.85
  g.add(shaft, topCap, botCap)
  return g
}

/** 孙悟空：几何体拼装的卡通猴子（脚底在 y=0，右手拄金箍棒） */
export function makeMonkey({ scale = 1 } = {}) {
  const g = new THREE.Group()

  const furMat = toonMat('#C77B3F')
  const skinMat = toonMat('#F5C68B')
  const goldMat = toonMat('#F7C948')
  const redMat = toonMat('#E63946')
  const darkMat = toonMat('#3D2B1F')

  // 腿（髋部为轴，可前后摆动）
  const legGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.42, 12)
  const leftLeg = makePivot(legGeo, furMat, 0.42)
  leftLeg.position.set(-0.18, 0.42, 0)
  const rightLeg = makePivot(legGeo, furMat, 0.42)
  rightLeg.position.set(0.18, 0.42, 0)

  // 身体（金色上衣）
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.85, 20), goldMat)
  body.position.y = 0.72

  // 肚子（浅色）
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), skinMat)
  belly.position.set(0, 0.66, 0.32)
  belly.scale.set(1, 1.1, 0.5)

  // 红色披风（颈后垂下）
  const capeMat = toonMat('#E63946')
  capeMat.side = THREE.DoubleSide
  const capeShape = new THREE.Shape()
  capeShape.moveTo(0, 0)
  capeShape.quadraticCurveTo(0.55, -0.45, 0.42, -0.95)
  capeShape.lineTo(-0.42, -0.95)
  capeShape.quadraticCurveTo(-0.55, -0.45, 0, 0)
  const cape = new THREE.Mesh(new THREE.ShapeGeometry(capeShape), capeMat)
  cape.position.set(0, 1.1, -0.42)
  cape.rotation.x = -0.18

  // 手臂（肩部为轴，可前后摆动）
  const armGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.55, 12)
  const leftArm = makePivot(armGeo, furMat, 0.55)
  leftArm.position.set(-0.46, 1.0, 0)
  leftArm.rotation.z = 0.3
  const rightArm = makePivot(armGeo, furMat, 0.55)
  rightArm.position.set(0.46, 1.0, 0)
  rightArm.rotation.z = -0.2

  // 金箍棒（右手拄着）
  const staff = makeStaff()
  staff.position.set(0.58, 0.98, 0)

  // 头
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), furMat)
  head.position.y = 1.42

  // 脸（浅色，向前凸出）
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 20), skinMat)
  face.position.set(0, 1.36, 0.42)
  face.scale.set(0.85, 0.95, 0.42)

  // 眼睛
  const eyeGeo = new THREE.SphereGeometry(0.07, 10, 10)
  const leftEye = new THREE.Mesh(eyeGeo, darkMat)
  leftEye.position.set(-0.14, 1.48, 0.55)
  const rightEye = new THREE.Mesh(eyeGeo, darkMat)
  rightEye.position.set(0.14, 1.48, 0.55)

  // 嘴
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), darkMat)
  mouth.position.set(0, 1.27, 0.58)
  mouth.scale.set(1.8, 0.6, 0.5)

  // 耳朵
  const earGeo = new THREE.SphereGeometry(0.15, 12, 12)
  const leftEar = new THREE.Mesh(earGeo, furMat)
  leftEar.position.set(-0.52, 1.5, 0)
  const rightEar = new THREE.Mesh(earGeo, furMat)
  rightEar.position.set(0.52, 1.5, 0)

  // 金箍（头箍）
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.05, 8, 28), goldMat)
  band.position.y = 1.62
  band.rotation.x = Math.PI / 2

  // 尾巴（后侧卷曲，根部分组用于摆动）
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.12, -0.28, -0.22),
    new THREE.Vector3(-0.3, -0.1, -0.4),
    new THREE.Vector3(-0.4, 0.25, -0.42),
    new THREE.Vector3(-0.32, 0.55, -0.25)
  ])
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 24, 0.07, 8), furMat)
  const tailPivot = new THREE.Group()
  tailPivot.position.set(0, 0.42, -0.28)
  tailPivot.add(tail)

  g.add(leftLeg, rightLeg, body, belly, cape, leftArm, rightArm, staff, head, face, leftEye, rightEye, mouth, leftEar, rightEar, band, tailPivot)
  g.scale.setScalar(scale)

  g.userData.parts = { leftArm, rightArm, leftLeg, rightLeg, head, tailPivot }
  return g
}

/** 猴子待机动画：手臂/腿摆动 + 尾巴摇晃 + 头轻晃（不修改整体 position，便于叠加跳跃） */
export function monkeyIdle(monkey, t) {
  const p = monkey.userData.parts
  if (!p) return
  p.leftArm.rotation.x = Math.sin(t * 4) * 0.4
  p.rightArm.rotation.x = Math.sin(t * 4 + Math.PI) * 0.4
  p.leftLeg.rotation.x = Math.sin(t * 4 + Math.PI) * 0.15
  p.rightLeg.rotation.x = Math.sin(t * 4) * 0.15
  p.tailPivot.rotation.y = Math.sin(t * 3) * 0.35
  p.head.rotation.z = Math.sin(t * 2) * 0.06
}
