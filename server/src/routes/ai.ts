import { Router, Response } from "express";
import { requireAuth, AuthedRequest } from "../middlewares/requireAuth";

type RecipeSuggestion = {
  title: string;
  recipe: {
    ingredients: string[];
    steps: string[];
  };
};

type AiSuggestionsResponse = {
  suggestions: RecipeSuggestion[];
  provider: string;
  language: "en";
  note?: string;
};

type AiAttempt = {
  suggestions: RecipeSuggestion[];
  provider: string;
};

type TextAttempt = {
  text: string;
  provider: string;
};

const aiRouter = Router();

function sanitizeTitles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((title) => title.slice(0, 100));
}

function sanitizeExcludeTitles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((title) => title.toLowerCase());
}

function detectLanguage(titles: string[]): "he" | "en" {
  const sample = titles.join(" ");
  const hebrewChars = (sample.match(/[\u0590-\u05FF]/g) ?? []).length;
  const latinChars = (sample.match(/[A-Za-z]/g) ?? []).length;
  return hebrewChars >= latinChars ? "he" : "en";
}

function buildRecommendationPrompt(titles: string[], excludeTitles: string[], variationHint: string) {
  const lines = [
    "You are a baking assistant.",
    "Return all content in English only.",
    "Use clear everyday words.",
    "Based on the user's recent recipes, suggest 5 next recipes to bake.",
    "Prefer variety over repeating the same classic ideas.",
    "Return only valid JSON with this exact shape:",
    '{"suggestions":[{"title":"string","recipe":{"ingredients":["string"],"steps":["string"]}}]}',
    "Each recipe should be short, practical, and easy to follow.",
    "Do not include markdown, code fences, or extra commentary.",
    `Variation hint: ${variationHint}`,
    "",
    "Recent recipes:",
    ...titles.map((title, idx) => `${idx + 1}. ${title}`),
  ];

  if (excludeTitles.length) {
    lines.push("", "Do not suggest these titles again:");
    excludeTitles.forEach((title, idx) => lines.push(`${idx + 1}. ${title}`));
  }

  return lines.join("\n");
}

function buildTranslationPrompt(titles: string[]) {
  return [
    "Translate the following recipe titles into natural English.",
    "Return only valid JSON with this exact shape:",
    '{"titles":["string"]}',
    "Do not add explanations.",
    "",
    "Titles:",
    ...titles.map((title, idx) => `${idx + 1}. ${title}`),
  ].join("\n");
}

function parseStructuredSuggestions(text: string): RecipeSuggestion[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as {
      suggestions?: Array<{
        title?: unknown;
        recipe?: { ingredients?: unknown; steps?: unknown };
      }>;
    };

    if (!Array.isArray(parsed?.suggestions)) return [];

    return parsed.suggestions
      .map((item) => ({
        title: String(item?.title ?? "").trim(),
        recipe: {
          ingredients: Array.isArray(item?.recipe?.ingredients)
            ? item.recipe.ingredients.map((v) => String(v ?? "").trim()).filter(Boolean)
            : [],
          steps: Array.isArray(item?.recipe?.steps)
            ? item.recipe.steps.map((v) => String(v ?? "").trim()).filter(Boolean)
            : [],
        },
      }))
      .filter((item) => item.title);
  } catch {
    return [];
  }
}

