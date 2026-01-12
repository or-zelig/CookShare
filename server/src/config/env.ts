import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";
dotenv.config();

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const ENV = {
  PORT: Number(process.env.PORT || 4000),
  MONGO_URI: must("MONGO_URI"),
  CLIENT_ORIGIN: must("CLIENT_ORIGIN"),

  ACCESS_TOKEN_SECRET: must("ACCESS_TOKEN_SECRET"),
  REFRESH_TOKEN_SECRET: must("REFRESH_TOKEN_SECRET"),
  REFRESH_TOKEN_TTL: must("REFRESH_TOKEN_TTL"),

  // IMPORTANT: type it as jsonwebtoken expects
  ACCESS_TOKEN_TTL: (process.env.ACCESS_TOKEN_TTL || "15m") as SignOptions["expiresIn"],

  GOOGLE_CLIENT_ID: must("GOOGLE_CLIENT_ID"),

  NODE_ENV: process.env.NODE_ENV || "development",
};
