import { WebSocket } from "ws"
import { prisma } from "@repo/db/prisma"
import { singleton } from "./singleton"
import { createClient } from "redis"

interface Users {
    socket: WebSocket,
    userId: number

}
interface rateLimitingUser {
    count: number
    timeStamp: number
}
export class RoomManager {

    private redisPublisher
    private redisSubscriber
    private redisClient
    private timeLimit: number = 30 //seconds
    private requestLimit: number = 3
    //userId and rateLimintingUser
    private rateLimitingWindow: Map<number, rateLimitingUser>

    // this should be a in memory varible also adding a snapshot to it  (redis in memory variable)
    private subscribedChannels: string = "subscribedChannels"
    // i get it i get it mann the socket come different when we connect and reconnect so the resisted data in the redis check for the socket and it says it dosent exist so but the user exists so now just store the userId
    private usersConnected: Set<number> 

    constructor() {

        this.redisClient = createClient({ url: "redis://localhost:6379" })
        this.redisPublisher = createClient({ url: "redis://localhost:6379" });
        this.redisSubscriber = createClient({ url: "redis://localhost:6379" });
        this.connectRedisClients()
        this.rateLimitingWindow = new Map<number, rateLimitingUser>
        this.usersConnected = new Set<number>

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

    private handleIncomingMessage(channel: string, message: string) {
        try {
            const parsedMessage = JSON.parse(message)
            singleton.bordcast(parsedMessage.message, parsedMessage.roomId, parsedMessage.userId)
        } catch (error) {
            console.error("Error handling incoming message:", error);
        }
    }

    private async rateLimiting(user:Users) {
        const now = Date.now()
        const findingUser = await this.redisClient.hGetAll(user.userId.toString())
        if (Object.keys(findingUser).length !== 0) {
            console.log((now - Number(findingUser.timestamp)) / 1000)
            if ((now - Number(findingUser.timestamp)) / 1000 >= this.timeLimit) {

                await this.redisClient.hSet(user.userId.toString(), { count: 1, timestamp: now })
            }
            if (Number(findingUser.count) < this.requestLimit) {
                await this.redisClient.hSet(user.userId.toString(), { count: Number(findingUser.count) + 1, timestamp: now })
            } else {
                console.log("rate limited bitchhhh")
                return
            }
        } else {
            // if users first message
            await this.redisClient.hSet(user.userId.toString(), { count: 1, timestamp: now })
        }

    }

    addUser(user: Users) {

        const userConnected = this.usersConnected.has(user.userId)
        if(userConnected){
            console.log("user already connected")
            return
        }
        this.usersConnected.add(user.userId)
        this.addHandler(user)
    }

    addHandler(user: Users) {
        user.socket.on("message", async (event) => {
            try {
                const userExists = this.usersConnected.has(user.userId);
                if (!userExists) {
                    console.log("user doesnt exists ...")
                    return
                }

                this.rateLimiting(user)

                const parsedData = JSON.parse(event.toString())
                console.log("Received:", parsedData);
                switch (parsedData.type) {
                    case "join_room":
                        // check if the room exist or not 
                        // if the size is met or not 

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
        const index = this.usersConnected.has(user.userId);

        if (!index) {
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

        // remove the user from the rateLimitingWindow 
        this.rateLimitingWindow.delete(user.userId)

        this.usersConnected.delete(user.userId);
        singleton.removeUser(user);
    }

}