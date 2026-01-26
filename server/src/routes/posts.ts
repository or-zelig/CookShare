import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import { Post, type Ingredient, type Step } from "../models/Post";
import { upload } from "../middlewares/upload";
import { requireAuth, AuthedRequest } from "../middlewares/requireAuth";
import { tryAuth } from "../middlewares/tryAuth";
import { Comment } from "../models/Comment";
import { PostLike } from "../models/PostLike";
import { attachPostMeta } from "./postMeta";

export const postsRouter = Router();

/**
 * Helpers
 */
function single(v: unknown): string | undefined {
  if (v == null) return undefined;

  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);

  if (Array.isArray(v)) return single(v[0]);

  return undefined;
}

function toInt(v: unknown, def: number, min: number, max: number): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = Math.floor(v);
    return Math.max(min, Math.min(max, n));
  }

  const s = single(v);
  const n = s ? Number(s) : NaN;
  if (!Number.isFinite(n)) return def;

  return Math.max(min, Math.min(max, Math.floor(n)));
}

function toBool(v: unknown, def: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;

  const s = single(v);
  if (s === undefined) return def;

  const x = s.toLowerCase();
  if (["true", "1", "yes", "y"].includes(x)) return true;
  if (["false", "0", "no", "n"].includes(x)) return false;

  return def;
}

function parseStringArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x)).map((s) => s.trim()).filter(Boolean);

  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return [];

    // Try JSON array first: '["a","b"]'
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).map((s) => s.trim()).filter(Boolean);
    } catch {
      // ignore
    }

    // Fallback: comma separated "a,b,c"
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

function asId(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return String(v);
}

function oid(v: unknown): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(asId(v));
}

/**
 * Accepts:
 * - JSON array string (either strings or objects)
 * - array (strings/objects) when multipart sends multiple fields with same key
 * Returns null if can't be treated as an array.
 */
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

  // If got JSON array (strings or objects)
  if (arr) {
    const out: Ingredient[] = [];
    for (const item of arr) {
      if (typeof item === "string") {
        const name = item.trim();
        if (name) out.push({ name });
        continue;
      }

      if (item && typeof item === "object") {
        const o = item as any;
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

  // Fallback: treat as string[] (comma separated etc.)
  return parseStringArray(v).map((name) => ({ name }));
}

function parseSteps(v: unknown): Step[] {
  const arr = parseUnknownArray(v);

  if (arr) {
    const out: Step[] = [];
    let i = 0;

    for (const item of arr) {
      if (typeof item === "string") {
        const text = item.trim();
        if (!text) continue;
        out.push({ order: out.length + 1, text });
        continue;
      }

      if (item && typeof item === "object") {
        const o = item as any;
        const text = typeof o.text === "string" ? o.text.trim() : "";
        if (!text) continue;

        const maybeOrder = typeof o.order === "number" && Number.isFinite(o.order) ? Math.floor(o.order) : undefined;
        const order = maybeOrder && maybeOrder >= 1 ? maybeOrder : out.length + 1;

        out.push({ order, text });
      }

      i++;
    }

    // Normalize ordering to 1..N (avoid duplicates/gaps coming from client)
    return out
      .sort((a, b) => a.order - b.order)
      .map((s, idx) => ({ order: idx + 1, text: s.text }));
  }

  // Fallback: string[] => numbered steps
  return parseStringArray(v)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, idx) => ({ order: idx + 1, text }));
}

async function tryDeleteUploadedFile(imageUrl?: string) {
  // We store imageUrl like "/uploads/<file>"
  if (!imageUrl) return;
  if (!imageUrl.startsWith("/uploads/")) return;

  const filename = imageUrl.replace("/uploads/", "");
  if (!filename) return;

  // adjust this if your uploads folder lives elsewhere
  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
  const full = path.join(uploadsDir, filename);

  try {
    await fs.unlink(full);
  } catch {
    // ignore (file might not exist)
  }
}

/**
 * POST /posts
 * Create a new post (multipart/form-data, optional image)
 */
postsRouter.post(
  "/posts",
  requireAuth,
  upload.single("image"),
  async (req: AuthedRequest, res: Response) => {
    const title = single(req.body.title)?.trim();
    const description = single(req.body.description)?.trim() ?? "";
    const isPublic = toBool(req.body.isPublic, true);

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    const ingredients = parseIngredients(req.body.ingredients);
    const steps = parseSteps(req.body.steps);
    const tags = parseStringArray(req.body.tags);

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const post = await Post.create({
      author: req.userId,
      title,
      description,
      ingredients,
      steps,
      tags,
      imageUrl,
      isPublic,
    });

    return res.status(201).json({ post });
  }
);

/**
 * GET /posts/feed
 * Public feed (no auth required)
 * Query: limit=1..50, cursor=<postId>, q=<search>
 */
postsRouter.get("/posts/feed", tryAuth, async (req: AuthedRequest, res: Response) => {
  const limit = toInt(req.query.limit, 20, 1, 50);
  const cursor = single(req.query.cursor);
  const q = single(req.query.q)?.trim();

  const filter: any = { isPublic: true };

  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { tags: { $regex: q, $options: "i" } },
    ];
  }

  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const posts = await Post.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate("author", "username avatarUrl");

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  const pageOut = page.map((p) => (typeof (p as any).toObject === "function" ? (p as any).toObject() : p));
  const postsWithMeta = await attachPostMeta(pageOut, req.userId);
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return res.json({ posts: postsWithMeta, nextCursor });
});


