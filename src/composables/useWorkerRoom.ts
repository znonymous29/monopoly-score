/**
 * 多人房间前端逻辑 - Cloudflare Worker 后端
 * 与 useColyseusRoom 同构的 API，便于 App.vue 通过环境变量切换后端
 */

import { ref, shallowRef, computed } from "vue";

export interface LobbySlot {
  sessionId: string;
  name: string;
  color: string;
}

export interface RoomPlayer {
  id: string;
  name: string;
  color: string;
  cash: number;
  bankrupt: boolean;
}

export interface RoomCityState {
  cityName: string;
  ownerId: string;
  houseCount: number;
  hasResort: boolean;
  isMortgaged: boolean;
}

export interface RoomLogItem {
  message: string;
  time: string;
  color: string;
}

interface WorkerState {
  phase: "lobby" | "playing";
  hostSessionId: string;
  maxPlayers: number;
  lobbySlots: Record<string, LobbySlot>;
  players: Record<string, RoomPlayer>;
  cities: Record<string, RoomCityState>;
  currentPlayerId: string;
  isGameOver: boolean;
  canUndo: boolean;
  canRedo: boolean;
  logs: RoomLogItem[];
}

const LS_CLIENT_ID_KEY = "monopoly:clientId";

function getOrCreateClientId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const existing = window.localStorage.getItem(LS_CLIENT_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(LS_CLIENT_ID_KEY, id);
  return id;
}

function getWorkerBaseUrl(): { http: string; ws: string } {
  const u = import.meta.env.VITE_CF_WORKER_URL as string | undefined;
  if (u) {
    const base = u.replace(/\/$/, "");
    const ws = base.startsWith("https") ? base.replace(/^https/, "wss") : base.replace(/^http/, "ws");
    return { http: base, ws };
  }
  if (typeof window !== "undefined") {
    const host = window.location.host;
    const ws = window.location.protocol === "https:" ? `wss://${host}` : `ws://${host}`;
    return { http: `${window.location.protocol}//${host}`, ws };
  }
  return { http: "http://localhost", ws: "ws://localhost" };
}

function applyState(
  state: WorkerState,
  target: {
    phase: { value: string };
    hostSessionId: { value: string };
    maxPlayers: { value: number };
    currentPlayerId: { value: string };
    isGameOver: { value: boolean };
    canUndo: { value: boolean };
    canRedo: { value: boolean };
    lobbySlots: { value: LobbySlot[] };
    players: { value: RoomPlayer[] };
    cities: { value: RoomCityState[] };
    logs: { value: RoomLogItem[] };
  },
) {
  target.phase.value = state.phase;
  target.hostSessionId.value = state.hostSessionId ?? "";
  target.maxPlayers.value = state.maxPlayers ?? 4;
  target.currentPlayerId.value = state.currentPlayerId ?? "";
  target.isGameOver.value = state.isGameOver ?? false;
  target.canUndo.value = state.canUndo ?? false;
  target.canRedo.value = state.canRedo ?? false;
  target.lobbySlots.value = Object.values(state.lobbySlots ?? {}).map((s) => ({
    sessionId: s.sessionId ?? "",
    name: s.name ?? "",
    color: s.color ?? "#1976D2",
  }));
  target.players.value = Object.values(state.players ?? {}).map((p) => ({
    id: p.id ?? "",
    name: p.name ?? "",
    color: p.color ?? "#1976D2",
    cash: p.cash ?? 0,
    bankrupt: p.bankrupt ?? false,
  }));
  target.cities.value = Object.values(state.cities ?? {}).map((c) => ({
    cityName: c.cityName ?? "",
    ownerId: c.ownerId ?? "",
    houseCount: c.houseCount ?? 0,
    hasResort: c.hasResort ?? false,
    isMortgaged: c.isMortgaged ?? false,
  }));
  target.logs.value = (state.logs ?? []).map((l) => ({
    message: l.message ?? "",
    time: l.time ?? "",
    color: l.color ?? "primary",
  }));
}

