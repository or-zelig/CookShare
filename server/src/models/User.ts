import mongoose from "mongoose";

export type UserDoc = mongoose.Document & {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  refreshTokens: string[];
  googleId?: string;
  provider: "local" | "google";
};

const userSchema = new mongoose.Schema<UserDoc>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    refreshTokens: { type: [String], default: [] },
    googleId: { type: String, default: "" },
    provider: { type: String, enum: ["local", "google"], default: "local" },
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDoc>("User", userSchema);
