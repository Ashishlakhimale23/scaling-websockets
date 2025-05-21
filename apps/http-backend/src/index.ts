import express from "express";
import { userRouter } from "./routes/route";
import cors from "cors"

const app = express()
app.use(cors({
    origin: ['http://localhost:3000','http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
    credentials: true, 
    optionsSuccessStatus: 200
}))
app.use(express.json())
app.use('/user',userRouter)

app.listen(8000,()=>console.log("server started at 8000"))