import { defineServer, defineRoom } from "colyseus";
import { MonopolyRoom } from "./rooms/MonopolyRoom.js";

const app = defineServer({
  rooms: {
    monopoly: defineRoom(MonopolyRoom),
  },
});

export default app;
