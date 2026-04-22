import { api, request } from "../api/http";

export type User = {
  id: string;
  username: string;
  email: string;
  avatarDataUrl?: string;
  password: string;
};

export type Ingredient = {
  name: string;
  amount?: string;
  unit?: string;
};

export type Step = {
  order: number;
  text: string;
};

export type Post = {
  id: string;
  authorId: string;
  title: string;
  text: string;
  description?: string;
  ingredients?: Ingredient[];
  steps?: Step[];
  tags?: string[];
  isPublic?: boolean;
  imageUrl?: string;
  imageDataUrl?: string;
  createdAt: number;
  likedBy: string[];
  likeCount?: number;
  likedByMe?: boolean;
  commentCount?: number;
  updatedAt?: string;
  author?: { id: string; username: string; avatarUrl?: string };
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: number;
  author?: { id: string; username: string; avatarUrl?: string };
};

type ServerUserSummary = {
  _id?: string;
  id?: string;
  username: string;
  avatarUrl?: string;
};

type ServerPost = {
  _id: string;
  author: string | ServerUserSummary;
  title: string;
  description?: string;
  ingredients?: Ingredient[];
  steps?: Step[];
  tags?: string[];
  imageUrl?: string;
  isPublic?: boolean;
  commentCount?: number;
  likeCount?: number;
  likedByMe?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ServerComment = {
  _id: string;
  postId: string;
  author: string | ServerUserSummary;
  text: string;
  createdAt?: string;
  updatedAt?: string;
};

function parseStringArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v.map((x) => String(x)).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x)).map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      // ignore
    }
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseUnknownArray(v: unknown): unknown[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

function parseIngredients(v: unknown): Ingredient[] {
  const arr = parseUnknownArray(v);
  if (arr) {
    const out: Ingredient[] = [];
    for (const item of arr) {
      if (typeof item === "string") {
        const name = item.trim();
        if (name) out.push({ name });
        continue;
      }
      if (item && typeof item === "object") {
        const o = item as { name?: unknown; amount?: unknown; unit?: unknown };
        const name = typeof o.name === "string" ? o.name.trim() : "";
        if (!name) continue;
        const amount = typeof o.amount === "string" ? o.amount.trim() : "";
        const unit = typeof o.unit === "string" ? o.unit.trim() : "";
        const ing: Ingredient = { name };
        if (amount) ing.amount = amount;
        if (unit) ing.unit = unit;
        out.push(ing);
      }
    }
    return out;
  }
  return parseStringArray(v).map((name) => ({ name }));
}

function parseSteps(v: unknown): Step[] {
  const arr = parseUnknownArray(v);
  if (arr) {
    const out: Step[] = [];
    for (const item of arr) {
      if (typeof item === "string") {
        const text = item.trim();
        if (text) out.push({ order: out.length + 1, text });
        continue;
      }
      if (item && typeof item === "object") {
        const o = item as { order?: unknown; text?: unknown };
        const text = typeof o.text === "string" ? o.text.trim() : "";
        if (!text) continue;
        const maybeOrder =
          typeof o.order === "number" && Number.isFinite(o.order) ? Math.floor(o.order) : undefined;
        const order = maybeOrder && maybeOrder >= 1 ? maybeOrder : out.length + 1;
        out.push({ order, text });
      }
    }
    return out.sort((a, b) => a.order - b.order).map((s, idx) => ({ order: idx + 1, text: s.text }));
  }
  return parseStringArray(v)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, idx) => ({ order: idx + 1, text }));
}

function mapApiUser(u: { id: string; username: string; email?: string; avatarUrl?: string }): User {
  return {
    id: u.id,
    username: u.username,
    email: u.email ?? "",
    avatarDataUrl: u.avatarUrl ?? "",
    password: "",
  };
}

function mapServerPost(p: ServerPost): Post {
  const authorId = typeof p.author === "string" ? p.author : p.author?._id ?? p.author?.id ?? "";
  const author =
    typeof p.author === "string"
      ? undefined
      : {
          id: p.author?._id ?? p.author?.id ?? "",
          username: p.author?.username ?? "",
          avatarUrl: p.author?.avatarUrl ?? "",
        };

  const createdAt = p.createdAt ? Date.parse(p.createdAt) : Date.now();
  return {
    id: p._id,
    authorId,
    title: p.title ?? "",
    text: p.description ?? "",
    description: p.description ?? "",
    ingredients: p.ingredients ?? [],
    steps: p.steps ?? [],
    tags: p.tags ?? [],
    isPublic: p.isPublic ?? true,
    imageUrl: p.imageUrl ?? "",
    imageDataUrl: p.imageUrl ?? "",
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    likedBy: [],
    likeCount: p.likeCount ?? 0,
    likedByMe: p.likedByMe ?? false,
    commentCount: p.commentCount ?? 0,
    updatedAt: p.updatedAt,
    author,
  };
}

