import mongoose, { Schema, Types } from "mongoose";

export interface PostDoc extends mongoose.Document {
  authorId: Types.ObjectId;
  text: string;
  imageUrl: string; // "/uploads/xxxx.jpg"
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<PostDoc>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    imageUrl: { type: String, required: true },

    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });

export const Post = mongoose.model<PostDoc>("Post", postSchema);
