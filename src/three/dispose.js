// Three.js 资源释放：几何、材质、贴图
// 说明：缓存/共享贴图带 userData.shared 标记，释放时跳过，避免把复用中的纹理销毁

/** 递归释放一个对象树上的 GPU 资源 */
export function disposeObject3D(root) {
  if (!root) return
  const nodes = []
  if (root.traverse) root.traverse((o) => nodes.push(o))
  else nodes.push(root)

  nodes.forEach((obj) => {
    obj.geometry?.dispose?.()
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []
    mats.forEach((m) => {
      if (!m) return
      for (const key in m) {
        const v = m[key]
        if (v && v.isTexture && !v.userData?.shared) v.dispose()
      }
      m.dispose?.()
    })
  })
}

/** 从场景移除并释放（用于每回合重建内容） */
export function removeAndDispose(scene, obj) {
  if (!obj) return
  scene?.remove(obj)
  disposeObject3D(obj)
}
