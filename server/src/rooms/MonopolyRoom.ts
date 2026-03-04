import { Room, Client } from "colyseus";
import {
  MonopolyState,
  LobbySlot,
  Player,
  CityState,
  LogItem,
  TransferRecord,
} from "../schema/MonopolyState.js";
import { CITY_CONFIG_MAP } from "../data/cityConfigs.js";

const CITY_NAMES = Object.keys(CITY_CONFIG_MAP);

const START_MONEY = 10000;
const MAX_HISTORY = 50;

interface GameStateSnapshot {
  players: Record<
    string,
    { id: string; name: string; color: string; cash: number; bankrupt: boolean }
  >;
  cities: Record<
    string,
    {
      cityName: string;
      ownerId: string;
      houseCount: number;
      hasResort: boolean;
      isMortgaged: boolean;
    }
  >;
  logs: { message: string; time: string; color: string }[];
  transferHistory: {
    fromId: string;
    toId: string;
    amount: number;
    reason: string;
    timestamp: number;
  }[];
  currentPlayerId: string;
  isGameOver: boolean;
}
const COLOR_PRESETS = [
  "#1976D2",
  "#C2185B",
  "#00796B",
  "#F57C00",
  "#7B1FA2",
  "#388E3C",
  "#D32F2F",
  "#0097A7",
];

export class MonopolyRoom extends Room {
  state = new MonopolyState();
  /** 玩家回合顺序（sessionId 列表） */
  private playerOrder: string[] = [];
  /** 主动退出的玩家（用于与掉线区分） */
  private quitSessions = new Set<string>();
  /** 撤销/重做：游戏状态历史（仅 playing 阶段） */
  private historyStack: GameStateSnapshot[] = [];
  private historyIndex = -1;
  /** 与 Worker 版本一致：使用 clientId 识别设备/玩家 */
  private hostClientId: string | null = null;

