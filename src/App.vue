<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { stopSpeak } from '@/utils/speech'
import { useInput } from '@/utils/input'
import { startBgm, stopBgm } from '@/utils/bgm'
import { progress } from '@/utils/progress'
import { setSfxVolume } from '@/utils/sound'

const { isTouch } = useInput()

// 首次用户交互后启动背景音乐（浏览器自动播放策略）
function onFirstInteract() {
  startBgm()
  window.removeEventListener('pointerdown', onFirstInteract)
  window.removeEventListener('keydown', onFirstInteract)
}

// 页面隐藏时停止语音、暂停音乐
function onVisibility() {
  if (document.hidden) {
    stopSpeak()
    stopBgm()
  } else {
    startBgm()
  }
}

onMounted(() => {
  setSfxVolume(progress.sfxVolume ?? 0.8)
  window.addEventListener('pointerdown', onFirstInteract)
  window.addEventListener('keydown', onFirstInteract)
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onFirstInteract)
  window.removeEventListener('keydown', onFirstInteract)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.page-enter-from {
  opacity: 0;
  transform: scale(0.96);
}
.page-leave-to {
  opacity: 0;
  transform: scale(1.03);
}
</style>
