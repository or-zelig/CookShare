import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import type { Comment, Post } from "../types/models";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("he-IL", {
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

  const [post, setPost] = useState<Post | null>(null);
  const [text, setText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const p = await api.getPost(postId);
        if (mounted) setPost(p);

        const res = await api.listComments(postId, 20, null);
        if (!mounted) return;
        setComments(res.comments);
        setCursor(res.nextCursor);
      } catch {
        if (!mounted) return;
        setPost(null);
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
        <p className="muted">Loading...</p>
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
    await api.addComment(postId, text.trim());
    setText("");
    const res = await api.listComments(postId, 20, null);
    setComments(res.comments);
    setCursor(res.nextCursor);
  }

  async function del(commentId: string) {
    await api.deleteComment(commentId);
    const res = await api.listComments(postId, 20, null);
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
            to={`/profile/${post.author?.id ?? ""}`}
            style={{ textDecoration: "underline" }}
          >
            {post.author?.username ?? "Unknown"}
          </Link>
        </div>
        <p style={{ marginBottom: 0 }}>{post.text}</p>

        {post.imageUrl && (
          <div className="postImageWrap" style={{ marginTop: 12 }}>
            <img className="postImage postImageLarge" src={post.imageUrl} alt="" />
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
            placeholder="כתבי תגובה..."
          />
          <button className="btn btnPrimary" onClick={add}>
            שליחה
          </button>
        </div>
      </div>

      {loading && <div className="card muted">Loading...</div>}

      {comments.map((c) => {
        const mine = !!user && c.author?.id === user.id;
        return (
          <div className="card" key={c.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row" style={{ gap: 10 }}>
                <div className="avatarSm">
                  {c.author?.avatarUrl ? (
                    <img src={c.author.avatarUrl} alt="" />
                  ) : (
                    <span>{c.author?.username?.[0] ?? "?"}</span>
                  )}
                </div>
                <div className="col" style={{ gap: 2 }}>
                  <Link
                    to={`/profile/${c.author?.id ?? ""}`}
                    style={{ fontWeight: 600 }}
                  >
                    {c.author?.username ?? "Unknown"}
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
            const res = await api.listComments(postId, 20, cursor);
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
