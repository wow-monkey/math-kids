// TTS 中文语音播报：优先自然音色，按句播报带自然停顿，减少机械感

let zhVoice = null
let enabled = true
// 播报代次：新的播报 / 停止会作废旧队列
let queueToken = 0

/** 音色打分：Natural/Neural 优先，避开老式 SAPI（Desktop/Compact）音色 */
function scoreVoice(v) {
  const name = v.name || ''
  let score = 0
  if (/natural|neural|online/i.test(name)) score += 40
  // 较柔和的中文女声优先（雅瑶、晓晓等听起来比 Huihui 更自然）
  if (/xiaoxiao|xiaoyi|xiaomeng|xiaomo|yunxi|yaoyao|tingting|ting-ting|meijia/i.test(name)) score += 24
  if (/huihui|kangkang/i.test(name)) score += 12
  if (/female|女/i.test(name)) score += 6
  if (/child|kid|童/i.test(name)) score += 4
  if (/desktop|compact|espeak|pico/i.test(name)) score -= 30
  return score
}

/** 从系统音色里挑最自然的中文女声 */
function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  const zh = voices.filter(
    (v) => /^zh/i.test(v.lang) || /chinese|mandarin|中文|普通话/i.test(v.name)
  )
  if (!zh.length) {
    zhVoice = null
    return
  }
  zhVoice = [...zh].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
}

if ('speechSynthesis' in window) {
  pickVoice()
  window.speechSynthesis.onvoiceschanged = pickVoice
  // 部分浏览器首次 getVoices 为空，稍后再取一次
  setTimeout(pickVoice, 300)
}

export function setVoiceEnabled(v) {
  enabled = !!v
  if (!enabled) stopSpeak()
}

export function isVoiceEnabled() {
  return enabled
}

/** 按标点切句：逐句播报比一口气读长句自然，也能规避部分引擎的长文本截断 */
function splitSentences(text) {
  return (String(text).match(/[^。！？!?；;\n]+[。！？!?；;\n]?/g) || [])
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 串行播报队列，句间留 140ms 停顿 */
function speakQueue(parts, index, opts, token) {
  if (token !== queueToken || !enabled || index >= parts.length) return
  const synth = window.speechSynthesis
  const u = new SpeechSynthesisUtterance(parts[index])
  u.lang = 'zh-CN'
  if (zhVoice) u.voice = zhVoice
  u.rate = opts.rate
  u.pitch = opts.pitch
  u.volume = opts.volume
  u.onend = () => setTimeout(() => speakQueue(parts, index + 1, opts, token), 140)
  u.onerror = () => setTimeout(() => speakQueue(parts, index + 1, opts, token), 60)
  synth.speak(u)
}

/**
 * 朗读文本
 * 默认音高 1.08（原先 1.5 会明显失真发尖）、语速 0.92（原先 0.85 偏慢且生硬）
 * @param opts { rate, pitch, volume, interrupt 是否打断当前播报 }
 */
export function speak(text, { rate = 0.92, pitch = 1.08, volume = 0.95, interrupt = true } = {}) {
  if (!enabled || !('speechSynthesis' in window) || !text) return
  const synth = window.speechSynthesis
  const token = ++queueToken
  if (interrupt) synth.cancel()
  const parts = splitSentences(text)
  if (!parts.length) return
  const opts = { rate, pitch, volume }
  // cancel 之后立刻 speak 在部分引擎上会被吞掉，留一点时间再开口
  setTimeout(() => speakQueue(parts, 0, opts, token), interrupt ? 70 : 0)
  return null
}

export function stopSpeak() {
  queueToken++
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

/** 朗读数字 */
export function speakNumber(n, opts) {
  // 动态引入避免循环依赖
  return import('./numbers.js').then(({ toChinese }) => speak(toChinese(n), opts))
}