  onCreate(options: { maxPlayers?: number }) {
    this.state.phase = "lobby";
    this.state.maxPlayers = Math.min(Math.max(options?.maxPlayers ?? 4, 2), 6);
    // 预创建空槽位
    for (let i = 0; i < this.state.maxPlayers; i++) {
      const slot = new LobbySlot();
      slot.sessionId = "";
      slot.name = "";
      slot.color = COLOR_PRESETS[i % COLOR_PRESETS.length];
      this.state.lobbySlots.set(String(i), slot);
    }

    this.setMetadata({
      maxPlayers: this.state.maxPlayers,
    });

    // 使用 onMessage 显式注册，避免 this.messages 在 onCreate 内赋值不生效
    this.onMessage("setPlayerName", (client, payload: { name?: string }) => {
      if (this.state.phase !== "lobby") return;
      const slot = this.findSlotBySession(client.sessionId);
      if (!slot) return;
      // 允许清空名称；仅做长度限制，空字符串不强制改为「玩家」
      const name = String(payload?.name ?? "")
        .trim()
        .slice(0, 20);
      slot.name = name;
      console.log("[lobby] setPlayerName", client.sessionId, name || "(空)");
    });

    this.onMessage("setPlayerColor", (client, payload: { color?: string }) => {
      if (this.state.phase !== "lobby") return;
      const slot = this.findSlotBySession(client.sessionId);
      if (!slot) return;
      if (!payload?.color) return;
      const usedByOthers = new Set(
        Array.from(this.state.lobbySlots.values())
          .filter((s) => s.sessionId && s.sessionId !== client.sessionId)
          .map((s) => s.color),
      );
      if (usedByOthers.has(payload.color)) return;
      slot.color = payload.color;
      console.log("[lobby] setPlayerColor", client.sessionId, payload.color);
    });

    this.onMessage("startGame", (client) => {
      if (this.state.phase !== "lobby") return;
      if (this.state.hostSessionId !== client.sessionId) return;
      const slots = Array.from(this.state.lobbySlots.values()).filter(
        (s) => s.sessionId,
      );
      if (slots.length < 2) return;
      console.log("[lobby] startGame", client.sessionId);
      this.startGameFromLobby();
    });

    // 游戏内消息
    this.onMessage(
      "setCurrentPlayer",
      (client, payload: { playerId?: string }) => {
        if (this.state.phase !== "playing" || this.state.isGameOver) return;
        if (this.state.hostSessionId !== client.sessionId) return;
        const playerId = payload?.playerId;
        if (!playerId) return;
        const p = this.state.players.get(playerId);
        if (p && !p.bankrupt) {
          this.state.currentPlayerId = playerId;
          this.addLog(`当前回合切换为玩家「${p.name}」。`, "secondary");
        }
      },
    );

    this.onMessage("buyLand", (client, payload: { cityName?: string }) => {
      this.handleGameAction(client, payload?.cityName ?? null, "buyLand");
    });
    this.onMessage("buildHouse", (client, payload: { cityName?: string }) => {
      this.handleGameAction(client, payload?.cityName ?? null, "buildHouse");
    });
    this.onMessage("buildResort", (client, payload: { cityName?: string }) => {
      this.handleGameAction(client, payload?.cityName ?? null, "buildResort");
    });
    this.onMessage("mortgage", (client, payload: { cityName?: string }) => {
      this.handleGameAction(client, payload?.cityName ?? null, "mortgage");
    });
    this.onMessage("redeem", (client, payload: { cityName?: string }) => {
      this.handleGameAction(client, payload?.cityName ?? null, "redeem");
    });
    this.onMessage("passStart", (client) => {
      this.handleGameAction(client, null, "passStart");
    });
    this.onMessage("housingCrash", (client) => {
      this.handleGameAction(client, null, "housingCrash");
    });
    this.onMessage("commonProsperity", (client) => {
      this.handleGameAction(client, null, "commonProsperity");
    });
    this.onMessage("addCustomMoney", (client, payload: { amount?: number }) => {
      this.handleGameAction(
        client,
        Number(payload?.amount ?? 0),
        "addCustomMoney",
      );
    });
    this.onMessage(
      "subtractCustomMoney",
      (client, payload: { amount?: number }) => {
        this.handleGameAction(
          client,
          Number(payload?.amount ?? 0),
          "subtractCustomMoney",
        );
      },
    );
    this.onMessage(
      "collectFee",
      (client, payload: { cityName?: string; visitorId?: string }) => {
        this.handleCollectFee(client, payload?.cityName, payload?.visitorId);
      },
    );
    this.onMessage(
      "destroyBuildings",
      (client, payload: { cityName?: string }) => {
        this.handleDestroyBuildings(payload?.cityName);
      },
    );
    this.onMessage("angelDescends", (client, payload: { cityName?: string }) => {
      this.handleAngelDescends(client, payload?.cityName);
    });
    this.onMessage(
      "buyCityWithFee",
      (client, payload: { cityName?: string }) => {
        this.handleBuyCityWithFee(client, payload?.cityName);
      },
    );
    this.onMessage(
      "swapProperty",
      (client, payload: { sourceCityName?: string; targetCityName?: string }) => {
        this.handleSwapProperty(
          client,
          payload?.sourceCityName,
          payload?.targetCityName,
        );
      },
    );

    /** 仅房主可重新开始游戏，重置所有状态 */
    this.onMessage("restartGame", (client) => {
      if (this.state.phase !== "playing") return;
      if (this.state.hostSessionId !== client.sessionId) return;
      this.startGameFromLobby();
      console.log("[game] restartGame by host", client.sessionId);
    });

    /** 玩家主动退出（客户端会随后 leave），其名下地产将被重置 */
    this.onMessage("quitGame", (client) => {
      if (this.state.phase !== "playing") return;
      this.quitSessions.add(client.sessionId);
    });

    this.onMessage("undo", () => {
      if (this.state.phase !== "playing") return;
      this.undo();
    });
    this.onMessage("redo", () => {
      if (this.state.phase !== "playing") return;
      this.redo();
    });
  }

