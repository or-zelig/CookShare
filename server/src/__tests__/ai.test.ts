import request from "supertest";
import { createApp } from "../app";
import { connectTestDb, clearTestDb, disconnectTestDb } from "./db";

type Tokens = { accessToken: string };

async function register(app: any, user: { username: string; email: string; password: string }): Promise<Tokens> {
  const res = await request(app).post("/auth/register").send(user);
  expect(res.status).toBe(201);
  expect(res.body.accessToken).toBeTruthy();
  return { accessToken: res.body.accessToken };
}

describe("AI Search API", () => {
  const app = createApp();
  let token = "";

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    const u1 = await register(app, { username: "u1", email: "u1@test.com", password: "123456" });
    token = u1.accessToken;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  it("POST /v1/ai/search/parse returns 422 for low confidence", async () => {
    const res = await request(app).post("/v1/ai/search/parse").set(auth(token)).send({ query: "hi" });
    expect(res.status).toBe(422);
    expect(res.body.confidence).toBeLessThan(0.5);
  });

  it("POST /v1/ai/search/parse returns structured response", async () => {
    const res = await request(app).post("/v1/ai/search/parse").set(auth(token)).send({ query: "vegan pasta" });
    expect(res.status).toBe(200);
    expect(res.body.filters).toBeDefined();
    expect(Array.isArray(res.body.filters.includeTerms)).toBe(true);
  });

  it("POST /v1/ai/search returns filtered posts", async () => {
    await request(app)
      .post("/posts")
      .set(auth(token))
      .send({
        title: "Vegan Pasta",
        description: "Quick and easy",
        isPublic: true,
        tags: ["vegan"],
        ingredients: [{ name: "pasta" }],
      });

    const res = await request(app)
      .post("/v1/ai/search")
      .set(auth(token))
      .send({ query: "vegan pasta", maxResults: 5 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
  });
});
