import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import { User } from "../models/User";
import { Post } from "../models/Post";
import { requireAuth, AuthedRequest } from "../middlewares/requireAuth";
import { tryAuth } from "../middlewares/tryAuth";
import { upload } from "../middlewares/upload";

export const usersRouter = Router();

async function tryDeleteUploadedFile(url?: string) {
  if (!url) return;
  if (!url.startsWith("/uploads/")) return;
  const filename = url.replace("/uploads/", "");
  if (!filename) return;

  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const full = path.join(uploadsDir, filename);
  try {
    await fs.unlink(full);
  } catch {}
}

// GET /users/:id (public)
usersRouter.get("/users/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "invalid id" });

  const user = await User.findById(id).select("_id username avatarUrl");
  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({ user });
});

// PATCH /users/me (auth, multipart: avatar + username)
usersRouter.patch(
  "/users/me",
  requireAuth,
  upload.single("avatar"),
  async (req: AuthedRequest, res: Response) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const username = typeof req.body?.username === "string" ? req.body.username.trim() : undefined;

    if (username) {
      // ensure unique
      const exists = await User.exists({ username, _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ message: "Username already taken" });
      user.username = username;
    }

    if (req.file) {
      await tryDeleteUploadedFile(user.avatarUrl);
      user.avatarUrl = `/uploads/${req.file.filename}`;
    }

    await user.save();
    return res.json({ user: { _id: user._id, username: user.username, avatarUrl: user.avatarUrl } });
  }
);

// GET /users/:id/posts (public; if me+auth => include private)
usersRouter.get("/users/:id/posts", tryAuth, async (req: AuthedRequest, res: Response) => {
  const userId = req.params.id;
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "invalid id" });

  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 20) || 20));
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

  const filter: any = { author: userId };
  const isMe = req.userId && String(req.userId) === String(userId);
  if (!isMe) filter.isPublic = true;

  if (cursor && mongoose.isValidObjectId(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const posts = await Post.find(filter).sort({ _id: -1 }).limit(limit + 1);

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return res.json({ posts: page, nextCursor });
});