  onJoin(client: Client, options: Record<string, unknown>) {
    const clientId =
      (options?.clientId as string | undefined) ??
      (options?.["clientId"] as string | undefined) ??
      client.sessionId;
    if (!this.hostClientId) {
      this.hostClientId = clientId;
      this.state.hostSessionId = client.sessionId;
    } else if (this.hostClientId === clientId) {
      // 房主刷新/重连：更新 hostSessionId
      this.state.hostSessionId = client.sessionId;
    }
    // 游戏进行中：lock() 会阻止新加入；断线重连将复用原 sessionId，无需分配槽位
    if (this.state.phase === "playing") return;
    // 优先重用同一 clientId 的槽位，其次分配第一个空槽位
    let target: LobbySlot | undefined;
    for (const slot of this.state.lobbySlots.values()) {
      if ((slot as unknown as { clientId?: string }).clientId === clientId) {
        target = slot;
        break;
      }
    }
    if (!target) {
      // 仅分配“真正空”的槽位：无 session 且无 clientId 或 clientId 正是本人（保留断线者的槽位不被顶替）
      for (let i = 0; i < this.state.maxPlayers; i++) {
        const key = String(i);
        const slot = this.state.lobbySlots.get(key)!;
        const slotClientId = (slot as unknown as { clientId?: string }).clientId;
        const empty = !slot.sessionId && (!slotClientId || slotClientId === clientId);
        if (empty) {
          target = slot;
          break;
        }
      }
    }
    if (target) {
      (target as unknown as { clientId?: string }).clientId = clientId;
      target.sessionId = client.sessionId;
      if (!target.name) {
        // 推断序号
        const index = Array.from(this.state.lobbySlots.values()).indexOf(
          target,
        );
        target.name = `玩家${index + 1}`;
      }
    }
  }

  async onLeave(client: Client, code?: number) {
    if (this.state.phase === "lobby") {
      const slot = this.findSlotBySession(client.sessionId);
      if (slot) {
        // 仅清空当前 sessionId，保留名称和 clientId，便于刷新后恢复
        slot.sessionId = "";
      }
      return;
    }
    if (this.state.phase === "playing") {
      const sessionId = client.sessionId;
      const leavingName = this.state.players.get(sessionId)?.name ?? "某玩家";

      const isQuit = this.quitSessions.has(sessionId);
      if (isQuit) this.quitSessions.delete(sessionId);

      // 掉线/刷新：允许短时间内重连恢复之前状态；主动退出则不允许重连
      if (!isQuit) {
        try {
          await this.allowReconnection(client, 60);
          this.addLog(`「${leavingName}」已重新连接。`, "secondary");
          return;
        } catch {
          // 重连超时，按“退出游戏”处理
        }
      }

      for (const city of this.state.cities.values()) {
        if (city.ownerId === sessionId) {
          city.ownerId = "";
          city.houseCount = 0;
          city.hasResort = false;
          city.isMortgaged = false;
        }
      }
      this.state.players.delete(sessionId);
      this.playerOrder = this.playerOrder.filter((id) => id !== sessionId);
      if (this.state.currentPlayerId === sessionId) {
        const next = this.playerOrder.find((id) => {
          const p = this.state.players.get(id);
          return p && !p.bankrupt;
        });
        this.state.currentPlayerId = next ?? "";
      }
      this.addLog(
        `「${leavingName}」退出游戏，其名下地产已重置。`,
        "secondary",
      );
    }
  }

  findSlotBySession(sessionId: string): LobbySlot | undefined {
    for (const slot of this.state.lobbySlots.values()) {
      if (slot.sessionId === sessionId) return slot;
    }
    return undefined;
  }

  startGameFromLobby() {
    this.state.phase = "playing";
    this.lock(); // 锁房：防止游戏中途新玩家加入，但允许断线重连
    this.state.players.clear();
    this.state.cities.clear();
    this.state.logs.clear();
    this.state.currentPlayerId = "";
    this.state.isGameOver = false;

    const slots = Array.from(this.state.lobbySlots.values()).filter(
      (s) => s.sessionId,
    );
    this.playerOrder = slots.map((s) => s.sessionId);
    let firstId = "";
    for (const slot of slots) {
      const p = new Player();
      p.id = slot.sessionId;
      p.name = slot.name || "玩家";
      p.color = slot.color;
      p.cash = START_MONEY;
      p.bankrupt = false;
      this.state.players.set(p.id, p);
      if (!firstId) firstId = p.id;
    }
    this.state.currentPlayerId = firstId;

    for (const name of CITY_NAMES) {
      const c = new CityState();
      c.cityName = name;
      c.ownerId = "";
      c.houseCount = 0;
      c.hasResort = false;
      c.isMortgaged = false;
      this.state.cities.set(name, c);
    }

    this.addLog("游戏已开始。", "primary");
    this.historyStack = [];
    this.historyIndex = -1;
    this.saveStateToHistory();
  }

