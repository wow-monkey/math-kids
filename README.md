# 数学小乐园

面向 3–8 岁儿童的数学启蒙单页应用：认识 0–100、点数、比多少、数字配对、按十数数，配合动画课堂、数字儿歌、描红练习与冒险故事关卡。

纯前端项目，无后端与接口，学习进度保存在浏览器 `localStorage`。

## 功能

- **闯关游戏**：数一数、认数字、数字配对、泡泡乐园、数字小火车、按十数数，4 个数字岛递进解锁。
- **冒险故事**：西游记 / 格林童话两套主题，每套 10 个故事关卡，复用 6 种玩法机制。
- **动画课堂**：3D 演示数字与数量（逐个点数 / 整捆小棒）。
- **数字儿歌**：TTS 分句跟读。
- **描一描**：Canvas 描红，覆盖率达到 72% 判定通过，成功后 3D 庆祝。
- **家长模式**：首页长按齿轮 2 秒进入，可查看进度、开关语音与背景音乐、调节音效音量、重置进度。

## 技术栈

- Vue 3（`<script setup>`）+ Vue Router（hash 模式）
- Three.js（程序化几何体与 CanvasTexture，无外部模型/贴图）
- Vite 5
- Web Audio 实时合成音效、`speechSynthesis` 中文语音

## 本地运行

```bash
npm install
npm run dev      # 默认 http://localhost:5173
npm run build    # 产物输出到 dist/
npm run preview  # 预览构建结果
```

开发服务器已开启 `host: true`，可用局域网地址在平板/手机上测试触控。

## 目录结构

```
src/
  views/       页面（首页、地图、课堂、儿歌、描红、家长模式等）
  games/       9 个 3D 玩法组件
  components/  游戏外壳（回合进度、通关弹窗、星级）
  three/       场景管理、物体工厂、贴图生成、粒子、资源释放
  utils/       进度存储、音效、语音、数字工具、补间动画
  composables/ 回合与星级逻辑
```

## 部署

`vite.config.js` 已设置 `base: './'`，使用 hash 路由，可直接部署到任意静态站点或子路径。

### Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git，选择本仓库。
2. 构建配置：
   - Framework preset：`Vite`
   - Build command：`npm run build`
   - Build output directory：`dist`
   - Node 版本：`20`（仓库已带 `.nvmrc`）
3. 部署完成后通过 `https://<项目名>.pages.dev` 访问。hash 路由不需要额外的 SPA 回退规则。
4. `public/_headers` 已配置：带 hash 的静态资源长缓存，`index.html` 每次校验。

## 说明

- 进度只存在本机浏览器，换设备不同步。
- 音频与语音依赖浏览器能力，首次交互后才会播放（自动播放策略）。
