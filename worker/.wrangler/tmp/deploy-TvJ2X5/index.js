var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/MonopolyRoomDO.ts
import { DurableObject } from "cloudflare:workers";

// src/cityConfigs.ts
var CITY_CONFIG_MAP = {
  \u5357\u660C: { name: "\u5357\u660C", color: "#207735", landPrice: 1800, mortgagePrice: 1080, redeemPrice: 1260, housePrice: 1e3, resortPrice: 1e3, baseFee: 140, house1Fee: 750, house2Fee: 2300, house3Fee: 6e3, resortFee: 8500 },
  \u547C\u548C\u6D69\u7279: { name: "\u547C\u548C\u6D69\u7279", color: "#207735", landPrice: 2e3, mortgagePrice: 1180, redeemPrice: 1520, housePrice: 1500, resortPrice: 1500, baseFee: 160, house1Fee: 750, house2Fee: 2150, house3Fee: 6080, resortFee: 8e3 },
  \u5357\u4EAC: { name: "\u5357\u4EAC", color: "#502F6B", landPrice: 3e3, mortgagePrice: 1800, redeemPrice: 2100, housePrice: 2e3, resortPrice: 2e3, baseFee: 260, house1Fee: 1300, house2Fee: 3900, house3Fee: 9e3, resortFee: 12750 },
  \u6566\u714C: { name: "\u6566\u714C", color: "#502F6B", landPrice: 1e3, mortgagePrice: 600, redeemPrice: 700, housePrice: 500, resortPrice: 500, baseFee: 60, house1Fee: 300, house2Fee: 900, house3Fee: 2700, resortFee: 5500 },
  \u5317\u4EAC: { name: "\u5317\u4EAC", color: "#502F6B", landPrice: 2600, mortgagePrice: 1560, redeemPrice: 1820, housePrice: 1500, resortPrice: 1500, baseFee: 220, house1Fee: 1100, house2Fee: 3300, house3Fee: 8e3, resortFee: 11500 },
  \u5929\u6D25: { name: "\u5929\u6D25", color: "#943673", landPrice: 2600, mortgagePrice: 1560, redeemPrice: 1820, housePrice: 1500, resortPrice: 1500, baseFee: 220, house1Fee: 1100, house2Fee: 3300, house3Fee: 8e3, resortFee: 11500 },
  \u54C8\u5C14\u6EE8: { name: "\u54C8\u5C14\u6EE8", color: "#943673", landPrice: 2800, mortgagePrice: 1680, redeemPrice: 1960, housePrice: 1500, resortPrice: 1500, baseFee: 240, house1Fee: 1200, house2Fee: 3600, house3Fee: 8500, resortFee: 12e3 },
  \u4E0A\u6D77: { name: "\u4E0A\u6D77", color: "#C51B25", landPrice: 3e3, mortgagePrice: 1800, redeemPrice: 2100, housePrice: 2e3, resortPrice: 2e3, baseFee: 260, house1Fee: 1300, house2Fee: 3900, house3Fee: 9e3, resortFee: 12750 },
  \u897F\u5B89: { name: "\u897F\u5B89", color: "#C51B25", landPrice: 2e3, mortgagePrice: 1200, redeemPrice: 1400, housePrice: 1e3, resortPrice: 1e3, baseFee: 160, house1Fee: 800, house2Fee: 2200, house3Fee: 6e3, resortFee: 8e3 },
  \u9752\u5C9B: { name: "\u9752\u5C9B", color: "#207735", landPrice: 2400, mortgagePrice: 1440, redeemPrice: 1680, housePrice: 1500, resortPrice: 1500, baseFee: 200, house1Fee: 1e3, house2Fee: 3e3, house3Fee: 7500, resortFee: 11e3 },
  \u957F\u6C99: { name: "\u957F\u6C99", color: "#207735", landPrice: 2200, mortgagePrice: 1320, redeemPrice: 1540, housePrice: 1500, resortPrice: 1500, baseFee: 180, house1Fee: 900, house2Fee: 2500, house3Fee: 7e3, resortFee: 10500 },
  \u6842\u6797: { name: "\u6842\u6797", color: "#0C416D", landPrice: 2200, mortgagePrice: 1320, redeemPrice: 1540, housePrice: 1500, resortPrice: 1500, baseFee: 180, house1Fee: 900, house2Fee: 2500, house3Fee: 7e3, resortFee: 10500 },
  \u676D\u5DDE: { name: "\u676D\u5DDE", color: "#207735", landPrice: 3200, mortgagePrice: 1920, redeemPrice: 2240, housePrice: 2e3, resortPrice: 2e3, baseFee: 280, house1Fee: 1500, house2Fee: 4500, house3Fee: 1e4, resortFee: 14e3 },
  \u6B66\u6C49: { name: "\u6B66\u6C49", color: "#207735", landPrice: 2200, mortgagePrice: 1320, redeemPrice: 1540, housePrice: 1500, resortPrice: 1500, baseFee: 180, house1Fee: 900, house2Fee: 2500, house3Fee: 7e3, resortFee: 10500 },
  \u91CD\u5E86: { name: "\u91CD\u5E86", color: "#207735", landPrice: 1800, mortgagePrice: 1080, redeemPrice: 1260, housePrice: 1e3, resortPrice: 1e3, baseFee: 140, house1Fee: 700, house2Fee: 2e3, house3Fee: 5500, resortFee: 9500 },
  \u6210\u90FD: { name: "\u6210\u90FD", color: "#C14D90", landPrice: 2800, mortgagePrice: 1680, redeemPrice: 1960, housePrice: 1500, resortPrice: 1500, baseFee: 240, house1Fee: 1200, house2Fee: 3600, house3Fee: 8500, resortFee: 12e3 },
  \u4E4C\u9C81\u6728\u9F50: { name: "\u4E4C\u9C81\u6728\u9F50", color: "#C14D90", landPrice: 1600, mortgagePrice: 1080, redeemPrice: 1260, housePrice: 1e3, resortPrice: 1e3, baseFee: 120, house1Fee: 700, house2Fee: 2e3, house3Fee: 5500, resortFee: 9500 },
  \u62C9\u8428: { name: "\u62C9\u8428", color: "#C14D90", landPrice: 1400, mortgagePrice: 840, redeemPrice: 980, housePrice: 1e3, resortPrice: 1e3, baseFee: 100, house1Fee: 500, house2Fee: 1500, house3Fee: 4500, resortFee: 7500 },
  \u5927\u7406: { name: "\u5927\u7406", color: "#0C416D", landPrice: 3200, mortgagePrice: 1560, redeemPrice: 1820, housePrice: 1500, resortPrice: 1500, baseFee: 220, house1Fee: 1100, house2Fee: 3300, house3Fee: 8e3, resortFee: 11500 },
  \u4E09\u4E9A: { name: "\u4E09\u4E9A", color: "#0C416D", landPrice: 3500, mortgagePrice: 2100, redeemPrice: 2450, housePrice: 2e3, resortPrice: 2e3, baseFee: 350, house1Fee: 1750, house2Fee: 5e3, house3Fee: 11e3, resortFee: 15e3 },
  \u53F0\u5317: { name: "\u53F0\u5317", color: "#C51B25", landPrice: 4e3, mortgagePrice: 2400, redeemPrice: 2800, housePrice: 2e3, resortPrice: 2e3, baseFee: 500, house1Fee: 2e3, house2Fee: 6e3, house3Fee: 14e3, resortFee: 2e4 },
  \u9999\u6E2F: { name: "\u9999\u6E2F", color: "#C51B25", landPrice: 3e3, mortgagePrice: 1880, redeemPrice: 2450, housePrice: 2250, resortPrice: 2250, baseFee: 200, house1Fee: 1e3, house2Fee: 3e3, house3Fee: 9e3, resortFee: 12500 },
  \u53A6\u95E8: { name: "\u53A6\u95E8", color: "#E3AC41", landPrice: 3500, mortgagePrice: 2100, redeemPrice: 2450, housePrice: 2e3, resortPrice: 2e3, baseFee: 350, house1Fee: 1750, house2Fee: 5e3, house3Fee: 11e3, resortFee: 15e3 },
  \u6DF1\u5733: { name: "\u6DF1\u5733", color: "#E3AC41", landPrice: 3200, mortgagePrice: 1920, redeemPrice: 2240, housePrice: 2e3, resortPrice: 2e3, baseFee: 280, house1Fee: 1500, house2Fee: 4500, house3Fee: 1e4, resortFee: 14e3 },
  \u5E7F\u5DDE: { name: "\u5E7F\u5DDE", color: "#E3AC41", landPrice: 2600, mortgagePrice: 1560, redeemPrice: 1820, housePrice: 500, resortPrice: 500, baseFee: 220, house1Fee: 1100, house2Fee: 3300, house3Fee: 8e3, resortFee: 11500 },
  \u6FB3\u95E8: { name: "\u6FB3\u95E8", color: "#E3AC41", landPrice: 2800, mortgagePrice: 1700, redeemPrice: 2e3, housePrice: 500, resortPrice: 500, baseFee: 240, house1Fee: 1200, house2Fee: 3600, house3Fee: 8500, resortFee: 12e3 }
};

