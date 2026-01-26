export type SearchSort = "newest" | "oldest" | "relevance";

export type SearchFilters = {
  includeTerms: string[];
  excludeTerms: string[];
  tags: string[];
  ingredients: string[];
  sort: SearchSort;
  isPublic: boolean;
};

export type SearchParseRequest = {
  query: string;
  locale?: string;
  maxResults?: number;
};

export type SearchParseResponse = {
  requestId: string;
  normalizedQuery: string;
  filters: SearchFilters;
  warnings: string[];
  confidence: number;
};

export type SearchResponse = SearchParseResponse & {
  results: unknown[];
};

export type LlmParseResult = {
  normalizedQuery: string;
  filters: SearchFilters;
  warnings: string[];
  confidence: number;
  raw: string;
};

export type LlmParseArgs = {
  requestId: string;
  query: string;
  locale?: string;
  maxResults: number;
  prompts: { system: string; user: string };
};

export type LlmProvider = {
  name: string;
  parseQuery: (args: LlmParseArgs) => Promise<LlmParseResult>;
};
