# 大富翁计分板（Monopoly Scoreboard）

一款用于线下/线上跑团式大富翁的轻量计分板，支持多玩家资产与现金变化记录，并提供 PWA 离线能力。

![logo](./logo.png)

## 功能概览

- **多人联网游戏**：基于 Colyseus；房主创建房间并指定人数，分享链接给好友加入；加入后可设置自己的名称和颜色，人齐后房主开启游戏
- **玩家管理**：支持 2-6 名玩家；可配置玩家名称与颜色；起始资金为 10000 元
- **城市/资产**：内置城市数据；支持购地、建民宿、建度假村、抵押与赎回
- **观光费计算**：自动计算观光费；同色全持有时支持翻倍逻辑
- **本地状态保存**：使用 localStorage 自动保存当前局进度，刷新页面会恢复；支持**导出存档**（JSON 文件）与**导入存档**（在游戏设置页选择文件恢复）
- **破产与结束**：玩家现金 < 0 时会被标记为“破产”（不立刻结束）；当仅剩 1 名玩家现金 > 0 时，游戏结束并判定胜者
- **离线使用**：支持添加到桌面（PWA）；静态资源缓存后可离线打开

## 技术栈

- **框架**：Vue 3 + Vuetify
- **构建**：Vite
- **多人游戏**：Colyseus（服务端在 `server/`），或可选 [Cloudflare Workers](#cloudflare-workers-后端)（`worker/`）
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

2. 启动前端后，点击「多人游戏」：
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

## Cloudflare Workers 后端

多人房间可改为跑在 Cloudflare Durable Objects 上，无需自建 Node 服务。见 **`worker/README.md`**。

- 在项目根目录：`cd worker && pnpm install && pnpm dev` 本地调试；`pnpm run cf-deploy` 部署。
- 前端使用 Worker 时，构建或开发时设置 `VITE_CF_WORKER_URL=https://你的-worker.workers.dev`，与 Colyseus 二选一。

## 部署（如何部署前端和后端）

有两种常用方式：**自建一台机（Docker）** 或 **Cloudflare（Worker + 静态站）**。

---

### 方式一：Docker Compose（一台机搞定前端 + Colyseus 后端）

适合：有自己的服务器或本机，希望前后端同域、一次部署完成。

1. 在项目根目录执行：
   ```bash
   docker compose up -d
   ```
2. 访问 **http://localhost**（本机）或 **http://你的服务器 IP**。
3. 前端和 Colyseus 共用同一域名：页面在 `/`，WebSocket 走 `/colyseus/`（由 Nginx 反向代理到 `server` 服务）。

涉及文件：`docker-compose.yml`、`Dockerfile.gateway`、`Dockerfile.server`、`nginx/default.conf`。

---

### 方式二：Cloudflare Workers 后端 + 静态前端

适合：不想维护服务器，用 Cloudflare 做后端和/或前端托管。

**1. 部署后端（Worker）**

```bash
cd worker
pnpm install
pnpm run cf-deploy
```

记下部署后的 Worker 地址，例如：`https://monopoly-score.xxx.workers.dev`。

**2. 部署前端**

- 构建时指定后端地址并打包：
  ```bash
  # 在项目根目录
  VITE_CF_WORKER_URL=https://你的-worker.workers.dev pnpm build
  ```
- 将生成的 **`dist/`** 目录部署到任意静态托管：
  - **Cloudflare Pages**：连 GitHub 仓库，构建命令填 `pnpm build`，环境变量加 `VITE_CF_WORKER_URL=https://你的-worker.workers.dev`，输出目录 `dist`
  - **GitHub Pages**：在仓库 Settings → Pages 里用 GitHub Actions，在 workflow 里为构建步骤加上环境变量 `VITE_CF_WORKER_URL`，再构建并上传 `dist/`
  - 其他：Vercel、Netlify、自建 Nginx 等，只要构建时带上 `VITE_CF_WORKER_URL`，然后把 `dist/` 当静态站发布即可

访问你部署的前端地址即可，多人功能会连到上述 Worker。

---

### 前端部署到 Cloudflare Pages

**方式 A：连 GitHub 自动构建（推荐）**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 选择本仓库，继续。
3. 配置构建设置：
   - **Framework preset**：None（或 Vue，若出现）
   - **Build command**：`pnpm build`（使用 pnpm 时在 **Settings → Environment variables** 添加 `ENABLE_PNPM` = `true`、`NODE_VERSION` = `20`；若用 npm 则改为 `npm run build`）
   - **Build output directory**：`dist`
   - **Root directory**：留空（项目根目录）
4. 若使用 **Worker 作为多人后端**，在 **Settings → Environment variables** 中为生产环境添加：
   - 变量名：`VITE_CF_WORKER_URL`
   - 值：`https://你的-worker.workers.dev`（与 worker 部署的地址一致）
5. 保存并部署。之后每次推送到所选分支会自动重新构建并发布。
6. 访问分配的子域（如 `xxx.pages.dev`）或绑定自定义域名。

**方式 B：本地上传 dist**

1. 在项目根目录构建：
   ```bash
   # 使用 Worker 后端时加上：
   VITE_CF_WORKER_URL=https://你的-worker.workers.dev pnpm build
   # 否则直接：
   pnpm build
   ```
2. 在 **Workers & Pages** → **Create** → **Pages** → **Upload assets**，把生成的 **`dist`** 文件夹里的全部内容拖进去（或选 dist 目录）。
3. 部署完成后得到 `xxx.pages.dev` 地址。

> 若仅做静态展示、不接多人后端，可不设置 `VITE_CF_WORKER_URL`，前端会处于“未连接”状态。

---

### 仅部署静态前端（无多人后端）

若只做静态展示、不需要多人游戏：

- 使用仓库自带的 **GitHub Actions**（`/.github/workflows/deploy.yml`）：推送到 `main`/`master` 后自动构建并发布 `dist/` 到 GitHub Pages。
- 在仓库 **Settings → Pages** 里将 Source 设为 **GitHub Actions**。
- 部署完成后在 Actions 里可看到 Pages 的访问地址。

> `vite.config.ts` 已设置 `base: "./"`，适合 GitHub Pages 等相对路径部署。

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