// src/MonopolyRoomDO.ts
var CITY_NAMES = Object.keys(CITY_CONFIG_MAP);
var START_MONEY = 1e4;
var MAX_HISTORY = 50;
var COLOR_PRESETS = [
  "#1976D2",
  "#C2185B",
  "#00796B",
  "#F57C00",
  "#7B1FA2",
  "#388E3C",
  "#D32F2F",
  "#0097A7"
];
var RECONNECT_GRACE_MS = 6e4;
var MonopolyRoomDO = class extends DurableObject {
  state;
  playerOrder = [];
  quitSessions = /* @__PURE__ */ new Set();
  historyStack = [];
  historyIndex = -1;
  sessions = /* @__PURE__ */ new Map();
  // ws -> sessionId
  sessionIdToClientId = /* @__PURE__ */ new Map();
  // 用于断线重连：按 clientId 找回 sessionId
  disconnectedReconnectUntil = /* @__PURE__ */ new Map();
  // sessionId -> 允许重连的截止时间戳
  disconnectTimers = /* @__PURE__ */ new Map();
  // sessionId -> 超时定时器
  locked = false;
  hostClientId = null;
  constructor(ctx, env) {
    super(ctx, env);
    this.state = this.initialState();
  }
  initialState(maxPlayers = 4) {
    const lobbySlots = {};
    for (let i = 0; i < maxPlayers; i++) {
      lobbySlots[String(i)] = {
        sessionId: "",
        name: "",
        color: COLOR_PRESETS[i % COLOR_PRESETS.length],
        clientId: ""
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
      logs: []
    };
  }
  async fetch(request) {
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const max = Math.min(Math.max(Number(body?.maxPlayers) || 4, 2), 6);
        this.state = this.initialState(max);
        const creatorClientId = request.headers.get("X-Client-Id");
        if (creatorClientId && !this.hostClientId) {
          this.hostClientId = creatorClientId;
          this.state.hostSessionId = "";
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch {
        return new Response(JSON.stringify({ error: "bad request" }), { status: 400 });
      }
    }
    const upgrade = request.headers.get("Upgrade");
    if (!upgrade || upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId") || crypto.randomUUID();
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    let sessionId;
    if (this.state.phase === "playing") {
      const now = Date.now();
      const reconnectingSessionId = [...this.sessionIdToClientId.entries()].find(
        ([sid, cid]) => cid === clientId && this.disconnectedReconnectUntil.has(sid) && now < (this.disconnectedReconnectUntil.get(sid) ?? 0)
      )?.[0];
      if (reconnectingSessionId) {
        sessionId = reconnectingSessionId;
        const timer = this.disconnectTimers.get(sessionId);
        if (timer)
          clearTimeout(timer);
        this.disconnectTimers.delete(sessionId);
        this.disconnectedReconnectUntil.delete(sessionId);
        this.sessions.set(server, sessionId);
        if (this.hostClientId === clientId)
          this.state.hostSessionId = sessionId;
        this.addLog(`\u300C${this.state.players[sessionId]?.name ?? "\u67D0\u73A9\u5BB6"}\u300D\u5DF2\u91CD\u65B0\u8FDE\u63A5\u3002`, "secondary");
      } else {
        server.close(4400, "Game in progress, reconnection window expired");
        return new Response(null, { status: 101, webSocket: client });
      }
    } else {
      sessionId = crypto.randomUUID();
      this.sessionIdToClientId.set(sessionId, clientId);
      this.sessions.set(server, sessionId);
      if (!this.hostClientId) {
        this.hostClientId = clientId;
        this.state.hostSessionId = sessionId;
      } else if (this.hostClientId === clientId) {
        this.state.hostSessionId = sessionId;
      }
      let slot = Object.values(this.state.lobbySlots).find((s) => s.clientId === clientId);
      if (slot) {
        slot.sessionId = sessionId;
      } else {
        for (let i = 0; i < this.state.maxPlayers; i++) {
          const key = String(i);
          const s = this.state.lobbySlots[key];
          const empty = !s.sessionId && (!s.clientId || s.clientId === clientId);
          if (empty) {
            s.sessionId = sessionId;
            s.clientId = clientId;
            if (!s.name)
              s.name = `\u73A9\u5BB6${i + 1}`;
            break;
          }
        }
      }
    }
    server.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(ev.data);
        this.handleMessage(sessionId, data);
      } catch {
      }
    });
    server.addEventListener("close", () => this.onLeave(server));
    this.send(server, { type: "welcome", sessionId });
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }
  send(ws, msg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
    }
  }
  broadcast() {
    const msg = { type: "state", state: this.serializeState() };
    this.sessions.forEach((_, ws) => this.send(ws, msg));
  }
  serializeState() {
    return JSON.parse(JSON.stringify(this.state));
  }
  handleMessage(sessionId, data) {
    const t = data.type;
    if (t === "setPlayerName") {
      if (this.state.phase !== "lobby")
        return;
      const slot = this.findSlotBySession(sessionId);
      if (!slot)
        return;
      slot.name = String(data.name ?? "").trim().slice(0, 20);
    } else if (t === "setPlayerColor") {
      if (this.state.phase !== "lobby")
        return;
      const slot = this.findSlotBySession(sessionId);
      if (!slot || !data.color)
        return;
      const used = new Set(
        Object.values(this.state.lobbySlots).filter((s) => s.sessionId && s.sessionId !== sessionId).map((s) => s.color)
      );
      if (used.has(String(data.color)))
        return;
      slot.color = String(data.color);
    } else if (t === "startGame") {
      if (this.state.phase !== "lobby" || this.state.hostSessionId !== sessionId)
        return;
      const slots = Object.values(this.state.lobbySlots).filter((s) => s.sessionId);
      if (slots.length < 2)
        return;
      this.startGameFromLobby();
    } else if (t === "setCurrentPlayer") {
      if (this.state.phase !== "playing" || this.state.isGameOver || this.state.hostSessionId !== sessionId)
        return;
      const pid = data.playerId;
      const p = pid ? this.state.players[pid] : null;
      if (p && !p.bankrupt) {
        this.state.currentPlayerId = pid;
        this.addLog(`\u5F53\u524D\u56DE\u5408\u5207\u6362\u4E3A\u73A9\u5BB6\u300C${p.name}\u300D\u3002`, "secondary");
      }
    } else if (t === "buyLand")
      this.handleGameAction(sessionId, data.cityName, "buyLand");
    else if (t === "buildHouse")
      this.handleGameAction(sessionId, data.cityName, "buildHouse");
    else if (t === "buildResort")
      this.handleGameAction(sessionId, data.cityName, "buildResort");
    else if (t === "mortgage")
      this.handleGameAction(sessionId, data.cityName, "mortgage");
    else if (t === "redeem")
      this.handleGameAction(sessionId, data.cityName, "redeem");
    else if (t === "passStart")
      this.handleGameAction(sessionId, null, "passStart");
    else if (t === "housingCrash")
      this.handleGameAction(sessionId, null, "housingCrash");
    else if (t === "commonProsperity")
      this.handleGameAction(sessionId, null, "commonProsperity");
    else if (t === "addCustomMoney")
      this.handleGameAction(sessionId, Number(data.amount ?? 0), "addCustomMoney");
    else if (t === "subtractCustomMoney")
      this.handleGameAction(sessionId, Number(data.amount ?? 0), "subtractCustomMoney");
    else if (t === "collectFee")
      this.handleCollectFee(sessionId, data.cityName, data.visitorId);
    else if (t === "destroyBuildings")
      this.handleDestroyBuildings(data.cityName);
    else if (t === "angelDescends")
      this.handleAngelDescends(sessionId, data.cityName);
    else if (t === "buyCityWithFee")
      this.handleBuyCityWithFee(sessionId, data.cityName);
    else if (t === "swapProperty")
      this.handleSwapProperty(sessionId, data.sourceCityName, data.targetCityName);
    else if (t === "restartGame") {
      if (this.state.phase !== "playing" || this.state.hostSessionId !== sessionId)
        return;
      this.startGameFromLobby();
    } else if (t === "quitGame") {
      if (this.state.phase === "playing")
        this.quitSessions.add(sessionId);
    } else if (t === "undo") {
      if (this.state.phase === "playing")
        this.undo();
    } else if (t === "redo") {
      if (this.state.phase === "playing")
        this.redo();
    }
    this.broadcast();
  }
  findSlotBySession(sessionId) {
    return Object.values(this.state.lobbySlots).find((s) => s.sessionId === sessionId);
  }
  onLeave(ws) {
    const sessionId = this.sessions.get(ws);
    if (!sessionId)
      return;
    this.sessions.delete(ws);
    if (this.state.phase === "lobby") {
      const slot = this.findSlotBySession(sessionId);
      if (slot) {
        slot.sessionId = "";
      }
      this.broadcast();
      return;
    }
    if (this.state.phase === "playing") {
      const isQuit = this.quitSessions.has(sessionId);
      if (isQuit)
        this.quitSessions.delete(sessionId);
      const name = this.state.players[sessionId]?.name ?? "\u67D0\u73A9\u5BB6";
      if (isQuit) {
        this.removePlayerFromGame(sessionId, name);
        return;
      }
      const until = Date.now() + RECONNECT_GRACE_MS;
      this.disconnectedReconnectUntil.set(sessionId, until);
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(sessionId);
        this.disconnectedReconnectUntil.delete(sessionId);
        this.removePlayerFromGame(sessionId, this.state.players[sessionId]?.name ?? "\u67D0\u73A9\u5BB6");
      }, RECONNECT_GRACE_MS);
      this.disconnectTimers.set(sessionId, timer);
      this.addLog(`\u300C${name}\u300D\u6682\u65F6\u65AD\u7EBF\uFF0C${RECONNECT_GRACE_MS / 1e3} \u79D2\u5185\u53EF\u91CD\u8FDE\u3002`, "secondary");
      this.broadcast();
    }
  }
  removePlayerFromGame(sessionId, name) {
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
      const next = this.playerOrder.find((id) => this.state.players[id] && !this.state.players[id].bankrupt);
      this.state.currentPlayerId = next ?? "";
    }
    this.addLog(`\u300C${name}\u300D\u9000\u51FA\u6E38\u620F\uFF0C\u5176\u540D\u4E0B\u5730\u4EA7\u5DF2\u91CD\u7F6E\u3002`, "secondary");
    this.broadcast();
  }
  startGameFromLobby() {
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
      const p = {
        id: slot.sessionId,
        name: slot.name || "\u73A9\u5BB6",
        color: slot.color,
        cash: START_MONEY,
        bankrupt: false
      };
      this.state.players[p.id] = p;
      if (!firstId)
        firstId = p.id;
    }
    this.state.currentPlayerId = firstId;
    for (const name of CITY_NAMES) {
      this.state.cities[name] = {
        cityName: name,
        ownerId: "",
        houseCount: 0,
        hasResort: false,
        isMortgaged: false
      };
    }
    this.addLog("\u6E38\u620F\u5DF2\u5F00\u59CB\u3002", "primary");
    this.historyStack = [];
    this.historyIndex = -1;
    this.saveStateToHistory();
  }
  addLog(message, color) {
    this.state.logs.push({
      message,
      time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      color
    });
    if (this.state.logs.length > 100)
      this.state.logs.shift();
  }
  getCityConfig(cityName) {
    return CITY_CONFIG_MAP[cityName] ?? null;
  }
  hasMonoColor(city) {
    if (!city.ownerId || city.isMortgaged)
      return false;
    const cfg = this.getCityConfig(city.cityName);
    if (!cfg)
      return false;
    for (const c of Object.values(this.state.cities)) {
      const cCfg = this.getCityConfig(c.cityName);
      if (cCfg?.color === cfg.color && (c.ownerId !== city.ownerId || c.isMortgaged))
        return false;
    }
    return true;
  }
  snapshotGameState() {
    const players = {};
    for (const [id, p] of Object.entries(this.state.players))
      players[id] = { id: p.id, name: p.name, color: p.color, cash: p.cash, bankrupt: p.bankrupt };
    const cities = {};
    for (const c of Object.values(this.state.cities))
      cities[c.cityName] = { cityName: c.cityName, ownerId: c.ownerId, houseCount: c.houseCount, hasResort: c.hasResort, isMortgaged: c.isMortgaged };
    return {
      players,
      cities,
      logs: [...this.state.logs],
      currentPlayerId: this.state.currentPlayerId,
      isGameOver: this.state.isGameOver
    };
  }
  restoreGameState(snap) {
    this.state.players = { ...snap.players };
    this.state.cities = {};
    for (const c of Object.values(snap.cities))
      this.state.cities[c.cityName] = { ...c };
    this.state.logs = [...snap.logs];
    this.state.currentPlayerId = snap.currentPlayerId;
    this.state.isGameOver = snap.isGameOver;
  }
  saveStateToHistory() {
    if (this.state.phase !== "playing")
      return;
    const snap = this.snapshotGameState();
    if (this.historyIndex < this.historyStack.length - 1)
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    this.historyStack.push(snap);
    if (this.historyStack.length > MAX_HISTORY) {
      this.historyStack.shift();
      this.historyIndex--;
    } else
      this.historyIndex = this.historyStack.length - 1;
    this.state.canUndo = this.historyIndex > 0;
    this.state.canRedo = this.historyIndex < this.historyStack.length - 1;
  }
  undo() {
    if (this.historyIndex <= 0)
      return;
    this.historyIndex--;
    this.restoreGameState(this.historyStack[this.historyIndex]);
    this.state.canUndo = this.historyIndex > 0;
    this.state.canRedo = this.historyIndex < this.historyStack.length - 1;
    this.addLog("\u5DF2\u64A4\u9500\u4E0A\u4E00\u6B65\u64CD\u4F5C\u3002", "warning");
  }
  redo() {
    if (this.historyIndex >= this.historyStack.length - 1)
      return;
    this.historyIndex++;
    this.restoreGameState(this.historyStack[this.historyIndex]);
    this.state.canUndo = this.historyIndex > 0;
    this.state.canRedo = this.historyIndex < this.historyStack.length - 1;
    this.addLog("\u5DF2\u91CD\u505A\u64CD\u4F5C\u3002", "info");
  }
  handleGameAction(sessionId, payload, action) {
    if (this.state.phase !== "playing" || this.state.isGameOver)
      return;
    const player = this.state.players[sessionId];
    if (!player || player.bankrupt)
      return;
    const cityName = typeof payload === "string" ? payload : null;
    const amount = typeof payload === "number" ? payload : 0;
    switch (action) {
      case "buyLand":
        if (cityName)
          this.doBuyLand(player, cityName);
        break;
      case "buildHouse":
        if (cityName)
          this.doBuildHouse(player, cityName);
        break;
      case "buildResort":
        if (cityName)
          this.doBuildResort(player, cityName);
        break;
      case "mortgage":
        if (cityName)
          this.doMortgage(player, cityName);
        break;
      case "redeem":
        if (cityName)
          this.doRedeem(player, cityName);
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
        if (amount > 0)
          this.doAddCustomMoney(player, amount);
        break;
      case "subtractCustomMoney":
        if (amount > 0)
          this.doSubtractCustomMoney(player, amount);
        break;
    }
    this.saveStateToHistory();
  }
  calcFee(city) {
    if (!city.ownerId || city.isMortgaged)
      return 0;
    const cfg = this.getCityConfig(city.cityName);
    if (!cfg)
      return 0;
    let fee = cfg.baseFee;
    if (city.hasResort)
      fee = cfg.resortFee;
    else if (city.houseCount === 3)
      fee = cfg.house3Fee;
    else if (city.houseCount === 2)
      fee = cfg.house2Fee;
    else if (city.houseCount === 1)
      fee = cfg.house1Fee;
    if (this.hasMonoColor(city))
      fee *= 2;
    return fee;
  }
  doBuyLand(player, cityName) {
    const city = this.state.cities[cityName];
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId || !cfg || player.cash < cfg.landPrice)
      return;
    player.cash -= cfg.landPrice;
    city.ownerId = player.id;
    this.addLog(`\u73A9\u5BB6\u300C${player.name}\u300D\u4EE5 \xA5${cfg.landPrice.toLocaleString()} \u8D2D\u4E70\u4E86\u300C${cityName}\u300D\u7A7A\u5730\u3002`, "primary");
    this.checkBankruptcy();
  }
  doBuildHouse(player, cityName) {
    const city = this.state.cities[cityName];
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId !== player.id || city.isMortgaged || city.hasResort || (city.houseCount ?? 0) >= 3 || !cfg || player.cash < cfg.housePrice)
      return;
    player.cash -= cfg.housePrice;
    city.houseCount = (city.houseCount ?? 0) + 1;
    this.addLog(`\u73A9\u5BB6\u300C${player.name}\u300D\u5728\u300C${cityName}\u300D\u65B0\u5EFA 1 \u95F4\u6C11\u5BBF\uFF08\u5F53\u524D\u5171 ${city.houseCount} \u95F4\uFF09\uFF0C\u82B1\u8D39 \xA5${cfg.housePrice.toLocaleString()}\u3002`, "green");
    this.checkBankruptcy();
  }
  doBuildResort(player, cityName) {
    const city = this.state.cities[cityName];
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId !== player.id || city.isMortgaged || city.hasResort || city.houseCount !== 3 || !cfg || player.cash < cfg.resortPrice)
      return;
    player.cash -= cfg.resortPrice;
    city.hasResort = true;
    this.addLog(`\u73A9\u5BB6\u300C${player.name}\u300D\u5728\u300C${cityName}\u300D\u5EFA\u6210\u5EA6\u5047\u6751\uFF0C\u82B1\u8D39 \xA5${cfg.resortPrice.toLocaleString()}\u3002`, "deep-purple");
    this.checkBankruptcy();
  }
  doMortgage(player, cityName) {
    const city = this.state.cities[cityName];
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId !== player.id || city.isMortgaged || !cfg)
      return;
    city.isMortgaged = true;
    player.cash += cfg.mortgagePrice;
    this.addLog(`\u73A9\u5BB6\u300C${player.name}\u300D\u62B5\u62BC\u4E86\u300C${cityName}\u300D\uFF0C\u83B7\u5F97 \xA5${cfg.mortgagePrice.toLocaleString()}\u3002`, "orange");
  }
  doRedeem(player, cityName) {
    const city = this.state.cities[cityName];
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId !== player.id || !city.isMortgaged || !cfg || player.cash < cfg.redeemPrice)
      return;
    city.isMortgaged = false;
    player.cash -= cfg.redeemPrice;
    this.addLog(`\u73A9\u5BB6\u300C${player.name}\u300D\u8D4E\u56DE\u4E86\u300C${cityName}\u300D\uFF0C\u652F\u4ED8 \xA5${cfg.redeemPrice.toLocaleString()}\u3002`, "teal");
    this.checkBankruptcy();
  }
  handleCollectFee(sessionId, cityName, visitorId) {
    if (!cityName || this.state.phase !== "playing" || this.state.isGameOver)
      return;
    const city = this.state.cities[cityName];
    if (!city || !city.ownerId)
      return;
    const owner = this.state.players[city.ownerId];
    if (!owner)
      return;
    const payerId = visitorId ?? sessionId;
    if (payerId === city.ownerId)
      return;
    const visitor = this.state.players[payerId];
    if (!visitor || visitor.bankrupt)
      return;
    if (visitorId != null && city.ownerId !== sessionId)
      return;
    const fee = this.calcFee(city);
    if (fee <= 0)
      return;
    const amountToPay = Math.min(visitor.cash, fee);
    if (amountToPay <= 0)
      return;
    visitor.cash -= amountToPay;
    owner.cash += amountToPay;
    if (amountToPay < fee) {
      visitor.bankrupt = true;
      this.addLog(`\u73A9\u5BB6\u300C${visitor.name}\u300D\u65E0\u6CD5\u652F\u4ED8\u300C${cityName}\u300D\u89C2\u5149\u8D39 \xA5${fee.toLocaleString()}\uFF0C\u5DF2\u652F\u4ED8\u5168\u90E8\u5269\u4F59\u8D44\u91D1 \xA5${amountToPay.toLocaleString()} \u7ED9\u73A9\u5BB6\u300C${owner.name}\u300D\uFF0C\u5E76\u5BA3\u544A\u7834\u4EA7\u3002`, "error");
    } else {
      this.addLog(`\u73A9\u5BB6\u300C${visitor.name}\u300D\u5728\u300C${cityName}\u300D\u652F\u4ED8\u89C2\u5149\u8D39 \xA5${fee.toLocaleString()} \u7ED9\u73A9\u5BB6\u300C${owner.name}\u300D\u3002`, "primary");
    }
    this.checkBankruptcy();
    this.saveStateToHistory();
  }
  handleDestroyBuildings(cityName) {
    if (!cityName || this.state.phase !== "playing" || this.state.isGameOver)
      return;
    const city = this.state.cities[cityName];
    if (!city || !city.ownerId || city.isMortgaged)
      return;
    if ((city.houseCount ?? 0) === 0 && !city.hasResort)
      return;
    const owner = this.state.players[city.ownerId];
    if (!owner)
      return;
    if (city.hasResort) {
      city.hasResort = false;
      this.addLog(`\u3010\u602A\u517D\u6765\u88AD\u3011\u73A9\u5BB6\u300C${owner.name}\u300D\u7684\u300C${cityName}\u300D\u5EA6\u5047\u6751\u88AB\u6467\u6BC1\u4E86\uFF01`, "red");
    } else {
      city.houseCount = (city.houseCount ?? 0) - 1;
      this.addLog(`\u3010\u602A\u517D\u6765\u88AD\u3011\u73A9\u5BB6\u300C${owner.name}\u300D\u7684\u300C${cityName}\u300D1 \u95F4\u6C11\u5BBF\u88AB\u6467\u6BC1\u4E86\uFF01\uFF08\u5269\u4F59 ${city.houseCount} \u95F4\uFF09`, "red");
    }
    this.saveStateToHistory();
  }
  handleAngelDescends(sessionId, cityName) {
    if (!cityName || this.state.phase !== "playing" || this.state.isGameOver)
      return;
    const city = this.state.cities[cityName];
    const seedCfg = this.getCityConfig(cityName);
    if (!city || !city.ownerId || city.ownerId !== sessionId || !seedCfg)
      return;
    const upgraded = [];
    for (const c of Object.values(this.state.cities)) {
      if (c.ownerId !== sessionId)
        continue;
      const cCfg = this.getCityConfig(c.cityName);
      if (!cCfg || cCfg.color !== seedCfg.color || c.hasResort)
        continue;
      if ((c.houseCount ?? 0) < 3) {
        c.houseCount = (c.houseCount ?? 0) + 1;
        upgraded.push(`${c.cityName}(+1\u6C11\u5BBF)`);
      } else {
        c.hasResort = true;
        upgraded.push(`${c.cityName}(+\u5EA6\u5047\u6751)`);
      }
    }
    if (upgraded.length > 0)
      this.addLog(`\u3010\u5929\u4F7F\u964D\u4E34\u3011\u540C\u8272\u5730\u4EA7\u5347\u7EA7\uFF1A${upgraded.join("\u3001")}`, "purple");
    else
      this.addLog(`\u3010\u5929\u4F7F\u964D\u4E34\u3011\u6240\u6709\u540C\u8272\u5730\u4EA7\u5747\u5DF2\u8FBE\u5230\u6700\u9AD8\u7B49\u7EA7\u3002`, "purple");
    this.saveStateToHistory();
  }
  handleBuyCityWithFee(sessionId, cityName) {
    if (!cityName || this.state.phase !== "playing" || this.state.isGameOver)
      return;
    const buyer = this.state.players[sessionId];
    const city = this.state.cities[cityName];
    if (!buyer || buyer.bankrupt || !city || !city.ownerId || city.ownerId === sessionId || city.isMortgaged)
      return;
    const owner = this.state.players[city.ownerId];
    if (!owner)
      return;
    const fee = this.calcFee(city);
    if (fee <= 0 || buyer.cash < fee)
      return;
    buyer.cash -= fee;
    owner.cash += fee;
    city.ownerId = sessionId;
    this.addLog(`\u3010\u62FF\u6765\u5427\u4F60\uFF01\u3011\u73A9\u5BB6\u300C${buyer.name}\u300D\u4EE5 \xA5${fee.toLocaleString()} \u4ECE\u73A9\u5BB6\u300C${owner.name}\u300D\u624B\u4E2D\u4E70\u4E0B\u4E86\u300C${cityName}\u300D\u3002`, "indigo");
    this.checkBankruptcy();
    this.saveStateToHistory();
  }
  handleSwapProperty(sessionId, sourceCityName, targetCityName) {
    if (!sourceCityName || !targetCityName || this.state.phase !== "playing" || this.state.isGameOver)
      return;
    const source = this.state.cities[sourceCityName];
    const target = this.state.cities[targetCityName];
    if (!source || !target || !source.ownerId || !target.ownerId || source.ownerId !== sessionId || source.isMortgaged || target.isMortgaged || source.ownerId === target.ownerId)
      return;
    const swapper = this.state.players[sessionId];
    const targetOwner = this.state.players[target.ownerId];
    if (!swapper || !targetOwner)
      return;
    const temp = source.ownerId;
    source.ownerId = target.ownerId;
    target.ownerId = temp;
    this.addLog(`\u3010\u4EA4\u6362\u623F\u4EA7\u3011\u73A9\u5BB6\u300C${swapper.name}\u300D\u7528\u300C${sourceCityName}\u300D\u4E0E\u73A9\u5BB6\u300C${targetOwner.name}\u300D\u7684\u300C${targetCityName}\u300D\u8FDB\u884C\u4E86\u4EA4\u6362\u3002`, "teal");
    this.saveStateToHistory();
  }
  doPassStart(player) {
    player.cash += 2e3;
    this.addLog(`\u73A9\u5BB6\u300C${player.name}\u300D\u8DEF\u8FC7\u8D77\u70B9\uFF0C\u83B7\u5F97 \xA52,000\u3002`, "success");
    this.checkBankruptcy();
  }
  doHousingCrash(player) {
    player.cash -= 1e3;
    this.addLog(`\u73A9\u5BB6\u300C${player.name}\u300D\u906D\u9047\u697C\u5E02\u66B4\u8DCC\uFF0C\u635F\u5931 \xA51,000\u3002`, "error");
    this.checkBankruptcy();
  }
  doCommonProsperity() {
    const names = [];
    for (const p of Object.values(this.state.players)) {
      if (!p.bankrupt) {
        p.cash += 1e3;
        names.push(`\u300C${p.name}\u300D`);
      }
    }
    this.addLog(`\u3010\u5171\u540C\u5BCC\u88D5\u3011\u6240\u6709\u73A9\u5BB6 ${names.join("\u3001")} \u5404\u83B7\u5F97 \xA51,000\u3002`, "teal");
  }
  doAddCustomMoney(player, amount) {
    player.cash += amount;
    this.addLog(`\u73A9\u5BB6\u300C${player.name}\u300D\u589E\u52A0 \xA5${amount.toLocaleString()}\u3002`, "success");
  }
  doSubtractCustomMoney(player, amount) {
    player.cash -= amount;
    this.addLog(`\u73A9\u5BB6\u300C${player.name}\u300D\u51CF\u5C11 \xA5${amount.toLocaleString()}\u3002`, "error");
    this.checkBankruptcy();
  }
  checkBankruptcy() {
    for (const p of Object.values(this.state.players)) {
      if (!p.bankrupt && p.cash < 0) {
        p.bankrupt = true;
        this.addLog(`\u73A9\u5BB6\u300C${p.name}\u300D\u8D44\u91D1\u5DF2\u4F4E\u4E8E 0\uFF0C\u5BA3\u544A\u7834\u4EA7\u3002`, "error");
      }
    }
    const withCash = Object.values(this.state.players).filter((p) => p.cash > 0);
    if (withCash.length === 1) {
      this.state.isGameOver = true;
      this.addLog(`\u4EC5\u5269\u73A9\u5BB6\u300C${withCash[0].name}\u300D\u6709\u8D44\u91D1\uFF0C\u6E38\u620F\u7ED3\u675F\uFF0C${withCash[0].name} \u83B7\u80DC\uFF01`, "success");
    }
  }
};
__name(MonopolyRoomDO, "MonopolyRoomDO");

