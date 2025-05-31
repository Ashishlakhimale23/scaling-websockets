import { WebSocket } from "ws"
import { prisma } from "@repo/db/prisma"
import { singleton } from "./singleton"
import { createClient } from "redis"

interface Users {
    socket: WebSocket,
    userId: number

}
interface rateLimitingUser{
    userId : number,
    count : number
    timeStamp : number
}
export class RoomManager {

    private redisPublisher
    private redisSubscriber
    private redisClient
    private limit :number = 2 
    private rateLimitingWindow  : rateLimitingUser[] 
    private now 
    // this should be a in memory varible also adding a snapshot to it  (redis in memory variable)
    private subscribedChannels: string = "subscribedChannels"
    // i get it i get it mann the socket come different when we connect and reconnect so the resisted data in the redis check for the socket and it says it dosent exist so but the use exists so now just store the userId
    // should i also make this a in memory variable also make it a set too 
    private usersConnected: string = "usersConnected"

    constructor() {

        this.redisClient = createClient({ url: "redis://localhost:6379" })
        this.redisPublisher = createClient({ url: "redis://localhost:6379" });
        this.redisSubscriber = createClient({ url: "redis://localhost:6379" });
        this.connectRedisClients()
        this.rateLimitingWindow = []
        this.now = new Date()



    }


    reFillingTheCount (){
        this.rateLimitingWindow.map(user => user.count=0)
    }
    

    async removeFromUserConnected() {
        await this.redisClient.del(this.usersConnected);
    }

    private async connectRedisClients() {
        try {
            if (!this.redisClient.isOpen) {
                await this.redisClient.connect()
            }
            if (!this.redisPublisher.isOpen) {
                await this.redisPublisher.connect();
            }
            if (!this.redisSubscriber.isOpen) {
                await this.redisSubscriber.connect();
                //resubscribing to all the channels in are reconnecting 
                this.redisSubscriber.on("reconnecting", async () => {
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

    handleIncomingMessage(channel: string, message: string) {
        try {
            const parsedMessage = JSON.parse(message)
            singleton.bordcast(parsedMessage.message, parsedMessage.roomId, parsedMessage.userId)
        } catch (error) {
            console.error("Error handling incoming message:", error);
        }

    }

    async addUser(user: Users) {

        const userConnected = await this.redisClient.sIsMember(this.usersConnected, JSON.stringify(user.userId))
        if (userConnected == 1) {
            console.log("the user is already connected ...")
            return
        }

        await this.redisClient.sAdd(this.usersConnected, JSON.stringify(user.userId))
        this.addHandler(user)
    }

    addHandler(user: Users) {
        user.socket.on("message", async (event) => {
            try {
                const userExists = await this.redisClient.sIsMember(this.usersConnected, JSON.stringify(user.userId));
                if(userExists!==1){
                    console.log("user doesnt exists ...")
                    return
                }

                // rate limiting should be done here
                const findingUser = this.rateLimitingWindow.find(userToFind => userToFind.userId === user.userId)
                if(findingUser){
                    if(findingUser.count < this.limit){
                        findingUser.count += 1
                        findingUser.timeStamp = this.now.getTime()
                    }else{
                        console.log("rate limited bitch")
                    }
                }else{
                    this.rateLimitingWindow.push({
                        userId: user.userId,
                        count: 0,
                        timeStamp: this.now.getTime()
                    })
                }
                
                const parsedData = JSON.parse(event.toString())
                console.log("Received:", parsedData);
                switch (parsedData.type) {
                    case "join_room":
                        console.log("userExists",userExists)
                            console.log("reached here....")
                            if (await this.redisClient.sIsMember(this.subscribedChannels, parsedData.roomId.toString()) == 0) {
                                await this.redisSubscriber.subscribe(
                                    parsedData.roomId.toString(),
                                    (message: string, channel: string) => {
                                        this.handleIncomingMessage(channel, message);
                                    }
                                );
                                await this.redisClient.sAdd(this.subscribedChannels, parsedData.roomId)
                            }
                            singleton.addUser(user, parsedData.roomId.toString());
                            console.log(`User ${user.userId} joined room ${parsedData.roomId}`);
                        break;
                    case "message":
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
                                await this.redisPublisher.publish(parsedData.roomId, JSON.stringify(dataTosend))
                                console.log(`User ${user.userId} messaged ${parsedData.roomId}`);
                            } catch (error) {
                                console.log(error)
                            }
                        break
                }
            } catch (error) {
                console.error("Error processing message:", error instanceof Error ? error.message : 'Unknown error');
            }
        });
    }


    async removeUser(user: Users) {
        const index = await this.redisClient.sIsMember(this.usersConnected, JSON.stringify(user.userId));

        if (index == 1) {
            console.log("user doesn't exist");
            return;
        }
        // unsubscribe the rooms which has no users in it .
        // get the rooms with zero users of the users which is disconnecting and unsubscribe it .
        const roomToUnsubscribe = singleton.getRoomWithZeroUsers(user.userId)

        if (roomToUnsubscribe.length > 0) {
            roomToUnsubscribe.forEach(async (roomId) => {
                if (await this.redisClient.sIsMember(this.subscribedChannels, roomId) == 1) {
                    this.redisSubscriber.unsubscribe(roomId, () => {
                        console.log(`unsubscribed ${roomId}`)
                    })
                    await this.redisClient.sRem(this.subscribedChannels, roomId)
                }
            })
        }

        await this.redisClient.sRem(this.usersConnected, JSON.stringify(user.userId));
        singleton.removeUser(user);
    }

}