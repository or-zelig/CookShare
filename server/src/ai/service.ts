import mongoose from "mongoose";
import { Post } from "../models/Post";
import { ENV } from "../config/env";
import { getCache, setCache } from "./cache";
import { buildPrompts, callProvider, getLlmProvider } from "./llm";
import { validateFilters } from "./schema";
import type { SearchParseRequest, SearchParseResponse, SearchResponse } from "./types";

function normalizeQuery(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function cacheKey(query: string, locale?: string) {
  return `${normalizeQuery(query)}::${locale ?? ""}`;
}

export async function parseQuery(args: { requestId: string; body: SearchParseRequest }): Promise<SearchParseResponse> {
  const maxResults = args.body.maxResults ?? ENV.AI_MAX_RESULTS;
  const key = cacheKey(args.body.query, args.body.locale);
  const cached = getCache(key);
  if (cached) return { ...cached, requestId: args.requestId };

  const provider = getLlmProvider();
  const prompts = buildPrompts({
    query: args.body.query,
    locale: args.body.locale,
    maxResults,
  });

  const start = Date.now();
  const result = await callProvider(
    provider,
    {
      requestId: args.requestId,
      query: args.body.query,
      locale: args.body.locale,
      maxResults,
      prompts,
    },
    ENV.AI_TIMEOUT_MS
  );

  const filters = validateFilters(result.filters);
  const normalizedQuery = normalizeQuery(result.normalizedQuery || args.body.query);

  const response: SearchParseResponse = {
    requestId: args.requestId,
    normalizedQuery,
    filters,
    warnings: result.warnings ?? [],
    confidence: Number(result.confidence ?? 0),
  };

  setCache(key, response, ENV.AI_CACHE_TTL_MS);

  const ms = Date.now() - start;
  if (ENV.NODE_ENV !== "test") {
    console.log(`[ai.parse] requestId=${args.requestId} provider=${provider.name} ms=${ms}`);
  }

  return response;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTextRegex(terms: string[]) {
  if (!terms.length) return null;
  const pattern = terms.map((t) => escapeRegex(t)).join("|");
  return new RegExp(pattern, "i");
}

export async function searchPosts(args: { requestId: string; body: SearchParseRequest }): Promise<SearchResponse> {
  const parsed = await parseQuery(args);
  const maxResults = args.body.maxResults ?? ENV.AI_MAX_RESULTS;

  const filter: any = { isPublic: parsed.filters.isPublic };
  const and: any[] = [];

  const includeRe = buildTextRegex(parsed.filters.includeTerms);
  if (includeRe) {
    and.push({
      $or: [
        { title: includeRe },
        { description: includeRe },
        { tags: includeRe },
        { "ingredients.name": includeRe },
      ],
    });
  }

  if (parsed.filters.tags.length) {
    and.push({ tags: { $in: parsed.filters.tags } });
  }

  if (parsed.filters.ingredients.length) {
    and.push({ "ingredients.name": { $in: parsed.filters.ingredients } });
  }

  if (parsed.filters.excludeTerms.length) {
    const exRe = buildTextRegex(parsed.filters.excludeTerms);
    if (exRe) {
      and.push({
        $and: [
          { title: { $not: exRe } },
          { description: { $not: exRe } },
          { tags: { $not: exRe } },
          { "ingredients.name": { $not: exRe } },
        ],
      });
    }
  }

  if (and.length) filter.$and = and;

  let sort: any = { _id: -1 };
  if (parsed.filters.sort === "oldest") sort = { _id: 1 };
  if (parsed.filters.sort === "relevance" && includeRe) sort = { _id: -1 };

  const results = await Post.find(filter)
    .sort(sort)
    .limit(maxResults)
    .populate("author", "username avatarUrl");

  return {
    ...parsed,
    results: results.map((p) => (typeof (p as any).toObject === "function" ? (p as any).toObject() : p)),
  };
}