function parseTranslatedTitles(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as { titles?: unknown[] };
    if (!Array.isArray(parsed?.titles)) return [];
    return parsed.titles.map((item) => String(item ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function hasMojibake(value: string) {
  return /׳|�/.test(value);
}

function looksEnglish(value: string) {
  const sample = value.replace(/\s+/g, "");
  if (!sample) return false;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  return latin / sample.length >= 0.45;
}

function isValidSuggestion(item: RecipeSuggestion) {
  if (!item.title) return false;
  if (item.recipe.ingredients.length < 3 || item.recipe.steps.length < 2) return false;

  const combined = [
    item.title,
    ...item.recipe.ingredients,
    ...item.recipe.steps,
  ].join(" ");

  if (hasMojibake(combined)) return false;
  if (!looksEnglish(combined)) return false;

  return true;
}

function fallbackSuggestions(excludeTitles: string[], variationHint: string): RecipeSuggestion[] {
  const all = [
    {
      title: "Lemon loaf cake",
      recipe: {
        ingredients: ["2 eggs", "1/2 cup sugar", "1 cup flour", "lemon juice", "1/3 cup oil"],
        steps: ["Mix everything", "Pour into a loaf pan", "Bake until golden"],
      },
    },
    {
      title: "Cinnamon rolls",
      recipe: {
        ingredients: ["2 cups flour", "yeast", "milk", "butter", "cinnamon sugar"],
        steps: ["Make the dough", "Roll and spread filling", "Slice and bake"],
      },
    },
    {
      title: "Chocolate brownies",
      recipe: {
        ingredients: ["200g chocolate", "100g butter", "2 eggs", "1/2 cup sugar", "1/2 cup flour"],
        steps: ["Melt chocolate and butter", "Mix in the rest", "Bake briefly for a fudgy texture"],
      },
    },
    {
      title: "Banana bread",
      recipe: {
        ingredients: ["3 ripe bananas", "2 eggs", "1/2 cup sugar", "1/3 cup oil", "1 1/2 cups flour"],
        steps: ["Mash the bananas", "Mix with the wet ingredients", "Fold in the flour and bake"],
      },
    },
    {
      title: "Blueberry muffins",
      recipe: {
        ingredients: ["1 1/2 cups flour", "1/2 cup sugar", "1 egg", "milk", "blueberries"],
        steps: ["Mix dry ingredients", "Add wet ingredients", "Fold in blueberries and bake in a muffin tray"],
      },
    },
    {
      title: "Apple crumble bars",
      recipe: {
        ingredients: ["2 apples", "1 1/2 cups flour", "butter", "brown sugar", "cinnamon"],
        steps: ["Make the crumb mixture", "Layer apples in the pan", "Top with crumbs and bake"],
      },
    },
    {
      title: "Vanilla pound cake",
      recipe: {
        ingredients: ["1 cup butter", "1 cup sugar", "3 eggs", "1 1/2 cups flour", "vanilla extract"],
        steps: ["Cream butter and sugar", "Add eggs and vanilla", "Fold in flour and bake"],
      },
    },
    {
      title: "Peanut butter cookies",
      recipe: {
        ingredients: ["1 cup peanut butter", "1/2 cup sugar", "1 egg", "vanilla extract"],
        steps: ["Mix everything", "Shape into small cookies", "Bake until lightly golden"],
      },
    },
    {
      title: "Carrot cake loaf",
      recipe: {
        ingredients: ["2 carrots", "2 eggs", "1/2 cup sugar", "1 1/2 cups flour", "cinnamon"],
        steps: ["Grate the carrots", "Mix the batter", "Pour into a loaf pan and bake"],
      },
    },
    {
      title: "Cheese danish buns",
      recipe: {
        ingredients: ["2 cups flour", "yeast", "milk", "cream cheese", "sugar"],
        steps: ["Make the dough", "Prepare the cheese filling", "Shape buns and bake"],
      },
    },
  ];

  const filtered = all.filter((item) => !excludeTitles.includes(item.title.toLowerCase()));
  const rotationBase = variationHint
    .split("")
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const rotation = filtered.length ? rotationBase % filtered.length : 0;
  const rotated = filtered.slice(rotation).concat(filtered.slice(0, rotation));
  return rotated.slice(0, 5);
}

async function callGroqJson(prompt: string, apiKey: string): Promise<TextAttempt> {
  const models = ["llama-3.1-8b-instant", "llama-3.1-70b-versatile", "mixtral-8x7b-32768"];

  for (const model of models) {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("[ai] groq model failed:", model, text || resp.status);
      continue;
    }

    const data = (await resp.json()) as any;
    return {
      text: String(data?.choices?.[0]?.message?.content ?? ""),
      provider: `groq:${model}`,
    };
  }

  throw new Error("No Groq models succeeded.");
}

async function callGeminiJson(prompt: string, apiKey: string, model: string): Promise<TextAttempt> {
  const modelsToTry = [model, "gemini-1.5-flash-latest", "gemini-1.5-flash-8b", "gemini-1.0-pro"].filter(
    (value, idx, arr) => value && arr.indexOf(value) === idx
  );

  for (const currentModel of modelsToTry) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("[ai] gemini model failed:", currentModel, text || resp.status);
      continue;
    }

    const data = (await resp.json()) as any;
    return {
      text:
        data?.candidates?.[0]?.content?.parts?.map((part: any) => String(part?.text ?? "")).join("\n") ?? "",
      provider: `gemini:${currentModel}`,
    };
  }

  throw new Error("No Gemini models succeeded.");
}

