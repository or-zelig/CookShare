import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import type { Post } from "../types/models";

type AiResponse = {
  suggestions: string[];
  provider: string;
  note?: string;
};

const POST_LIMIT = 5;

export default function SuggestedForYou() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [ai, setAi] = useState<AiResponse | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState("");

  const titles = useMemo(
    () => posts.map((p) => p.text).filter(Boolean).slice(0, POST_LIMIT),
    [posts]
  );

  async function loadPosts() {
    setLoadingPosts(true);
    setError("");
    try {
      const res = await api.getMyPosts(POST_LIMIT);
      setPosts(res.posts);
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
      const res = await api.getAiSuggestions(titles);
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
          <button className="btn" onClick={loadPosts} disabled={loadingPosts}>
            {loadingPosts ? "Refreshing..." : "Refresh recipes"}
          </button>
          <Link className="btn" to="/feed">
            Back to feed
          </Link>
        </div>

        {error && <div className="card muted">{error}</div>}
        {ai?.note && <div className="muted" style={{ marginTop: 8 }}>{ai.note}</div>}
        {ai?.provider && (
          <div className="muted" style={{ marginTop: 6 }}>
            Provider: {ai.provider}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Latest recipes</h3>
        {posts.length === 0 && <div className="muted">No recipes yet.</div>}
        {posts.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {posts.map((post) => (
              <li key={post.id}>{post.text}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recommendations</h3>
        {!ai && !loadingAi && <div className="muted">No suggestions yet.</div>}
        {loadingAi && <div className="muted">Generating suggestions...</div>}
        {ai?.suggestions?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {ai.suggestions.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
