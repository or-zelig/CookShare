import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import PostImage from "../components/PostImage";
import type { Post } from "../types/models";

type AiResult = { tokens: string[]; explanation: string };

const CACHE_KEY = "cookshare_ai_cache_v1";
const COOLDOWN_MS = 2500;
const PAGE_LIMIT = 25;

function loadCache(): Record<string, AiResult> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, AiResult>;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, AiResult>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function mockAiParse(q: string): AiResult {
  const s = q.toLowerCase();
  const tokens: string[] = [];
  const push = (t: string) => (tokens.includes(t) ? null : tokens.push(t));

  if (s.includes("vegan")) push("vegan");
  if (s.includes("gluten free") || s.includes("gluten-free")) push("gluten");
  if (s.includes("quinoa")) push("quinoa");
  if (s.includes("pasta")) push("pasta");
  if (s.includes("salad")) push("salad");
  if (s.includes("chicken")) push("chicken");
  if (s.includes("fish") || s.includes("tuna")) push("tuna");

  if (tokens.length === 0) {
    s.split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]+/gu, ""))
      .filter((w) => w.length >= 4)
      .slice(0, 4)
      .forEach(push);
  }

  return {
    tokens,
    explanation: `Searching for recipes that include: ${tokens.join(", ") || "—"}`,
  };
}

export default function AiSearch() {
  const [query, setQuery] = useState("");
  const [lastRun, setLastRun] = useState<number>(0);
  const [result, setResult] = useState<AiResult | null>(null);
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadMyPosts() {
    setLoading(true);
    try {
      const res = await api.getMyPosts(PAGE_LIMIT);
      setItems(res.posts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMyPosts();
  }, []);

  const canRun = Date.now() - lastRun > COOLDOWN_MS;

  const filtered = useMemo(() => {
    if (!result?.tokens?.length) return items;
    return items.filter((p) => result.tokens.every((t) => `${p.title} ${p.text}`.toLowerCase().includes(t.toLowerCase())));
  }, [items, result]);

  async function run() {
    if (!query.trim()) return;
    if (!canRun) return alert("Please wait a moment before running another search.");

    setLastRun(Date.now());

    const cache = loadCache();
    const key = query.trim().toLowerCase();
    const nextResult = cache[key] ?? mockAiParse(key);
    cache[key] = nextResult;
    saveCache(cache);
    setResult(nextResult);

    await loadMyPosts();
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>AI Search (Mock)</h2>
        <p className="muted">Free-text search across your own recipes only.</p>

        <div className="row" style={{ alignItems: "stretch" }}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='For example: "vegan gluten free"'
          />
          <button className="btn btnPrimary" onClick={() => void run()}>
            Search
          </button>
        </div>

        {result && (
          <div className="chipRow" style={{ marginTop: 10 }}>
            <span className="muted">{result.explanation}</span>
          </div>
        )}

        <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <Link className="btn" to="/feed">
            Back to feed
          </Link>
        </div>
      </div>

      {filtered.map((p) => (
        <div className="postCard" key={p.id}>
          <div className="postBody">
            <div className="postTitle">{p.title}</div>
            {p.text.trim() && p.text.trim() !== p.title.trim() && <div className="postText">{p.text}</div>}
            <div className="postImageWrap">
              <PostImage className="postImage" src={p.imageUrl} alt={p.title} />
            </div>
          </div>
          <div className="postActions">
            <Link className="btn" to={`/post/${p.id}/comments`}>
              Comments
            </Link>
          </div>
        </div>
      ))}

      {loading && <div className="card">Loading...</div>}
      {filtered.length === 0 && <div className="card muted">No matches found.</div>}
    </div>
  );
}
