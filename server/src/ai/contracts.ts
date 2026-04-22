import { z } from "zod";

export const aiSuggestionsRequestSchema = z
  .object({
    selectedPostIds: z.array(z.string().min(1)).max(10).optional(),
    titles: z.array(z.string().min(1).max(100)).max(10).optional(),
    excludeTitles: z.array(z.string().min(1).max(120)).max(20).optional(),
    locale: z.string().min(2).max(16).optional(),
    maxSuggestions: z.number().int().min(1).max(8).optional(),
  })
  .superRefine((value, ctx) => {
    if ((!value.selectedPostIds || value.selectedPostIds.length === 0) && (!value.titles || value.titles.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "selectedPostIds or titles are required",
        path: ["selectedPostIds"],
      });
    }
  });

export const llmRecipeSuggestionSchema = z.object({
  title: z.string().min(1).max(120),
  recipe: z.object({
    ingredients: z.array(z.string().min(1).max(160)).min(3).max(12),
    steps: z.array(z.string().min(1).max(240)).min(2).max(8),
  }),
  basedOnSourceIds: z.array(z.string().min(1)).max(5).optional(),
});

export const llmRecipeSuggestionsSchema = z.object({
  suggestions: z.array(llmRecipeSuggestionSchema).min(1).max(8),
  warnings: z.array(z.string().min(1).max(200)).max(8).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const aiSuggestionsResponseSchema = z.object({
  requestId: z.string().min(1),
  provider: z.string().min(1),
  mode: z.enum(["rag", "fallback", "mock"]),
  normalizedInput: z.object({
    titles: z.array(z.string().min(1)),
    language: z.string().min(2),
  }),
  retrieval: z.object({
    used: z.boolean(),
    topK: z.number().int().min(0),
    hitCount: z.number().int().min(0),
    thresholdApplied: z.number().nullable(),
    warnings: z.array(z.string()),
    sources: z.array(
      z.object({
        documentId: z.string().min(1),
        sourceId: z.string().min(1),
        title: z.string().optional(),
        chunkIndex: z.number().int().min(0).optional(),
        score: z.number().optional(),
      })
    ),
  }),
  suggestions: z.array(llmRecipeSuggestionSchema),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type AiSuggestionsRequest = z.infer<typeof aiSuggestionsRequestSchema>;
export type LlmRecipeSuggestions = z.infer<typeof llmRecipeSuggestionsSchema>;
export type AiSuggestionsResponse = z.infer<typeof aiSuggestionsResponseSchema>;
export type AiSuggestion = AiSuggestionsResponse["suggestions"][number];
