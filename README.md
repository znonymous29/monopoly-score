# 大富翁计分板（Monopoly Scoreboard）

一款用于线下/线上跑团式大富翁的轻量计分板，支持多玩家资产与现金变化记录，并提供 PWA 离线能力。

![logo](./logo.png)

## 功能概览

- **单人/多人模式**：支持单人本地游戏，或多人联网游戏（基于 Colyseus）
- **多人游戏**：房主创建房间并指定人数，分享链接给好友加入；加入后可设置自己的名称和颜色，人齐后房主开启游戏
- **玩家管理**：支持 2-6 名玩家；可配置玩家名称与颜色；起始资金为 10000 元
- **城市/资产**：内置城市数据；支持购地、建民宿、建度假村、抵押与赎回
- **观光费计算**：自动计算观光费；同色全持有时支持翻倍逻辑
- **本地状态保存**：使用 localStorage 自动保存当前局进度，刷新页面会恢复；支持**导出存档**（JSON 文件）与**导入存档**（在游戏设置页选择文件恢复）
- **破产与结束**：玩家现金 < 0 时会被标记为“破产”（不立刻结束）；当仅剩 1 名玩家现金 > 0 时，游戏结束并判定胜者
- **离线使用**：支持添加到桌面（PWA）；静态资源缓存后可离线打开

## 技术栈

- **框架**：Vue 3 + Vuetify
- **构建**：Vite
- **多人游戏**：Colyseus（服务端在 `server/`）
- **PWA**：`manifest.json` + 自定义 `sw.js`（Service Worker）

## 快速开始

### 环境要求

- **Node.js**：建议 20+（与 GitHub Actions 部署环境保持一致）
- **包管理器**：推荐 pnpm（仓库包含 `pnpm-lock.yaml`，部署流程也使用 pnpm）

### 使用 pnpm（推荐）

```bash
pnpm install
pnpm dev
```

默认启动在 `http://localhost:6200`。

### 多人游戏

1. 启动 Colyseus 服务端：
   ```bash
   pnpm dev:server
   # 或：cd server && pnpm start
   ```
   服务端默认监听 `ws://localhost:2567`。

2. 启动前端后，在游戏设置中点击「多人游戏」：
   - **创建房间**：指定人数，点击「创建并加入」，复制分享链接发给好友
   - **加入房间**：粘贴房主分享的链接，点击「加入」

3. 在大厅中，每位玩家可设置自己的名称和颜色；房主在人齐后点击「开始游戏」。

### 使用 npm（可选）

```bash
npm install
npm run dev
```

> 说明：`npm` 也能运行，但建议优先使用 `pnpm` 以获得一致的依赖解析结果。

## 常用命令

```bash
pnpm dev        # 本地开发（端口 6200）
pnpm dev:server # 启动 Colyseus 多人游戏服务端（端口 2567）
pnpm build      # 构建产物到 dist/
pnpm preview    # 预览构建产物（Vite 默认端口通常为 4173）
```

## 部署（GitHub Pages）

本项目内置 GitHub Actions 工作流：`/.github/workflows/deploy.yml`。

- **触发方式**：推送到 `main` / `master` 分支后自动构建并发布
- **发布内容**：上传并部署 `dist/` 到 GitHub Pages
- **仓库设置**：在 GitHub 仓库 `Settings → Pages` 中将 Source 设为 **GitHub Actions**
- **访问地址**：部署完成后，可在 Actions 的部署任务输出中看到 Pages URL

> 备注：`vite.config.ts` 已设置 `base: "./"`，便于以相对路径方式在 GitHub Pages/本地预览环境下访问静态资源。

## PWA / 离线缓存说明

- **Manifest**：`public/manifest.json`
- **Service Worker**：`public/sw.js`
  - 仅在**生产环境**且非 `localhost/127.0.0.1` 时注册（见 `index.html`）
  - 使用“**缓存优先**”策略缓存静态资源（`public/footage/*` 等）
  - 如需强制刷新缓存：更新 `public/sw.js` 里的 `CACHE_VERSION`

## 目录结构

```
.
├─ server/               # Colyseus 多人游戏服务端
│  ├─ src/
│  │  ├─ rooms/          # 房间逻辑
│  │  ├─ schema/         # 状态 Schema
│  │  └─ data/           # 城市配置（与前端同步）
│  └─ package.json
├─ src/
│  ├─ App.vue            # 主界面
│  ├─ composables/       # useColyseusRoom 等
│  ├─ main.ts            # 入口
│  └─ data/cities.ts     # 城市数据
├─ public/
│  ├─ manifest.json      # PWA 配置
│  ├─ sw.js              # Service Worker
│  └─ footage/           # 图标/素材
└─ .github/workflows/
   └─ deploy.yml         # GitHub Pages 自动部署
```

## 贡献

欢迎提交 Issue / PR：包含 bug 复现步骤、截图或录屏会更容易定位问题。
