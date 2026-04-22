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

  AI_PROVIDER: process.env.AI_PROVIDER || "mock",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-1.5-flash-latest",
  LLM_MOCK_MODE: (process.env.LLM_MOCK_MODE || "never") as
    | "always"
    | "development"
    | "test"
    | "never",
  AI_MOCK_SCENARIO: (process.env.AI_MOCK_SCENARIO || "success") as
    | "success"
    | "malformed_json"
    | "timeout"
    | "low_confidence",
  AI_RETRIEVAL_TOP_K: Number(process.env.AI_RETRIEVAL_TOP_K || 5),
  AI_RETRIEVAL_THRESHOLD: Number(process.env.AI_RETRIEVAL_THRESHOLD || 0.18),
  AI_EMBEDDING_DIMENSIONS: Number(process.env.AI_EMBEDDING_DIMENSIONS || 128),
  AI_TEMPERATURE: Number(process.env.AI_TEMPERATURE || 0.2),
  AI_MAX_OUTPUT_TOKENS: Number(
    process.env.AI_MAX_OUTPUT_TOKENS || process.env.AI_RESPONSE_MAX_TOKENS || 700
  ),
  AI_TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS || 4000),
  AI_RATE_LIMIT_RPM: Number(process.env.AI_RATE_LIMIT_RPM || 30),

  NODE_ENV: process.env.NODE_ENV || "development",
};
