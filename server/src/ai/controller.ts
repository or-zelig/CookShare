import type { Request, Response } from "express";
import { ZodError } from "zod";
import { ENV } from "../config/env";
import { parseAiAuthHeader } from "./auth";
import { aiSuggestionsRequestSchema } from "./contracts";
import { AiAppError, AiValidationError } from "./errors";
import { createLlmClient } from "./llmClient";
import { enforceAiRateLimit } from "./rateLimiter";
import { createRequestId } from "./requestId";
import { createAiSuggestionsService } from "./service";

function parseBody(body: unknown) {
  try {
    return aiSuggestionsRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AiValidationError("Invalid AI suggestions request body", error.flatten());
    }
    throw error;
  }
}

function toErrorPayload(requestId: string, error: unknown) {
  if (error instanceof AiAppError) {
    return {
      statusCode: error.statusCode,
      body: {
        requestId,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      requestId,
      error: {
        code: "internal_error",
        message: error instanceof Error ? error.message : "Internal server error",
      },
    },
  };
}

export async function postAiSuggestionsController(req: Request, res: Response) {
  const requestId = createRequestId();
  res.setHeader("X-Request-Id", requestId);

  try {
    const auth = parseAiAuthHeader(req.header("Authorization"));

    const parsedBody = parseBody(req.body);
    enforceAiRateLimit(auth.userId, ENV.AI_RATE_LIMIT_RPM);

    const llmClient = createLlmClient({
      provider: ENV.AI_PROVIDER,
      groqKey: ENV.GROQ_API_KEY,
      geminiKey: ENV.GEMINI_API_KEY,
      geminiModel: ENV.GEMINI_MODEL,
      mockMode: ENV.LLM_MOCK_MODE,
      mockScenario: ENV.AI_MOCK_SCENARIO,
      nodeEnv: ENV.NODE_ENV,
    });

    const service = createAiSuggestionsService({
      llmClient,
      config: {
        retrievalTopK: ENV.AI_RETRIEVAL_TOP_K,
        retrievalThreshold: ENV.AI_RETRIEVAL_THRESHOLD,
        embeddingDimensions: ENV.AI_EMBEDDING_DIMENSIONS,
        temperature: ENV.AI_TEMPERATURE,
        maxTokens: ENV.AI_MAX_OUTPUT_TOKENS,
        timeoutMs: ENV.AI_TIMEOUT_MS,
      },
    });

    const response = await service.getSuggestions(auth.userId, requestId, parsedBody);
    return res.status(200).json(response);
  } catch (error) {
    const mapped = toErrorPayload(requestId, error);
    return res.status(mapped.statusCode).json(mapped.body);
  }
}
