import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { db, type Post, type User } from "../mock/db";
import { useAuth } from "../auth/AuthContext";

type Mode = "all" | "mine" | "liked";

function fmtTime(ms: number) {
  return new Date(ms).toLocaleString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function Feed() {
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>("all");
  const [items, setItems] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // composer / edit
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [text, setText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(
    undefined
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filterArgs = useMemo(() => {
    if (!user) return { authorId: undefined, likedByUserId: undefined };
    if (mode === "mine") return { authorId: user.id, likedByUserId: undefined };
    if (mode === "liked")
      return { authorId: undefined, likedByUserId: user.id };
    return { authorId: undefined, likedByUserId: undefined };
  }, [mode, user]);

  function refresh() {
    const res = db.listPosts({ limit: 5, cursor: 0, ...filterArgs });
    setItems(res.items);
    setCursor(res.nextCursor);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver((entries) => {
      const hit = entries.some((e) => e.isIntersecting);
      if (hit) void loadMore();
    });

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, mode, user]);

  async function loadMore() {
    if (cursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = db.listPosts({ limit: 5, cursor, ...filterArgs });
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setText("");
    setImageDataUrl(undefined);
    setComposerOpen(true);
  }

  function openEdit(p: Post) {
    setEditing(p);
    setText(p.text);
    setImageDataUrl(p.imageDataUrl);
    setComposerOpen(true);
  }

  async function onPickImage(file?: File) {
    if (!file) return;
    const url = await readFileAsDataUrl(file);
    setImageDataUrl(url);
  }

  function onSave() {
    if (!text.trim()) return alert("טקסט חובה");
    if (!user) return;

    if (!editing) {
      db.createPost({ text: text.trim(), imageDataUrl });
    } else {
      db.updatePost(editing.id, {
        text: text.trim(),
        imageDataUrl: imageDataUrl ?? null,
      });
    }

    setComposerOpen(false);
    refresh();
  }

  function onDelete(p: Post) {
    if (!confirm("למחוק את הפוסט?")) return;
    db.deletePost(p.id);
    refresh();
  }

  function toggleLike(p: Post) {
    db.toggleLike(p.id);
    refresh();
  }

  function getAuthor(p: Post): User | null {
    return db.getUser(p.authorId);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>Feed</h2>
            <div className="muted">גלילה אינסופית + לייקים + תגובות (Mock)</div>
          </div>

          <div className="row">
            <button
              className={`btn ${mode === "all" ? "btnPrimary" : ""}`}
              onClick={() => setMode("all")}
            >
              כולם
            </button>
            <button
              className={`btn ${mode === "mine" ? "btnPrimary" : ""}`}
              onClick={() => setMode("mine")}
            >
              שלי
            </button>
            <button
              className={`btn ${mode === "liked" ? "btnPrimary" : ""}`}
              onClick={() => setMode("liked")}
            >
              לייקים
            </button>

            <button className="btn btnPrimary" onClick={openCreate}>
              + פוסט חדש
            </button>
          </div>
        </div>
      </div>

      {items.map((p) => {
        const author = getAuthor(p);
        const counts = db.getCounts(p.id);
        const likedByMe = !!user && p.likedBy.includes(user.id);
        const isMine = !!user && p.authorId === user.id;

        return (
          <div className="postCard" key={p.id}>
            <div className="postHeader">
              <div className="row" style={{ gap: 10 }}>
                <div className="avatar">
                  {author?.avatarDataUrl ? (
                    <img src={author.avatarDataUrl} alt="" />
                  ) : (
                    <span>{author?.username?.[0] ?? "?"}</span>
                  )}
                </div>
                <div className="col" style={{ gap: 2 }}>
                  <Link
                    to={`/profile/${author?.id ?? ""}`}
                    className="postAuthor"
                  >
                    {author?.username ?? "Unknown"}
                  </Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {fmtTime(p.createdAt)}
                  </div>
                </div>
              </div>

              {isMine && (
                <div className="row">
                  <button className="btn" onClick={() => openEdit(p)}>
                    עריכה
                  </button>
                  <button className="btn danger" onClick={() => onDelete(p)}>
                    מחיקה
                  </button>
                </div>
              )}
            </div>

            <div className="postBody">
              <div className="postText">{p.text}</div>
              {p.imageDataUrl && (
                <div className="postImageWrap">
                  <img className="postImage" src={p.imageDataUrl} alt="" />
                </div>
              )}
            </div>

            <div className="postActions">
              <button
                className={`btn ${likedByMe ? "btnPrimary" : ""}`}
                onClick={() => toggleLike(p)}
              >
                {likedByMe ? "❤️" : "🤍"} {p.likedBy.length}
              </button>

              <Link className="btn" to={`/post/${p.id}/comments`}>
                💬 {counts.commentsCount}
              </Link>
            </div>
          </div>
        );
      })}

      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && <div className="card">טוען עוד…</div>}
      {cursor == null && <div className="card muted">סוף הרשימה ✨</div>}

      {composerOpen && (
        <div
          className="modalBackdrop"
          onMouseDown={() => setComposerOpen(false)}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {editing ? "עריכת פוסט" : "פוסט חדש"}
            </h3>

            <textarea
              className="input"
              style={{ minHeight: 110, resize: "vertical" }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="מה בא לך לשתף?"
            />

            <div className="row" style={{ justifyContent: "space-between" }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onPickImage(e.target.files?.[0])}
              />

              <div className="row">
                <button className="btn" onClick={() => setComposerOpen(false)}>
                  ביטול
                </button>
                <button className="btn btnPrimary" onClick={onSave}>
                  שמירה
                </button>
              </div>
            </div>

            {imageDataUrl && (
              <div className="postImageWrap" style={{ marginTop: 10 }}>
                <img className="postImage" src={imageDataUrl} alt="" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
