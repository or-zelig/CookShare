import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db } from "../mock/db";
import { useAuth } from "../auth/AuthContext";

function fmtTime(ms: number) {
  return new Date(ms).toLocaleString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function Comments() {
  const { id } = useParams();
  const postId = id ?? "";
  const { user } = useAuth();

  const [post, setPost] = useState<Awaited<ReturnType<typeof db.getPost>> | null>(null);
  const [author, setAuthor] = useState<ReturnType<typeof db.getUser> | null>(null);
  const [text, setText] = useState("");
  const [comments, setComments] = useState<Awaited<ReturnType<typeof db.listComments>>["comments"]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const p = await db.getPost(postId);
        if (mounted) {
          setPost(p);
          setAuthor(
            p?.author
              ? {
                  id: p.author.id,
                  username: p.author.username,
                  email: "",
                  avatarDataUrl: p.author.avatarUrl,
                  password: "",
                }
              : null
          );
        }

        const res = await db.listComments(postId, { limit: 20, cursor: null });
        if (!mounted) return;
        setComments(res.comments);
        setCursor(res.nextCursor);
      } catch {
        if (!mounted) return;
        setPost(null);
        setAuthor(null);
        setComments([]);
        setCursor(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [postId]);

  if (!post && loading) {
    return (
      <div className="card">
        <h2>Comments</h2>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="card">
        <h2>Comments</h2>
        <p className="muted">הפוסט לא נמצא</p>
        <Link className="btn" to="/feed">
          חזרה לפיד
        </Link>
      </div>
    );
  }

  async function add() {
    if (!text.trim()) return;
    await db.addComment(postId, text.trim());
    setText("");
    const res = await db.listComments(postId, { limit: 20, cursor: null });
    setComments(res.comments);
    setCursor(res.nextCursor);
  }

  async function del(commentId: string) {
    await db.deleteComment(commentId);
    const res = await db.listComments(postId, { limit: 20, cursor: null });
    setComments(res.comments);
    setCursor(res.nextCursor);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>תגובות</h2>
        <div className="muted">
          לפוסט של{" "}
          <Link
            to={`/profile/${author?.id ?? ""}`}
            style={{ textDecoration: "underline" }}
          >
            {author?.username ?? "Unknown"}
          </Link>
        </div>
        <p style={{ marginBottom: 0 }}>{post.text}</p>

        <div
          className="row"
          style={{ marginTop: 12, justifyContent: "space-between" }}
        >
          <Link className="btn" to="/feed">
            ← חזרה לפיד
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>הוספת תגובה</h3>
          <span className="muted">{user?.username}</span>
        </div>

        <div className="row" style={{ marginTop: 10, alignItems: "stretch" }}>
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="כתבי תגובה…"
          />
          <button className="btn btnPrimary" onClick={add}>
            שליחה
          </button>
        </div>
      </div>

      {loading && <div className="card muted">Loading…</div>}

      {comments.map((c) => {
        const u = c.author
          ? {
              id: c.author.id,
              username: c.author.username,
              email: "",
              avatarDataUrl: c.author.avatarUrl,
              password: "",
            }
          : null;
        const mine = !!user && c.authorId === user.id;
        return (
          <div className="card" key={c.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row" style={{ gap: 10 }}>
                <div className="avatarSm">
                  {u?.avatarDataUrl ? (
                    <img src={u.avatarDataUrl} alt="" />
                  ) : (
                    <span>{u?.username?.[0] ?? "?"}</span>
                  )}
                </div>
                <div className="col" style={{ gap: 2 }}>
                  <Link
                    to={`/profile/${u?.id ?? ""}`}
                    style={{ fontWeight: 600 }}
                  >
                    {u?.username ?? "Unknown"}
                  </Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {fmtTime(c.createdAt)}
                  </div>
                </div>
              </div>

              {mine && (
                <button className="btn danger" onClick={() => del(c.id)}>
                  מחיקה
                </button>
              )}
            </div>

            <p style={{ marginBottom: 0 }}>{c.text}</p>
          </div>
        );
      })}

      {cursor && (
        <button
          className="btn"
          onClick={async () => {
            const res = await db.listComments(postId, { limit: 20, cursor });
            setComments((prev) => [...prev, ...res.comments]);
            setCursor(res.nextCursor);
          }}
        >
          Load more
        </button>
      )}
    </div>
  );
}
