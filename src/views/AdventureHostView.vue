<script setup>
// 冒险游戏宿主页：根据主题+关卡配置加载对应玩法组件
import { computed, ref, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStage } from '@/utils/stages'
import { getTheme, getThemeEmojis, ADV_ROUNDS } from '@/utils/adventures'
import { webglSupported } from '@/three/SceneManager'
import AdventureShell from '@/components/AdventureShell.vue'

// 每个玩法按需加载
const CountGame = defineAsyncComponent(() => import('@/games/CountGame.vue'))
const RecognizeGame = defineAsyncComponent(() => import('@/games/RecognizeGame.vue'))
const MatchGame = defineAsyncComponent(() => import('@/games/MatchGame.vue'))
const CompareGame = defineAsyncComponent(() => import('@/games/CompareGame.vue'))
const OrderGame = defineAsyncComponent(() => import('@/games/OrderGame.vue'))
const GiveGame = defineAsyncComponent(() => import('@/games/GiveGame.vue'))

const route = useRoute()
const router = useRouter()

const themeId = computed(() => route.params.theme)
const stage = computed(() => getStage(route.params.stageId))
const levelIdx = computed(() => Number(route.params.levelIdx))
const theme = computed(() => getTheme(themeId.value))
const level = computed(() => theme.value.levels[levelIdx.value])
const mech = computed(() => level.value.mech)
const gameKey = computed(() => `${themeId.value}-${stage.value.id}-${levelIdx.value}`)

const GAME_COMPONENTS = {
  count: CountGame,
  recognize: RecognizeGame,
  compare: CompareGame,
  match: MatchGame,
  order: OrderGame,
  give: GiveGame
}

const shell = ref(null)
const supported = webglSupported()
const retryTick = ref(0)

// give 玩法的接收者形象（按主题）
const receiver = computed(() => (themeId.value === 'xiyou' ? '🙏' : '👸'))
const receiverName = computed(() => (themeId.value === 'xiyou' ? '唐僧' : '公主'))

function onRound(r) {
  shell.value?.setRound(r)
}

function onFinish(stars) {
  shell.value?.finish(stars)
}

function onShellComplete({ action }) {
  if (action === 'retry') retryTick.value++
}
</script>

<template>
  <AdventureShell
    v-if="theme && level"
    ref="shell"
    :key="gameKey"
    :theme="themeId"
    :stage-id="stage.id"
    :level-idx="levelIdx"
    :level-count="theme.levels.length"
    :level-name="level.name"
    :level-emoji="level.emoji"
    :total-rounds="ADV_ROUNDS[mech] || 5"
    @complete="onShellComplete"
  >
    <component
      :is="GAME_COMPONENTS[mech]"
      v-if="supported"
      :key="`${gameKey}-${retryTick}`"
      :stage-id="stage.id"
      :emojis="getThemeEmojis(themeId)"
      :receiver="mech === 'give' ? receiver : undefined"
      :receiver-name="mech === 'give' ? receiverName : undefined"
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
  </AdventureShell>
</template>
