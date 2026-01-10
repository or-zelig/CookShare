import { useMemo, useState } from "react";
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

  const post = db.getPost(postId);
  const author = post ? db.getUser(post.authorId) : null;

  const [text, setText] = useState("");

  const comments = useMemo(() => db.listComments(postId), [postId, text]); // re-render ok for mock

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

  function add() {
    if (!text.trim()) return;
    db.addComment(postId, text.trim());
    setText("");
  }

  function del(commentId: string) {
    db.deleteComment(commentId);
    setText((t) => t); // trigger rerender
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

      {comments.map((c) => {
        const u = db.getUser(c.authorId);
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
    </div>
  );
}
