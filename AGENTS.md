# AGENTS.md

儿童数学启蒙单页应用：Vite 5 + Vue 3（`<script setup>`）+ Three.js。无后端、无接口，全部进度存在 localStorage。界面与代码注释均为简体中文。

## 命令与验证

- `npm run dev`：开发服务器，`host: true` 已开启，可用局域网地址在真机/平板上测触控。
- `npm run build` / `npm run preview`：构建与预览。
- **没有测试、lint、typecheck、CI**。不要跑或虚构 `npm test`、`npm run lint` 之类命令；验证方式只能是起 dev server 手动点开对应路由看效果。
- `dist/` 是旧的构建产物，不要手改；改源码后重新 `npm run build` 才会更新。

## 代码地图

- 入口：`index.html` → `src/main.js` → `src/App.vue`（页面过渡、首次交互启动 BGM、切后台停语音）。
- 路由：`src/router/index.js`，使用 **hash 模式**（`createWebHashHistory`），地址形如 `/#/play/2/0`。
- `src/views/` 页面；`src/games/` 9 个 3D 玩法组件（普通闯关用其中 6 个，冒险模式复用并多出 compare/order/give）；`src/components/` 两种游戏外壳；`src/three/` Three.js 场景与素材工厂；`src/utils/` 进度、音频、语音、数字工具。
- 别名 `@` → `src/`（`vite.config.js`）。跨目录一律用 `@/xxx`，不要写 `../../`。
- 三条流程：普通闯关 `/stage/:mode` → `/map/:stageId` → `/play/:stageId/:levelIdx`；冒险故事 `/adventure` → `/adventure/:theme` → `/adventure/:theme/:stageId` → `/adventure-play/...`；以及 `/lesson/:stageId`、`/song/:stageId`、`/trace/:stageId`、`/parent`。
- 路由用 `beforeEach` 校验 `mode / stageId / theme / levelIdx`，非法参数自动回退；**新增带参路由必须同步加校验**，否则视图拿到 `undefined` 会整页白屏。
- 每个玩法在 `GameHostView` / `AdventureHostView` 里用 `defineAsyncComponent` 按需加载。

## 新增/改动玩法必须同步登记的 5 处（最易漏）

1. `src/utils/stages.js` 的 `GAME_META`（名称 + emoji）。
2. `src/utils/stages.js` 中 4 个 `STAGES[].games` 数组——数组下标就是关卡下标。
3. `src/views/GameHostView.vue` 的 `GAME_COMPONENTS` 和 `GAME_ROUNDS`。
4. 冒险模式额外要改 `src/utils/adventures.js` 的 `levels[].mech`、`ADV_ROUNDS`、`ADV_BG`，以及 `src/views/AdventureHostView.vue` 的 `GAME_COMPONENTS`。
5. 游戏组件内 `useGameRound(n)` 的 `n` 必须与 `GAME_ROUNDS` / `ADV_ROUNDS` 对应值一致，否则外壳回合点与通关判定错位。

## 游戏组件契约

- 游戏组件自己 `position: absolute; inset: 0` 铺满，塞进外壳的 slot；**不要在组件模板里放标题、返回按钮、回合圆点、完成弹窗**，这些由 `GameShell.vue` / `AdventureShell.vue` 负责。
- 与外壳通信只有两个事件：`emit('round', n)`（进入第 n 回合）和 `emit('finish', stars)`（通关）。宿主再通过 ref 调外壳的 `setRound()` / `finish()`。
- 星级规则在 `useGameRound`：0 错 3 星，≤2 错 2 星，其余 1 星。答错必须调 `addMistake()`，否则永远满星。
- “再玩一次”由宿主递增 `retryTick` 改 `key` 强制重建组件实现，**不要在游戏内部写 reset 逻辑**。
- 生命周期必须成对：`onMounted` 建 `SceneManager`，`onBeforeUnmount` 里 `clearLater()` + `stopSpeak()` + `cancel 庆祝动画` + `sm.dispose()`。
- 每回合重建内容时用 `removeAndDispose(sm.scene, obj)`（`@/three/dispose`），**不要只 `scene.remove`**：只 remove 的对象不在 scene 里，`sm.dispose()` 遍历不到，几何/材质/CanvasTexture 会永久留在显存。
- 所有延时用 `later(fn, ms)`（`@/utils/timers`），不要直接 `setTimeout`；组件卸载时 `clearLater()` 统一清理，避免定时器在销毁后继续操作场景。
- 宿主已用 `webglSupported()` 做兜底，游戏组件内不要重复判断 WebGL。

