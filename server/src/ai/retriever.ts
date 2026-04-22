import type { PostDoc } from "../models/Post";
import { buildHashEmbedding, chunkText, cosineSimilarity, detectLanguage, normalizeText } from "./text";

export type RetrievalSource = {
  sourceId: string;
  ownerUserId: string;
  documentType: "post" | "recipe";
  documentId: string;
  chunkIndex: number;
  language: "he" | "en" | "unknown";
  text: string;
  embedding: number[] | null;
  metadata: {
    title?: string;
    tags?: string[];
  };
};

export type RetrievalHit = RetrievalSource & {
  score: number;
};

export type RetrievalResult = {
  hits: RetrievalHit[];
  warnings: string[];
};

function buildPostSearchText(post: PostDoc) {
  const lines = [
    `title: ${post.title}`,
    post.description ? `description: ${post.description}` : "",
    post.tags?.length ? `tags: ${post.tags.join(", ")}` : "",
    post.ingredients?.length
      ? `ingredients: ${post.ingredients.map((item) => [item.amount, item.unit, item.name].filter(Boolean).join(" ")).join("; ")}`
      : "",
    post.steps?.length ? `steps: ${post.steps.map((item) => item.text).join(" ")}` : "",
  ].filter(Boolean);

  return lines.join(". ");
}

export class RecipeRetriever {
  constructor(
    private readonly embeddingDimensions: number,
    private readonly threshold: number
  ) {}

  buildSources(ownerUserId: string, posts: PostDoc[]) {
    const sources: RetrievalSource[] = [];

    for (const post of posts) {
      const rawText = buildPostSearchText(post);
      const chunks = chunkText(rawText);

      chunks.forEach((chunk, index) => {
        sources.push({
          sourceId: `post:${String(post._id)}:${index}`,
          ownerUserId,
          documentType: "post",
          documentId: String(post._id),
          chunkIndex: index,
          language: detectLanguage([post.title, chunk]),
          text: chunk,
          embedding: buildHashEmbedding(normalizeText(chunk), this.embeddingDimensions),
          metadata: {
            title: post.title,
            tags: post.tags ?? [],
          },
        });
      });
    }

    return sources;
  }

  retrieve(queryText: string, sources: RetrievalSource[], topK: number): RetrievalResult {
    const warnings: string[] = [];
    const queryEmbedding = buildHashEmbedding(queryText, this.embeddingDimensions);

    const hits = sources
      .map((source) => ({
        ...source,
        score: source.embedding ? cosineSimilarity(queryEmbedding, source.embedding) : 0,
      }))
      .filter((hit) => hit.score >= this.threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (hits.length === 0) {
      warnings.push("No retrieval chunks passed the similarity threshold.");
    }

    return { hits, warnings };
  }
}
