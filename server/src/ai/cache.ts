import { SearchParseResponse } from "./types";

type CacheEntry = { value: SearchParseResponse; expiresAt: number };

const cache = new Map<string, CacheEntry>();

export function getCache(key: string): SearchParseResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCache(key: string, value: SearchParseResponse, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
