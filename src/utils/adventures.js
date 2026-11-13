// 冒险故事模式配置：西游记 + 格林童话 两大主题，各 10 关
// 玩法机制（mech）复用 6 种通用游戏组件，主题只决定文案/图标/场景氛围

export const ADVENTURE_THEMES = [
  {
    id: 'xiyou',
    name: '西游记',
    emoji: '🐵',
    desc: '跟着孙悟空去取经',
    color: '#FF9F43',
    levels: [
      { mech: 'count', emoji: '🐒', name: '猴子偷桃' },
      { mech: 'compare', emoji: '🐷', name: '猪八戒偷瓜' },
      { mech: 'recognize', emoji: '🐵', name: '孙悟空打妖怪' },
      { mech: 'count', emoji: '🐉', name: '白龙马驮行李' },
      { mech: 'order', emoji: '🌟', name: '金箍棒降妖' },
      { mech: 'match', emoji: '🍑', name: '蟠桃会' },
      { mech: 'count', emoji: '🌊', name: '流沙河' },
      { mech: 'count', emoji: '🔥', name: '火焰山' },
      { mech: 'order', emoji: '🏔️', name: '五行山' },
      { mech: 'give', emoji: '🎁', name: '唐僧的礼物' }
    ]
  },
  {
    id: 'grimm',
    name: '格林童话',
    emoji: '🏰',
    desc: '走进童话故事学数字',
    color: '#B983FF',
    levels: [
      { mech: 'give', emoji: '🍎', name: '白雪公主分苹果' },
      { mech: 'count', emoji: '🎃', name: '灰姑娘南瓜车' },
      { mech: 'recognize', emoji: '🐺', name: '狼和七只小山羊' },
      { mech: 'order', emoji: '🍞', name: '韩塞尔与格莱特' },
      { mech: 'match', emoji: '🐸', name: '青蛙王子' },
      { mech: 'count', emoji: '🌹', name: '睡美人的玫瑰' },
      { mech: 'count', emoji: '🎻', name: '不莱梅音乐家' },
      { mech: 'match', emoji: '👗', name: '小精灵与鞋匠' },
      { mech: 'recognize', emoji: '🦢', name: '六只天鹅' },
      { mech: 'count', emoji: '⭐', name: '星星金币' }
    ]
  }
]

export function getTheme(id) {
  return ADVENTURE_THEMES.find((t) => t.id === id)
}

// 各主题的场景物品表情（用于点数/比多少/配对等玩法）
const THEME_EMOJIS = {
  xiyou: ['🍑', '🍉', '🐒', '🔥', '🐉', '🍌', '🌟', '🥕'],
  grimm: ['🍎', '🎃', '🌹', '🐸', '🦢', '🍄', '⭐', '🍇']
}

export function getThemeEmojis(theme) {
  return THEME_EMOJIS[theme] || THEME_EMOJIS.grimm
}

// 各玩法机制的回合数
export const ADV_ROUNDS = { count: 5, recognize: 5, compare: 4, match: 4, order: 4, give: 4 }

// 各玩法机制对应的场景背景色（营造主题氛围）
export const ADV_BG = { count: 0xaee7ff, recognize: 0x8fd9ff, compare: 0xb8ecff, match: 0xc4e8ff, order: 0xa8d8ff, give: 0xc9efff }
