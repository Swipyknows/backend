import mongoose from "mongoose";
import { db_name } from "./constants.js";
import connectDB from "./db/dbi.js" ;
import dotenv from "dotenv";
dotenv.config({path:"./.env"});
connectDB().then(()=>{
    application.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running at port:${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("Mongodb Connection Failed !!!",err);
})


// import mongoose from "mongoose";
// import { db_name } from "./constants.js";
// import express from "express";
// const app=express();
// ;(()=>{
//     async function connectDB(){
//         try{
//             await mongoose.connect(`${process.env.MONGO_URI}/${db_name}`);
//             app.on("error",(error)=>{
//                 console.log("err:",error);
//                 throw error;
//             })
//             app.listen(process.env.PORT,()=>{
//                 console.log(`Server is running on port ${process.env.PORT}`);
//             })
//         } catch (error) {
//             console.error("Error connecting to MongoDB:", error);
//             throw error;
//         }
//     }
// })()