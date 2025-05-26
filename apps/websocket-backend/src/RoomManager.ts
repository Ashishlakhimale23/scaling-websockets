import { WebSocket } from "ws"
import { prisma } from "@repo/db/prisma"
import { singleton } from "./singleton"
import {createClient} from "redis"

interface Users {
    socket: WebSocket,
    userId: number
}

export class RoomManager {
    
    private redisPublisher 
    private redisSubscriber
    private redisClient
    // this should be a in memory varible also adding a snapshot to it  (redis in memory variable)
    private subscribedChannels : string = "subscribedChannels" 
    // should i also make this a in memory variable
    private usersConnected: Users[]

    constructor() {

        this.usersConnected = []
        this.redisClient = createClient({url:"redis://localhost:6379"})
        this.redisPublisher = createClient({ url: "redis://localhost:6379" });
        this.redisSubscriber = createClient({ url: "redis://localhost:6379" });
        this.connectRedisClients()
        
    }

    private async connectRedisClients() {
        try {
            if(!this.redisClient.isOpen){
                await this.redisClient.connect()
            }
            if (!this.redisPublisher.isOpen) {
                await this.redisPublisher.connect();
            }
            if (!this.redisSubscriber.isOpen) {
                await this.redisSubscriber.connect();
                //resubscribing to all the channels in are reconnecting 
                this.redisSubscriber.on("reconnecting",async ()=>{
                    if (await this.redisClient.sCard(this.subscribedChannels) !== 0) {
                        for (const values of this.subscribedChannels) {
                            await this.redisSubscriber.subscribe(
                                values,
                                (message: string, channel: string) => {
                                    this.handleIncomingMessage(channel, message);
                                }
                            );
                        }
                    }
                })
                 
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
                            if(!await this.redisClient.sIsMember(this.subscribedChannels,parsedData.roomId.toString())){
                                await this.redisSubscriber.subscribe(
                                    parsedData.roomId.toString(),
                                    (message: string, channel: string) => {
                                        this.handleIncomingMessage(channel, message);
                                    }
                                );
                                await this.redisClient.sAdd(this.subscribedChannels,parsedData.roomId)
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
        // unsubscribe the rooms which has no users in it .
        // get the rooms with zero users of the users which is disconnecting and unsubscribe it .
        const roomToUnsubscribe = singleton.getRoomWithZeroUsers(user.userId)

        if(roomToUnsubscribe.length>0){
            roomToUnsubscribe.forEach(async (roomId)=>{
                if(await this.redisClient.sIsMember(this.subscribedChannels,roomId)){
                    this.redisSubscriber.unsubscribe(roomId,()=>{
                        console.log(`unsubscribed ${roomId}`)
                    })
                    await this.redisClient.sRem(this.subscribedChannels,roomId)
                }
            })
        } 

        this.usersConnected.splice(index, 1);
        singleton.removeUser(user);
    }

}