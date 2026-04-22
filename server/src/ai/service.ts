import mongoose from "mongoose";
import { Post, type PostDoc } from "../models/Post";
import {
  aiSuggestionsResponseSchema,
  llmRecipeSuggestionsSchema,
  type AiSuggestionsRequest,
  type AiSuggestionsResponse,
  type AiSuggestion,
} from "./contracts";
import { AiLowConfidenceError, AiProviderError } from "./errors";
import type { LlmClient } from "./llmClient";
import { RecipeRetriever, type RetrievalHit } from "./retriever";
import { detectLanguage, hasCorruptedText, looksEnglish, normalizeText, sanitizeTitle } from "./text";

type ServiceConfig = {
  retrievalTopK: number;
  retrievalThreshold: number;
  embeddingDimensions: number;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
};

type ServiceDeps = {
  llmClient: LlmClient;
  config: ServiceConfig;
};

type QueryContext = {
  posts: PostDoc[];
  titles: string[];
  language: "he" | "en" | "unknown";
  warnings: string[];
};

function buildTranslationPrompt(titles: string[]) {
  return [
    "Translate the following recipe titles into natural English.",
    'Return only valid JSON in this exact shape: {"titles":["string"]}',
    "Do not add commentary.",
    "",
    "Titles:",
    ...titles.map((title, index) => `${index + 1}. ${title}`),
  ].join("\n");
}

function buildSuggestionPrompt(
  queryTitles: string[],
  retrievalHits: RetrievalHit[],
  maxSuggestions: number,
  excludeTitles: string[]
) {
  const contextLines = retrievalHits.map((hit, index) => {
    const title = hit.metadata.title ? `title=${hit.metadata.title}; ` : "";
    return `${index + 1}. sourceId=${hit.sourceId}; ${title}text=${hit.text}`;
  });

  return [
    "You are a backend recipe suggestion service.",
    "Return all content in English only.",
    "Use only the supplied context as evidence.",
    "Output must be valid JSON only, with no markdown and no extra prose.",
    'Return exactly this shape: {"suggestions":[{"title":"string","recipe":{"ingredients":["string"],"steps":["string"]},"basedOnSourceIds":["string"]}],"confidence":0.0}',
    "Every basedOnSourceIds entry must reference sourceIds from the provided context.",
    "If the context is weak, make conservative recipe suggestions and use lower confidence.",
    "Do not claim specific user preferences unless the context supports them.",
    "Do not repeat or lightly rename recipes the user already posted.",
    "",
    `Target suggestions: ${maxSuggestions}`,
    `Query titles: ${queryTitles.join(" | ")}`,
    `Forbidden titles: ${excludeTitles.join(" | ")}`,
    "Context sources:",
    ...contextLines,
  ].join("\n");
}

function parseTranslatedTitles(rawText: string) {
  try {
    const parsed = JSON.parse(rawText) as { titles?: unknown[] };
    if (!Array.isArray(parsed.titles)) return [];
    return parsed.titles.map((item) => sanitizeTitle(String(item ?? ""))).filter(Boolean);
  } catch {
    return [];
  }
}

function conservativeFallback(queryTitles: string[], retrievalHits: RetrievalHit[], maxSuggestions: number): AiSuggestion[] {
  const seedTitles = [
    "Banana bread",
    "Blueberry muffins",
    "Lemon loaf cake",
    "Cinnamon rolls",
    "Apple crumble bars",
    "Carrot cake loaf",
    "Vanilla pound cake",
  ];
  const normalizedQuery = queryTitles.map((title) => title.toLowerCase());
  const sourceIds = retrievalHits.slice(0, 2).map((hit) => hit.sourceId);

  return seedTitles
    .filter((title) => !normalizedQuery.includes(title.toLowerCase()))
    .slice(0, maxSuggestions)
    .map((title) => ({
      title,
      recipe: {
        ingredients: ["flour", "sugar", "eggs", "butter"],
        steps: ["Mix the ingredients", "Transfer to a pan", "Bake until done"],
      },
      basedOnSourceIds: sourceIds,
    }));
}

function buildSelectedPostsQueryText(posts: PostDoc[], fallbackTitles: string[]) {
  const parts = posts.flatMap((post) => [
    post.title,
    post.description ?? "",
    ...(post.tags ?? []),
    ...(post.ingredients ?? []).map((item) => [item.amount, item.unit, item.name].filter(Boolean).join(" ")),
    ...(post.steps ?? []).map((item) => item.text),
  ]);

  return normalizeText([...fallbackTitles, ...parts].filter(Boolean).join(" "));
}

