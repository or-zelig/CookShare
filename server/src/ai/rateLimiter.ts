import { AiRateLimitError } from "./errors";

type Bucket = {
  windowStartMs: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

export function enforceAiRateLimit(userId: string, limitPerMinute: number, now = Date.now()) {
  if (limitPerMinute <= 0) return;

  const key = `ai:${userId}`;
  const current = buckets.get(key);
  const minuteMs = 60_000;

  if (!current || now - current.windowStartMs >= minuteMs) {
    buckets.set(key, { windowStartMs: now, count: 1 });
    return;
  }

  if (current.count >= limitPerMinute) {
    throw new AiRateLimitError();
  }

  current.count += 1;
}

export function resetAiRateLimiter() {
  buckets.clear();
}
