import type { SearchFilters } from "./types";

export function buildSystemPrompt() {
  return [
    "You are a query parser that outputs JSON only.",
    "Return a JSON object that matches the exact schema.",
    "Do not include code fences or extra text.",
    "If uncertain, lower confidence and add warnings. Do not invent filters.",
  ].join(" ");
}

export function buildUserPrompt(args: { query: string; locale?: string; maxResults: number }) {
  return [
    "Parse the user query into this JSON schema:",
    "{",
    '  "normalizedQuery": string,',
    '  "filters": {',
    '    "includeTerms": string[],',
    '    "excludeTerms": string[],',
    '    "tags": string[],',
    '    "ingredients": string[],',
    '    "sort": "newest" | "oldest" | "relevance",',
    '    "isPublic": boolean',
    "  },",
    '  "warnings": string[],',
    '  "confidence": number',
    "}",
    "",
    "Return JSON only.",
    "",
    "Examples:",
    JSON.stringify(
      {
        normalizedQuery: "quick vegan pasta",
        filters: {
          includeTerms: ["quick", "vegan", "pasta"],
          excludeTerms: [],
          tags: ["vegan"],
          ingredients: ["pasta"],
          sort: "relevance",
          isPublic: true,
        } satisfies SearchFilters,
        warnings: [],
        confidence: 0.83,
      },
      null,
      2
    ),
    JSON.stringify(
      {
        normalizedQuery: "no dairy salad",
        filters: {
          includeTerms: ["salad"],
          excludeTerms: ["dairy"],
          tags: [],
          ingredients: [],
          sort: "relevance",
          isPublic: true,
        } satisfies SearchFilters,
        warnings: ["Negative term detected: dairy"],
        confidence: 0.7,
      },
      null,
      2
    ),
    "",
    `Query: ${args.query}`,
    args.locale ? `Locale: ${args.locale}` : "",
    `MaxResults: ${args.maxResults}`,
  ]
    .filter(Boolean)
    .join("\n");
}