function dedupeSuggestions(
  suggestions: AiSuggestion[],
  excludeTitles: string[],
  queryTitles: string[],
  allowedSourceIds: Set<string>
) {
  const seen = new Set<string>();
  const excluded = new Set(
    [...excludeTitles, ...queryTitles].map((item) => item.toLowerCase())
  );

  return suggestions.filter((item) => {
    const titleKey = item.title.trim().toLowerCase();
    if (!titleKey || seen.has(titleKey) || excluded.has(titleKey)) return false;
    if (hasCorruptedText([item.title, ...item.recipe.ingredients, ...item.recipe.steps].join(" "))) return false;
    if (!looksEnglish([item.title, ...item.recipe.ingredients, ...item.recipe.steps].join(" "))) return false;
    if (item.recipe.ingredients.length < 3 || item.recipe.steps.length < 2) return false;
    if (item.basedOnSourceIds?.some((sourceId) => !allowedSourceIds.has(sourceId))) return false;
    seen.add(titleKey);
    return true;
  });
}

async function loadUserPosts(userId: string) {
  return Post.find({ author: new mongoose.Types.ObjectId(userId) }).sort({ _id: -1 });
}

function pickSelectedPosts(allPosts: PostDoc[], selectedPostIds?: string[]) {
  if (!selectedPostIds?.length) return [];
  const selectedSet = new Set(selectedPostIds);
  return allPosts.filter((post) => selectedSet.has(String(post._id)));
}

function buildQueryContext(allPosts: PostDoc[], request: AiSuggestionsRequest): QueryContext {
  const warnings: string[] = [];
  const selectedPosts = pickSelectedPosts(allPosts, request.selectedPostIds);

  let titles = (request.titles ?? []).map(sanitizeTitle).filter(Boolean);
  if (selectedPosts.length > 0) {
    titles = selectedPosts.map((post) => sanitizeTitle(post.title)).filter(Boolean);
  }

  if (!titles.length) {
    throw new AiLowConfidenceError("No usable recipe titles were supplied.");
  }

  if (selectedPosts.length === 0 && request.selectedPostIds?.length) {
    warnings.push("Selected post IDs did not match the authenticated user's posts; using titles only.");
  }

  return {
    posts: selectedPosts.length ? selectedPosts : allPosts.slice(0, 5),
    titles,
    language: detectLanguage(titles),
    warnings,
  };
}

export class AiSuggestionsService {
  constructor(private readonly deps: ServiceDeps) {}