  addLog(message: string, color: string) {
    const item = new LogItem();
    item.message = message;
    item.time = new Date().toLocaleTimeString();
    item.color = color;
    this.state.logs.push(item);
    if (this.state.logs.length > 100) {
      this.state.logs.shift();
    }
  }

  private addTransfer(
    fromId: string,
    toId: string,
    amount: number,
    reason: string,
  ) {
    if (!fromId || !toId || fromId === toId) return;
    if (!Number.isFinite(amount) || amount <= 0) return;
    const item = new TransferRecord();
    item.fromId = fromId;
    item.toId = toId;
    item.amount = amount;
    item.reason = reason;
    item.timestamp = Date.now();
    this.state.transferHistory.push(item);
    if (this.state.transferHistory.length > 1000) {
      this.state.transferHistory.shift();
    }
  }

  private snapshotGameState(): GameStateSnapshot {
    const players: GameStateSnapshot["players"] = {};
    this.state.players.forEach((p, id) => {
      players[id] = {
        id: p.id,
        name: p.name,
        color: p.color,
        cash: p.cash,
        bankrupt: p.bankrupt,
      };
    });
    const cities: GameStateSnapshot["cities"] = {};
    this.state.cities.forEach((c) => {
      cities[c.cityName] = {
        cityName: c.cityName,
        ownerId: c.ownerId,
        houseCount: c.houseCount,
        hasResort: c.hasResort,
        isMortgaged: c.isMortgaged,
      };
    });
    const logs = Array.from(this.state.logs).map((l) => ({
      message: l.message,
      time: l.time,
      color: l.color,
    }));
    const transferHistory = Array.from(this.state.transferHistory).map((t) => ({
      fromId: t.fromId,
      toId: t.toId,
      amount: t.amount,
      reason: t.reason,
      timestamp: t.timestamp,
    }));
    return {
      players,
      cities,
      logs,
      transferHistory,
      currentPlayerId: this.state.currentPlayerId,
      isGameOver: this.state.isGameOver,
    };
  }

  private restoreGameState(snap: GameStateSnapshot) {
    this.state.players.clear();
    for (const [id, p] of Object.entries(snap.players)) {
      const P = new Player();
      P.id = id;
      P.name = p.name;
      P.color = p.color;
      P.cash = p.cash;
      P.bankrupt = p.bankrupt;
      this.state.players.set(id, P);
    }
    this.state.cities.clear();
    for (const c of Object.values(snap.cities)) {
      const C = new CityState();
      C.cityName = c.cityName;
      C.ownerId = c.ownerId;
      C.houseCount = c.houseCount;
      C.hasResort = c.hasResort;
      C.isMortgaged = c.isMortgaged;
      this.state.cities.set(c.cityName, C);
    }
    while (this.state.logs.length > 0) this.state.logs.shift();
    for (const l of snap.logs) {
      const L = new LogItem();
      L.message = l.message;
      L.time = l.time;
      L.color = l.color;
      this.state.logs.push(L);
    }
    while (this.state.transferHistory.length > 0)
      this.state.transferHistory.shift();
    for (const t of snap.transferHistory) {
      const T = new TransferRecord();
      T.fromId = t.fromId;
      T.toId = t.toId;
      T.amount = t.amount;
      T.reason = t.reason;
      T.timestamp = t.timestamp;
      this.state.transferHistory.push(T);
    }
    this.state.currentPlayerId = snap.currentPlayerId;
    this.state.isGameOver = snap.isGameOver;
  }

