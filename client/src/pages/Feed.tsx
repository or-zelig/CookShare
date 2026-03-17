import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { db, type Post, type User } from "../mock/db";

type Mode = "all" | "mine" | "liked";

function fmtTime(ms: number) {
  return new Date(ms).toLocaleString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function mergeUniquePosts(prev: Post[], next: Post[]): Post[] {
  const byId = new Map<string, Post>();
  for (const p of prev) byId.set(p.id, p);
  for (const p of next) byId.set(p.id, p);
  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export default function Feed() {
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>("all");
  const [items, setItems] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<number | string | null>(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ready, setReady] = useState(false);

  // composer / edit
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    undefined
  );
  const [saving, setSaving] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  const filterArgs = useMemo(() => {
    if (!user) return { authorId: undefined, likedByUserId: undefined };
    if (mode === "mine") return { authorId: user.id, likedByUserId: undefined };
    if (mode === "liked")
      return { authorId: undefined, likedByUserId: user.id };
    return { authorId: undefined, likedByUserId: undefined };
  }, [mode, user]);

  async function fetchPage(nextCursor: number | string | null) {
    if (mode === "all") return db.getFeed({ limit: 5, cursor: nextCursor });
    if (mode === "mine") return db.getMyPosts({ limit: 5, cursor: nextCursor });
    return db.listPosts({ limit: 5, cursor: nextCursor, ...filterArgs });
  }

  async function refresh() {
    const res = await fetchPage(0);
    setItems("posts" in res ? res.posts : res.items);
    setCursor(res.nextCursor);
    setReady(true);
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
    if (cursor == null || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchPage(cursor);
      const pageItems = "posts" in res ? res.posts : res.items;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const item of pageItems) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }
        return merged;
      });
      setCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }

  function openCreate() {
    setEditing(null);
    setText("");
    setImageUrl(undefined);
    setImageFile(undefined);
    setImagePreview(undefined);
    setComposerOpen(true);
  }

  function openEdit(p: Post) {
    setEditing(p);
    setText(p.text);
    setImageUrl(p.imageDataUrl);
    setImageFile(undefined);
    setImagePreview(p.imageDataUrl);
    setComposerOpen(true);
  }

  function onPickImage(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(url);
  }

  async function onSave() {
    if (!text.trim()) return alert("טקסט חובה");
    if (!user) return;

    if (!editing) {
      await db.createPost({ title: text.trim(), imageDataUrl });
    } else {
      await db.updatePost(editing.id, {
        title: text.trim(),
        imageDataUrl: imageDataUrl ?? null,
      });
    }

      setComposerOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p: Post) {
    if (!confirm("למחוק את הפוסט?")) return;
    await db.deletePost(p.id);
    refresh();
  }

  async function toggleLike(p: Post) {
    if (p.likedByMe) {
      await db.unlikePost(p.id);
    } else {
      await db.likePost(p.id);
    }
    refresh();
  }

  function getAuthor(p: Post): User | null {
    if (!p.author) return null;
    return {
      id: p.author.id,
      username: p.author.username,
      email: "",
      avatarDataUrl: p.author.avatarUrl,
      password: "",
    };
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
        const likedByMe = p.likedByMe ?? (!!user && p.likedBy.includes(user.id));
        const likeCount = p.likeCount ?? p.likedBy.length;
        const isMine = !!user && p.authorId === user.id;

        return (
          <div className="postCard" key={p.id}>
            <div className="postHeader">
              <div className="row" style={{ gap: 10 }}>
                <div className="avatar">
                  {author?.avatarDataUrl || p.author?.avatarUrl ? (
                    <img src={author?.avatarDataUrl ?? p.author?.avatarUrl} alt="" />
                  ) : (
                    <span>{(author?.username ?? p.author?.username)?.[0] ?? "?"}</span>
                  )}
                </div>
                <div className="col" style={{ gap: 2 }}>
                  <Link
                    to={`/profile/${author?.id ?? ""}`}
                    className="postAuthor"
                  >
                    {author?.username ?? p.author?.username ?? "Unknown"}
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
              {(p.imageDataUrl || p.imageUrl) && (
                <div className="postImageWrap">
                  <img className="postImage" src={p.imageDataUrl ?? p.imageUrl} alt="" />
                </div>
              )}
            </div>

            <div className="postActions">
              <button
                className={`btn ${likedByMe ? "btnPrimary" : ""}`}
                onClick={() => toggleLike(p)}
              >
                {likedByMe ? "❤️" : "🤍"} {likeCount}
              </button>

              <Link className="btn" to={`/post/${p.id}/comments`}>
                💬 {p.commentCount ?? 0}
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
                disabled={saving}
                onChange={(e) => void onPickImage(e.target.files?.[0])}
              />

              <div className="row">
                <button className="btn" onClick={() => setComposerOpen(false)}>
                  ביטול
                </button>
                <button
                  className="btn btnPrimary"
                  disabled={saving}
                  onClick={onSave}
                >
                  שמירה
                </button>
              </div>
            </div>

            {imagePreview && (
              <div className="postImageWrap" style={{ marginTop: 10 }}>
                <img className="postImage" src={imagePreview} alt="" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
