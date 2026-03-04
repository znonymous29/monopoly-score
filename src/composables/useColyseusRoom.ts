import { ref, shallowRef, computed } from "vue";
import { Client, Room } from "@colyseus/sdk";

const COLYSEUS_WS = (() => {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const envWs = env.VITE_COLYSEUS_WS;
  if (envWs) return envWs;
  const pathOnly = env.VITE_COLYSEUS_WS_PATH;
  if (pathOnly && typeof window !== "undefined")
    return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}${pathOnly}`;
  if (typeof window !== "undefined")
    return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:2567`;
  return "ws://localhost:2567";
})();

const LS_RECONNECT_TOKEN_KEY = "monopoly:reconnectToken";
const LS_CLIENT_ID_KEY = "monopoly:clientId";

function getOrCreateClientId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const existing = window.localStorage.getItem(LS_CLIENT_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  window.localStorage.setItem(LS_CLIENT_ID_KEY, id);
  return id;
}

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

export interface TransferRecord {
  fromId: string;
  toId: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export function useColyseusRoom() {
  const client = shallowRef<Client | null>(null);
  const room = shallowRef<Room | null>(null);
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
  const transferHistory = ref<TransferRecord[]>([]);

  function persistReconnectToken(r: Room) {
    if (typeof window === "undefined") return;
    const token = (r as unknown as { reconnectionToken?: string })
      .reconnectionToken;
    if (token) localStorage.setItem(LS_RECONNECT_TOKEN_KEY, token);
  }

  function clearReconnectToken() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LS_RECONNECT_TOKEN_KEY);
  }

  function syncFromRoom(r: Room) {
    const state = (r as Room & { state?: Record<string, unknown> }).state;
    if (!state) return;
    const newPhase = (state.phase as "lobby" | "playing") ?? "disconnected";
    if (newPhase === "playing") stopSyncPoll();
    phase.value = newPhase;
    hostSessionId.value = (state.hostSessionId as string) ?? "";
    maxPlayers.value = (state.maxPlayers as number) ?? 4;
    currentPlayerId.value = (state.currentPlayerId as string) ?? "";
    isGameOver.value = (state.isGameOver as boolean) ?? false;
    canUndo.value = (state.canUndo as boolean) ?? false;
    canRedo.value = (state.canRedo as boolean) ?? false;

    const lobbySlotsMap = state.lobbySlots as
      | { forEach: (cb: (v: { sessionId?: string; name?: string; color?: string }, k: string) => void) => void }
      | undefined;
    if (lobbySlotsMap?.forEach) {
      const slots: LobbySlot[] = [];
      lobbySlotsMap.forEach((s, _k) => {
        slots.push({
          sessionId: String(s?.sessionId ?? ""),
          name: String(s?.name ?? ""),
          color: String(s?.color ?? "#1976D2"),
        });
      });
      lobbySlots.value = slots;
    }

    const playersMap = state.players as
      | {
          forEach: (
            cb: (
              v: {
                id: string;
                name: string;
                color: string;
                cash: number;
                bankrupt: boolean;
              },
              k: string,
            ) => void,
          ) => void;
        }
      | undefined;
    if (playersMap?.forEach) {
      const plist: RoomPlayer[] = [];
      playersMap.forEach((p) => {
        plist.push({
          id: p.id ?? "",
          name: p.name ?? "",
          color: p.color ?? "#1976D2",
          cash: p.cash ?? 0,
          bankrupt: p.bankrupt ?? false,
        });
      });
      players.value = plist;
    }

    const citiesMap = state.cities as
      | {
          forEach: (
            cb: (
              v: {
                cityName: string;
                ownerId: string;
                houseCount: number;
                hasResort: boolean;
                isMortgaged: boolean;
              },
              k: string,
            ) => void,
          ) => void;
        }
      | undefined;
    if (citiesMap?.forEach) {
      const clist: RoomCityState[] = [];
      citiesMap.forEach((c) => {
        clist.push({
          cityName: c.cityName ?? "",
          ownerId: c.ownerId ?? "",
          houseCount: c.houseCount ?? 0,
          hasResort: c.hasResort ?? false,
          isMortgaged: c.isMortgaged ?? false,
        });
      });
      cities.value = clist;
    }

    // 同步操作日志（服务端 ArraySchema 可能非普通数组，用 Array.from 兼容）
    const logsRaw = state.logs;
    if (logsRaw != null) {
      const arr = Array.isArray(logsRaw)
        ? (logsRaw as RoomLogItem[])
        : Array.from((logsRaw as Iterable<{ message?: string; time?: string; color?: string }>) || []);
      logs.value = arr.map((l) => ({
        message: String(l?.message ?? ""),
        time: String(l?.time ?? ""),
        color: String(l?.color ?? "primary"),
      }));
    }

    // 同步资金流动历史（服务端维护）
    const transfersRaw = state.transferHistory;
    if (transfersRaw != null) {
      const arr = Array.isArray(transfersRaw)
        ? (transfersRaw as TransferRecord[])
        : Array.from(
            (transfersRaw as Iterable<{
              fromId?: string;
              toId?: string;
              amount?: number;
              reason?: string;
              timestamp?: number;
            }>) || [],
          );
      transferHistory.value = arr.map((t) => ({
        fromId: String(t?.fromId ?? ""),
        toId: String(t?.toId ?? ""),
        amount: Number(t?.amount ?? 0),
        reason: String(t?.reason ?? ""),
        timestamp: Number(t?.timestamp ?? 0),
      }));
    } else {
      transferHistory.value = [];
    }
  }

  let syncPollTimer: ReturnType<typeof setInterval> | null = null;

  function startSyncPoll(r: Room) {
    stopSyncPoll();
    syncPollTimer = setInterval(() => {
      if (phase.value === "lobby" && room.value) syncFromRoom(r);
    }, 250);
  }

  function stopSyncPoll() {
    if (syncPollTimer) {
      clearInterval(syncPollTimer);
      syncPollTimer = null;
    }
  }

  function handleUnexpectedLeave() {
    // 非主动 leave（掉线/刷新等）：保留重连 token，回到未连接界面
    stopSyncPoll();
    room.value = null;
    client.value = null;
    phase.value = "disconnected";
    hostSessionId.value = "";
    lobbySlots.value = [];
    players.value = [];
    cities.value = [];
    logs.value = [];
    transferHistory.value = [];
  }

  async function createRoom(maxPlayersCount: number) {
    error.value = null;
    connecting.value = true;
    try {
      const c = new Client(COLYSEUS_WS);
      client.value = c;
      const r = await c.joinOrCreate("monopoly", {
        maxPlayers: Math.min(Math.max(maxPlayersCount, 2), 6),
        clientId,
      });
      room.value = r;
      mySessionId.value = r.sessionId;
      persistReconnectToken(r);
      syncFromRoom(r);
      r.onStateChange(() => syncFromRoom(r));
      r.onLeave(() => handleUnexpectedLeave());
      startSyncPoll(r);
      return r;
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
    try {
      const c = new Client(COLYSEUS_WS);
      client.value = c;
      const r = await c.joinById(roomId, { clientId });
      room.value = r;
      mySessionId.value = r.sessionId;
      persistReconnectToken(r);
      syncFromRoom(r);
      r.onStateChange(() => syncFromRoom(r));
      r.onLeave(() => handleUnexpectedLeave());
      startSyncPoll(r);
      return r;
    } catch (e) {
      error.value = (e as Error).message ?? "加入失败";
      throw e;
    } finally {
      connecting.value = false;
    }
  }

  function send(type: string, payload?: unknown) {
    room.value?.send(type as never, payload as never);
  }

  async function reconnect() {
    error.value = null;
    connecting.value = true;
    try {
      if (typeof window === "undefined") {
        throw new Error("当前环境不支持重连");
      }
      const token = localStorage.getItem(LS_RECONNECT_TOKEN_KEY);
      if (!token) throw new Error("无可用重连信息");
      const c = new Client(COLYSEUS_WS);
      client.value = c;
      const r = await (
        c as unknown as { reconnect: (t: string) => Promise<Room> }
      ).reconnect(token);
      room.value = r;
      mySessionId.value = r.sessionId;
      persistReconnectToken(r);
      syncFromRoom(r);
      r.onStateChange(() => syncFromRoom(r));
      r.onLeave(() => handleUnexpectedLeave());
      startSyncPoll(r);
      return r;
    } catch (e) {
      error.value = (e as Error).message ?? "重连失败";
      clearReconnectToken();
      throw e;
    } finally {
      connecting.value = false;
    }
  }

  function disconnect(consented: boolean = true) {
    stopSyncPoll();
    if (consented) clearReconnectToken();
    (
      room.value as unknown as { leave?: (c?: boolean) => void } | null
    )?.leave?.(consented);
    room.value = null;
    client.value = null;
    phase.value = "disconnected";
    mySessionId.value = "";
    hostSessionId.value = "";
    lobbySlots.value = [];
    players.value = [];
    cities.value = [];
    logs.value = [];
    transferHistory.value = [];
    canUndo.value = false;
    canRedo.value = false;
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
    transferHistory,
    createRoom,
    joinRoom,
    send,
    reconnect,
    disconnect,
    syncFromRoom,
  };
}
