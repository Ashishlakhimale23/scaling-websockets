import {WebSocket, WebSocketServer} from "ws"

type messageType = "join" | "message"

interface User {
    userId  : number,
    socket : WebSocket
}

interface message{
    type : messageType,
    roomId ?: number,
    message ?: string
}


const ws = new WebSocketServer({port:8001})
const usersAndRooms = new Map<number,User[]>()

ws.on("connection",(socket:WebSocket)=>{

    socket.on("message",(message:string)=>{
        const messageData : message = JSON.parse(message)
        if (messageData.type == "join") {

            if (!messageData.roomId) return
            const usersInTheRoom = usersAndRooms.get(messageData.roomId)
            let id: number
            if (usersInTheRoom == undefined) {
                id = 1
            } else {
                id = usersInTheRoom.length + 1
            }
            const newUser: User = {
                userId: id,
                socket: socket
            }
            if (usersInTheRoom == undefined) {
                //Room doesnt exist
                usersAndRooms.set(messageData.roomId, [newUser])
            } else {
                // if user with same userId trys to join dont add the user to the array (server logic if we're getting the userId from the jwt token)
                const results = usersInTheRoom.find(user => user.userId === newUser.userId)
                console.log(results)
                if (results) {
                    return
                }
                //Room exits
                usersAndRooms.set(messageData.roomId, [...usersInTheRoom, newUser])
            }

            console.log(usersAndRooms)

        }


    })
    socket.send("hello from the servre")

})
