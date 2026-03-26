import { Router, Response } from "express";
import { requireAuth, AuthedRequest } from "../middlewares/requireAuth";

type AiSuggestionsResponse = {
  suggestions: string[];
  provider: string;
  note?: string;
};

const aiRouter = Router();

const DEFAULT_SUGGESTIONS = [
  "Lemon drizzle loaf",
  "Cinnamon rolls",
  "Berry crumble",
  "Salted caramel brownies",
  "Matcha shortbread",
];

function sanitizeTitles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((title) => title.slice(0, 100));
}

function fallbackSuggestions(titles: string[]): string[] {
  const lower = titles.join(" ").toLowerCase();
  const picks = new Set<string>();

  const addIf = (token: string, suggestion: string) => {
    if (lower.includes(token)) picks.add(suggestion);
  };

  addIf("chocolate", "Chocolate lava cake");
  addIf("banana", "Banana bread");
  addIf("cookie", "Chewy brown sugar cookies");
  addIf("bread", "No-knead focaccia");
  addIf("muffin", "Blueberry muffins");
  addIf("cheesecake", "Mini berry cheesecakes");
  addIf("cinnamon", "Cinnamon swirl coffee cake");
  addIf("apple", "Apple crumble bars");
  addIf("carrot", "Carrot cake loaf");
  addIf("brownie", "Espresso brownies");

  for (const suggestion of DEFAULT_SUGGESTIONS) {
    if (picks.size >= 5) break;
    picks.add(suggestion);
  }

  return Array.from(picks).slice(0, 5);
}

function buildPrompt(titles: string[]) {
  return [
    "You are a helpful baking assistant.",
    "Based on these recent recipes, suggest 5 new things to bake next.",
    "Return only a JSON array of strings with no extra text.",
    "",
    "Recent recipes:",
    ...titles.map((title, idx) => `${idx + 1}. ${title}`),
  ].join("\n");
}

function parseSuggestions(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
  } catch {
    // fallback to line parsing
  }

  return trimmed
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);
}

type AiAttempt = {
  suggestions: string[];
  provider: string;
};

async function callGroq(prompt: string, apiKey: string): Promise<AiAttempt> {
  const models = [
    "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile",
    "mixtral-8x7b-32768",
  ];

  for (const model of models) {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 256,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("[ai] groq model failed:", model, text || resp.status);
      continue;
    }

    const data = (await resp.json()) as any;
    const content = data?.choices?.[0]?.message?.content ?? "";
    const suggestions = parseSuggestions(String(content));
    return {
      suggestions: suggestions.length ? suggestions.slice(0, 5) : [],
      provider: `groq:${model}`,
    };
  }

  throw new Error("No Groq models succeeded.");
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<AiAttempt> {
  const modelsToTry = [
    model,
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-8b",
    "gemini-1.0-pro",
  ].filter((value, idx, arr) => value && arr.indexOf(value) === idx);

  for (const currentModel of modelsToTry) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("[ai] gemini model failed:", currentModel, text || resp.status);
      continue;
    }

    const data = (await resp.json()) as any;
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => String(part?.text ?? ""))
        .join("\n") ?? "";

    const suggestions = parseSuggestions(text);
    return {
      suggestions: suggestions.length ? suggestions.slice(0, 5) : [],
      provider: `gemini:${currentModel}`,
    };
  }

  throw new Error("No Gemini models succeeded.");
}

aiRouter.post("/ai/suggestions", requireAuth, async (req: AuthedRequest, res: Response) => {
  const titles = sanitizeTitles(req.body?.titles);
  if (!titles.length) {
    return res.status(400).json({ message: "titles are required" });
  }

  const prompt = buildPrompt(titles);
  const provider = (process.env.AI_PROVIDER || "groq").toLowerCase();
  const groqKey = process.env.GROQ_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";

  try {
    let attempt: AiAttempt | null = null;

    if (provider === "groq") {
      if (!groqKey) throw new Error("GROQ_API_KEY not set");
      attempt = await callGroq(prompt, groqKey);
    } else if (provider === "gemini") {
      if (!geminiKey) throw new Error("GEMINI_API_KEY not set");
      attempt = await callGemini(prompt, geminiKey, geminiModel);
    } else {
      throw new Error(`Unknown AI_PROVIDER: ${provider}`);
    }

    const suggestions = attempt?.suggestions?.length
      ? attempt.suggestions
      : fallbackSuggestions(titles);
    const payload: AiSuggestionsResponse = {
      suggestions,
      provider: attempt?.provider ?? "fallback",
    };

    return res.json(payload);
  } catch (err) {
    console.error("[ai] request failed:", err);
    const suggestions = fallbackSuggestions(titles);
    const payload: AiSuggestionsResponse = {
      suggestions,
      provider: "fallback",
      note: "AI request failed; using local suggestions.",
    };
    return res.json(payload);
  }
});

export default aiRouter;
