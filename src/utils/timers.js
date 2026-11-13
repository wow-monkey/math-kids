// 组件内延时器集合：卸载时统一清理
// 避免定时器在组件销毁后继续操作已 dispose 的 3D 场景

const timers = new Set()

/** 注册一个可被统一清理的延时任务 */
export function later(fn, ms) {
  const id = setTimeout(() => {
    timers.delete(id)
    fn()
  }, ms)
  timers.add(id)
  return id
}

/** 清理全部延时任务（游戏组件 onBeforeUnmount 调用） */
export function clearLater() {
  timers.forEach((id) => clearTimeout(id))
  timers.clear()
}
