import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../mock/db";

type AiResult = { tokens: string[]; explanation: string };

const CACHE_KEY = "cookshare_ai_cache_v1";
const COOLDOWN_MS = 2500;

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

  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<Awaited<ReturnType<typeof db.listPosts>>["items"]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await db.listPosts({ limit: 5, cursor: null });
      if (!mounted) return;
      setItems(res.items);
      setCursor(res.nextCursor);
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
    const res = await db.listPosts({ limit: 10, cursor: null });
    setItems(res.items);
    setCursor(res.nextCursor);
  }

  async function loadMore() {
    if (cursor == null) return;
    const res = await db.listPosts({ limit: 10, cursor });
    setItems((prev) => [...prev, ...res.items]);
    setCursor(res.nextCursor);
  }

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
          {cursor != null && (
            <button className="btn" onClick={loadMore}>
              טען עוד
            </button>
          )}
        </div>
      </div>

      {filtered.map((p) => (
        <div className="postCard" key={p.id}>
          <div className="postBody">
            <div className="postText">{p.text}</div>
            {(p.imageDataUrl || p.imageUrl) && (
              <div className="postImageWrap">
                <img className="postImage" src={p.imageDataUrl ?? p.imageUrl} alt="" />
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

      {filtered.length === 0 && <div className="card muted">אין התאמות</div>}
    </div>
  );
}
