import type { LlmParseResult, SearchFilters } from "./types";

function tokenize(q: string) {
  return q
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.replace(/[^a-z0-9_-]+/g, ""))
    .filter(Boolean);
}

function unique(list: string[]) {
  return Array.from(new Set(list));
}

export function parseMock(query: string): LlmParseResult {
  const normalizedQuery = query.trim().toLowerCase();
  const tokens = tokenize(query);

  const includeTerms: string[] = [];
  const excludeTerms: string[] = [];
  const tags: string[] = [];
  const ingredients: string[] = [];
  const warnings: string[] = [];

  for (const t of tokens) {
    if (t === "no" || t === "without") continue;
    if (t === "vegan" || t === "glutenfree" || t === "gluten-free") tags.push(t);
    if (t === "pasta" || t === "salad" || t === "soup") ingredients.push(t);
    includeTerms.push(t);
  }

  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i] === "no" || tokens[i] === "without") {
      excludeTerms.push(tokens[i + 1]);
      warnings.push(`Excluded term: ${tokens[i + 1]}`);
    }
  }

  const filters: SearchFilters = {
    includeTerms: unique(includeTerms),
    excludeTerms: unique(excludeTerms),
    tags: unique(tags),
    ingredients: unique(ingredients),
    sort: "relevance",
    isPublic: true,
  };

  const confidence = tokens.length >= 2 ? 0.7 : 0.3;
  if (confidence < 0.5) warnings.push("Low confidence parse");

  return {
    normalizedQuery,
    filters,
    warnings,
    confidence,
    raw: JSON.stringify({ normalizedQuery, filters, warnings, confidence }),
  };
}
