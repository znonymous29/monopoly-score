# 大富翁计分板 - Cloudflare Workers 后端

将多人房间逻辑运行在 Cloudflare Durable Objects 上，无需自建 Node 服务器。

## 环境

- Node.js 20+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)（已写入 `package.json`）

## 本地开发

```bash
cd worker
pnpm install
pnpm dev
```

默认在 `http://localhost:8787` 提供：

- `POST /create?maxPlayers=4` — 创建房间，返回 `{ roomId }`
- `GET /room/:roomId` — WebSocket 升级，进入房间

## 部署

（pnpm 在 workspace 下会保留 `deploy` 给根项目，故此处脚本名为 `cf-deploy`。）

```bash
pnpm run cf-deploy
```

部署后记下 Worker 的 URL（如 `https://monopoly-score.xxx.workers.dev`）。

## 前端对接

构建或开发时设置环境变量：

```bash
VITE_CF_WORKER_URL=https://你的-worker.workers.dev pnpm build
# 或
VITE_CF_WORKER_URL=https://你的-worker.workers.dev pnpm dev
```

前端会使用 Worker 作为多人后端（创建/加入房间、WebSocket 状态同步），与 Colyseus 后端 API 兼容。

## 说明

- 断线重连：当前 Worker 版本未实现重连 token，刷新或掉线后需重新通过链接加入。
- 与 `server/` 的 Colyseus 后端二选一使用，通过是否设置 `VITE_CF_WORKER_URL` 切换。
