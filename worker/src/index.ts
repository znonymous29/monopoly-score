/**
 * Cloudflare Worker：大富翁多人房间
 * - POST /create?maxPlayers=4 -> { roomId } 创建房间
 * - GET /room/:roomId  WebSocket 升级，进入对应 Durable Object
 */

export { MonopolyRoomDO } from "./MonopolyRoomDO.js";

export interface Env {
  MONOPOLY_ROOM: DurableObjectNamespace;
}

function parsePath(url: string): string[] {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  } catch {
    return [];
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = parsePath(request.url);

    // POST /create -> 创建房间，初始化 DO 并返回 roomId
    if (request.method === "POST" && path[0] === "create") {
      const url = new URL(request.url);
      const maxPlayers = Math.min(
        Math.max(parseInt(url.searchParams.get("maxPlayers") ?? "4", 10), 2),
        6,
      );
      const roomId = crypto.randomUUID();
      const id = env.MONOPOLY_ROOM.idFromName(roomId);
      const stub = env.MONOPOLY_ROOM.get(id);
      const initUrl = new URL(request.url);
      initUrl.pathname = `/room/${roomId}`;
      await stub.fetch(new Request(initUrl.toString(), {
        method: "POST",
        body: JSON.stringify({ maxPlayers }),
        headers: { "Content-Type": "application/json" },
      }));
      return new Response(JSON.stringify({ roomId }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // GET /room/:roomId -> WebSocket 升级到该房间 DO
    if (request.method === "GET" && path[0] === "room" && path[1]) {
      const roomId = path[1];
      const upgrade = request.headers.get("Upgrade");
      if (!upgrade || upgrade.toLowerCase() !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }
      const id = env.MONOPOLY_ROOM.idFromName(roomId);
      const stub = env.MONOPOLY_ROOM.get(id);
      return stub.fetch(request);
    }

    return new Response(
      JSON.stringify({
        usage: {
          "POST /create?maxPlayers=4": "Create room, returns { roomId }",
          "GET /room/:roomId": "WebSocket connect to room",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  },
};
