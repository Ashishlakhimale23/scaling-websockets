import { WebSocket } from "ws"
import { prisma } from "@repo/db/prisma"
import { singleton } from "./singleton"
import {createClient} from "redis"

interface Users {
    socket: WebSocket,
    userId: number
}

export class RoomManager {

    private usersConnected: Users[]
    private subscribedChannels : Set<string>
    private redisPublisher 
    private redisSubscriber

    constructor() {
        this.usersConnected = []
        this.subscribedChannels = new Set()
        this.redisPublisher = createClient({ url: "redis://localhost:6379" });
        this.redisSubscriber = createClient({ url: "redis://localhost:6379" });
        this.connectRedisClients()
    }

    private async connectRedisClients() {
        try {
            if (!this.redisPublisher.isOpen) {
                await this.redisPublisher.connect();
            }
            if (!this.redisSubscriber.isOpen) {
                await this.redisSubscriber.connect();
            }
        } catch (error) {
            console.error("Error connecting to Redis:", error);
        }
    }

    handleIncomingMessage(channel:string,message:string){
        try{
            const parsedMessage = JSON.parse(message)
            singleton.bordcast(parsedMessage.message,parsedMessage.roomId,parsedMessage.userId)
        }catch(error){
            console.error("Error handling incoming message:", error);
        }

    }

    addUser(user: Users) {

        const userConnected = this.usersConnected.find(previousUser => previousUser.userId == user.userId)
        if (userConnected) {
            console.log("the user is already connected ...")
            return
        }

        this.usersConnected.push(user)
        this.addHandler(user)
    }

    addHandler(user: Users) {
        user.socket.on("message", async (event) => {
            try {
                const parsedData = JSON.parse(event.toString())
                console.log("Received:", parsedData);

                switch (parsedData.type) {
                    case "join_room":
                        const userExists = this.usersConnected.find((x) => x.userId === user.userId);
                        if (userExists) {
                            console.log("reached here....")
                            if(!this.subscribedChannels.has(parsedData.roomId.toString())){
                                await this.redisSubscriber.subscribe(
                                    parsedData.roomId.toString(),
                                    (message: string, channel: string) => {
                                        this.handleIncomingMessage(channel, message);
                                    }
                                );
                                this.subscribedChannels.add(parsedData.roomId)
                            }
                            singleton.addUser(user, parsedData.roomId.toString());
                            console.log(`User ${user.userId} joined room ${parsedData.roomId}`);
                        }
                        break;
                    case "message":
                        const userExistsForMessage = this.usersConnected.find((x) => x.userId === user.userId);
                        if (userExistsForMessage) {
                            try {
                                const dataTosend = {
                                    ...parsedData,
                                    userId: user.userId
                                }
                                await prisma.chats.create({
                                    data: {
                                        message: parsedData.message.toString(),
                                        roomId: Number(parsedData.roomId),
                                        userId: user.userId
                                    }
                                })
                                await this.redisPublisher.publish(parsedData.roomId,JSON.stringify(dataTosend))
                                console.log(`User ${user.userId} messaged ${parsedData.roomId}`);
                            } catch (error) {
                                console.log(error)
                            }
                        }
                        break
                }
            } catch (error) {
                console.error("Error processing message:", error instanceof Error ? error.message : 'Unknown error');
            }
        });
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