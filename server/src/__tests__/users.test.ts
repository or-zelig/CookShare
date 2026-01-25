import request from "supertest";
import { createApp } from "../app";
import { connectTestDb, clearTestDb, disconnectTestDb } from "./db";

type Tokens = { accessToken: string; userId: string };

async function register(app: any, user: { username: string; email: string; password: string }): Promise<Tokens> {
  const res = await request(app).post("/auth/register").send(user);
  expect(res.status).toBe(201);
  expect(res.body.accessToken).toBeTruthy();
  const id = res.body.user?._id ?? res.body.user?.id;
  return { accessToken: res.body.accessToken, userId: id };
}

describe("Users API", () => {
  const app = createApp();

  let token1 = "";
  let token2 = "";
  let user1Id = "";

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    const u1 = await register(app, { username: "u1", email: "u1@test.com", password: "123456" });
    const u2 = await register(app, { username: "u2", email: "u2@test.com", password: "123456" });

    token1 = u1.accessToken;
    token2 = u2.accessToken;
    user1Id = u1.userId;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function createPostJson(t: string, body: any) {
    return request(app).post("/posts").set(auth(t)).send(body);
  }

  async function createComment(t: string, postId: string, text: string) {
    return request(app).post(`/posts/${postId}/comments`).set(auth(t)).send({ text });
  }

  async function likePost(t: string, postId: string) {
    return request(app).post(`/posts/${postId}/like`).set(auth(t));
  }

  it("GET /users/:id/posts includes commentCount/likeCount/likedByMe", async () => {
    const created = await createPostJson(token1, { title: "User Meta", isPublic: true });
    const id = created.body.post._id ?? created.body.post.id;

    const comment = await createComment(token2, id, "Nice");
    expect(comment.status).toBe(201);

    const like = await likePost(token2, id);
    expect(like.status).toBe(200);

    const res = await request(app).get(`/users/${user1Id}/posts`).set(auth(token2));
    expect(res.status).toBe(200);
    const post = res.body.posts.find((p: any) => (p._id ?? p.id) === id);
    expect(post.commentCount).toBe(1);
    expect(post.likeCount).toBe(1);
    expect(post.likedByMe).toBe(true);
  });
});