## Three.js 布局约定

- 透视相机，默认 `cameraZ: 12`；屏幕上的“可见世界”大小用 `sm.visibleSize(z)` 计算。任何位置/尺寸都按它推导，硬编码坐标在平板或手机横屏下会跑出屏幕或重叠。
- 可点击对象必须给**根 group** 设 `userData.pickRoot`，并推进 `sm.pickables`；射线命中后会沿父级查找 `pickRoot`。每回合重建场景时记得 `sm.pickables = []`——`SceneManager` 不会自动清理。
- 动画统一用 `@/utils/tween`（`tween` / `tweenAsync` / `Ease` / `wait`），帧循环是 `@/utils/ticker` 的全局 rAF；不要自建 `requestAnimationFrame` 渲染循环。持续动画用 `sm.addUpdater(fn)`（返回取消函数）。
- 素材全部程序化生成，仓库里没有模型/图片文件：`three/objects.js`（数字积木、小棒捆、火车、悟空等工厂）、`three/textures.js`（CanvasTexture 数字/emoji/粒子贴图）、`three/particles.js`（`burst` / `celebrate`）。新增物体优先加进这些文件复用。
- `three/textures.js` 的贴图按参数缓存（同屏相同数字/emoji 只建一次），缓存贴图带 `userData.shared = true`，`disposeObject3D` 会跳过它们；模块级共享贴图（如 toon 渐变）也必须标记 shared。
- 页面内不要重复 `new SceneManager`：TraceView 曾因每次庆祝都新建导致 WebGL 上下文耗尽，正确做法是复用前先 `dispose()` 旧实例。

## 进度与存储

- 唯一持久化键：`localStorage['math-kids-progress-v1']`，封装为 `src/utils/progress.js` 里响应式的 `progress`；`load()` 会与默认值合并，改数据结构时需兼容旧数据。
- 星星只增不减（`recordStars` 取最大值），并即时 `save()`。
- 解锁规则：关卡需上一关 ≥1 星；阶段需上一阶段**全部**关卡 ≥1 星。冒险进度 key 为 `adv-<theme>-<stage>-<level>`，共用同一个 `progress.stars`。
- 新增“开关类”设置要同时改三处：`progress.js` 默认值、对应模块内部 enabled 状态（`speech.js` / `bgm.js`）、`ParentView.vue` 的 UI。
- 音效音量存在 `progress.sfxVolume`（0-1，默认 0.8），由 `sound.js` 的 `setSfxVolume()` 作用在音频总线 `master.gain`；新增音效必须连 `master`，不要直连 `destination`。

## 体验与样式约定

- 目标用户是 3–8 岁儿童：可点区域要大（参考 `.btn-big`），文案口语化简体中文，答错反馈必须温和（用 `wrong()`，不要刺耳音效），关键操作配 `speak()`。
- **数字不要用 `--font-fun`**：站酷快乐体的数字被方块化（0 是空心方框），认数字场景会误导。DOM 数字加 `.num-font`（`--font-num`），CanvasTexture 用 `textures.js` 里的 `NUM_FONT`。
- 全局样式集中在 `src/styles/global.css`：色板变量 `--sky/--grass/--sun/--coral/--orange/--blue/--brown/--cream`，通用类 `.btn-big/.btn-back/.page-title/.sky-bg/.overlay/.overlay-card/.scene-container/.anim-*`。优先复用，别在页面里重画一套按钮或弹窗。
- 默认横屏；已用 `100dvh`、`env(safe-area-inset-*)` 和 `clamp()` 适配，新布局沿用这套写法。
- 音频全部免文件：BGM 走 `src/assets/audio/*.mp3` 且**只在首次 pointerdown/keydown 后播放**（浏览器自动播放策略）；音效是 `utils/sound.js` 的 Web Audio 实时合成（木琴音色 + 总线压缩混响）；语音是 `speechSynthesis`（语速 0.92、音高 1.08，按句停顿）。新增音效请加合成函数，不要引入音频文件。
