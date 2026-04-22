import { setTimeout as delay } from "timers/promises";
import { AiProviderError } from "./errors";

export type LlmJsonParams = {
  purpose: "translate_titles" | "generate_suggestions";
  prompt: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
};

export type LlmJsonResult = {
  provider: string;
  rawText: string;
  mock: boolean;
};

export interface LlmClient {
  generateJson(params: LlmJsonParams): Promise<LlmJsonResult>;
}

type ProviderOptions = {
  provider: string;
  groqKey: string;
  geminiKey: string;
  geminiModel: string;
  mockMode: "always" | "development" | "test" | "never";
  mockScenario: "success" | "malformed_json" | "timeout" | "low_confidence";
  nodeEnv: string;
};

function shouldUseMock(options: ProviderOptions) {
  if (options.provider === "mock") return true;
  if (options.mockMode === "always") return true;
  if (options.mockMode === "development" && options.nodeEnv === "development") return true;
  if (options.mockMode === "test" && options.nodeEnv === "test") return true;
  return false;
}

function buildMockSuggestionPayload(prompt: string) {
  const queryLine = prompt
    .split("\n")
    .find((line) => line.startsWith("Query titles:"));
  const forbiddenLine = prompt
    .split("\n")
    .find((line) => line.startsWith("Forbidden titles:"));
  const lines = (queryLine?.replace("Query titles:", "") ?? "")
    .split("|")
    .map((line) => line.trim())
    .filter(Boolean);
  const forbidden = new Set(
    (forbiddenLine?.replace("Forbidden titles:", "") ?? "")
      .split("|")
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean)
  );
  const recipeLibrary = [
    "Banana oat loaf",
    "Apple crumble muffins",
    "Cinnamon swirl buns",
    "Blueberry yogurt cake",
    "Hazelnut brownies",
    "Orange olive oil cake",
    "Chai spice cookies",
    "Vanilla pear loaf",
  ];

  const seeds = recipeLibrary.filter((title) => !forbidden.has(title.toLowerCase()));
  const sourceIds = prompt
    .split("\n")
    .filter((line) => line.includes("sourceId="))
    .map((line) => {
      const match = line.match(/sourceId=([^;]+)/);
      return match?.[1]?.trim() ?? "";
    })
    .filter(Boolean);

  return JSON.stringify({
    suggestions: seeds.slice(0, 5).map((seed, index) => ({
      title: seed,
      recipe: {
        ingredients: [`${index + 2} eggs`, "1 cup flour", "1/2 cup sugar", "butter"],
        steps: ["Mix the ingredients", "Transfer to a pan", "Bake until done"],
      },
      basedOnSourceIds: sourceIds.slice(0, Math.max(1, Math.min(2, sourceIds.length))),
    })),
    confidence: 0.72,
    warnings: lines.length ? [`Mock suggestions were generated from ${lines.length} selected recipes.`] : [],
  });
}

function buildMockTranslationPayload(prompt: string) {
  const titles = prompt
    .split("\n")
    .filter((line) => /^\d+\.\s/.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  return JSON.stringify({
    titles: titles.map((title, index) => `translated recipe ${index + 1}: ${title}`),
  });
}

class ProviderLlmClient implements LlmClient {
  constructor(private readonly options: ProviderOptions) {}

  async generateJson(params: LlmJsonParams): Promise<LlmJsonResult> {
    if (shouldUseMock(this.options)) {
      if (this.options.mockScenario === "timeout") {
        await delay(Math.min(params.timeoutMs + 20, 100));
        throw new AiProviderError("Mock AI timeout");
      }
      if (this.options.mockScenario === "malformed_json") {
        return { provider: "mock", rawText: "{bad json", mock: true };
      }
      if (this.options.mockScenario === "low_confidence" && params.purpose === "generate_suggestions") {
        return {
          provider: "mock",
          rawText: JSON.stringify({
            suggestions: [
              {
                title: "Basic vanilla muffins",
                recipe: {
                  ingredients: ["flour", "sugar", "eggs"],
                  steps: ["Mix ingredients", "Bake"],
                },
                basedOnSourceIds: [],
              },
            ],
            confidence: 0.18,
            warnings: ["Mock low-confidence scenario."],
          }),
          mock: true,
        };
      }
      return {
        provider: "mock",
        rawText:
          params.purpose === "translate_titles"
            ? buildMockTranslationPayload(params.prompt)
            : buildMockSuggestionPayload(params.prompt),
        mock: true,
      };
    }

    if (this.options.provider === "groq") {
      return this.callGroq(params);
    }

    if (this.options.provider === "gemini") {
      return this.callGemini(params);
    }

    throw new AiProviderError(`Unsupported AI provider: ${this.options.provider}`);
  }

  private async callGroq(params: LlmJsonParams): Promise<LlmJsonResult> {
    if (!this.options.groqKey) throw new AiProviderError("GROQ_API_KEY not set");

    const models = ["llama-3.1-8b-instant", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"];
    for (const model of models) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.options.groqKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: params.prompt }],
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            response_format: { type: "json_object" },
          }),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          continue;
        }

        const data = (await response.json()) as any;
        return {
          provider: `groq:${model}`,
          rawText: String(data?.choices?.[0]?.message?.content ?? ""),
          mock: false,
        };
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          throw new AiProviderError("Groq AI request timed out");
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new AiProviderError("Groq AI provider failed");
  }

  private async callGemini(params: LlmJsonParams): Promise<LlmJsonResult> {
    if (!this.options.geminiKey) throw new AiProviderError("GEMINI_API_KEY not set");

    const models = [this.options.geminiModel, "gemini-1.5-flash-latest", "gemini-1.5-flash-8b"].filter(
      (value, index, arr) => value && arr.indexOf(value) === index
    );

    for (const model of models) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.options.geminiKey)}`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: params.prompt }] }],
              generationConfig: {
                temperature: params.temperature,
                maxOutputTokens: params.maxTokens,
              },
            }),
          }
        );

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          continue;
        }

        const data = (await response.json()) as any;
        return {
          provider: `gemini:${model}`,
          rawText:
            data?.candidates?.[0]?.content?.parts?.map((part: any) => String(part?.text ?? "")).join("\n") ?? "",
          mock: false,
        };
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          throw new AiProviderError("Gemini AI request timed out");
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new AiProviderError("Gemini AI provider failed");
  }
}

export function createLlmClient(options: ProviderOptions): LlmClient {
  return new ProviderLlmClient(options);
}
