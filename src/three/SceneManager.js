// Three.js 场景管理器：渲染器、相机、灯光、拾取、帧更新、销毁

import * as THREE from 'three'
import { subscribe } from '@/utils/ticker'
import { disposeObject3D } from './dispose'

export class SceneManager {
  /**
   * @param container 挂载 DOM
   * @param opts { background, cameraZ, fov }
   */
  constructor(container, opts = {}) {
    this.container = container
    this.disposed = false
    this.updaters = new Set()
    this.pickables = []
    this.onPick = null
    this.onHover = null
    this.hovered = null

    const w = container.clientWidth || 1
    const h = container.clientHeight || 1

    this.scene = new THREE.Scene()
    if (opts.background !== undefined) this.scene.background = new THREE.Color(opts.background)

    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 45, w / h, 0.1, 100)
    this.camera.position.set(0, 0, opts.cameraZ ?? 12)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: opts.background === undefined })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    container.appendChild(this.renderer.domElement)

    // 灯光：柔和卡通光
    const amb = new THREE.AmbientLight(0xffffff, 1.1)
    const dir = new THREE.DirectionalLight(0xffffff, 1.6)
    dir.position.set(3, 6, 8)
    this.scene.add(amb, dir)

    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()

    this._onPointerDown = (e) => this._pick(e, 'pick')
    this._onPointerMove = (e) => this._pick(e, 'hover')
    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown)
    this.renderer.domElement.addEventListener('pointermove', this._onPointerMove)

    this._ro = new ResizeObserver(() => this.resize())
    this._ro.observe(container)

    this._unsub = subscribe((dt, t) => {
      if (this.disposed) return
      for (const fn of this.updaters) fn(dt, t)
      this.renderer.render(this.scene, this.camera)
    })
  }

  /** z=0 平面可视区域尺寸（世界单位） */
  visibleSize(z = 0) {
    const dist = this.camera.position.z - z
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * dist
    return { h, w: h * this.camera.aspect }
  }

  resize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (!w || !h) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  addUpdater(fn) {
    this.updaters.add(fn)
    return () => this.updaters.delete(fn)
  }

  _setPointer(e) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  _pick(e, type) {
    if (!this.pickables.length) return
    this._setPointer(e)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.pickables, true)
    if (!hits.length) {
      if (type === 'hover') this._setHover(null)
      return
    }
    // 找到挂载了 userData.pickRoot 的祖先
    let obj = hits[0].object
    while (obj && !obj.userData.pickRoot) obj = obj.parent
    const root = obj || hits[0].object
    if (type === 'pick') {
      this.onPick?.(root.userData.pickRoot ?? root, e)
    } else {
      this._setHover(root.userData.pickRoot ?? root)
    }
  }

  _setHover(obj) {
    if (this.hovered === obj) return
    this.hovered = obj
    this.renderer.domElement.style.cursor = obj ? 'pointer' : ''
    this.onHover?.(obj, this.hovered)
  }

  dispose() {
    this.disposed = true
    this._unsub()
    this._ro.disconnect()
    this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown)
    this.renderer.domElement.removeEventListener('pointermove', this._onPointerMove)
    disposeObject3D(this.scene)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}

/** 检测 WebGL 是否可用 */
export function webglSupported() {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch (e) {
    return false
  }
}
