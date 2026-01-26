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

  AI_RATE_LIMIT_RPM: Number(process.env.AI_RATE_LIMIT_RPM || 30),
  AI_MAX_TOKENS_PER_MIN: Number(process.env.AI_MAX_TOKENS_PER_MIN || 8000),
  AI_TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS || 4000),
  AI_CACHE_TTL_MS: Number(process.env.AI_CACHE_TTL_MS || 120000),
  AI_CONFIDENCE_MIN: Number(process.env.AI_CONFIDENCE_MIN || 0.5),
  AI_MAX_RESULTS: Number(process.env.AI_MAX_RESULTS || 20),
  AI_RETRIES: Number(process.env.AI_RETRIES || 1),
  LLM_PROVIDER: process.env.LLM_PROVIDER || "mock",
  LLM_MOCK_MODE: process.env.LLM_MOCK_MODE || "development",
};
