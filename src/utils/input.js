// 输入方式检测：触控 / 鼠标

import { ref, readonly } from 'vue'

const isTouch = ref(false)
const hasMouse = ref(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false)
let bound = false

function bind() {
  if (bound) return
  bound = true
  // 首次触摸即切换为触控模式
  window.addEventListener('touchstart', () => { isTouch.value = true }, { once: true, passive: true })
  // 鼠标移动则标记鼠标可用
  window.addEventListener('mousemove', () => { hasMouse.value = true }, { once: true, passive: true })
}
bind()

export function useInput() {
  return {
    isTouch: readonly(isTouch),
    hasMouse: readonly(hasMouse)
  }
}
