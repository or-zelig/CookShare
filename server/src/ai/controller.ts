import { Request, Response } from "express";
import crypto from "crypto";
import { ENV } from "../config/env";
import { validateSearchParseRequest } from "./schema";
import { parseQuery, searchPosts } from "./service";

function requestId() {
  return crypto.randomUUID();
}

function isTransient(err: unknown) {
  if (!(err instanceof Error)) return false;
  return /timeout|network|temporarily/i.test(err.message);
}

async function withRetries<T>(fn: () => Promise<T>, retries: number) {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === retries || !isTransient(err)) break;
    }
  }
  throw lastErr;
}

export async function parseHandler(req: Request, res: Response) {
  const id = requestId();
  let body;
  try {
    body = validateSearchParseRequest(req.body);
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Invalid body" });
    return;
  }

  try {
    const parsed = await withRetries(() => parseQuery({ requestId: id, body }), ENV.AI_RETRIES);
    if (parsed.confidence < ENV.AI_CONFIDENCE_MIN) {
      res.status(422).json({ ...parsed, warnings: [...parsed.warnings, "Low confidence"] });
      return;
    }
    res.json(parsed);
  } catch (err) {
    res.status(503).json({ message: err instanceof Error ? err.message : "LLM failure" });
  }
}

export async function searchHandler(req: Request, res: Response) {
  const id = requestId();
  let body;
  try {
    body = validateSearchParseRequest(req.body);
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Invalid body" });
    return;
  }

  try {
    const result = await withRetries(() => searchPosts({ requestId: id, body }), ENV.AI_RETRIES);
    if (result.confidence < ENV.AI_CONFIDENCE_MIN) {
      res.status(422).json({ ...result, warnings: [...result.warnings, "Low confidence"] });
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(503).json({ message: err instanceof Error ? err.message : "LLM failure" });
  }
}
