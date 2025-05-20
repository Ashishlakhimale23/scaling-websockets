import {WebSocket, WebSocketServer} from "ws"

const ws = new WebSocketServer({port:8001})
ws.on("connection",(socket:WebSocket)=>{

    socket.send("hello from the servre")

})
