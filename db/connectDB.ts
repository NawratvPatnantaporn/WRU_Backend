import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const MONGOURL = process.env.MONGO_URI;
    if (!MONGOURL) {
      throw new Error("MONGO_URI is not defined in the environment variables.");
    }

    console.log("MONGOURL: ", MONGOURL);
    const conn = await mongoose.connect(MONGOURL); //  mongoUri เป็น string 
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // ตรวจสอบว่า error เป็นชนิด Error 
    if (error instanceof Error) {
      console.log("Error connection to MongoDB: ", error.message);
    } else {
      console.log("An unknown error occurred during MongoDB connection.");
    }
    process.exit(1);
  }
};
