import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import type { Post } from "../types/models";

type AiResponse = {
  requestId: string;
  mode: "rag" | "fallback" | "mock";
  normalizedInput: {
    titles: string[];
    language: string;
  };
  retrieval: {
    used: boolean;
    topK: number;
    hitCount: number;
    thresholdApplied: number | null;
    warnings: string[];
    sources: Array<{
      documentId: string;
      sourceId: string;
      title?: string;
      chunkIndex?: number;
      score?: number;
    }>;
  };
  suggestions: Array<{
    title: string;
    recipe: {
      ingredients: string[];
      steps: string[];
    };
    basedOnSourceIds?: string[];
  }>;
  provider: string;
  warnings: string[];
  confidence: number;
};

const POST_LIMIT = 5;

export default function SuggestedForYou() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Post[]>([]);
  const [ai, setAi] = useState<AiResponse | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState("");

  const titles = useMemo(
    () =>
      Array.from(
        new Set(selectedPosts.map((p) => p.title.trim()).filter(Boolean))
      ).slice(0, POST_LIMIT),
    [selectedPosts]
  );

  function pickPostsForAi(allPosts: Post[], shuffle: boolean) {
    if (allPosts.length <= POST_LIMIT) return allPosts;
    if (!shuffle) return allPosts.slice(0, POST_LIMIT);

    const shuffled = [...allPosts];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, POST_LIMIT);
  }

  async function loadPosts(shuffle = false) {
    setLoadingPosts(true);
    setError("");
    try {
      const res = await api.getMyPosts(50);
      setPosts(res.posts);
      setSelectedPosts(pickPostsForAi(res.posts, shuffle));
    } catch (err) {
      setError("Could not load your latest recipes.");
    } finally {
      setLoadingPosts(false);
    }
  }

  async function getSuggestions() {
    if (!titles.length) {
      setError("Add at least one recipe to get suggestions.");
      return;
    }

    setLoadingAi(true);
    setError("");
    try {
      const excludeTitles = ai?.suggestions?.map((item) => item.title) ?? [];
      const res = await api.getAiSuggestions(
        titles,
        excludeTitles,
        selectedPosts.map((post) => post.id)
      );
      setAi(res);
    } catch (err) {
      setError("Could not fetch suggestions.");
    } finally {
      setLoadingAi(false);
    }
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Suggested for you</h2>
        <p className="muted">
          We look at your latest recipes and ask an AI model what you might bake
          next.
        </p>

        <div className="row" style={{ alignItems: "stretch" }}>
          <button
            className="btn btnPrimary"
            onClick={getSuggestions}
            disabled={loadingAi || titles.length === 0}
          >
            {loadingAi ? "Asking AI..." : "Get suggestions"}
          </button>
          <button
            className="btn"
            onClick={() => void loadPosts(true)}
            disabled={loadingPosts}
          >
            {loadingPosts ? "Refreshing..." : "Refresh recipes"}
          </button>
          <Link className="btn" to="/feed">
            Back to feed
          </Link>
        </div>

        {error && <div className="card muted">{error}</div>}
        {ai && ai.mode !== "rag" && (
          <div className="muted" style={{ marginTop: 8 }}>
            Suggestions are running in {ai.mode} mode.
          </div>
        )}
        {ai && ai.confidence < 0.5 && (
          <div className="muted" style={{ marginTop: 6 }}>
            Limited confidence.
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Latest recipes</h3>
        {selectedPosts.length === 0 && <div className="muted">No recipes yet.</div>}
        {selectedPosts.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {selectedPosts.map((post) => (
              <li key={post.id}>{post.title}</li>
            ))}
          </ul>
        )}
        {posts.length > POST_LIMIT && (
          <div className="muted" style={{ marginTop: 8 }}>
            Refresh recipes to shuffle which 5 recipes are sent to AI.
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recommendations</h3>
        {!ai && !loadingAi && <div className="muted">No suggestions yet.</div>}
        {loadingAi && <div className="muted">Generating suggestions...</div>}
        {ai?.suggestions?.length
          ? ai.suggestions.map((item, idx) => (
              <div
                key={`${item.title}-${idx}`}
                className="card"
                style={{ marginTop: 10 }}
              >
                <h4 style={{ marginTop: 0, marginBottom: 8 }}>{item.title}</h4>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Ingredients</div>
                <ul style={{ marginTop: 0, paddingLeft: 18 }}>
                  {item.recipe.ingredients.map((ingredient, ingredientIdx) => (
                    <li key={`${item.title}-ingredient-${ingredientIdx}`}>
                      {ingredient}
                    </li>
                  ))}
                </ul>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Steps</div>
                <ol style={{ marginTop: 0, paddingLeft: 18 }}>
                  {item.recipe.steps.map((step, stepIdx) => (
                    <li key={`${item.title}-step-${stepIdx}`}>{step}</li>
                  ))}
                </ol>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
