// 数字相关工具：中文读数、随机数等

const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 0-100 数字转中文读法，用于 TTS 语音朗读 */
export function toChinese(n) {
  n = Math.round(n)
  if (n === 0) return '零'
  if (n <= 9) return D[n]
  if (n === 10) return '十'
  if (n < 20) return '十' + D[n % 10]
  if (n === 100) return '一百'
  if (n % 10 === 0) return D[n / 10] + '十'
  return D[Math.floor(n / 10)] + '十' + D[n % 10]
}

/** 生成 [min, max] 范围内的随机整数 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 从数组随机取 n 个不重复元素 */
export function sample(arr, n) {
  const copy = [...arr]
  const out = []
  while (copy.length && out.length < n) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }
  return out
}

/** 打乱数组 */
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 生成不重复的目标干扰数字（用于"认数字"等游戏） */
export function makeDistractors(target, count, min, max) {
  const set = new Set([target])
  let guard = 0
  while (set.size < count + 1 && guard++ < 200) {
    // 优先生成相近数字，增加辨识度训练
    const near = target + randomInt(-9, 9)
    const far = randomInt(min, max)
    const cand = Math.random() < 0.6 ? near : far
    if (cand >= min && cand <= max && cand !== target) set.add(cand)
  }
  while (set.size < count + 1) {
    const cand = randomInt(min, max)
    if (cand !== target) set.add(cand)
  }
  return [...set].filter((n) => n !== target)
}