  async getSuggestions(userId: string, requestId: string, request: AiSuggestionsRequest): Promise<AiSuggestionsResponse> {
    const allPosts = await loadUserPosts(userId);
    const context = buildQueryContext(allPosts, request);
    const warnings = [...context.warnings];
    const retriever = new RecipeRetriever(this.deps.config.embeddingDimensions, this.deps.config.retrievalThreshold);
    const sources = retriever.buildSources(userId, allPosts);

    let queryTitles = context.titles;
    const sourceLanguage = context.language;
    let providerLabel = "fallback";
    let mode: "rag" | "fallback" | "mock" = "fallback";

    if (sourceLanguage === "he") {
      try {
        const translation = await this.deps.llmClient.generateJson({
          purpose: "translate_titles",
          prompt: buildTranslationPrompt(context.titles),
          temperature: this.deps.config.temperature,
          maxTokens: 300,
          timeoutMs: this.deps.config.timeoutMs,
        });
        const translatedTitles = parseTranslatedTitles(translation.rawText);
        if (translatedTitles.length === context.titles.length) {
          queryTitles = translatedTitles;
          if (translation.mock) mode = "mock";
          providerLabel = translation.provider;
        } else {
          warnings.push("Title translation did not return a usable result; continuing with original titles.");
        }
      } catch (error) {
        warnings.push("Title translation failed; continuing with original titles.");
      }
    }

    const queryText = buildSelectedPostsQueryText(context.posts, queryTitles);
    const retrieval = retriever.retrieve(queryText, sources, this.deps.config.retrievalTopK);
    warnings.push(...retrieval.warnings);

    const allowedSourceIds = new Set(retrieval.hits.map((hit) => hit.sourceId));

    if (retrieval.hits.length === 0) {
      const excludedTitles = new Set((request.excludeTitles ?? []).map((title) => title.toLowerCase()));
      const fallback = conservativeFallback(queryTitles, retrieval.hits, request.maxSuggestions ?? 5).filter(
        (item) => !excludedTitles.has(item.title.toLowerCase())
      );
      const response = aiSuggestionsResponseSchema.parse({
        requestId,
        provider: "fallback",
        mode: "fallback",
        normalizedInput: {
          titles: queryTitles,
          language: "en",
        },
        retrieval: {
          used: false,
          topK: this.deps.config.retrievalTopK,
          hitCount: 0,
          thresholdApplied: this.deps.config.retrievalThreshold,
          warnings,
          sources: [],
        },
        suggestions: fallback,
        warnings,
        confidence: 0.24,
      });
      return response;
    }

    try {
      const generation = await this.deps.llmClient.generateJson({
        purpose: "generate_suggestions",
        prompt: buildSuggestionPrompt(
          queryTitles,
          retrieval.hits,
          request.maxSuggestions ?? 5,
          [...queryTitles, ...(request.excludeTitles ?? [])]
        ),
        temperature: this.deps.config.temperature,
        maxTokens: this.deps.config.maxTokens,
        timeoutMs: this.deps.config.timeoutMs,
      });

      providerLabel = generation.provider;
      mode = generation.mock ? "mock" : "rag";

      const parsed = llmRecipeSuggestionsSchema.parse(JSON.parse(generation.rawText));
      const deduped = dedupeSuggestions(
        parsed.suggestions,
        request.excludeTitles ?? [],
        queryTitles,
        allowedSourceIds
      ).slice(0, request.maxSuggestions ?? 5);

      if (!deduped.length) {
        throw new AiProviderError("AI output was unusable after validation.");
      }

      const confidence = Math.max(
        0.1,
        Math.min(
          typeof parsed.confidence === "number" ? parsed.confidence : 0.72,
          retrieval.hits[0]?.score ? Math.max(parsed.confidence ?? 0.72, retrieval.hits[0].score) : parsed.confidence ?? 0.72
        )
      );

      return aiSuggestionsResponseSchema.parse({
        requestId,
        provider: providerLabel,
        mode,
        normalizedInput: {
          titles: queryTitles,
          language: "en",
        },
        retrieval: {
          used: true,
          topK: this.deps.config.retrievalTopK,
          hitCount: retrieval.hits.length,
          thresholdApplied: this.deps.config.retrievalThreshold,
          warnings,
          sources: retrieval.hits.map((hit) => ({
            documentId: hit.documentId,
            sourceId: hit.sourceId,
            title: hit.metadata.title,
            chunkIndex: hit.chunkIndex,
            score: Number(hit.score.toFixed(4)),
          })),
        },
        suggestions: deduped,
        warnings: [...warnings, ...(parsed.warnings ?? [])],
        confidence: Number(confidence.toFixed(2)),
      });
    } catch (error) {
      const fallbackWarnings = [...warnings, "LLM generation failed validation; using conservative fallback."];
      const fallback = conservativeFallback(queryTitles, retrieval.hits, request.maxSuggestions ?? 5)
        .filter((item) => !new Set((request.excludeTitles ?? []).map((title) => title.toLowerCase())).has(item.title.toLowerCase()))
        .slice(0, request.maxSuggestions ?? 5);

      return aiSuggestionsResponseSchema.parse({
        requestId,
        provider: "fallback",
        mode: "fallback",
        normalizedInput: {
          titles: queryTitles,
          language: "en",
        },
        retrieval: {
          used: true,
          topK: this.deps.config.retrievalTopK,
          hitCount: retrieval.hits.length,
          thresholdApplied: this.deps.config.retrievalThreshold,
          warnings: fallbackWarnings,
          sources: retrieval.hits.map((hit) => ({
            documentId: hit.documentId,
            sourceId: hit.sourceId,
            title: hit.metadata.title,
            chunkIndex: hit.chunkIndex,
            score: Number(hit.score.toFixed(4)),
          })),
        },
        suggestions: fallback,
        warnings: fallbackWarnings,
        confidence: 0.35,
      });
    }
  }
}

export function createAiSuggestionsService(deps: ServiceDeps) {
  return new AiSuggestionsService(deps);
}