  private saveStateToHistory() {
    if (this.state.phase !== "playing") return;
    const snap = this.snapshotGameState();
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    }
    this.historyStack.push(snap);
    if (this.historyStack.length > MAX_HISTORY) {
      this.historyStack.shift();
      this.historyIndex--;
    } else {
      this.historyIndex = this.historyStack.length - 1;
    }
    this.updateCanUndoRedo();
  }

  private updateCanUndoRedo() {
    this.state.canUndo = this.historyIndex > 0;
    this.state.canRedo = this.historyIndex < this.historyStack.length - 1;
  }

  private undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restoreGameState(this.historyStack[this.historyIndex]!);
    this.updateCanUndoRedo();
    this.addLog("已撤销上一步操作。", "warning");
  }

  private redo() {
    if (this.historyIndex >= this.historyStack.length - 1) return;
    this.historyIndex++;
    this.restoreGameState(this.historyStack[this.historyIndex]!);
    this.updateCanUndoRedo();
    this.addLog("已重做操作。", "info");
  }

  private getCityConfig(cityName: string) {
    return CITY_CONFIG_MAP[cityName] ?? null;
  }

  private hasMonoColor(city: CityState): boolean {
    if (!city.ownerId || city.isMortgaged) return false;
    const cfg = this.getCityConfig(city.cityName);
    if (!cfg) return false;
    for (const c of this.state.cities.values()) {
      const cCfg = this.getCityConfig(c.cityName);
      if (
        cCfg?.color === cfg.color &&
        (c.ownerId !== city.ownerId || c.isMortgaged)
      )
        return false;
    }
    return true; // 同色地产全部由同一玩家持有且未抵押
  }

  handleGameAction(
    client: Client,
    payload: string | number | null,
    action: string,
  ) {
    if (this.state.phase !== "playing" || this.state.isGameOver) return;
    const player = this.state.players.get(client.sessionId);
    if (!player || player.bankrupt) return;
    // 无回合限制，任何玩家均可操作

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

  handleCollectFee(
    client: Client,
    cityName: string | undefined,
    visitorId: string | undefined,
  ) {
    if (!cityName) return;
    if (this.state.phase !== "playing" || this.state.isGameOver) return;
    const city = this.state.cities.get(cityName);
    if (!city || !city.ownerId) return;
    const owner = this.state.players.get(city.ownerId);
    if (!owner) return;

    // 未传 visitorId：发送方为支付方（当前玩家直接支付给地主）
    const payerId = visitorId ?? client.sessionId;
    if (payerId === city.ownerId) return; // 地主不能给自己付
    const visitor = this.state.players.get(payerId);
    if (!visitor || visitor.bankrupt) return;
    // 若传了 visitorId，则只允许地主发起收取
    if (visitorId != null && city.ownerId !== client.sessionId) return;

    const fee = this.calcFee(city);
    if (fee <= 0) return;
    // 资金不足时也允许支付：支付方将剩余资金全部给地主，然后破产
    const amountToPay = Math.min(visitor.cash, fee);
    if (amountToPay <= 0) return;
    visitor.cash -= amountToPay;
    owner.cash += amountToPay;
    this.addTransfer(
      visitor.id,
      owner.id,
      amountToPay,
      `观光费(${cityName})`,
    );
    if (amountToPay < fee) {
      visitor.bankrupt = true;
      this.addLog(
        `玩家「${visitor.name}」无法支付「${cityName}」观光费 ¥${fee.toLocaleString()}，已支付全部剩余资金 ¥${amountToPay.toLocaleString()} 给玩家「${owner.name}」，并宣告破产。`,
        "error",
      );
    } else {
      this.addLog(
        `玩家「${visitor.name}」在「${cityName}」支付观光费 ¥${fee.toLocaleString()} 给玩家「${owner.name}」。`,
        "primary",
      );
    }
    this.checkBankruptcy();
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
    const city = this.state.cities.get(cityName);
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId || !cfg) return;
    if (player.cash < cfg.landPrice) return;
    player.cash -= cfg.landPrice;
    city.ownerId = player.id;
    this.addLog(
      `玩家「${player.name}」以 ¥${cfg.landPrice.toLocaleString()} 购买了「${cityName}」空地。`,
      "primary",
    );
    this.checkBankruptcy();
  }

  private doBuildHouse(player: Player, cityName: string) {
    const city = this.state.cities.get(cityName);
    const cfg = this.getCityConfig(cityName);
    if (
      !city ||
      city.ownerId !== player.id ||
      city.isMortgaged ||
      city.hasResort ||
      city.houseCount >= 3 ||
      !cfg
    )
      return;
    if (player.cash < cfg.housePrice) return;
    player.cash -= cfg.housePrice;
    city.houseCount += 1;
    this.addLog(
      `玩家「${player.name}」在「${cityName}」新建 1 间民宿（当前共 ${city.houseCount} 间），花费 ¥${cfg.housePrice.toLocaleString()}。`,
      "green",
    );
    this.checkBankruptcy();
  }

  private doBuildResort(player: Player, cityName: string) {
    const city = this.state.cities.get(cityName);
    const cfg = this.getCityConfig(cityName);
    if (
      !city ||
      city.ownerId !== player.id ||
      city.isMortgaged ||
      city.hasResort ||
      city.houseCount !== 3 ||
      !cfg
    )
      return;
    if (player.cash < cfg.resortPrice) return;
    player.cash -= cfg.resortPrice;
    city.hasResort = true;
    this.addLog(
      `玩家「${player.name}」在「${cityName}」建成度假村，花费 ¥${cfg.resortPrice.toLocaleString()}。`,
      "deep-purple",
    );
    this.checkBankruptcy();
  }

  private doMortgage(player: Player, cityName: string) {
    const city = this.state.cities.get(cityName);
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId !== player.id || city.isMortgaged || !cfg) return;
    city.isMortgaged = true;
    player.cash += cfg.mortgagePrice;
    this.addLog(
      `玩家「${player.name}」抵押了「${cityName}」，获得 ¥${cfg.mortgagePrice.toLocaleString()}。`,
      "orange",
    );
  }

  private doRedeem(player: Player, cityName: string) {
    const city = this.state.cities.get(cityName);
    const cfg = this.getCityConfig(cityName);
    if (!city || city.ownerId !== player.id || !city.isMortgaged || !cfg)
      return;
    if (player.cash < cfg.redeemPrice) return;
    city.isMortgaged = false;
    player.cash -= cfg.redeemPrice;
    this.addLog(
      `玩家「${player.name}」赎回了「${cityName}」，支付 ¥${cfg.redeemPrice.toLocaleString()}。`,
      "teal",
    );
    this.checkBankruptcy();
  }

  handleDestroyBuildings(cityName: string | undefined) {
    if (!cityName) return;
    if (this.state.phase !== "playing" || this.state.isGameOver) return;
    const city = this.state.cities.get(cityName);
    if (!city || !city.ownerId || city.isMortgaged) return;
    if (city.houseCount === 0 && !city.hasResort) return;
    const owner = this.state.players.get(city.ownerId);
    if (!owner) return;
    let msg = `【怪兽来袭】玩家「${owner.name}」的「${cityName}」`;
    if (city.hasResort) {
      city.hasResort = false;
      msg += "度假村被摧毁了！";
    } else {
      city.houseCount -= 1;
      msg += `1 间民宿被摧毁了！（剩余 ${city.houseCount} 间）`;
    }
    this.addLog(msg, "red");
    this.saveStateToHistory();
  }

  handleAngelDescends(client: Client, cityName: string | undefined) {
    if (!cityName) return;
    if (this.state.phase !== "playing" || this.state.isGameOver) return;
    const city = this.state.cities.get(cityName);
    const seedCfg = this.getCityConfig(cityName);
    if (!city || !city.ownerId || !seedCfg) return;
    // 只能升级自己的地产：触发者必须持有该城市
    if (city.ownerId !== client.sessionId) return;
    const upgradedCities: string[] = [];
    for (const c of this.state.cities.values()) {
      if (c.ownerId !== client.sessionId) continue; // 仅升级自己的同色地产
      const cCfg = this.getCityConfig(c.cityName);
      if (!cCfg || cCfg.color !== seedCfg.color) continue;
      if (c.hasResort) continue;
      if (c.houseCount < 3) {
        c.houseCount += 1;
        upgradedCities.push(`${c.cityName}(+1民宿)`);
      } else {
        c.hasResort = true;
        upgradedCities.push(`${c.cityName}(+度假村)`);
      }
    }
    if (upgradedCities.length > 0) {
      this.addLog(`【天使降临】同色地产升级：${upgradedCities.join("、")}`, "purple");
    } else {
      this.addLog(`【天使降临】所有同色地产均已达到最高等级。`, "purple");
    }
    this.saveStateToHistory();
  }

  handleBuyCityWithFee(client: Client, cityName: string | undefined) {
    if (!cityName) return;
    if (this.state.phase !== "playing" || this.state.isGameOver) return;
    const buyer = this.state.players.get(client.sessionId);
    const city = this.state.cities.get(cityName);
    if (!buyer || buyer.bankrupt || !city || !city.ownerId) return;
    if (city.ownerId === client.sessionId) return;
    if (city.isMortgaged) return;
    const owner = this.state.players.get(city.ownerId);
    if (!owner) return;
    const fee = this.calcFee(city);
    if (fee <= 0 || buyer.cash < fee) return;
    buyer.cash -= fee;
    owner.cash += fee;
    this.addTransfer(
      buyer.id,
      owner.id,
      fee,
      `拿来吧你(${cityName})`,
    );
    city.ownerId = client.sessionId;
    this.addLog(
      `【拿来吧你！】玩家「${buyer.name}」以 ¥${fee.toLocaleString()} 从玩家「${owner.name}」手中买下了「${cityName}」。`,
      "indigo",
    );
    this.checkBankruptcy();
    this.saveStateToHistory();
  }

  handleSwapProperty(
    client: Client,
    sourceCityName: string | undefined,
    targetCityName: string | undefined,
  ) {
    if (!sourceCityName || !targetCityName) return;
    if (this.state.phase !== "playing" || this.state.isGameOver) return;
    const source = this.state.cities.get(sourceCityName);
    const target = this.state.cities.get(targetCityName);
    if (!source || !target || !source.ownerId || !target.ownerId) return;
    if (source.ownerId !== client.sessionId) return;
    if (source.isMortgaged || target.isMortgaged) return;
    if (source.ownerId === target.ownerId) return;
    const swapper = this.state.players.get(client.sessionId);
    const targetOwner = this.state.players.get(target.ownerId);
    if (!swapper || !targetOwner) return;
    const temp = source.ownerId;
    source.ownerId = target.ownerId;
    target.ownerId = temp;
    this.addLog(
      `【交换房产】玩家「${swapper.name}」用「${sourceCityName}」与玩家「${targetOwner.name}」的「${targetCityName}」进行了交换。`,
      "teal",
    );
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
    for (const p of this.state.players.values()) {
      if (!p.bankrupt) p.cash += 1000;
    }
    const names = Array.from(this.state.players.values())
      .filter((p) => !p.bankrupt)
      .map((p) => `「${p.name}」`)
      .join("、");
    this.addLog(`【共同富裕】所有玩家 ${names} 各获得 ¥1,000。`, "teal");
  }

  private doAddCustomMoney(player: Player, amount: number) {
    player.cash += amount;
    this.addLog(
      `玩家「${player.name}」增加 ¥${amount.toLocaleString()}。`,
      "success",
    );
  }

  private doSubtractCustomMoney(player: Player, amount: number) {
    player.cash -= amount;
    this.addLog(
      `玩家「${player.name}」减少 ¥${amount.toLocaleString()}。`,
      "error",
    );
    this.checkBankruptcy();
  }

  private checkBankruptcy() {
    for (const p of this.state.players.values()) {
      if (!p.bankrupt && p.cash < 0) {
        p.bankrupt = true;
        this.addLog(`玩家「${p.name}」资金已低于 0，宣告破产。`, "error");
      }
    }
    const withCash = Array.from(this.state.players.values()).filter(
      (p) => p.cash > 0,
    );
    if (withCash.length === 1) {
      this.state.isGameOver = true;
      this.addLog(
        `仅剩玩家「${withCash[0].name}」有资金，游戏结束，${withCash[0].name} 获胜！`,
        "success",
      );
    }
  }
}
