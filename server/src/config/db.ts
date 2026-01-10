import mongoose from "mongoose";
import { ENV } from "./env";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(ENV.MONGO_URI);
  console.log("[db] connected");
}
