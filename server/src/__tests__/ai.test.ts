import request from "supertest";
import { createApp } from "../app";
import { connectTestDb, clearTestDb, disconnectTestDb } from "./db";
import { resetAiRateLimiter } from "../ai/rateLimiter";
import { ENV } from "../config/env";
import { createAiSuggestionsService } from "../ai/service";
import type { LlmClient } from "../ai/llmClient";

async function register(app: any, user: { username: string; email: string; password: string }) {
  const res = await request(app).post("/auth/register").send(user);
  expect(res.status).toBe(201);
  return {
    accessToken: res.body.accessToken as string,
    userId: String(res.body.user?.id ?? ""),
  };
}

describe("AI suggestions", () => {
  const app = createApp();
  let token = "";
  let userId = "";

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    resetAiRateLimiter();

    ENV.AI_PROVIDER = "mock";
    ENV.LLM_MOCK_MODE = "always";
    ENV.AI_MOCK_SCENARIO = "success";
    ENV.AI_RETRIEVAL_TOP_K = 5;
    ENV.AI_RETRIEVAL_THRESHOLD = 0.18;
    ENV.AI_RATE_LIMIT_RPM = 30;

    const user = await register(app, {
      username: "abby",
      email: "abby@test.com",
      password: "123456",
    });
    token = user.accessToken;
    userId = user.userId;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  const auth = (value: string) => ({ Authorization: `Bearer ${value}` });

  async function createPost(body: any) {
    const res = await request(app).post("/posts").set(auth(token)).send(body);
    expect(res.status).toBe(201);
    return res.body.post;
  }

  it("returns 400 for invalid body with requestId", async () => {
    const res = await request(app).post("/ai/suggestions").set(auth(token)).send({});

    expect(res.status).toBe(400);
    expect(res.body.requestId).toBeTruthy();
    expect(res.body.error.code).toBe("invalid_body");
  });

  it("service returns rag success with retrieval sources", async () => {
    const created = await createPost({
      title: "Banana bread",
      description: "Soft loaf with bananas and cinnamon",
      tags: ["banana", "loaf"],
      ingredients: [{ name: "banana" }, { name: "flour" }, { name: "cinnamon" }],
      steps: ["Mash bananas", "Bake the loaf"],
      isPublic: true,
    });

    const llmClient: LlmClient = {
      async generateJson(params) {
        if (params.purpose === "translate_titles") {
          return {
            provider: "mock:test",
            rawText: JSON.stringify({ titles: ["Banana bread"] }),
            mock: false,
          };
        }

        const sourceIds = params.prompt
          .split("\n")
          .filter((line) => line.includes("sourceId="))
          .map((line) => line.match(/sourceId=([^;]+)/)?.[1] ?? "")
          .filter(Boolean);

        return {
          provider: "mock:test",
          rawText: JSON.stringify({
            suggestions: [
              {
                title: "Banana oat loaf",
                recipe: {
                  ingredients: ["banana", "oats", "eggs", "flour"],
                  steps: ["Mix the batter", "Bake in a loaf pan"],
                },
                basedOnSourceIds: sourceIds.slice(0, 1),
              },
            ],
            confidence: 0.77,
            warnings: [],
          }),
          mock: false,
        };
      },
    };

    const service = createAiSuggestionsService({
      llmClient,
      config: {
        retrievalTopK: 5,
        retrievalThreshold: 0.05,
        embeddingDimensions: 128,
        temperature: 0.2,
        maxTokens: 600,
        timeoutMs: 3000,
      },
    });

    const response = await service.getSuggestions(userId, "req_test", {
      selectedPostIds: [String(created._id ?? created.id)],
      titles: ["Banana bread"],
      maxSuggestions: 1,
    });

    expect(response.mode).toBe("rag");
    expect(response.retrieval.used).toBe(true);
    expect(response.retrieval.hitCount).toBeGreaterThan(0);
    expect(response.suggestions[0].basedOnSourceIds?.length).toBeGreaterThan(0);
  });

  it("falls back when mock returns malformed JSON", async () => {
    await createPost({
      title: "Apple pie",
      description: "Classic pie with apples",
      ingredients: [{ name: "apple" }, { name: "flour" }, { name: "butter" }],
      steps: ["Prepare filling", "Bake the pie"],
      isPublic: true,
    });

    ENV.AI_MOCK_SCENARIO = "malformed_json";

    const res = await request(app)
      .post("/ai/suggestions")
      .set(auth(token))
      .send({ titles: ["Apple pie"] });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("fallback");
    expect(res.body.requestId).toBeTruthy();
    expect(res.body.warnings.length).toBeGreaterThan(0);
  });

  it("uses mock mode deterministically during tests", async () => {
    await createPost({
      title: "Cheesecake",
      description: "Creamy cheesecake",
      ingredients: [{ name: "cream cheese" }, { name: "eggs" }, { name: "sugar" }],
      steps: ["Mix filling", "Bake gently"],
      isPublic: true,
    });

    ENV.AI_PROVIDER = "groq";
    ENV.LLM_MOCK_MODE = "test";
    ENV.AI_MOCK_SCENARIO = "success";

    const res = await request(app)
      .post("/ai/suggestions")
      .set(auth(token))
      .send({ titles: ["Cheesecake"] });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("mock");
  });

  it("returns fallback when no retrieval hit passes the threshold", async () => {
    await createPost({
      title: "Savory cheese tart",
      description: "Cheese and herbs",
      ingredients: [{ name: "cheese" }, { name: "flour" }, { name: "butter" }],
      steps: ["Mix dough", "Bake tart"],
      isPublic: true,
    });

    ENV.AI_RETRIEVAL_THRESHOLD = 0.95;

    const res = await request(app)
      .post("/ai/suggestions")
      .set(auth(token))
      .send({ titles: ["Chocolate souffle"] });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("fallback");
    expect(res.body.retrieval.used).toBe(false);
    expect(res.body.retrieval.hitCount).toBe(0);
  });

  it("deduplicates suggestions and excludes excluded titles", async () => {
    const post = await createPost({
      title: "Lemon cake",
      description: "Bright lemon flavor",
      ingredients: [{ name: "lemon" }, { name: "flour" }, { name: "eggs" }],
      steps: ["Mix batter", "Bake cake"],
      isPublic: true,
    });

    const llmClient: LlmClient = {
      async generateJson(params) {
        const sourceIds = params.prompt
          .split("\n")
          .filter((line) => line.includes("sourceId="))
          .map((line) => line.match(/sourceId=([^;]+)/)?.[1] ?? "")
          .filter(Boolean);

        return {
          provider: "mock:test",
          rawText: JSON.stringify({
            suggestions: [
              {
                title: "Lemon cake remix",
                recipe: {
                  ingredients: ["lemon", "flour", "eggs"],
                  steps: ["Mix", "Bake"],
                },
                basedOnSourceIds: sourceIds.slice(0, 1),
              },
              {
                title: "Lemon cake remix",
                recipe: {
                  ingredients: ["lemon", "flour", "eggs"],
                  steps: ["Mix", "Bake"],
                },
                basedOnSourceIds: sourceIds.slice(0, 1),
              },
              {
                title: "Blueberry loaf",
                recipe: {
                  ingredients: ["blueberries", "flour", "eggs"],
                  steps: ["Mix batter", "Bake loaf"],
                },
                basedOnSourceIds: sourceIds.slice(0, 1),
              },
            ],
            confidence: 0.8,
          }),
          mock: false,
        };
      },
    };

    const service = createAiSuggestionsService({
      llmClient,
      config: {
        retrievalTopK: 5,
        retrievalThreshold: 0.01,
        embeddingDimensions: 128,
        temperature: 0.2,
        maxTokens: 600,
        timeoutMs: 3000,
      },
    });

    const response = await service.getSuggestions(userId, "req_dedupe", {
      selectedPostIds: [String(post._id ?? post.id)],
      titles: ["Lemon cake"],
      excludeTitles: ["Lemon cake remix"],
      maxSuggestions: 3,
    });

    const suggestionTitles = response.suggestions.map((item) => item.title.toLowerCase());
    expect(suggestionTitles).not.toContain("lemon cake remix");
    expect(new Set(suggestionTitles).size).toBe(suggestionTitles.length);
  });
});