// src/index.ts
function parsePath(url) {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  } catch {
    return [];
  }
}
__name(parsePath, "parsePath");
function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Client-Id",
    "Access-Control-Max-Age": "86400"
  };
}
__name(corsHeaders, "corsHeaders");
function jsonResponse(body, status, request) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) }
  });
}
__name(jsonResponse, "jsonResponse");
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    const path = parsePath(request.url);
    if (request.method === "POST" && path[0] === "create") {
      const url = new URL(request.url);
      const maxPlayers = Math.min(
        Math.max(parseInt(url.searchParams.get("maxPlayers") ?? "4", 10), 2),
        6
      );
      const hostClientId = request.headers.get("X-Client-Id") || void 0;
      const roomId = crypto.randomUUID();
      const id = env.MONOPOLY_ROOM.idFromName(roomId);
      const stub = env.MONOPOLY_ROOM.get(id);
      const initUrl = new URL(request.url);
      initUrl.pathname = `/room/${roomId}`;
      await stub.fetch(new Request(initUrl.toString(), {
        method: "POST",
        body: JSON.stringify({ maxPlayers }),
        headers: {
          "Content-Type": "application/json",
          ...hostClientId ? { "X-Client-Id": hostClientId } : {}
        }
      }));
      return jsonResponse(JSON.stringify({ roomId }), 201, request);
    }
    if (request.method === "GET" && path[0] === "room" && path[1]) {
      const roomId = path[1];
      const upgrade = request.headers.get("Upgrade");
      if (!upgrade || upgrade.toLowerCase() !== "websocket") {
        return jsonResponse("Expected WebSocket upgrade", 426, request);
      }
      const id = env.MONOPOLY_ROOM.idFromName(roomId);
      const stub = env.MONOPOLY_ROOM.get(id);
      return stub.fetch(request);
    }
    return jsonResponse(
      JSON.stringify({
        usage: {
          "POST /create?maxPlayers=4": "Create room, returns { roomId }",
          "GET /room/:roomId": "WebSocket connect to room"
        }
      }),
      200,
      request
    );
  }
};
export {
  MonopolyRoomDO,
  src_default as default
};
//# sourceMappingURL=index.js.map
