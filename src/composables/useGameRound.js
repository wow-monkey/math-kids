// 游戏通用回合逻辑

import { ref, computed } from 'vue'

/**
 * @param totalRounds 总回合数
 */
export function useGameRound(totalRounds = 5) {
  const round = ref(0) // 当前回合（从 1 开始）
  const mistakes = ref(0)
  const done = ref(false)

  const stars = computed(() => {
    if (mistakes.value === 0) return 3
    if (mistakes.value <= 2) return 2
    return 1
  })

  function start() {
    round.value = 1
    mistakes.value = 0
    done.value = false
  }

  function addMistake() {
    mistakes.value++
  }

  /** 进入下一回合，返回是否还有下一回合 */
  function nextRound() {
    if (round.value >= totalRounds) {
      done.value = true
      return false
    }
    round.value++
    return true
  }

  return { round, mistakes, done, stars, totalRounds, start, addMistake, nextRound }
}