/**
 * GET /posts/mine
 * My posts (auth)
 */
postsRouter.get("/posts/mine", requireAuth, async (req: AuthedRequest, res: Response) => {
  const limit = toInt(req.query.limit, 20, 1, 50);
  const cursor = single(req.query.cursor);

  const filter: any = { author: req.userId };

  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const posts = await Post.find(filter).sort({ _id: -1 }).limit(limit + 1);

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  const pageOut = page.map((p) => (typeof (p as any).toObject === "function" ? (p as any).toObject() : p));
  const postsWithMeta = await attachPostMeta(pageOut, req.userId);
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return res.json({ posts: postsWithMeta, nextCursor });
});

/**
 * GET /posts/:id
 * Get single post
 * If private -> only owner can view
 */
postsRouter.get("/posts/:id", tryAuth, async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const post = await Post.findById(id).populate("author", "username avatarUrl");
  if (!post) return res.status(404).json({ message: "Post not found" });

  if (!post.isPublic) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const [withMeta] = await attachPostMeta(
    [typeof (post as any).toObject === "function" ? (post as any).toObject() : post],
    req.userId
  );
  return res.json({ post: withMeta });
});


/**
 * PATCH /posts/:id
 * Update a post (auth + owner)
 * multipart/form-data optional image
 */
postsRouter.patch(
  "/posts/:id",
  requireAuth,
  upload.single("image"),
  async (req: AuthedRequest, res: Response) => {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "invalid id" });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (String(post.author) !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const title = single(req.body.title);
    const description = single(req.body.description);
    const isPublic = req.body.isPublic !== undefined ? toBool(req.body.isPublic, post.isPublic) : post.isPublic;

    if (title !== undefined) post.title = title.trim();
    if (description !== undefined) post.description = description.trim();
    post.isPublic = isPublic;

    if (req.body.ingredients !== undefined) post.ingredients = parseIngredients(req.body.ingredients);
    if (req.body.steps !== undefined) post.steps = parseSteps(req.body.steps);
    if (req.body.tags !== undefined) post.tags = parseStringArray(req.body.tags);

    if (req.file) {
      await tryDeleteUploadedFile(post.imageUrl);
      post.imageUrl = `/uploads/${req.file.filename}`;
    }

    await post.save();
    return res.json({ post });
  }
);

/**
 * DELETE /posts/:id
 * Delete a post (auth + owner)
 */
postsRouter.delete("/posts/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "invalid id" });
  }

  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  if (String(post.author) !== req.userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  await tryDeleteUploadedFile(post.imageUrl);
  await post.deleteOne();

  return res.json({ ok: true });
});

// POST /posts/:id/comments (auth)
postsRouter.post("/posts/:id/comments", requireAuth, async (req: AuthedRequest, res: Response) => {
  const postId = req.params.id;
  if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ message: "invalid id" });

  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ message: "text is required" });

  const exists = await Post.exists({ _id: postId });
  if (!exists) return res.status(404).json({ message: "Post not found" });

const comment = await Comment.create({
  postId: oid(postId),
  author: oid(req.userId),
  text,
});

  const populated = await Comment.findById(comment._id).populate("author", "username avatarUrl");
  return res.status(201).json({ comment: populated });
});

// GET /posts/:id/comments (public)
postsRouter.get("/posts/:id/comments", async (req: Request, res: Response) => {
  const postId = req.params.id;
  if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ message: "invalid id" });

  const limitRaw = req.query.limit;
  const limit = Math.max(1, Math.min(50, Number(limitRaw ?? 20) || 20));
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

const filter: any = { postId: oid(postId) };

if (cursor && mongoose.isValidObjectId(cursor)) {
  filter._id = { $lt: oid(cursor) };
}

  const items = await Comment.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate("author", "username avatarUrl");

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return res.json({ comments: page, nextCursor });
});

// DELETE /comments/:id (auth + owner)
postsRouter.delete("/comments/:id", requireAuth, async (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid id" });

  const comment = await Comment.findById(id);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  if (String(comment.author) !== req.userId) return res.status(403).json({ message: "Forbidden" });

  await comment.deleteOne();
  return res.json({ ok: true });
});


// POST /posts/:id/like (auth) - idempotent
postsRouter.post("/posts/:id/like", requireAuth, async (req: AuthedRequest, res: Response) => {
  const postId = req.params.id;
  if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ message: "invalid id" });

  const exists = await Post.exists({ _id: postId });
  if (!exists) return res.status(404).json({ message: "Post not found" });

await PostLike.updateOne(
  { postId: oid(postId), userId: oid(req.userId) },
  { $setOnInsert: { postId: oid(postId), userId: oid(req.userId) } },
  { upsert: true }
);


  return res.json({ ok: true });
});

// DELETE /posts/:id/like (auth)
postsRouter.delete("/posts/:id/like", requireAuth, async (req: AuthedRequest, res: Response) => {
  const postId = req.params.id;
  if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ message: "invalid id" });

await PostLike.deleteOne({ postId: oid(postId), userId: oid(req.userId) });

  return res.json({ ok: true });
});



export default postsRouter;
