import { Request,Response } from "express"
import jwt from "jsonwebtoken"
import {ZodValidation} from '@repo/common/zod'
import {prisma} from "@repo/db/client"
import bcrypjs from "bcryptjs"

interface User{
    email:string,
    password:string,
    username:string
}

interface roomID {
    roomId : string
}


export const SignUpHandler = async (req:Request<{},{},User>,res:Response) =>{
    const {email,password,username} = req.body
    
    const validationCheck = ZodValidation({
        username:username,
        email:email,
        password:password
    })
    if(!validationCheck.result){
        res.json({message:validationCheck.errormessage})
        return
    }
    console.log(validationCheck)
   
    const exists = await prisma.user.findFirst({where:{
        username:username,
        email:email,
    }})
    console.log(exists)
    if(exists){
        res.json({message:"user already exists"})
        return 
    }

    const hashedPassword = await bcrypjs.hash(password,10)
    const create = await prisma.user.create({
        data:{
            username:username,
            email:email,
            password:hashedPassword
        }
    })
    if(!create){
        res.json({message:"something went wrong"})
    }

    const token = jwt.sign({username:username,email:email,userid:create.id},"asdasd",{expiresIn:"1h"})
     res.json({token:token}).status(200)
     return

}

export const SignInHandler = async (req:Request<{},{},User>,res:Response) =>{
    const {email,password,username} = req.body
    
    const validationCheck = ZodValidation({
        username:username,
        email:email,
        password:password
    })
    if(!validationCheck.result){
        res.json({message:validationCheck.errormessage})
        return
    }

    const exists = await prisma.user.findFirst({where:{
        username:username,
        email:email,
    }})

    if(!exists) {
        res.json({message:"user doenst exist"})
    }

    const passwordCheck =await  bcrypjs.compare(password,exists!.password)

    if(!passwordCheck){
        res.json({message:"password incorrect"})
        return 
    }

    

    const token = jwt.sign({username:username,email:email,userid:exists?.id},"asdasd",{expiresIn:"7h"})
    res.json({token:token}).status(200)
    return

}

export const CreateRoom = async (req:Request<{},{},roomID>,res:Response)=>{
    const roomId = req.body.roomId
    const userid = req.userId
    const exists = await prisma.room.findFirst({
        where:{
            RoomId:roomId
        }
    })

    if(exists){
        res.json({message:`room already exist with roomId ${roomId}`})
        return 
    }

    const create =await prisma.room.create({
        data:{
            RoomId:roomId,
            admin:{
                connect:{
                   id:userid                 
                }
            }
        },
    })

    if(!create){
        res.json({message:"something occured could'nt create the room"})
    }
    res.json({message:create.id})
    return
}


export const GetRoomChats = async (req:Request,res:Response) =>{
    const roomId = req.query.roomId
    const userId = req.userId
    

    const roomDetails = await prisma.room.findFirst({
        where:{
            id:Number(roomId)
        }
    })

    const adminChats = await prisma.chats.findMany({
        where:{
            userId:roomDetails?.adminId,
            roomId : null
        }
    })
    const chats = await prisma.chats.findMany({
        take:50,
        where:{
            roomId:Number(roomId)
        },
        
    })

    const allchats = [...adminChats,...chats]

    res.json({message:allchats})
    return


}

export const GetUsersChats = async(req:Request,res:Response)=>{

    const userid = req.userId

    try{

        let userChats = await prisma.chats.findMany({
            where:{
                userId : Number(userid),
                roomId: null
            }
        })

        userChats = userChats.filter(chats => chats.roomId == null)

        
        res.json({chats : userChats}).status(200)
        return

    }catch(error){
        console.log(error)
        res.json({message:"internal server error"}).status(500)
        return
    }

}

export const GetRoomDetails =async (req:Request,res:Response) =>{
    const roomId = req.query.roomId
    console.log(roomId)
    try {
        const roomDetails = await prisma.room.findFirst({
            where:{
                RoomId : roomId?.toString()
            }
        })

        if(!roomDetails){
            res.status(411).json({message:`room doenst exist with roomId ${roomId}`})
        }

        res.status(200).json({Details:roomDetails})
        
    } catch (error) {
        console.log(error)
        res.status(411).json({message:"internal server error"})

    }


}

export const InsertChats =async(req:Request<{},{},{message:string}>,res:Response)=>{
    const userid = req.userId
    const message = req.body.message 
    try {

        const result = await prisma.chats.create({
            data:{
                message:message,
                userId : Number(userid)
            }
        })

        if(result) {
            res.status(200).json({message:'done'})
            return
        }
        res.status(500).json({message:"something went wrong"})
        return

        
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"internal server error"})
        return
        
    }

}

export const EditChats=async(req:Request<{},{},{message:string,id:number}>,res:Response)=>{
    const userid = req.userId
    const {message,id} = req.body
    try{
        const result =await prisma.chats.update({
            where:{
                userId : Number(userid),
                id : id
            },
            data:{
                message : message
            }
        })

        if(result){
            res.status(200).json({message:"edited"})
            return
        }

        res.status(500).json({message:"something went wrong "})
        return

    }catch(error){
        console.log(error)
        res.status(500).json({message:"internal server error"})
        return 
    }

}

export const DeleteChat = async (req:Request<{},{},{id:number}>,res:Response)=>{
    const userid = req.userId
    const {id} = req.body

    try {

        const result = await prisma.chats.delete({
            where:{
                id:id,
                userId:userid
            }
        })

        if(result){
            res.status(200).json({message:"deleted"})
            return 
        }
        res.status(500).json({message:"something went wrong"})
        return 

        
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"internal server error"})
        return
        
    }


}