<script setup>
// 游戏宿主页：根据关卡配置加载对应的 3D 小游戏
import { computed, ref, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStage } from '@/utils/stages'
import { webglSupported } from '@/three/SceneManager'
import GameShell from '@/components/GameShell.vue'

// 每个玩法按需加载：进入某一关只下载对应游戏的代码
const CountGame = defineAsyncComponent(() => import('@/games/CountGame.vue'))
const RecognizeGame = defineAsyncComponent(() => import('@/games/RecognizeGame.vue'))
const MatchGame = defineAsyncComponent(() => import('@/games/MatchGame.vue'))
const BubbleGame = defineAsyncComponent(() => import('@/games/BubbleGame.vue'))
const TrainGame = defineAsyncComponent(() => import('@/games/TrainGame.vue'))
const TensGame = defineAsyncComponent(() => import('@/games/TensGame.vue'))

const route = useRoute()
const router = useRouter()

const stage = computed(() => getStage(route.params.stageId))
const levelIdx = computed(() => Number(route.params.levelIdx))
const gameType = computed(() => stage.value.games[levelIdx.value])
const gameKey = computed(() => `${stage.value.id}-${levelIdx.value}`)

const GAME_COMPONENTS = {
  count: CountGame,
  recognize: RecognizeGame,
  match: MatchGame,
  bubble: BubbleGame,
  train: TrainGame,
  tens: TensGame
}

// 各游戏回合数（需与游戏内 useGameRound 参数一致）
const GAME_ROUNDS = { count: 5, recognize: 5, match: 4, bubble: 5, train: 4, tens: 3 }

const shell = ref(null)
const supported = webglSupported()

function onRound(r) {
  shell.value?.setRound(r)
}

function onFinish(stars) {
  shell.value?.finish(stars)
}

function onShellComplete({ action }) {
  if (action === 'retry') {
    // 通过 key 强制重建游戏组件
    retryTick.value++
  }
}
const retryTick = ref(0)
</script>

<template>
  <GameShell
    ref="shell"
    :key="gameKey"
    :stage-id="stage.id"
    :level-idx="levelIdx"
    :game-type="gameType"
    :total-rounds="GAME_ROUNDS[gameType] || 5"
    @complete="onShellComplete"
  >
    <component
      :is="GAME_COMPONENTS[gameType]"
      v-if="supported"
      :key="`${gameKey}-${retryTick}`"
      :stage-id="stage.id"
      @round="onRound"
      @finish="onFinish"
    />
    <div v-else class="overlay">
      <div class="overlay-card">
        <div style="font-size: 60px">😢</div>
        <p style="font-size: 24px; color: var(--brown); margin: 16px 0">
          当前浏览器不支持 3D 效果，请换一个浏览器试试吧
        </p>
        <button class="btn-big" @click="router.push('/')">回首页</button>
      </div>
    </div>
  </GameShell>
</template>
