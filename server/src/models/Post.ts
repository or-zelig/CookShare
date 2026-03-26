import mongoose, { Schema, Types } from "mongoose";

export type Ingredient = {
  name: string;
  amount?: string;
  unit?: string;
};

export type Step = {
  order: number;
  text: string;
};

export interface PostDoc {
  _id: Types.ObjectId;
  author: Types.ObjectId;

  title: string;
  description: string;

  ingredients: Ingredient[];
  steps: Step[];

  imageUrl: string;

  isPublic: boolean;
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema = new Schema<Ingredient>(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: String, default: "", trim: true },
    unit: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const StepSchema = new Schema<Step>(
  {
    order: { type: Number, required: true, min: 1 },
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const PostSchema = new Schema<PostDoc>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },

    ingredients: { type: [IngredientSchema], default: [] },
    steps: { type: [StepSchema], default: [] },

    // בשלב הזה נשמור רק URL/נתיב יחסי (אחרי זה נחליט סטורג' מסודר)
    imageUrl: { type: String, default: "" },

    isPublic: { type: Boolean, default: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ title: "text", description: "text" });
PostSchema.virtual("text").get(function (this: PostDoc) {
  return this.description;
});

export const Post =
  (mongoose.models.Post as mongoose.Model<PostDoc>) ||
  mongoose.model<PostDoc>("Post", PostSchema);
