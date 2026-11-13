// 全局帧循环订阅器

const subs = new Set()
let last = performance.now()

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  for (const fn of subs) fn(dt, now / 1000)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

/** 订阅每帧回调，返回取消函数 */
export function subscribe(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}
