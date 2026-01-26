import { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env";

type Bucket = {
  resetAt: number;
  requests: number;
  tokens: number;
};

const buckets = new Map<string, Bucket>();

function now() {
  return Date.now();
}

function getKey(req: Request) {
  const userId = (req as any).userId as string | undefined;
  return userId ? `user:${userId}` : `ip:${req.ip}`;
}

function estimateTokens(query: string) {
  const chars = query.trim().length;
  return Math.max(1, Math.ceil(chars / 4));
}

export function aiRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = getKey(req);
  const windowMs = 60_000;
  const maxRequests = ENV.AI_RATE_LIMIT_RPM;
  const maxTokens = ENV.AI_MAX_TOKENS_PER_MIN;

  const query = typeof req.body?.query === "string" ? req.body.query : "";
  const tokens = estimateTokens(query);

  const t = now();
  let bucket = buckets.get(key);

  if (!bucket || t > bucket.resetAt) {
    bucket = { resetAt: t + windowMs, requests: 0, tokens: 0 };
    buckets.set(key, bucket);
  }

  if (bucket.requests + 1 > maxRequests || bucket.tokens + tokens > maxTokens) {
    res.status(429).json({ message: "Rate limit exceeded" });
    return;
  }

  bucket.requests += 1;
  bucket.tokens += tokens;
  next();
}
