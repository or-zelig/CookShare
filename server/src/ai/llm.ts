import { ENV } from "../config/env";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { LlmProvider, LlmParseArgs, LlmParseResult } from "./types";
import { parseMock } from "./mockProvider";
import { openAiProvider } from "./openaiProvider";
import { googleGenAiProvider } from "./googleGenAiProvider";

function shouldMock() {
  const mode = ENV.LLM_MOCK_MODE;
  if (mode === "always") return true;
  if (mode === "never") return false;
  if (mode === "test") return ENV.NODE_ENV === "test";
  if (mode === "development") return ENV.NODE_ENV !== "production";
  return true;
}

const mockProvider: LlmProvider = {
  name: "mock",
  async parseQuery(args) {
    return parseMock(args.query);
  },
};

const missingProvider: LlmProvider = {
  name: "missing",
  async parseQuery() {
    throw new Error("LLM provider not configured");
  },
};

export function getLlmProvider(): LlmProvider {
  if (shouldMock()) return mockProvider;
  if (ENV.LLM_PROVIDER === "openai") return openAiProvider;
  if (ENV.LLM_PROVIDER === "google" || ENV.LLM_PROVIDER === "genai" || ENV.LLM_PROVIDER === "gemini") {
    return googleGenAiProvider;
  }
  return missingProvider;
}

export function buildPrompts(args: { query: string; locale?: string; maxResults: number }) {
  return {
    system: buildSystemPrompt(),
    user: buildUserPrompt(args),
  };
}

export async function callProvider(
  provider: LlmProvider,
  args: LlmParseArgs,
  timeoutMs: number
): Promise<LlmParseResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await provider.parseQuery({ ...args, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}
