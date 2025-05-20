"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const ws = new ws_1.WebSocketServer({ port: 8001 });
const usersAndRooms = new Map();
ws.on("connection", (socket) => {
    socket.on("message", (message) => {
        const messageData = JSON.parse(message);
        if (messageData.type == "join") {
            if (!messageData.roomId)
                return;
            const usersInTheRoom = usersAndRooms.get(messageData.roomId);
            let id;
            if (usersInTheRoom == undefined) {
                id = 1;
            }
            else {
                id = usersInTheRoom.length + 1;
            }
            const newUser = {
                userId: id,
                socket: socket
            };
            if (usersInTheRoom == undefined) {
                //Room doesnt exist
                usersAndRooms.set(messageData.roomId, [newUser]);
            }
            else {
                // if user with same userId trys to join dont add the user to the array (server logic if we're getting the userId from the jwt token)
                const results = usersInTheRoom.find(user => user.userId === newUser.userId);
                console.log(results);
                if (results) {
                    return;
                }
                //Room exits
                usersAndRooms.set(messageData.roomId, [...usersInTheRoom, newUser]);
            }
            console.log(usersAndRooms);
        }
        if (messageData.type == "message") {
            const usersInTheRoom = usersAndRooms.get(messageData.roomId);
            usersInTheRoom === null || usersInTheRoom === void 0 ? void 0 : usersInTheRoom.forEach((user) => {
                if (user.socket !== socket) {
                    user.socket.send(messageData.message);
                }
            });
        }
    });
    socket.send("hello from the servre");
});
