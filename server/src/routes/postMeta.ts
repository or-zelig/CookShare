import mongoose from "mongoose";
import { Comment } from "../models/Comment";
import { PostLike } from "../models/PostLike";

type WithId = { _id: mongoose.Types.ObjectId | string };

export async function attachPostMeta<T extends WithId>(posts: T[], userId?: string) {
  if (posts.length === 0) return [];

  const ids = posts.map((p) => new mongoose.Types.ObjectId(String(p._id)));

  const commentCounts = await Comment.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { postId: { $in: ids } } },
    { $group: { _id: "$postId", count: { $sum: 1 } } },
  ]);

  const likeCounts = await PostLike.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { postId: { $in: ids } } },
    { $group: { _id: "$postId", count: { $sum: 1 } } },
  ]);

  const commentMap = new Map<string, number>();
  for (const row of commentCounts) {
    commentMap.set(String(row._id), row.count);
  }

  const likeMap = new Map<string, number>();
  for (const row of likeCounts) {
    likeMap.set(String(row._id), row.count);
  }

  let likedSet = new Set<string>();
  if (userId && mongoose.isValidObjectId(userId)) {
    const likes = await PostLike.find({
      postId: { $in: ids },
      userId: new mongoose.Types.ObjectId(userId),
    }).select("postId");
    likedSet = new Set(likes.map((l) => String(l.postId)));
  }

  return posts.map((p) => {
    const id = String(p._id);
    return {
      ...p,
      commentCount: commentMap.get(id) || 0,
      likeCount: likeMap.get(id) || 0,
      likedByMe: likedSet.has(id),
    };
  });
}
