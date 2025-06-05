import { WebSocket , WebSocketServer } from "ws"
import jwt, { JwtPayload } from "jsonwebtoken"
import { RoomManager } from "./RoomManager"

const ws = new WebSocketServer({port:8001})

const roomManager= new RoomManager()

const verifyToken = (token:string) => {
    try {
        const jwtPayload = jwt.verify(token,"asdasd") as JwtPayload
        return jwtPayload?.userid ?? null 
    } catch (error) {
        console.log("some error occured : ",error)
        return null
    }
}

ws.on("connection",(socket:WebSocket,req:Request)=>{

    const url = req.url
    if(!url){
        socket.close()
        return 
    }
    const queryParams : URLSearchParams= new URLSearchParams(url.split("?")[1])
    let token: string | null = queryParams.get("token");
    if(!token){
        socket.close()
        console.log("no token provided")
        return 
    }

    const userid = verifyToken(token)
    if(!userid){
        console.log("no userid in the token")
        socket.close()
        return
    }

    roomManager.addUser({userId:userid,socket:socket})

    socket.on("close", () => {
        // remove from the redis userConnected too
        roomManager.removeUser({userId:userid,socket:socket})
    });


    

})


