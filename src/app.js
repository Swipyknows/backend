import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app=express()
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended:true,limit:"16kb"}));
app.use(express.static("public"));
app.use(cookieParser());


//router
import userRouter from "./routes/user.routes.js";
console.log("USER ROUTER IMPORTED:", typeof userRouter);
app.use("/api/v1/users",userRouter);
console.log("ROUTES REGISTERED");

// 404 handler - must be before error handler
app.use((req, res) => {
    console.log("404 - Route not found:", req.method, req.url);
    res.status(404).json({ success: false, message: "Route not found" });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(status).json({
        success: false,
        statusCode: status,
        message: message,
        errors: err.errors || []
    });
});

export {app};
