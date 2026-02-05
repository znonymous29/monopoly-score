# 大富翁计分板（Monopoly Scoreboard）

一款用于线下/线上跑团式大富翁的轻量计分板，支持多玩家资产与现金变化记录，并提供 PWA 离线能力。

![logo](./logo.png)

## 功能概览

- **玩家管理**：支持 2-6 名玩家；可配置玩家名称与颜色；起始资金为 10000 元
- **城市/资产**：内置城市数据；支持购地、建民宿、建度假村、抵押与赎回
- **观光费计算**：自动计算观光费；同色全持有时支持翻倍逻辑
- **本地状态保存**：使用 localStorage 自动保存当前局进度，刷新页面会恢复；支持**导出存档**（JSON 文件）与**导入存档**（在游戏设置页选择文件恢复）
- **破产与结束**：玩家现金 < 0 时会被标记为“破产”（不立刻结束）；当仅剩 1 名玩家现金 > 0 时，游戏结束并判定胜者
- **离线使用**：支持添加到桌面（PWA）；静态资源缓存后可离线打开

## 技术栈

- **框架**：Vue 3 + Vuetify
- **构建**：Vite
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

### 使用 npm（可选）

```bash
npm install
npm run dev
```

> 说明：`npm` 也能运行，但建议优先使用 `pnpm` 以获得一致的依赖解析结果。

## 常用命令

```bash
pnpm dev      # 本地开发（端口 6200）
pnpm build    # 构建产物到 dist/
pnpm preview  # 预览构建产物（Vite 默认端口通常为 4173）
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
├─ src/
│  ├─ App.vue            # 主界面
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
