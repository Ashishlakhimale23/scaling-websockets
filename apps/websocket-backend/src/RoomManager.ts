import { WebSocket } from "ws"
interface Users {
    socket: WebSocket,
    userId: number

}
import { singleton } from "./singleton"

export class RoomManager{

    private usersConnected : Users[] 

    constructor(){
        this.usersConnected = []
    }

    addhandler(user:Users){

        const userConnected = this.usersConnected.find(previousUser => previousUser.userId == user.userId)
        if(userConnected){
            console.log("the user is already connected ...")
            return
        }

        this.usersConnected.push(user)
        this.addHandler(user)
    }

    addHandler(user:Users){
        user.socket.onmessage = async (event) => {
            try {
                const parsedData = JSON.parse(event.data.toString())
                console.log("Received:", parsedData);

                switch (parsedData.type) {
                    case "join_room":
                        const userExists = this.usersConnected.find((x) => x.userId === user.userId);
                        if (userExists) {
                            singleton.addUser(user, parsedData.roomId.toString());
                            console.log(`User ${user.userId} joined room ${parsedData.roomId}`);
                        }
                        break;
                    case "message" :
                        const userExistsForMessage = this.usersConnected.find((x) => x.userId === user.userId);
                        if (userExistsForMessage) {
                            singleton.bordcast(parsedData.message.toString(),parsedData.roomId.toString(),user);
                            console.log(`User ${user.userId} messaged ${parsedData.roomId}`);
                        }
                        break
                }
            } catch (error) {
                console.error("Error processing message:", error instanceof Error ? error.message : 'Unknown error');
            }
        };
    }



    removeUser(user: Users) {
        const index = this.usersConnected.findIndex((users) => users.socket === user.socket);

        if (index === -1) {
            console.log("user doesn't exist");
            return;
        }
        this.usersConnected.splice(index, 1);

        singleton.removeUser(user);
    }   

}