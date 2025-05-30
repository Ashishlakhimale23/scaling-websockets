import { WebSocket } from "ws"

interface Users {
    socket: WebSocket,
    userId: number
}



class Singleton{

    private static instance :Singleton
    //userid and roomid[]
    private userRoomMapping : Map<number,string[]> 
    //roomid and users[]
    private userInRoom : Map<string,Users[]>

    constructor(){

        this.userInRoom = new Map<string,Users[]>()
        this.userRoomMapping = new Map<number,string[]>() 

    }


    static getInstance() {
        if (Singleton.instance) {
            return Singleton.instance
        }
        Singleton.instance = new Singleton()
        return Singleton.instance
    }


    addUser(user: Users, roomId: string) {
    // check if user exists in the room the same roomId as mentioned
    // user can be in multiple rooms 
        const userExistsInAnyRoom = this.userRoomMapping.get(user.userId) 
        if(userExistsInAnyRoom?.includes(roomId)){
            console.log(userExistsInAnyRoom?.includes(roomId))
            console.log("user already exists in the room : ",userExistsInAnyRoom)
            return
        }else{
            //limit the no of users in a room 100 are fine ..
            this.userRoomMapping.set(user.userId,[ ...userExistsInAnyRoom || [], roomId])
            this.userInRoom.set(roomId,[...this.userInRoom.get(roomId) || [] , user] )
            console.log("user added in the room")
        }
    }

    bordcast(message:string,roomId:string,userId:number){
        // avoid sending back the message to the same user
        // room exists or not 
        // user in the room or not 
        console.log(message,roomId,userId)

        const roomExistsOrNot = this.userInRoom.get(roomId)
        if(!roomExistsOrNot || roomExistsOrNot.length == 0 ){
            console.log(roomExistsOrNot)
            console.log("either the room does'nt exists or the room is empty")
            return 
        }

        const userExistsInTheRoom = this.userRoomMapping.get(userId) 
        if(!userExistsInTheRoom || !userExistsInTheRoom?.includes(roomId)){
            console.log("the user which is trying to send the message to the room doesnt exists in the room")
            return
        }

        roomExistsOrNot.forEach(receivinguser => receivinguser.userId !==userId ? receivinguser.socket.send(message) : receivinguser)
    }

    getRoomWithZeroUsers(userId:number):string[]{
        const usersRoom = this.userRoomMapping.get(userId)
        let roomToUnsubscribe : string[]= []
        console.log(usersRoom)

        if(!usersRoom){
            return [] 
        }

        usersRoom.forEach((roomId)=>{
            const usersInARooms = this.userInRoom.get(roomId)
            if(!usersInARooms){
                roomToUnsubscribe.push(roomId)
            }

            // filtered the room and remove the user with the userid same as the userid provided
            const fileteredusers = usersInARooms?.filter((user)=>user.userId!==userId)       
            if(fileteredusers?.length == 0){
                roomToUnsubscribe.push(roomId)
            }

        })
        return roomToUnsubscribe
    }


    removeUser(user:Users){
        const UserInExistsInRoom = this.userRoomMapping.get(user.userId) // return a array of roomids
        if(!UserInExistsInRoom || UserInExistsInRoom.length == 0){
            console.log("user dosent exist in the room")
            return
        }

        //clear the user from all the rooms he exists
        UserInExistsInRoom.forEach((roomid) =>{
            //we have all the roomids 
            //get the roomusersmapping for roomid x  -> return array of users
            //if the array is empty delete the room
            //filter out the users and get it again 

            const usersInRoom = this.userInRoom.get(roomid)

            if (!usersInRoom) {
                this.userInRoom.delete(roomid)
            }else{
                const remainingUsers = usersInRoom?.filter(remaininguser =>
                    user.userId !== remaininguser.userId
                )

                if (remainingUsers?.length == 0) {
                    this.userInRoom.delete(roomid)
                }

                this.userInRoom.set(roomid, remainingUsers)
            }

        })

        // deleting the userroommapping ...
        this.userRoomMapping.delete(user.userId)

    }

}

export const singleton = Singleton.getInstance()