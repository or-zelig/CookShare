import mongoose from "mongoose";

export async function connectTestDb() {
  await mongoose.connect(process.env.MONGO_URI!);
}

export async function clearTestDb() {
  if (!mongoose.connection.db) return;
  await mongoose.connection.db.dropDatabase();
}


export async function disconnectTestDb() {
  await mongoose.disconnect();
}
