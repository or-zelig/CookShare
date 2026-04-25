import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import PostImage from "../components/PostImage";
import type { Post } from "../types/models";

type Mode = "all" | "mine" | "liked";

type Page = {
  posts: Post[];
  nextCursor: string | null;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
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
  return Array.from(byId.values()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export default function Feed() {
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>("all");
  const [items, setItems] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ready, setReady] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [imageUrlRel, setImageUrlRel] = useState<string | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
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
    void refresh();
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
    setTitle("");
    setText("");
    setImageUrlRel(undefined);
    setImageFile(undefined);
    setImagePreview(undefined);
    setComposerOpen(true);
  }

  function openEdit(post: Post) {
    setEditing(post);
    setTitle(post.title);
    setText(post.text);
    setImageUrlRel(api.toRelativeMediaUrl(post.imageUrl));
    setImageFile(undefined);
    setImagePreview(post.imageUrl || undefined);
    setComposerOpen(true);
  }

  function onPickImage(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(url);
  }

  async function onSave() {
    if (!title.trim()) return alert("Title is required");
    if (!text.trim()) return alert("Text is required");
    if (!user) return;

    setSaving(true);
    try {
      let nextImageUrlRel = imageUrlRel;
      if (imageFile) {
        const uploadedUrl = await api.uploadImage(imageFile);
        nextImageUrlRel = uploadedUrl;
      }

      if (!editing) {
        await api.createPost({
          title: title.trim(),
          text: text.trim(),
          imageUrl: nextImageUrlRel,
        });
      } else {
        await api.updatePost(editing.id, {
          title: title.trim(),
          text: text.trim(),
          imageUrl: nextImageUrlRel,
        });
      }

      setComposerOpen(false);
      await refresh();
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
    await refresh();
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>Feed</h2>
          </div>

          <div className="row">
            <button className={`btn ${mode === "all" ? "btnPrimary" : ""}`} onClick={() => setMode("all")}>
              All
            </button>
            <button className={`btn ${mode === "mine" ? "btnPrimary" : ""}`} onClick={() => setMode("mine")}>
              Mine
            </button>
            <button className={`btn ${mode === "liked" ? "btnPrimary" : ""}`} onClick={() => setMode("liked")}>
              Liked
            </button>

            <button className="btn btnPrimary" onClick={openCreate}>
              + New Post
            </button>
          </div>
        </div>
      </div>

      {items.map((p) => {
        const likeCount = p.likeCount ?? 0;
        const isMine = !!user && p.author?.id === user.id;

        return (
          <div className="postCard" key={p.id}>
            <div className="postHeader">
              <div className="row" style={{ gap: 10 }}>
                <Avatar className="avatar" src={p.author?.avatarUrl} name={p.author?.username} alt={p.author?.username ?? ""} />
                <div className="col" style={{ gap: 2 }}>
                  <Link to={`/profile/${p.author?.id ?? ""}`} className="postAuthor">
                    {p.author?.username ?? "Unknown"}
                  </Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {fmtTime(p.createdAt)}
                  </div>
                </div>
              </div>

              {isMine && (
                <button className="btn" onClick={() => openEdit(p)}>
                  Edit
                </button>
              )}
            </div>

            <div className="postBody">
              <div className="postTitle">{p.title}</div>
              <div className="postText">{p.text}</div>
              <Link to={`/post/${p.id}/comments`} className="postImageWrap">
                <PostImage className="postImage" src={p.imageUrl} alt={p.title} />
              </Link>
            </div>

            <div className="postActions">
              <button className={`btn ${p.likedByMe ? "btnPrimary" : ""}`} onClick={() => void toggleLike(p)}>
                {p.likedByMe ? "❤️" : "🤍"} {likeCount}
              </button>

              <Link className="btn" to={`/post/${p.id}/comments`}>
                💬 {p.commentCount ?? 0}
              </Link>
            </div>
          </div>
        );
      })}

      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && <div className="card">Loading more...</div>}
      {cursor == null && <div className="card muted">End of feed ✨</div>}

      {composerOpen && (
        <div className="modalBackdrop" onMouseDown={() => setComposerOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editing ? "Edit Post" : "New Post"}</h3>

            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recipe title"
            />

            <textarea
              className="input"
              style={{ minHeight: 110, resize: "vertical" }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Description, notes, or instructions"
            />

            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <label className="btn" style={{ cursor: saving ? "not-allowed" : "pointer" }}>
                  Choose image
                  <input
                    className="srOnly"
                    type="file"
                    accept="image/*"
                    disabled={saving}
                    onChange={(e) => void onPickImage(e.target.files?.[0])}
                  />
                </label>
                <span className="muted">{imageFile?.name ?? "No file selected"}</span>
              </div>

              <div className="row">
                <button className="btn" onClick={() => setComposerOpen(false)}>
                  Cancel
                </button>
                <button className="btn btnPrimary" disabled={saving} onClick={() => void onSave()}>
                  Save
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
