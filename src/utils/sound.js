// Web Audio 合成音效（无需音频文件）
// 音色设计：FM 木质音（马林巴/木琴）+ 短混响，柔和温暖，适合儿童长时间聆听

let ctx = null
let master = null
// 音效音量（0-1）与开关，家长模式可调
let sfxVolume = 1
let sfxEnabled = true

function applyGain() {
  if (master && ctx) master.gain.value = sfxEnabled ? 0.85 * sfxVolume : 0
}

/** 设置音效音量（0-1） */
export function setSfxVolume(v) {
  sfxVolume = Math.min(1, Math.max(0, Number(v) || 0))
  applyGain()
}

/** 音效开关 */
export function setSfxEnabled(v) {
  sfxEnabled = !!v
  applyGain()
}

/** 生成混响脉冲响应（指数衰减噪声，模拟温暖的房间） */
function makeImpulse(seconds, decay) {
  const rate = ctx.sampleRate
  const len = Math.max(1, Math.floor(rate * seconds))
  const buf = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}

/**
 * 音频上下文 + 总线：
 * 干声 + 轻混响并联 → 压缩器 → 输出
 * 压缩器用于连续答题时防止叠音爆音，总线统一控制整体音量
 */
function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 0.85

    const reverb = ctx.createConvolver()
    reverb.buffer = makeImpulse(1.2, 2.8)
    const wet = ctx.createGain()
    wet.gain.value = 0.16

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -20
    comp.knee.value = 24
    comp.ratio.value = 3
    comp.attack.value = 0.004
    comp.release.value = 0.25

    master.connect(comp)
    master.connect(reverb).connect(wet).connect(comp)
    comp.connect(ctx.destination)
    applyGain()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

/**
 * 木质音色：正弦载波 + FM 调制 + 指数衰减
 * 调制指数快速衰减 → 起音有木头的"颗粒感"，尾音干净不刺耳
 * @param freq 基频
 * @param opts { t 延迟, dur 时长, vol 音量, ratio 调制比, index 调制指数, pan 声像 }
 */
function mallet(freq, { t = 0, dur = 0.45, vol = 0.16, ratio = 3, index = 2, pan = 0 } = {}) {
  const c = ac()
  const start = c.currentTime + t
  const car = c.createOscillator()
  const mod = c.createOscillator()
  const modGain = c.createGain()
  const amp = c.createGain()

  car.type = 'sine'
  mod.type = 'sine'
  car.frequency.setValueAtTime(freq, start)
  mod.frequency.setValueAtTime(freq * ratio, start)
  modGain.gain.setValueAtTime(freq * index, start)
  modGain.gain.exponentialRampToValueAtTime(freq * 0.03, start + Math.min(0.18, dur * 0.6))
  mod.connect(modGain)
  modGain.connect(car.frequency)

  // 6ms 起音避免"咔"声，指数衰减模拟敲击后的自然余音
  amp.gain.setValueAtTime(0, start)
  amp.gain.linearRampToValueAtTime(vol, start + 0.006)
  amp.gain.exponentialRampToValueAtTime(0.0008, start + dur)

  car.connect(amp)
  let out = amp
  if (c.createStereoPanner) {
    const panner = c.createStereoPanner()
    panner.pan.value = pan
    amp.connect(panner)
    out = panner
  }
  out.connect(master)

  mod.start(start)
  car.start(start)
  mod.stop(start + dur + 0.05)
  car.stop(start + dur + 0.05)
  car.onended = () => {
    try {
      car.disconnect()
      mod.disconnect()
      modGain.disconnect()
      amp.disconnect()
      if (out !== amp) out.disconnect()
    } catch (e) { /* 已断开 */ }
  }
}

/** 柔和低音垫：正弦，慢起音长衰减，用来给木琴音"垫底" */
function pad(freq, { t = 0, dur = 0.6, vol = 0.05 } = {}) {
  const c = ac()
  const start = c.currentTime + t
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(vol, start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0006, start + dur)
  o.connect(g).connect(master)
  o.start(start)
  o.stop(start + dur + 0.05)
  o.onended = () => {
    try {
      o.disconnect()
      g.disconnect()
    } catch (e) { /* 已断开 */ }
  }
}

/** 带通噪声（泡泡、风声、庆祝的沙沙声） */
function noise({ t = 0, dur = 0.2, vol = 0.14, from = 3000, to = 500, q = 1.2 } = {}) {
  const c = ac()
  const start = c.currentTime + t
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, start)
  filter.frequency.exponentialRampToValueAtTime(to, start + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(vol, start + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0008, start + dur)
  src.connect(filter).connect(g).connect(master)
  src.start(start)
  src.onended = () => {
    try {
      src.disconnect()
      filter.disconnect()
      g.disconnect()
    } catch (e) { /* 已断开 */ }
  }
}

/** 点击：轻轻的木质"嗒" */
export function click() {
  mallet(1244.5, { dur: 0.1, vol: 0.07, ratio: 2, index: 1.1 })
}

/** 答对：木琴"叮—咚"上行五度 + 低音垫，明亮但不刺耳 */
export function ding() {
  mallet(783.99, { dur: 0.5, vol: 0.15 })
  mallet(1174.66, { t: 0.085, dur: 0.6, vol: 0.12 })
  pad(392, { dur: 0.7, vol: 0.045 })
}

/** 答错：温柔的两音下行，像"嗯？再想想"，不吓人 */
export function wrong() {
  mallet(440, { dur: 0.28, vol: 0.1, ratio: 2, index: 1.2 })
  mallet(349.23, { t: 0.11, dur: 0.36, vol: 0.09, ratio: 2, index: 1.2 })
}

/** 泡泡破裂：噪声气泡 + 木琴点缀 */
export function pop() {
  noise({ dur: 0.1, vol: 0.16, from: 2200, to: 700 })
  mallet(987.77, { t: 0.02, dur: 0.16, vol: 0.1, ratio: 2, index: 1.4 })
}

/** 答对一题的鼓励：五声音阶上行，柔和的"哒哒哒" */
export function cheer() {
  ;[523.25, 587.33, 659.25, 783.99].forEach((f, i) => {
    mallet(f, { t: i * 0.09, dur: 0.42, vol: 0.11 })
  })
  pad(261.63, { dur: 0.8, vol: 0.04 })
}

/** 通关号角：五声音阶上行 + 收尾双音 + 星光沙沙声 */
export function fanfare() {
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    mallet(f, { t: i * 0.11, dur: 0.5, vol: 0.13 })
  })
  mallet(1046.5, { t: 0.52, dur: 0.9, vol: 0.15 })
  mallet(1318.5, { t: 0.52, dur: 0.9, vol: 0.1 })
  pad(261.63, { t: 0.5, dur: 1.4, vol: 0.05 })
  noise({ t: 0.5, dur: 0.7, vol: 0.06, from: 5000, to: 1200, q: 0.8 })
}

/** 飞驰/掉落 */
export function whoosh() {
  noise({ dur: 0.3, vol: 0.1, from: 500, to: 2200, q: 0.8 })
}

/** 火车汽笛：双三角波 + 低通，保留辨识度但把音量压下来 */
export function whistle() {
  const c = ac()
  const start = c.currentTime
  const g = c.createGain()
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2200
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(0.07, start + 0.04)
  g.gain.setValueAtTime(0.07, start + 0.22)
  g.gain.exponentialRampToValueAtTime(0.0008, start + 0.4)
  ;[440, 554.37].forEach((f) => {
    const o = c.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(f, start)
    o.connect(lp)
    o.start(start)
    o.stop(start + 0.45)
  })
  lp.connect(g).connect(master)
}
