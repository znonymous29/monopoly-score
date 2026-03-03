/**
 * Durable Object：大富翁房间状态与消息处理
 * 协议：JSON 消息 { type, ...payload }，服务端广播 { type: "state", state } 全量状态
 */

import { DurableObject } from "cloudflare:workers";
import { CITY_CONFIG_MAP, type CityConfig } from "./cityConfigs.js";

const CITY_NAMES = Object.keys(CITY_CONFIG_MAP);
const START_MONEY = 10000;
const MAX_HISTORY = 50;
const COLOR_PRESETS = [
  "#1976D2", "#C2185B", "#00796B", "#F57C00", "#7B1FA2", "#388E3C", "#D32F2F", "#0097A7",
];

// 与 Colyseus schema 同构的纯数据
interface LobbySlot {
  sessionId: string;
  name: string;
  color: string;
}
interface Player {
  id: string;
  name: string;
  color: string;
  cash: number;
  bankrupt: boolean;
}
interface CityState {
  cityName: string;
  ownerId: string;
  houseCount: number;
  hasResort: boolean;
  isMortgaged: boolean;
}
interface LogItem {
  message: string;
  time: string;
  color: string;
}
interface RoomState {
  phase: "lobby" | "playing";
  hostSessionId: string;
  maxPlayers: number;
  lobbySlots: Record<string, LobbySlot>;
  players: Record<string, Player>;
  cities: Record<string, CityState>;
  currentPlayerId: string;
  isGameOver: boolean;
  canUndo: boolean;
  canRedo: boolean;
  logs: LogItem[];
}
interface GameStateSnapshot {
  players: Record<string, { id: string; name: string; color: string; cash: number; bankrupt: boolean }>;
  cities: Record<string, { cityName: string; ownerId: string; houseCount: number; hasResort: boolean; isMortgaged: boolean }>;
  logs: LogItem[];
  currentPlayerId: string;
  isGameOver: boolean;
}

type Env = Record<string, unknown>;

