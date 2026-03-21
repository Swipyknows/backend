import mongoose from "mongoose";
import { db_name } from "../constants.js";
const connectDB = async () => {
    try {
        const connectionInstance=await mongoose.connect(`${process.env.MONGO_URI}/${db_name}`);
        console.log(`\nConnected to MongoDB DB HOST${connectionInstance}`);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};

export default connectDB;