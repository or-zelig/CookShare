import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import type { Post } from "../types/models";

type Mode = "all" | "mine" | "liked";

type Page = {
  posts: Post[];
  nextCursor: string | null;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("he-IL", {
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
  return Array.from(byId.values()).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export default function Feed() {
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>("all");
  const [items, setItems] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ready, setReady] = useState(false);

  // composer / edit
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [text, setText] = useState("");
  const [imageUrlRel, setImageUrlRel] = useState<string | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    undefined
  );
  const [saving, setSaving] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  async function fetchPage(nextCursor: string | null): Promise<Page> {
    if (mode === "mine") return api.getMyPosts(5, nextCursor);

    const page = await api.getFeed(5, nextCursor);
    if (mode === "liked" && user) {
      return {
        posts: page.posts.filter((p) => p.likedByMe),
        nextCursor: page.nextCursor,
      };
    }
    return page;
  }

  async function refresh() {
    const res = await fetchPage(null);
    setItems(res.posts);
    setCursor(res.nextCursor);
    setReady(true);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id]);

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
    if (!ready || cursor == null || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchPage(cursor);
      setItems((prev) => mergeUniquePosts(prev, res.posts));
      setCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }

  function openCreate() {
    setEditing(null);
    setText("");
    setImageUrlRel(undefined);
    setImageFile(undefined);
    setImagePreview(undefined);
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

    setSaving(true);
    try {
      let nextImageUrlRel = imageUrlRel;
      if (imageFile) {
        const uploadedUrl = await api.uploadImage(imageFile);
        nextImageUrlRel = uploadedUrl;
      }

      if (!editing) {
        await api.createPost({ text: text.trim(), imageUrl: nextImageUrlRel });
      } else {
        await api.updatePost(editing.id, {
          text: text.trim(),
          imageUrl: nextImageUrlRel,
        });
      }

      setComposerOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleLike(p: Post) {
    if (p.likedByMe) {
      await api.unlikePost(p.id);
    } else {
      await api.likePost(p.id);
    }
    refresh();
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>Feed</h2>
            <div className="muted">גלילה אינסופית + לייקים + תגובות</div>
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
        const likedByMe = p.likedByMe;
        const likeCount = p.likeCount ?? 0;
        const isMine = !!user && p.author?.id === user.id;

        return (
          <div className="postCard" key={p.id}>
            <div className="postHeader">
              <div className="row" style={{ gap: 10 }}>
                <div className="avatar">
                  {p.author?.avatarUrl ? (
                    <img src={p.author.avatarUrl} alt="" />
                  ) : (
                    <span>{p.author?.username?.[0] ?? "?"}</span>
                  )}
                </div>
                <div className="col" style={{ gap: 2 }}>
                  <Link to={`/profile/${p.author?.id ?? ""}`} className="postAuthor">
                    {p.author?.username ?? "Unknown"}
                  </Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {fmtTime(p.createdAt)}
                  </div>
                </div>
              </div>

              {isMine && null}
            </div>

            <div className="postBody">
              <div className="postText">{p.text}</div>
              {p.imageUrl && (
                <Link to={`/post/${p.id}/comments`} className="postImageWrap">
                  <img className="postImage" src={p.imageUrl} alt="" />
                </Link>
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