export class MonopolyRoomDO extends DurableObject<Env> {
  private state!: RoomState;
  private playerOrder: string[] = [];
  private quitSessions = new Set<string>();
  private historyStack: GameStateSnapshot[] = [];
  private historyIndex = -1;
  private sessions = new Map<WebSocket, string>(); // ws -> sessionId
  private locked = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.state = this.initialState();
  }

  private initialState(maxPlayers = 4): RoomState {
    const lobbySlots: Record<string, LobbySlot> = {};
    for (let i = 0; i < maxPlayers; i++) {
      lobbySlots[String(i)] = {
        sessionId: "",
        name: "",
        color: COLOR_PRESETS[i % COLOR_PRESETS.length],
      };
    }
    return {
      phase: "lobby",
      hostSessionId: "",
      maxPlayers,
      lobbySlots,
      players: {},
      cities: {},
      currentPlayerId: "",
      isGameOver: false,
      canUndo: false,
      canRedo: false,
      logs: [],
    };
  }

  async fetch(request: Request): Promise<Response> {
    // POST body { maxPlayers }：初始化房间（由 Worker /create 调用）
    if (request.method === "POST") {
      try {
        const body = (await request.json()) as { maxPlayers?: number };
        const max = Math.min(Math.max(Number(body?.maxPlayers) || 4, 2), 6);
        this.state = this.initialState(max);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "bad request" }), { status: 400 });
      }
    }

    const upgrade = request.headers.get("Upgrade");
    if (!upgrade || upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    const sessionId = crypto.randomUUID();
    this.sessions.set(server, sessionId);

    if (this.state.hostSessionId === "") this.state.hostSessionId = sessionId;
    if (this.state.phase === "lobby") {
      for (let i = 0; i < this.state.maxPlayers; i++) {
        const key = String(i);
        const slot = this.state.lobbySlots[key]!;
        if (!slot.sessionId) {
          slot.sessionId = sessionId;
          slot.name = `玩家${i + 1}`;
          break;
        }
      }
    }

    server.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as { type: string; [k: string]: unknown };
        this.handleMessage(sessionId, data);
      } catch {
        // ignore parse error
      }
    });
    server.addEventListener("close", () => this.onLeave(sessionId, server));

    this.send(server, { type: "welcome", sessionId });
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  private send(ws: WebSocket, msg: unknown) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }

  private broadcast() {
    const msg = { type: "state", state: this.serializeState() };
    this.sessions.forEach((_, ws) => this.send(ws, msg));
  }

  private serializeState(): RoomState {
    return JSON.parse(JSON.stringify(this.state));
  }

  private handleMessage(sessionId: string, data: { type: string; [k: string]: unknown }) {
    const t = data.type;
    if (t === "setPlayerName") {
      if (this.state.phase !== "lobby") return;
      const slot = this.findSlotBySession(sessionId);
      if (!slot) return;
      slot.name = String(data.name ?? "").trim().slice(0, 20);
    } else if (t === "setPlayerColor") {
      if (this.state.phase !== "lobby") return;
      const slot = this.findSlotBySession(sessionId);
      if (!slot || !data.color) return;
      const used = new Set(
        Object.values(this.state.lobbySlots)
          .filter((s) => s.sessionId && s.sessionId !== sessionId)
          .map((s) => s.color),
      );
      if (used.has(String(data.color))) return;
      slot.color = String(data.color);
    } else if (t === "startGame") {
      if (this.state.phase !== "lobby" || this.state.hostSessionId !== sessionId) return;
      const slots = Object.values(this.state.lobbySlots).filter((s) => s.sessionId);
      if (slots.length < 2) return;
      this.startGameFromLobby();
    } else if (t === "setCurrentPlayer") {
      if (this.state.phase !== "playing" || this.state.isGameOver || this.state.hostSessionId !== sessionId) return;
      const pid = data.playerId as string;
      const p = pid ? this.state.players[pid] : null;
      if (p && !p.bankrupt) {
        this.state.currentPlayerId = pid;
        this.addLog(`当前回合切换为玩家「${p.name}」。`, "secondary");
      }
    } else if (t === "buyLand") this.handleGameAction(sessionId, data.cityName as string | null, "buyLand");
    else if (t === "buildHouse") this.handleGameAction(sessionId, data.cityName as string | null, "buildHouse");
    else if (t === "buildResort") this.handleGameAction(sessionId, data.cityName as string | null, "buildResort");
    else if (t === "mortgage") this.handleGameAction(sessionId, data.cityName as string | null, "mortgage");
    else if (t === "redeem") this.handleGameAction(sessionId, data.cityName as string | null, "redeem");
    else if (t === "passStart") this.handleGameAction(sessionId, null, "passStart");
    else if (t === "housingCrash") this.handleGameAction(sessionId, null, "housingCrash");
    else if (t === "commonProsperity") this.handleGameAction(sessionId, null, "commonProsperity");
    else if (t === "addCustomMoney") this.handleGameAction(sessionId, Number(data.amount ?? 0), "addCustomMoney");
    else if (t === "subtractCustomMoney") this.handleGameAction(sessionId, Number(data.amount ?? 0), "subtractCustomMoney");
    else if (t === "collectFee") this.handleCollectFee(sessionId, data.cityName as string, data.visitorId as string | undefined);
    else if (t === "destroyBuildings") this.handleDestroyBuildings(data.cityName as string);
    else if (t === "angelDescends") this.handleAngelDescends(sessionId, data.cityName as string);
    else if (t === "buyCityWithFee") this.handleBuyCityWithFee(sessionId, data.cityName as string);
    else if (t === "swapProperty") this.handleSwapProperty(sessionId, data.sourceCityName as string, data.targetCityName as string);
    else if (t === "restartGame") {
      if (this.state.phase !== "playing" || this.state.hostSessionId !== sessionId) return;
      this.startGameFromLobby();
    } else if (t === "quitGame") {
      if (this.state.phase === "playing") this.quitSessions.add(sessionId);
    } else if (t === "undo") {
      if (this.state.phase === "playing") this.undo();
    } else if (t === "redo") {
      if (this.state.phase === "playing") this.redo();
    }
    this.broadcast();
  }

  private findSlotBySession(sessionId: string): LobbySlot | undefined {
    return Object.values(this.state.lobbySlots).find((s) => s.sessionId === sessionId);
  }

  private onLeave(sessionId: string, ws: WebSocket) {
    this.sessions.delete(ws);
    if (this.state.phase === "lobby") {
      const slot = this.findSlotBySession(sessionId);
      if (slot) {
        slot.sessionId = "";
        slot.name = "";
      }
      if (this.state.hostSessionId === sessionId) {
        const first = Object.values(this.state.lobbySlots).find((s) => s.sessionId);
        this.state.hostSessionId = first?.sessionId ?? "";
      }
      this.broadcast();
      return;
    }
    if (this.state.phase === "playing") {
      const isQuit = this.quitSessions.has(sessionId);
      if (isQuit) this.quitSessions.delete(sessionId);
      const name = this.state.players[sessionId]?.name ?? "某玩家";
      for (const c of Object.values(this.state.cities)) {
        if (c.ownerId === sessionId) {
          c.ownerId = "";
          c.houseCount = 0;
          c.hasResort = false;
          c.isMortgaged = false;
        }
      }
      delete this.state.players[sessionId];
      this.playerOrder = this.playerOrder.filter((id) => id !== sessionId);
      if (this.state.currentPlayerId === sessionId) {
        const next = this.playerOrder.find((id) => this.state.players[id] && !this.state.players[id]!.bankrupt);
        this.state.currentPlayerId = next ?? "";
      }
      this.addLog(`「${name}」退出游戏，其名下地产已重置。`, "secondary");
      this.broadcast();
    }
  }

  private startGameFromLobby() {
    this.state.phase = "playing";
    this.locked = true;
    this.state.players = {};
    this.state.cities = {};
    this.state.logs = [];
    this.state.currentPlayerId = "";
    this.state.isGameOver = false;
    const slots = Object.values(this.state.lobbySlots).filter((s) => s.sessionId);
    this.playerOrder = slots.map((s) => s.sessionId);
    let firstId = "";
    for (const slot of slots) {
      const p: Player = {
        id: slot.sessionId,
        name: slot.name || "玩家",
        color: slot.color,
        cash: START_MONEY,
        bankrupt: false,
      };
      this.state.players[p.id] = p;
      if (!firstId) firstId = p.id;
    }
    this.state.currentPlayerId = firstId;
    for (const name of CITY_NAMES) {
      this.state.cities[name] = {
        cityName: name,
        ownerId: "",
        houseCount: 0,
        hasResort: false,
        isMortgaged: false,
      };
    }
    this.addLog("游戏已开始。", "primary");
    this.historyStack = [];
    this.historyIndex = -1;
    this.saveStateToHistory();
  }

  private addLog(message: string, color: string) {
    this.state.logs.push({
      message,
      time: new Date().toLocaleTimeString(),
      color,
    });
    if (this.state.logs.length > 100) this.state.logs.shift();
  }

  private getCityConfig(cityName: string): CityConfig | null {
    return CITY_CONFIG_MAP[cityName] ?? null;
  }

  private hasMonoColor(city: CityState): boolean {
    if (!city.ownerId || city.isMortgaged) return false;
    const cfg = this.getCityConfig(city.cityName);
    if (!cfg) return false;
    for (const c of Object.values(this.state.cities)) {
      const cCfg = this.getCityConfig(c.cityName);
      if (cCfg?.color === cfg.color && (c.ownerId !== city.ownerId || c.isMortgaged)) return false;
    }
    return true;
  }

  private snapshotGameState(): GameStateSnapshot {
    const players: GameStateSnapshot["players"] = {};
    for (const [id, p] of Object.entries(this.state.players))
      players[id] = { id: p.id, name: p.name, color: p.color, cash: p.cash, bankrupt: p.bankrupt };
    const cities: GameStateSnapshot["cities"] = {};
    for (const c of Object.values(this.state.cities))
      cities[c.cityName] = { cityName: c.cityName, ownerId: c.ownerId, houseCount: c.houseCount, hasResort: c.hasResort, isMortgaged: c.isMortgaged };
    return {
      players,
      cities,
      logs: [...this.state.logs],
      currentPlayerId: this.state.currentPlayerId,
      isGameOver: this.state.isGameOver,
    };
  }

  private restoreGameState(snap: GameStateSnapshot) {
    this.state.players = { ...snap.players };
    this.state.cities = {};
    for (const c of Object.values(snap.cities)) this.state.cities[c.cityName] = { ...c };
    this.state.logs = [...snap.logs];
    this.state.currentPlayerId = snap.currentPlayerId;
    this.state.isGameOver = snap.isGameOver;
  }

  private saveStateToHistory() {
    if (this.state.phase !== "playing") return;
    const snap = this.snapshotGameState();
    if (this.historyIndex < this.historyStack.length - 1)
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    this.historyStack.push(snap);
    if (this.historyStack.length > MAX_HISTORY) {
      this.historyStack.shift();
      this.historyIndex--;
    } else this.historyIndex = this.historyStack.length - 1;
    this.state.canUndo = this.historyIndex > 0;
    this.state.canRedo = this.historyIndex < this.historyStack.length - 1;
  }

  private undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restoreGameState(this.historyStack[this.historyIndex]!);
    this.state.canUndo = this.historyIndex > 0;
    this.state.canRedo = this.historyIndex < this.historyStack.length - 1;
    this.addLog("已撤销上一步操作。", "warning");
  }

  private redo() {
    if (this.historyIndex >= this.historyStack.length - 1) return;
    this.historyIndex++;
    this.restoreGameState(this.historyStack[this.historyIndex]!);
    this.state.canUndo = this.historyIndex > 0;
    this.state.canRedo = this.historyIndex < this.historyStack.length - 1;
    this.addLog("已重做操作。", "info");
  }

  private handleGameAction(sessionId: string, payload: string | number | null, action: string) {
    if (this.state.phase !== "playing" || this.state.isGameOver) return;
    const player = this.state.players[sessionId];
    if (!player || player.bankrupt) return;
    const cityName = typeof payload === "string" ? payload : null;
    const amount = typeof payload === "number" ? payload : 0;

    switch (action) {
      case "buyLand":
        if (cityName) this.doBuyLand(player, cityName);
        break;
      case "buildHouse":
        if (cityName) this.doBuildHouse(player, cityName);
        break;
      case "buildResort":
        if (cityName) this.doBuildResort(player, cityName);
        break;
      case "mortgage":
        if (cityName) this.doMortgage(player, cityName);
        break;
      case "redeem":
        if (cityName) this.doRedeem(player, cityName);
        break;
      case "passStart":
        this.doPassStart(player);
        break;
      case "housingCrash":
        this.doHousingCrash(player);
        break;
      case "commonProsperity":
        this.doCommonProsperity();
        break;
      case "addCustomMoney":
        if (amount > 0) this.doAddCustomMoney(player, amount);
        break;
      case "subtractCustomMoney":
        if (amount > 0) this.doSubtractCustomMoney(player, amount);
        break;
    }
    this.saveStateToHistory();
  }

  private calcFee(city: CityState): number {
    if (!city.ownerId || city.isMortgaged) return 0;
    const cfg = this.getCityConfig(city.cityName);
    if (!cfg) return 0;
    let fee = cfg.baseFee;
    if (city.hasResort) fee = cfg.resortFee;
    else if (city.houseCount === 3) fee = cfg.house3Fee;
    else if (city.houseCount === 2) fee = cfg.house2Fee;
    else if (city.houseCount === 1) fee = cfg.house1Fee;
    if (this.hasMonoColor(city)) fee *= 2;
    return fee;
  }

  private doBuyLand(player: Player, cityName: string) {
    const city = this.state.cities[cityName];
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId || !cfg || player.cash < cfg.landPrice) return;
    player.cash -= cfg.landPrice;
    city.ownerId = player.id;
    this.addLog(`玩家「${player.name}」以 ¥${cfg.landPrice.toLocaleString()} 购买了「${cityName}」空地。`, "primary");
    this.checkBankruptcy();
  }

  private doBuildHouse(player: Player, cityName: string) {
    const city = this.state.cities[cityName];
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId !== player.id || city.isMortgaged || city.hasResort || (city.houseCount ?? 0) >= 3 || !cfg || player.cash < cfg.housePrice) return;
    player.cash -= cfg.housePrice;
    city.houseCount = (city.houseCount ?? 0) + 1;
    this.addLog(`玩家「${player.name}」在「${cityName}」新建 1 间民宿（当前共 ${city.houseCount} 间），花费 ¥${cfg.housePrice.toLocaleString()}。`, "green");
    this.checkBankruptcy();
  }

  private doBuildResort(player: Player, cityName: string) {
    const city = this.state.cities[cityName];
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId !== player.id || city.isMortgaged || city.hasResort || city.houseCount !== 3 || !cfg || player.cash < cfg.resortPrice) return;
    player.cash -= cfg.resortPrice;
    city.hasResort = true;
    this.addLog(`玩家「${player.name}」在「${cityName}」建成度假村，花费 ¥${cfg.resortPrice.toLocaleString()}。`, "deep-purple");
    this.checkBankruptcy();
  }

  private doMortgage(player: Player, cityName: string) {
    const city = this.state.cities[cityName];
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId !== player.id || city.isMortgaged || !cfg) return;
    city.isMortgaged = true;
    player.cash += cfg.mortgagePrice;
    this.addLog(`玩家「${player.name}」抵押了「${cityName}」，获得 ¥${cfg.mortgagePrice.toLocaleString()}。`, "orange");
  }

  private doRedeem(player: Player, cityName: string) {
    const city = this.state.cities[cityName];
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId !== player.id || !city.isMortgaged || !cfg || player.cash < cfg.redeemPrice) return;
    city.isMortgaged = false;
    player.cash -= cfg.redeemPrice;
    this.addLog(`玩家「${player.name}」赎回了「${cityName}」，支付 ¥${cfg.redeemPrice.toLocaleString()}。`, "teal");
    this.checkBankruptcy();
  }

  private handleCollectFee(sessionId: string, cityName: string | undefined, visitorId: string | undefined) {
    if (!cityName || this.state.phase !== "playing" || this.state.isGameOver) return;
    const city = this.state.cities[cityName];
    if (!city || !city.ownerId) return;
    const owner = this.state.players[city.ownerId];
    if (!owner) return;
    const payerId = visitorId ?? sessionId;
    if (payerId === city.ownerId) return;
    const visitor = this.state.players[payerId];
    if (!visitor || visitor.bankrupt) return;
    if (visitorId != null && city.ownerId !== sessionId) return;
    const fee = this.calcFee(city);
    if (fee <= 0) return;
    const amountToPay = Math.min(visitor.cash, fee);
    if (amountToPay <= 0) return;
    visitor.cash -= amountToPay;
    owner.cash += amountToPay;
    if (amountToPay < fee) {
      visitor.bankrupt = true;
      this.addLog(`玩家「${visitor.name}」无法支付「${cityName}」观光费 ¥${fee.toLocaleString()}，已支付全部剩余资金 ¥${amountToPay.toLocaleString()} 给玩家「${owner.name}」，并宣告破产。`, "error");
    } else {
      this.addLog(`玩家「${visitor.name}」在「${cityName}」支付观光费 ¥${fee.toLocaleString()} 给玩家「${owner.name}」。`, "primary");
    }
    this.checkBankruptcy();
    this.saveStateToHistory();
  }

  private handleDestroyBuildings(cityName: string | undefined) {
    if (!cityName || this.state.phase !== "playing" || this.state.isGameOver) return;
    const city = this.state.cities[cityName];
    if (!city || !city.ownerId || city.isMortgaged) return;
    if ((city.houseCount ?? 0) === 0 && !city.hasResort) return;
    const owner = this.state.players[city.ownerId];
    if (!owner) return;
    if (city.hasResort) {
      city.hasResort = false;
      this.addLog(`【怪兽来袭】玩家「${owner.name}」的「${cityName}」度假村被摧毁了！`, "red");
    } else {
      city.houseCount = (city.houseCount ?? 0) - 1;
      this.addLog(`【怪兽来袭】玩家「${owner.name}」的「${cityName}」1 间民宿被摧毁了！（剩余 ${city.houseCount} 间）`, "red");
    }
    this.saveStateToHistory();
  }

  private handleAngelDescends(sessionId: string, cityName: string | undefined) {
    if (!cityName || this.state.phase !== "playing" || this.state.isGameOver) return;
    const city = this.state.cities[cityName];
    const seedCfg = this.getCityConfig(cityName);
    if (!city || !city.ownerId || city.ownerId !== sessionId || !seedCfg) return;
    const upgraded: string[] = [];
    for (const c of Object.values(this.state.cities)) {
      if (c.ownerId !== sessionId) continue;
      const cCfg = this.getCityConfig(c.cityName);
      if (!cCfg || cCfg.color !== seedCfg.color || c.hasResort) continue;
      if ((c.houseCount ?? 0) < 3) {
        c.houseCount = (c.houseCount ?? 0) + 1;
        upgraded.push(`${c.cityName}(+1民宿)`);
      } else {
        c.hasResort = true;
        upgraded.push(`${c.cityName}(+度假村)`);
      }
    }
    if (upgraded.length > 0) this.addLog(`【天使降临】同色地产升级：${upgraded.join("、")}`, "purple");
    else this.addLog(`【天使降临】所有同色地产均已达到最高等级。`, "purple");
    this.saveStateToHistory();
  }

  private handleBuyCityWithFee(sessionId: string, cityName: string | undefined) {
    if (!cityName || this.state.phase !== "playing" || this.state.isGameOver) return;
    const buyer = this.state.players[sessionId];
    const city = this.state.cities[cityName];
    if (!buyer || buyer.bankrupt || !city || !city.ownerId || city.ownerId === sessionId || city.isMortgaged) return;
    const owner = this.state.players[city.ownerId];
    if (!owner) return;
    const fee = this.calcFee(city);
    if (fee <= 0 || buyer.cash < fee) return;
    buyer.cash -= fee;
    owner.cash += fee;
    city.ownerId = sessionId;
    this.addLog(`【拿来吧你！】玩家「${buyer.name}」以 ¥${fee.toLocaleString()} 从玩家「${owner.name}」手中买下了「${cityName}」。`, "indigo");
    this.checkBankruptcy();
    this.saveStateToHistory();
  }

  private handleSwapProperty(sessionId: string, sourceCityName: string | undefined, targetCityName: string | undefined) {
    if (!sourceCityName || !targetCityName || this.state.phase !== "playing" || this.state.isGameOver) return;
    const source = this.state.cities[sourceCityName];
    const target = this.state.cities[targetCityName];
    if (!source || !target || !source.ownerId || !target.ownerId || source.ownerId !== sessionId || source.isMortgaged || target.isMortgaged || source.ownerId === target.ownerId) return;
    const swapper = this.state.players[sessionId];
    const targetOwner = this.state.players[target.ownerId];
    if (!swapper || !targetOwner) return;
    const temp = source.ownerId;
    source.ownerId = target.ownerId;
    target.ownerId = temp;
    this.addLog(`【交换房产】玩家「${swapper.name}」用「${sourceCityName}」与玩家「${targetOwner.name}」的「${targetCityName}」进行了交换。`, "teal");
    this.saveStateToHistory();
  }

  private doPassStart(player: Player) {
    player.cash += 2000;
    this.addLog(`玩家「${player.name}」路过起点，获得 ¥2,000。`, "success");
    this.checkBankruptcy();
  }

  private doHousingCrash(player: Player) {
    player.cash -= 1000;
    this.addLog(`玩家「${player.name}」遭遇楼市暴跌，损失 ¥1,000。`, "error");
    this.checkBankruptcy();
  }

  private doCommonProsperity() {
    const names: string[] = [];
    for (const p of Object.values(this.state.players)) {
      if (!p.bankrupt) {
        p.cash += 1000;
        names.push(`「${p.name}」`);
      }
    }
    this.addLog(`【共同富裕】所有玩家 ${names.join("、")} 各获得 ¥1,000。`, "teal");
  }

  private doAddCustomMoney(player: Player, amount: number) {
    player.cash += amount;
    this.addLog(`玩家「${player.name}」增加 ¥${amount.toLocaleString()}。`, "success");
  }

  private doSubtractCustomMoney(player: Player, amount: number) {
    player.cash -= amount;
    this.addLog(`玩家「${player.name}」减少 ¥${amount.toLocaleString()}。`, "error");
    this.checkBankruptcy();
  }

  private checkBankruptcy() {
    for (const p of Object.values(this.state.players)) {
      if (!p.bankrupt && p.cash < 0) {
        p.bankrupt = true;
        this.addLog(`玩家「${p.name}」资金已低于 0，宣告破产。`, "error");
      }
    }
    const withCash = Object.values(this.state.players).filter((p) => p.cash > 0);
    if (withCash.length === 1) {
      this.state.isGameOver = true;
      this.addLog(`仅剩玩家「${withCash[0]!.name}」有资金，游戏结束，${withCash[0]!.name} 获胜！`, "success");
    }
  }
}