function mapServerComment(c: ServerComment): Comment {
  const authorId = typeof c.author === "string" ? c.author : c.author?._id ?? c.author?.id ?? "";
  const author =
    typeof c.author === "string"
      ? undefined
      : {
          id: c.author?._id ?? c.author?.id ?? "",
          username: c.author?.username ?? "",
          avatarUrl: c.author?.avatarUrl ?? "",
        };

  const createdAt = c.createdAt ? Date.parse(c.createdAt) : Date.now();
  return {
    id: c._id,
    postId: c.postId,
    authorId,
    text: c.text,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    author,
  };
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; filename: string } | null {
  const match = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!match) return null;
  const mime = match[1];
  const b64 = match[2];
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ext = mime.split("/")[1] ?? "png";
  return { blob: new Blob([bytes], { type: mime }), filename: `upload.${ext}` };
}

export const db = {
  // -------- Auth --------
  async getCurrentUser(): Promise<User | null> {
    try {
      const me = await api.me();
      return mapApiUser(me);
    } catch {
      return null;
    }
  },

  async authMe(): Promise<User> {
    const me = await api.me();
    return mapApiUser(me);
  },

  async login(username: string, password: string): Promise<User> {
    const data = await api.login(username, password);
    return mapApiUser(data.user);
  },

  async refresh(): Promise<{ user: User; accessToken: string }> {
    const data = await request<{ user: ServerUserSummary; accessToken: string }>("/auth/refresh", {
      method: "POST",
    });
    return {
      user: {
        id: data.user._id ?? data.user.id ?? "",
        username: data.user.username ?? "",
        email: "",
        avatarDataUrl: data.user.avatarUrl ?? "",
        password: "",
      },
      accessToken: data.accessToken,
    };
  },

  async googleLogin(credential: string): Promise<User> {
    const data = await api.google(credential);
    return mapApiUser(data.user);
  },

  async register(username: string, email: string, password: string): Promise<User> {
    const data = await api.register(username, email, password);
    return mapApiUser(data.user);
  },

  async logout() {
    return api.logout();
  },

  async updateMe(data: { username?: string; avatarDataUrl?: string }) {
    const fd = new FormData();
    if (data.username) fd.set("username", data.username);
    if (data.avatarDataUrl) {
      const file = dataUrlToBlob(data.avatarDataUrl);
      if (file) fd.set("avatar", file.blob, file.filename);
    }
    const res = await request<{ user: ServerUserSummary }>("/users/me", {
      method: "PATCH",
      body: fd,
    });
    return {
      id: res.user._id ?? res.user.id ?? "",
      username: res.user.username ?? "",
      email: "",
      avatarDataUrl: res.user.avatarUrl ?? "",
      password: "",
    };
  },

  // -------- Users --------
  async getUserById(userId: string): Promise<User> {
    const data = await request<{ user: ServerUserSummary }>(`/users/${userId}`);
    return {
      id: data.user._id ?? data.user.id ?? "",
      username: data.user.username ?? "",
      email: "",
      avatarDataUrl: data.user.avatarUrl ?? "",
      password: "",
    };
  },

  async listUserPosts(args: { userId: string; limit: number; cursor?: number | string | null }) {
    const params = new URLSearchParams();
    params.set("limit", String(args.limit));
    if (args.cursor) params.set("cursor", String(args.cursor));

    const data = await request<{ posts: ServerPost[]; nextCursor: string | null }>(
      `/users/${args.userId}/posts?${params.toString()}`
    );
    return { items: data.posts.map(mapServerPost), nextCursor: data.nextCursor };
  },

  // -------- Posts --------
  async listPosts(args: {
    cursor?: number | string | null;
    limit: number;
    authorId?: string;
    likedByUserId?: string;
    textIncludes?: string[];
  }) {
    if (args.authorId) {
      return db.listUserPosts({ userId: args.authorId, limit: args.limit, cursor: args.cursor });
    }

    const params = new URLSearchParams();
    params.set("limit", String(args.limit));
    if (args.cursor) params.set("cursor", String(args.cursor));
    if (args.textIncludes?.length) params.set("q", args.textIncludes.join(" "));

    const data = await request<{ posts: ServerPost[]; nextCursor: string | null }>(
      `/posts/feed?${params.toString()}`
    );
    let items = data.posts.map(mapServerPost);

    if (args.likedByUserId) {
      items = items.filter((p) => p.likedByMe);
    }

    return { items, nextCursor: data.nextCursor };
  },

  async getFeed(args: { limit: number; cursor?: number | string | null; q?: string }) {
    const params = new URLSearchParams();
    params.set("limit", String(args.limit));
    if (args.cursor) params.set("cursor", String(args.cursor));
    if (args.q) params.set("q", args.q);

    const data = await request<{ posts: ServerPost[]; nextCursor: string | null }>(
      `/posts/feed?${params.toString()}`
    );
    return { posts: data.posts.map(mapServerPost), nextCursor: data.nextCursor };
  },

  async getMyPosts(args: { limit: number; cursor?: number | string | null }) {
    const params = new URLSearchParams();
    params.set("limit", String(args.limit));
    if (args.cursor) params.set("cursor", String(args.cursor));

    const data = await request<{ posts: ServerPost[]; nextCursor: string | null }>(
      `/posts/mine?${params.toString()}`
    );
    return { posts: data.posts.map(mapServerPost), nextCursor: data.nextCursor };
  },

  async getPost(postId: string): Promise<Post | null> {
    const data = await request<{ post: ServerPost }>(`/posts/${postId}`);
    return mapServerPost(data.post);
  },

  async createPost(data: {
    title?: string;
    description?: string;
    isPublic?: boolean;
    tags?: string[] | string;
    ingredients?: Ingredient[] | string[] | string;
    steps?: Step[] | string[] | string;
    imageDataUrl?: string;
    text?: string;
  }): Promise<Post> {
    const title = (data.title ?? "").trim();
    if (!title) throw new Error("title is required");
    const description = (data.text ?? data.description ?? "").trim();
    const isPublic = data.isPublic ?? true;
    const tags = parseStringArray(data.tags);
    const ingredients = parseIngredients(data.ingredients);
    const steps = parseSteps(data.steps);

    if (data.imageDataUrl) {
      const fd = new FormData();
      fd.set("title", title);
      if (description) fd.set("description", description);
      fd.set("isPublic", String(isPublic));
      if (tags.length) fd.set("tags", JSON.stringify(tags));
      if (ingredients.length) fd.set("ingredients", JSON.stringify(ingredients));
      if (steps.length) fd.set("steps", JSON.stringify(steps));

      const file = dataUrlToBlob(data.imageDataUrl);
      if (file) fd.set("image", file.blob, file.filename);

      const res = await request<{ post: ServerPost }>("/posts", { method: "POST", body: fd });
      return mapServerPost(res.post);
    }

    const res = await request<{ post: ServerPost }>("/posts", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        isPublic,
        tags,
        ingredients,
        steps,
      }),
    });
    return mapServerPost(res.post);
  },

  async updatePost(
    postId: string,
    data: {
      title?: string;
      description?: string;
      isPublic?: boolean;
      tags?: string[] | string;
      ingredients?: Ingredient[] | string[] | string;
      steps?: Step[] | string[] | string;
      imageDataUrl?: string | null;
      text?: string;
    }
  ) {
    const title = data.title;
    const description = data.text ?? data.description;
    const isPublic = data.isPublic;
    const tags = data.tags !== undefined ? parseStringArray(data.tags) : undefined;
    const ingredients = data.ingredients !== undefined ? parseIngredients(data.ingredients) : undefined;
    const steps = data.steps !== undefined ? parseSteps(data.steps) : undefined;

    if (data.imageDataUrl) {
      const fd = new FormData();
      if (title !== undefined) fd.set("title", String(title));
      if (description !== undefined) fd.set("description", String(description));
      if (isPublic !== undefined) fd.set("isPublic", String(isPublic));
      if (tags) fd.set("tags", JSON.stringify(tags));
      if (ingredients) fd.set("ingredients", JSON.stringify(ingredients));
      if (steps) fd.set("steps", JSON.stringify(steps));

      const file = dataUrlToBlob(data.imageDataUrl);
      if (file) fd.set("image", file.blob, file.filename);

      const res = await request<{ post: ServerPost }>(`/posts/${postId}`, {
        method: "PATCH",
        body: fd,
      });
      return mapServerPost(res.post);
    }

    const res = await request<{ post: ServerPost }>(`/posts/${postId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
        ...(tags ? { tags } : {}),
        ...(ingredients ? { ingredients } : {}),
        ...(steps ? { steps } : {}),
      }),
    });
    return mapServerPost(res.post);
  },

  async deletePost(postId: string) {
    const data = await request<{ ok: true }>(`/posts/${postId}`, { method: "DELETE" });
    return data;
  },

  async toggleLike(postId: string) {
    const p = await db.getPost(postId);
    if (p?.likedByMe) return db.unlikePost(postId);
    return db.likePost(postId);
  },

  // -------- Comments --------
  async listComments(postId: string, args?: { limit?: number; cursor?: string | null }) {
    const params = new URLSearchParams();
    if (args?.limit) params.set("limit", String(args.limit));
    if (args?.cursor) params.set("cursor", String(args.cursor));
    const q = params.toString();
    const data = await request<{ comments: ServerComment[]; nextCursor: string | null }>(
      `/posts/${postId}/comments${q ? `?${q}` : ""}`
    );
    return { comments: data.comments.map(mapServerComment), nextCursor: data.nextCursor };
  },

  async addComment(postId: string, text: string) {
    const data = await request<{ comment: ServerComment }>(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    return mapServerComment(data.comment);
  },

  async deleteComment(commentId: string) {
    await request<{ ok: true }>(`/comments/${commentId}`, { method: "DELETE" });
    return { ok: true as const };
  },

  async likePost(postId: string) {
    const data = await request<{ ok: true }>(`/posts/${postId}/like`, { method: "POST" });
    return data;
  },

  async unlikePost(postId: string) {
    const data = await request<{ ok: true }>(`/posts/${postId}/like`, { method: "DELETE" });
    return data;
  },
};
