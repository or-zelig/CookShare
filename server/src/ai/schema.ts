import { SearchFilters, SearchParseRequest } from "./types";

const SORTS = new Set(["newest", "oldest", "relevance"]);

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function validateSearchParseRequest(body: any): SearchParseRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Body must be an object");
  }

  const { query, locale, maxResults } = body;
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("query is required");
  }

  const out: SearchParseRequest = { query: query.trim() };
  if (typeof locale === "string" && locale.trim()) out.locale = locale.trim();
  if (maxResults !== undefined) {
    if (typeof maxResults !== "number" || !Number.isFinite(maxResults)) {
      throw new Error("maxResults must be a number");
    }
    out.maxResults = Math.min(50, Math.max(1, Math.floor(maxResults)));
  }

  return out;
}

export function validateFilters(candidate: any): SearchFilters {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("filters must be an object");
  }

  const includeTerms = candidate.includeTerms ?? [];
  const excludeTerms = candidate.excludeTerms ?? [];
  const tags = candidate.tags ?? [];
  const ingredients = candidate.ingredients ?? [];
  const sort = candidate.sort ?? "relevance";
  const isPublic = candidate.isPublic ?? true;

  if (!isStringArray(includeTerms)) throw new Error("includeTerms must be string[]");
  if (!isStringArray(excludeTerms)) throw new Error("excludeTerms must be string[]");
  if (!isStringArray(tags)) throw new Error("tags must be string[]");
  if (!isStringArray(ingredients)) throw new Error("ingredients must be string[]");
  if (!SORTS.has(String(sort))) throw new Error("sort must be newest|oldest|relevance");
  if (typeof isPublic !== "boolean") throw new Error("isPublic must be boolean");

  const clean = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);

  return {
    includeTerms: clean(includeTerms),
    excludeTerms: clean(excludeTerms),
    tags: clean(tags),
    ingredients: clean(ingredients),
    sort: sort as "newest" | "oldest" | "relevance",
    isPublic,
  };
}
