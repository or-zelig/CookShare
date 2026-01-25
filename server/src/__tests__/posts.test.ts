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

describe("Posts API", () => {
  const app = createApp();

  let token1 = "";
  let token2 = "";

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    const u1 = await register(app, { username: "u1", email: "u1@test.com", password: "123456" });
    const u2 = await register(app, { username: "u2", email: "u2@test.com", password: "123456" });

    token1 = u1.accessToken;
    token2 = u2.accessToken;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function createPostMultipart(t: string, fields: Record<string, any>) {
    const r = request(app).post("/posts").set(auth(t));

    // multipart fields:
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue;

      // For arrays/objects, send as JSON string (like FormData usually does)
      const value =
        typeof v === "string" || typeof v === "number" || typeof v === "boolean"
          ? String(v)
          : JSON.stringify(v);

      r.field(k, value);
    }

    return r;
  }

  async function createPostJson(t: string, body: any) {
    return request(app).post("/posts").set(auth(t)).send(body);
  }

  async function createComment(t: string, postId: string, text: string) {
    return request(app).post(`/posts/${postId}/comments`).set(auth(t)).send({ text });
  }

  async function likePost(t: string, postId: string) {
    return request(app).post(`/posts/${postId}/like`).set(auth(t));
  }

  it("POST /posts requires auth", async () => {
    const res = await request(app).post("/posts").send({ title: "X" });
    expect(res.status).toBe(401);
  });

  it("POST /posts creates post (multipart) with Ingredient[] / Step[]", async () => {
    const res = await createPostMultipart(token1, {
      title: "My Post",
      description: "Hello",
      isPublic: true,
      tags: ["easy", "quick"],
      ingredients: [{ name: "Egg", amount: "2", unit: "pcs" }],
      steps: [{ order: 1, text: "Mix" }],
    });

    expect(res.status).toBe(201);
    expect(res.body.post).toBeDefined();
    expect(res.body.post.title).toBe("My Post");
    expect(Array.isArray(res.body.post.ingredients)).toBe(true);
    expect(res.body.post.ingredients[0].name).toBe("Egg");
    expect(res.body.post.steps[0].text).toBe("Mix");
  });

  it("POST /posts accepts ingredients/steps as string[] and converts to objects", async () => {
    const res = await createPostJson(token1, {
      title: "Compat",
      isPublic: true,
      ingredients: ["Salt", "Pepper"],
      steps: ["Step A", "Step B"],
    });

    expect(res.status).toBe(201);
    expect(res.body.post.ingredients[0].name).toBe("Salt");
    expect(res.body.post.steps[0].order).toBe(1);
    expect(res.body.post.steps[0].text).toBe("Step A");
  });

  it("GET /posts/feed returns only public posts + supports cursor pagination", async () => {
    // create 2 public posts + 1 private
    const p1 = await createPostJson(token1, { title: "Public 1", isPublic: true });
    const p2 = await createPostJson(token1, { title: "Public 2", isPublic: true });
    await createPostJson(token1, { title: "Private", isPublic: false });

    expect(p1.status).toBe(201);
    expect(p2.status).toBe(201);

    const feed1 = await request(app).get("/posts/feed?limit=1");
    expect(feed1.status).toBe(200);
    expect(Array.isArray(feed1.body.posts)).toBe(true);
    expect(feed1.body.posts.length).toBe(1);
    expect(feed1.body.nextCursor).toBeTruthy();

    const feed2 = await request(app).get(`/posts/feed?limit=5&cursor=${feed1.body.nextCursor}`);
    expect(feed2.status).toBe(200);

    // total public posts is 2, private should NOT appear
    const titles = [...feed1.body.posts, ...feed2.body.posts].map((p: any) => p.title);
    expect(titles).toEqual(expect.arrayContaining(["Public 1", "Public 2"]));
    expect(titles).not.toEqual(expect.arrayContaining(["Private"]));
  });

  it("GET /posts/feed includes commentCount/likeCount/likedByMe", async () => {
    const created = await createPostJson(token1, { title: "Meta", isPublic: true });
    const id = created.body.post._id ?? created.body.post.id;

    const comment = await createComment(token2, id, "Nice");
    expect(comment.status).toBe(201);

    const like = await likePost(token1, id);
    expect(like.status).toBe(200);

    const feedNoAuth = await request(app).get("/posts/feed");
    const noAuthPost = feedNoAuth.body.posts.find((p: any) => (p._id ?? p.id) === id);
    expect(noAuthPost.commentCount).toBe(1);
    expect(noAuthPost.likeCount).toBe(1);
    expect(noAuthPost.likedByMe).toBe(false);

    const feedAuth = await request(app).get("/posts/feed").set(auth(token1));
    const authPost = feedAuth.body.posts.find((p: any) => (p._id ?? p.id) === id);
    expect(authPost.commentCount).toBe(1);
    expect(authPost.likeCount).toBe(1);
    expect(authPost.likedByMe).toBe(true);
  });

  it("GET /posts/mine requires auth and returns only my posts (public + private)", async () => {
    await createPostJson(token1, { title: "Mine Public", isPublic: true });
    await createPostJson(token1, { title: "Mine Private", isPublic: false });
    await createPostJson(token2, { title: "Other", isPublic: true });

    const noAuth = await request(app).get("/posts/mine");
    expect(noAuth.status).toBe(401);

    const mine = await request(app).get("/posts/mine").set(auth(token1));
    expect(mine.status).toBe(200);
    const titles = mine.body.posts.map((p: any) => p.title);

    expect(titles).toEqual(expect.arrayContaining(["Mine Public", "Mine Private"]));
    expect(titles).not.toEqual(expect.arrayContaining(["Other"]));
  });

  it("GET /posts/mine includes commentCount/likeCount/likedByMe", async () => {
    const created = await createPostJson(token1, { title: "Mine Meta", isPublic: true });
    const id = created.body.post._id ?? created.body.post.id;

    const comment = await createComment(token2, id, "Yo");
    expect(comment.status).toBe(201);

    const like = await likePost(token2, id);
    expect(like.status).toBe(200);

    const mine = await request(app).get("/posts/mine").set(auth(token1));
    expect(mine.status).toBe(200);
    const minePost = mine.body.posts.find((p: any) => (p._id ?? p.id) === id);
    expect(minePost.commentCount).toBe(1);
    expect(minePost.likeCount).toBe(1);
    expect(minePost.likedByMe).toBe(false);
  });

  it("GET /posts/:id returns 200 for public, 403 for private", async () => {
    const pub = await createPostJson(token1, { title: "Pub", isPublic: true });
    const priv = await createPostJson(token1, { title: "Priv", isPublic: false });

    const pubId = pub.body.post._id ?? pub.body.post.id;
    const privId = priv.body.post._id ?? priv.body.post.id;

    const getPub = await request(app).get(`/posts/${pubId}`);
    expect(getPub.status).toBe(200);
    expect(getPub.body.post.title).toBe("Pub");

    const getPriv = await request(app).get(`/posts/${privId}`);
    expect(getPriv.status).toBe(403);
  });

  it("GET /posts/:id includes commentCount/likeCount/likedByMe", async () => {
    const created = await createPostJson(token1, { title: "Single Meta", isPublic: true });
    const id = created.body.post._id ?? created.body.post.id;

    const comment = await createComment(token2, id, "Hi");
    expect(comment.status).toBe(201);

    const like = await likePost(token1, id);
    expect(like.status).toBe(200);

    const noAuth = await request(app).get(`/posts/${id}`);
    expect(noAuth.status).toBe(200);
    expect(noAuth.body.post.commentCount).toBe(1);
    expect(noAuth.body.post.likeCount).toBe(1);
    expect(noAuth.body.post.likedByMe).toBe(false);

    const withAuth = await request(app).get(`/posts/${id}`).set(auth(token1));
    expect(withAuth.status).toBe(200);
    expect(withAuth.body.post.likedByMe).toBe(true);
  });

  it("PATCH /posts/:id updates post and normalizes steps order", async () => {
    const created = await createPostJson(token1, { title: "ToUpdate", isPublic: false });
    const id = created.body.post._id ?? created.body.post.id;

    const upd = await request(app)
      .patch(`/posts/${id}`)
      .set(auth(token1))
      .send({
        title: "Updated",
        ingredients: ["Salt"],
        steps: [{ order: 99, text: "Second" }, { order: 1, text: "First" }],
        tags: ["t1"],
      });

    expect(upd.status).toBe(200);
    expect(upd.body.post.title).toBe("Updated");
    expect(upd.body.post.ingredients[0].name).toBe("Salt");

    // normalized ordering 1..N
    expect(upd.body.post.steps[0].order).toBe(1);
    expect(upd.body.post.steps[0].text).toBe("First");
    expect(upd.body.post.steps[1].order).toBe(2);
    expect(upd.body.post.steps[1].text).toBe("Second");
  });

  it("PATCH /posts/:id forbidden for non-owner", async () => {
    const created = await createPostJson(token1, { title: "OwnerOnly", isPublic: true });
    const id = created.body.post._id ?? created.body.post.id;

    const upd = await request(app).patch(`/posts/${id}`).set(auth(token2)).send({ title: "Hack" });
    expect(upd.status).toBe(403);
  });

  it("DELETE /posts/:id deletes post (owner only)", async () => {
    const created = await createPostJson(token1, { title: "ToDelete", isPublic: true });
    const id = created.body.post._id ?? created.body.post.id;

    const delForbidden = await request(app).delete(`/posts/${id}`).set(auth(token2));
    expect(delForbidden.status).toBe(403);

    const del = await request(app).delete(`/posts/${id}`).set(auth(token1));
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const get = await request(app).get(`/posts/${id}`);
    expect(get.status).toBe(404);
  });
});
