import { ENV } from "../config/env";
import type { LlmParseArgs, LlmParseResult } from "./types";

type OpenAiMessage = { role: "system" | "user"; content: string };

type OpenAiResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
  usage?: { total_tokens?: number };
};

function must(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function clampConfidence(v: any) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return Math.max(0, Math.min(1, n));
}

export const openAiProvider = {
  name: "openai",
  async parseQuery(args: LlmParseArgs): Promise<LlmParseResult> {
    const apiKey = must("OPENAI_API_KEY", ENV.OPENAI_API_KEY);
    const model = ENV.OPENAI_MODEL || "gpt-4o-mini";

    const messages: OpenAiMessage[] = [
      { role: "system", content: args.prompts.system },
      { role: "user", content: args.prompts.user },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: ENV.AI_RESPONSE_MAX_TOKENS,
        messages,
      }),
      signal: args.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI error: ${res.status} ${res.statusText} ${text}`.trim());
    }

    const data = (await res.json()) as OpenAiResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned empty content");

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error("OpenAI returned non-JSON content");
    }

    return {
      normalizedQuery: String(parsed.normalizedQuery ?? ""),
      filters: parsed.filters ?? {},
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      confidence: clampConfidence(parsed.confidence),
      raw: content,
    };
  },
};
