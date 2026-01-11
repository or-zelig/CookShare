import mongoose from "mongoose";

export async function connectTestDb() {
  await mongoose.connect(process.env.MONGO_URI!);
}

export async function clearTestDb() {
  const db = mongoose.connection.db;
  if (!db) return; // not connected yet

  const collections = await db.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
}

export async function disconnectTestDb() {
  await mongoose.disconnect();
}
