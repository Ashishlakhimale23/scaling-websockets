import { NextFunction,Request,Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken"
declare global {
    namespace Express{
        interface Request{
            userId?:number;
        }
    }
}
export const Middleware =async (req:Request,res:Response,next:NextFunction)=>{
    console.log(req.headers)
    let token : string | undefined= req.headers.authorization 
    token = token?.split(" ")[1]
    console.log(token)
    if(token==undefined && typeof token !="string"){
        res.json({message:"unathorized"})
        return
    }
    jwt.verify(token,"asdasd", (err, decoded) => {
  if (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(401).json({ message: "Invalid Token" });
  }
  req.userId = (decoded as JwtPayload).userid;
  next();
});

}