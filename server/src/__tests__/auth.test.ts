import request from "supertest";
import { createApp } from "../app";
import { connectTestDb, clearTestDb, disconnectTestDb } from "./db";

describe("Auth API", () => {
  const app = createApp();

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it("POST /auth/register returns user + accessToken", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "u1", email: "u1@test.com", password: "123456" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe("u1");
    expect(res.body.accessToken).toMatch(/^eyJ/);
  });

  it("POST /auth/login returns user + accessToken", async () => {
    await request(app)
      .post("/auth/register")
      .send({ username: "u1", email: "u1@test.com", password: "123456" })
      .set("Content-Type", "application/json");

    const res = await request(app)
      .post("/auth/login")
      .send({ username: "u1", password: "123456" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("u1");
    expect(res.body.accessToken).toMatch(/^eyJ/);
  });

  it("GET /auth/me without token returns 401", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /auth/me with token returns 200", async () => {
    const reg = await request(app)
      .post("/auth/register")
      .send({ username: "u1", email: "u1@test.com", password: "123456" })
      .set("Content-Type", "application/json");

    const token = reg.body.accessToken as string;

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("u1");
  });

  it("POST /auth/logout returns ok", async () => {
    const res = await request(app).post("/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("POST /auth/google without credential returns 400", async () => {
    const res = await request(app)
      .post("/auth/google")
      .send({})
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
  });
});
