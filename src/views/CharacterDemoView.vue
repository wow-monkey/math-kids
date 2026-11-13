<script setup>
// 示例角色演示：孙悟空（几何体拼装 + 待机动画 + 点击跳跃）
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { SceneManager } from '@/three/SceneManager'
import { makeMonkey, monkeyIdle, makeGround, makeCloud } from '@/three/objects'
import { whoosh } from '@/utils/sound'

const router = useRouter()
const container = ref(null)

let sm = null
let monkey = null
let groundY = 0
let jumpT = -1

function startJump() {
  if (jumpT >= 0) return
  jumpT = 0
  whoosh()
}

onMounted(() => {
  sm = new SceneManager(container.value, { background: 0xaee7ff, cameraZ: 12 })
  const { w, h } = sm.visibleSize()

  groundY = -h / 2 - 2.2
  const ground = makeGround()
  ground.position.y = groundY
  sm.scene.add(ground)

  const cloud1 = makeCloud(1.1)
  cloud1.position.set(-w / 2 + 1.5, h / 2 - 0.8, -2)
  const cloud2 = makeCloud(0.8)
  cloud2.position.set(w / 2 - 1.2, h / 2 - 1.6, -2)
  sm.scene.add(cloud1, cloud2)

  monkey = makeMonkey()
  monkey.position.set(0, groundY, 0)
  monkey.userData.pickRoot = monkey
  sm.scene.add(monkey)
  sm.pickables.push(monkey)

  sm.onPick = (root) => {
    if (root === monkey) startJump()
  }

  sm.addUpdater((dt, t) => {
    monkeyIdle(monkey, t)
    const bob = Math.sin(t * 3) * 0.05
    let dy = bob
    if (jumpT >= 0) {
      jumpT += dt
      const d = jumpT / 0.7
      if (d >= 1) jumpT = -1
      else dy = bob + Math.sin(Math.min(d, 1) * Math.PI) * 1.3
    }
    monkey.position.y = groundY + dy

    cloud1.position.x += dt * 0.15
    if (cloud1.position.x > w / 2 + 2) cloud1.position.x = -w / 2 - 2
    cloud2.position.x -= dt * 0.1
    if (cloud2.position.x < -w / 2 - 2) cloud2.position.x = w / 2 + 2
  })
})

onBeforeUnmount(() => {
  sm?.dispose()
})
</script>

<template>
  <div class="demo">
    <button class="btn-back" @click="router.push('/')">🏠</button>
    <div class="page-title">🐵 孙悟空</div>
    <div ref="container" class="scene-container"></div>
    <div class="demo-hint">点一下孙悟空，看它跳起来！</div>
  </div>
</template>

<style scoped>
.demo {
  position: absolute;
  inset: 0;
}
.demo-hint {
  position: absolute;
  bottom: max(24px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  background: rgba(255, 255, 255, 0.92);
  border: 4px solid var(--coral);
  border-radius: 999px;
  padding: 10px 26px;
  font-size: clamp(17px, 2.6vw, 24px);
  color: var(--brown);
  white-space: nowrap;
}
</style>
