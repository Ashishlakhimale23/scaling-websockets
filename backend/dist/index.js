"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const ws = new ws_1.WebSocketServer({ port: 8001 });
ws.on("connection", (socket) => {
    socket.send("hello from the servre");
});
