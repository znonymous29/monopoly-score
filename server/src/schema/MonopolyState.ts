import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

const START_MONEY = 10000;

export class LobbySlot extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("string") color: string = "#1976D2";
  @type("string") clientId: string = "";
}

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") color: string = "#1976D2";
  @type("number") cash: number = START_MONEY;
  @type("boolean") bankrupt: boolean = false;
}

export class CityState extends Schema {
  @type("string") cityName: string = "";
  @type("string") ownerId: string = "";
  @type("number") houseCount: number = 0;
  @type("boolean") hasResort: boolean = false;
  @type("boolean") isMortgaged: boolean = false;
}

export class LogItem extends Schema {
  @type("string") message: string = "";
  @type("string") time: string = "";
  @type("string") color: string = "primary";
}

export class MonopolyState extends Schema {
  @type("string") phase: "lobby" | "playing" = "lobby";
  @type("string") hostSessionId: string = "";
  @type("number") maxPlayers: number = 4;
  @type({ map: LobbySlot }) lobbySlots = new MapSchema<LobbySlot>();
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: CityState }) cities = new MapSchema<CityState>();
  @type("string") currentPlayerId: string = "";
  @type("boolean") isGameOver: boolean = false;
  @type("boolean") canUndo: boolean = false;
  @type("boolean") canRedo: boolean = false;
  @type([ LogItem ]) logs = new ArraySchema<LogItem>();
}