export function useWorkerRoom() {
  const ws = shallowRef<WebSocket | null>(null);
  const room = shallowRef<{ roomId: string } | null>(null);
  const clientId = getOrCreateClientId();
  const error = ref<string | null>(null);
  const connecting = ref(false);

  const phase = ref<"disconnected" | "lobby" | "playing">("disconnected");
  const hostSessionId = ref("");
  const maxPlayers = ref(4);
  const mySessionId = ref("");
  const isHost = computed(() => mySessionId.value === hostSessionId.value);

  const lobbySlots = ref<LobbySlot[]>([]);
  const players = ref<RoomPlayer[]>([]);
  const cities = ref<RoomCityState[]>([]);
  const currentPlayerId = ref("");
  const isGameOver = ref(false);
  const canUndo = ref(false);
  const canRedo = ref(false);
  const logs = ref<RoomLogItem[]>([]);

  const target = {
    phase,
    hostSessionId,
    maxPlayers,
    currentPlayerId,
    isGameOver,
    canUndo,
    canRedo,
    lobbySlots,
    players,
    cities,
    logs,
  };

  function handleMessage(ev: MessageEvent) {
    try {
      const data = JSON.parse(ev.data as string) as { type: string; state?: WorkerState; sessionId?: string };
      if (data.type === "welcome" && data.sessionId) mySessionId.value = data.sessionId;
      if (data.type === "state" && data.state) applyState(data.state, target);
    } catch {
      // ignore
    }
  }

  function handleClose() {
    ws.value = null;
    room.value = null;
    phase.value = "disconnected";
    hostSessionId.value = "";
    mySessionId.value = "";
    lobbySlots.value = [];
    players.value = [];
    cities.value = [];
    logs.value = [];
  }

  async function createRoom(maxPlayersCount: number) {
    error.value = null;
    connecting.value = true;
    const { http, ws: wsBase } = getWorkerBaseUrl();
    try {
      const res = await fetch(
        `${http}/create?maxPlayers=${Math.min(Math.max(maxPlayersCount, 2), 6)}`,
        {
          method: "POST",
          headers: { "X-Client-Id": clientId },
        },
      );
      if (!res.ok) throw new Error("创建房间失败");
      const { roomId } = (await res.json()) as { roomId: string };
      room.value = { roomId };
      const wsUrl = `${wsBase}/room/${roomId}?clientId=${encodeURIComponent(
        clientId,
      )}`;
      const socket = new WebSocket(wsUrl);
      ws.value = socket;
      socket.onmessage = (e) => {
        handleMessage(e);
        if (phase.value === "lobby") connecting.value = false;
      };
      socket.onopen = () => {};
      socket.onerror = () => {
        error.value = "连接失败";
        connecting.value = false;
      };
      socket.onclose = () => {
        handleClose();
        connecting.value = false;
      };
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!mySessionId.value) reject(new Error("连接超时"));
        }, 10000);
        const check = setInterval(() => {
          if (mySessionId.value) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 50);
        socket.onclose = () => {
          clearInterval(check);
          clearTimeout(timeout);
          if (!mySessionId.value) reject(new Error("连接关闭"));
        };
      });
    } catch (e) {
      error.value = (e as Error).message ?? "连接失败";
      throw e;
    } finally {
      connecting.value = false;
    }
  }

  async function joinRoom(roomId: string) {
    error.value = null;
    connecting.value = true;
    const { ws: wsBase } = getWorkerBaseUrl();
    const wsUrl = `${wsBase}/room/${roomId}?clientId=${encodeURIComponent(
      clientId,
    )}`;
    room.value = { roomId };
    try {
      const socket = new WebSocket(wsUrl);
      ws.value = socket;
      socket.onmessage = (e) => {
        handleMessage(e);
        if (phase.value !== "disconnected") connecting.value = false;
      };
      socket.onerror = () => {
        error.value = "加入失败";
        connecting.value = false;
      };
      socket.onclose = () => {
        handleClose();
        connecting.value = false;
      };
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!mySessionId.value) reject(new Error("连接超时"));
        }, 10000);
        const check = setInterval(() => {
          if (mySessionId.value) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 50);
        socket.onclose = () => {
          clearInterval(check);
          clearTimeout(timeout);
          if (!mySessionId.value) reject(new Error("连接关闭"));
        };
      });
    } catch (e) {
      error.value = (e as Error).message ?? "加入失败";
      throw e;
    } finally {
      connecting.value = false;
    }
  }

  function send(type: string, payload?: unknown) {
    const s = ws.value;
    if (!s || s.readyState !== WebSocket.OPEN) return;
    if (payload !== undefined) s.send(JSON.stringify({ type, ...(payload as object) }));
    else s.send(JSON.stringify({ type }));
  }

  async function reconnect() {
    error.value = "Cloudflare Worker 后端暂不支持断线重连";
    throw new Error(error.value);
  }

  function disconnect(_consented: boolean = true) {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    handleClose();
    canUndo.value = false;
    canRedo.value = false;
  }

  function syncFromRoom(_r?: unknown) {
    // Worker 端状态由 onmessage 驱动，无需轮询
  }

  return {
    room,
    error,
    connecting,
    phase,
    hostSessionId,
    maxPlayers,
    mySessionId,
    isHost,
    lobbySlots,
    players,
    cities,
    currentPlayerId,
    isGameOver,
    canUndo,
    canRedo,
    logs,
    createRoom,
    joinRoom,
    send,
    reconnect,
    disconnect,
    syncFromRoom,
  };
}
