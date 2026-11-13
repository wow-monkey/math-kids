// 阶段配置：0-100 分四个阶段

export const STAGES = [
  {
    id: 1,
    name: '启蒙岛',
    emoji: '🌱',
    color: '#FF9F43',
    range: [0, 10],
    desc: '认识 0-10',
    // 每关对应的游戏类型
    games: ['count', 'recognize', 'match', 'bubble', 'train', 'tens']
  },
  {
    id: 2,
    name: '基础岛',
    emoji: '🌷',
    color: '#FF6B81',
    range: [11, 20],
    desc: '认识 11-20',
    games: ['count', 'recognize', 'match', 'bubble', 'train', 'tens']
  },
  {
    id: 3,
    name: '进阶岛',
    emoji: '🌈',
    color: '#54A0FF',
    range: [20, 50],
    desc: '认识 20-50',
    games: ['recognize', 'match', 'bubble', 'train', 'tens', 'count']
  },
  {
    id: 4,
    name: '拓展岛',
    emoji: '🚀',
    color: '#5F27CD',
    range: [50, 100],
    desc: '认识 50-100',
    games: ['recognize', 'match', 'bubble', 'train', 'tens', 'count']
  }
]

export function getStage(id) {
  return STAGES.find((s) => s.id === Number(id))
}

// 游戏元信息
export const GAME_META = {
  count: { name: '数一数', emoji: '🍎' },
  recognize: { name: '认数字', emoji: '🔢' },
  match: { name: '数字配对', emoji: '🧩' },
  bubble: { name: '泡泡乐园', emoji: '🫧' },
  train: { name: '数字小火车', emoji: '🚂' },
  tens: { name: '按十数数', emoji: '🧱' }
}
