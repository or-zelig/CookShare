import mongoose, { Schema, Types } from "mongoose";

export type UserDoc = mongoose.Document & {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  refreshTokens: Types.DocumentArray<RefreshTokenSubdoc>;
  googleId?: string;
  provider: "local" | "google";
};

export type RefreshTokenSubdoc = {
  jti: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByJti?: string | null;
};

const RefreshTokenSchema = new Schema(
  {
    jti: { type: String, required: true },
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByJti: { type: String, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema<UserDoc>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    refreshTokens: [RefreshTokenSchema],
    googleId: { type: String, default: "" },
    provider: { type: String, enum: ["local", "google"], default: "local" },
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDoc>("User", userSchema);
