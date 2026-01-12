import mongoose, { Schema, Types } from "mongoose";

export interface PostLikeDoc {
  _id: Types.ObjectId;
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PostLikeSchema = new Schema<PostLikeDoc>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// prevent duplicates
PostLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostLike =
  (mongoose.models.PostLike as mongoose.Model<PostLikeDoc>) ||
  mongoose.model<PostLikeDoc>("PostLike", PostLikeSchema);