async function callProviderJson(
  prompt: string,
  provider: string,
  groqKey: string,
  geminiKey: string,
  geminiModel: string
): Promise<TextAttempt> {
  if (provider === "groq") {
    if (!groqKey) throw new Error("GROQ_API_KEY not set");
    return callGroqJson(prompt, groqKey);
  }
  if (provider === "gemini") {
    if (!geminiKey) throw new Error("GEMINI_API_KEY not set");
    return callGeminiJson(prompt, geminiKey, geminiModel);
  }
  throw new Error(`Unknown AI_PROVIDER: ${provider}`);
}

async function translateTitlesIfNeeded(
  titles: string[],
  sourceLanguage: "he" | "en",
  provider: string,
  groqKey: string,
  geminiKey: string,
  geminiModel: string
) {
  if (sourceLanguage === "en") {
    return { titles, note: undefined as string | undefined, providerUsed: undefined as string | undefined };
  }

  try {
    const translation = await callProviderJson(
      buildTranslationPrompt(titles),
      provider,
      groqKey,
      geminiKey,
      geminiModel
    );
    const translatedTitles = parseTranslatedTitles(translation.text);
    if (translatedTitles.length === titles.length) {
      return {
        titles: translatedTitles,
        note: "Translated Hebrew recipe titles to English before generating recommendations.",
        providerUsed: translation.provider,
      };
    }
  } catch (err) {
    console.error("[ai] title translation failed:", err);
  }

  return {
    titles,
    note: "Could not translate titles first; recommendations may be weaker.",
    providerUsed: undefined as string | undefined,
  };
}

aiRouter.post("/ai/suggestions", requireAuth, async (req: AuthedRequest, res: Response) => {
  const rawTitles = sanitizeTitles(req.body?.titles);
  const excludeTitles = sanitizeExcludeTitles(req.body?.excludeTitles);
  if (!rawTitles.length) {
    return res.status(400).json({ message: "titles are required" });
  }

  const sourceLanguage = detectLanguage(rawTitles);
  const provider = (process.env.AI_PROVIDER || "groq").toLowerCase();
  const groqKey = process.env.GROQ_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
  const variationHint = new Date().toISOString();

  try {
    const translated = await translateTitlesIfNeeded(
      rawTitles,
      sourceLanguage,
      provider,
      groqKey,
      geminiKey,
      geminiModel
    );

    const recommendationAttempt = await callProviderJson(
      buildRecommendationPrompt(translated.titles, excludeTitles, variationHint),
      provider,
      groqKey,
      geminiKey,
      geminiModel
    );

    const validated = parseStructuredSuggestions(recommendationAttempt.text)
      .filter((item) => isValidSuggestion(item))
      .slice(0, 5);

    return res.json({
      suggestions: validated.length ? validated : fallbackSuggestions(excludeTitles, variationHint),
      provider: validated.length ? recommendationAttempt.provider : "fallback",
      language: "en",
      note:
        validated.length > 0
          ? translated.note
          : "AI output quality was too low; showing local English suggestions.",
    } satisfies AiSuggestionsResponse);
  } catch (err) {
    console.error("[ai] request failed:", err);
    return res.json({
      suggestions: fallbackSuggestions(excludeTitles, variationHint),
      provider: "fallback",
      language: "en",
      note: "AI request failed; showing local English suggestions.",
    } satisfies AiSuggestionsResponse);
  }
});

export default aiRouter;
