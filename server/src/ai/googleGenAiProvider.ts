import { GoogleGenAI } from "@google/genai";
import { ENV } from "../config/env";
import type { LlmParseArgs, LlmParseResult } from "./types";

function clampConfidence(v: any) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return Math.max(0, Math.min(1, n));
}

const ai = new GoogleGenAI({});

export const googleGenAiProvider = {
  name: "google-genai",
  async parseQuery(args: LlmParseArgs): Promise<LlmParseResult> {
    const model = ENV.GEMINI_MODEL || "gemini-3-flash-preview";
    const prompt = [args.prompts.system, args.prompts.user].filter(Boolean).join("\n\n");

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const content =
      typeof (response as { text?: unknown }).text === "function"
        ? await (response as { text: () => Promise<string> }).text()
        : (response as { text?: string }).text;

    if (!content) throw new Error("Google GenAI returned empty content");

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error("Google GenAI returned non-JSON content");
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
