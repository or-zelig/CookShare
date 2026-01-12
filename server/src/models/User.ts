import mongoose, { type Types } from "mongoose";

export type RefreshTokenSubdoc = {
  jti: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};

export interface UserDoc extends mongoose.Document {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  refreshTokens: Types.DocumentArray<RefreshTokenSubdoc>;
  googleId?: string;
  provider?: "local" | "google";
}

const RefreshTokenSchema = new mongoose.Schema<RefreshTokenSubdoc>(
  {
    jti: { type: String, required: true },
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }, // <-- במקום required
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema<UserDoc>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    refreshTokens: { type: [RefreshTokenSchema], default: [] },
    googleId: { type: String },
    provider: { type: String, enum: ["local", "google"], default: "local" },
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDoc>("User", userSchema);
