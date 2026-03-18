import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import type { Post } from "../types/models";

type AiResult = { tokens: string[]; explanation: string };

type PageState = {
  page: number;
  hasMore: boolean;
};

const CACHE_KEY = "cookshare_ai_cache_v1";
const COOLDOWN_MS = 2500;
const PAGE_LIMIT = 10;

function loadCache(): Record<string, AiResult> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<
      string,
      AiResult
    >;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, AiResult>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

// “AI” מקומי: מפענח טקסט חופשי למילות מפתח לסינון
function mockAiParse(q: string): AiResult {
  const s = q.toLowerCase();

  const tokens: string[] = [];
  const push = (t: string) => (tokens.includes(t) ? null : tokens.push(t));

  if (s.includes("טבעוני")) push("טבעוני");
  if (s.includes("ללא גלוטן") || s.includes("בלי גלוטן")) push("גלוטן");
  if (s.includes("קינואה")) push("קינואה");
  if (s.includes("פסטה")) push("פסטה");
  if (s.includes("סלט")) push("סלט");
  if (s.includes("עוף")) push("עוף");
  if (s.includes("דג") || s.includes("טונה")) push("טונה");

  // אם אין כלום – ניקח מילים “חזקות” (אורך >= 4)
  if (tokens.length === 0) {
    s.split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]+/gu, ""))
      .filter((w) => w.length >= 4)
      .slice(0, 4)
      .forEach(push);
  }

  return {
    tokens,
    explanation: `הבנתי שתרצי תוצאות שכוללות: ${tokens.join(", ") || "—"}`,
  };
}

export default function AiSearch() {
  const [query, setQuery] = useState("");
  const [lastRun, setLastRun] = useState<number>(0);
  const [result, setResult] = useState<AiResult | null>(null);

  const [items, setItems] = useState<Post[]>([]);
  const [paging, setPaging] = useState<PageState>({ page: 1, hasMore: true });
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await api.getFeedPage(1, PAGE_LIMIT);
      if (!mounted) return;
      setItems(res.posts);
      setPaging({
        page: 2,
        hasMore: res.posts.length === PAGE_LIMIT,
      });
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const canRun = Date.now() - lastRun > COOLDOWN_MS;

  const filtered = useMemo(() => {
    if (!result?.tokens?.length) return items;
    return items.filter((p) =>
      result.tokens.every((t) => p.text.toLowerCase().includes(t.toLowerCase()))
    );
  }, [items, result]);

  async function run() {
    if (!query.trim()) return;
    if (!canRun) return alert("חכי רגע לפני חיפוש נוסף (cooldown)");

    setLastRun(Date.now());

    const cache = loadCache();
    const key = query.trim().toLowerCase();

    const r = cache[key] ?? mockAiParse(key);
    cache[key] = r;
    saveCache(cache);

    setResult(r);

    // ריסט “פיד” בסיסי כדי שירגיש כמו חיפוש מחדש
    const res = await api.getFeedPage(1, PAGE_LIMIT);
    setItems(res.posts);
    setPaging({
      page: 2,
      hasMore: res.posts.length === PAGE_LIMIT,
    });
  }

  async function loadMore() {
    if (loadingMore || !paging.hasMore) return;
    setLoadingMore(true);
    try {
      const res = await api.getFeedPage(paging.page, PAGE_LIMIT);
      setItems((prev) => [...prev, ...res.posts]);
      setPaging({
        page: paging.page + 1,
        hasMore: res.posts.length === PAGE_LIMIT,
      });
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadMore();
    });

    io.observe(el);
    return () => io.disconnect();
  }, [paging, loadingMore]);

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>AI Search (Mock)</h2>
        <p className="muted">
          חיפוש בלשון חופשית → פענוח ל"מילות מפתח" → סינון תוצאות. כולל cache +
          cooldown.
        </p>

        <div className="row" style={{ alignItems: "stretch" }}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='לדוגמה: "טבעוני ללא גלוטן"'
          />
          <button className="btn btnPrimary" onClick={run}>
            Search
          </button>
        </div>

        {result && (
          <div className="chipRow" style={{ marginTop: 10 }}>
            <span className="muted">{result.explanation}</span>
          </div>
        )}

        <div
          className="row"
          style={{ marginTop: 12, justifyContent: "space-between" }}
        >
          <Link className="btn" to="/feed">
            ← חזרה לפיד
          </Link>
        </div>
      </div>

      {filtered.map((p) => (
        <div className="postCard" key={p.id}>
          <div className="postBody">
            <div className="postText">{p.text}</div>
            {p.imageUrl && (
              <div className="postImageWrap">
                <img className="postImage" src={p.imageUrl} alt="" />
              </div>
            )}
          </div>
          <div className="postActions">
            <Link className="btn" to={`/post/${p.id}/comments`}>
              תגובות
            </Link>
          </div>
        </div>
      ))}

      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && <div className="card">טוען עוד…</div>}

      {filtered.length === 0 && <div className="card muted">אין התאמות</div>}
    </div>
  );
}
