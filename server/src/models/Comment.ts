import mongoose, { Schema, Types } from "mongoose";

export interface CommentDoc {
  _id: Types.ObjectId;
  postId: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<CommentDoc>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  },
  { timestamps: true }
);

CommentSchema.index({ postId: 1, createdAt: -1 });

export const Comment =
  (mongoose.models.Comment as mongoose.Model<CommentDoc>) ||
  mongoose.model<CommentDoc>("Comment", CommentSchema);
