import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { db } from "../mock/db";
import type { Post } from "../types/models";

export default function ProfileMe() {
  const { user, refreshUser } = useAuth();
  const me = user;

  // ✅ חייב להיות לפני hooks + פתרון null
  if (!me) return null;

  // ✅ פתרון #2: צילום ערך שאחרי ה-guard הוא בוודאות string
  const myUsername = me.username;

  const [username, setUsername] = useState(myUsername);
  const [busy, setBusy] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    undefined
  );
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl || "");

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editText, setEditText] = useState("");
  const [editImageUrlRel, setEditImageUrlRel] = useState<string | undefined>(
    undefined
  );
  const [editImageFile, setEditImageFile] = useState<File | undefined>(
    undefined
  );
  const [editImagePreview, setEditImagePreview] = useState<
    string | undefined
  >(undefined);
  const [savingPost, setSavingPost] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    return () => {
      if (editImagePreview && editImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(editImagePreview);
      }
    };
  }, [editImagePreview]);

  useEffect(() => {
    let mounted = true;
    setPostsLoading(true);
    (async () => {
      try {
        const res = await api.getMyPosts(50, null);
        if (!mounted) return;
        setPosts(res.posts);
      } catch {
        if (!mounted) return;
        setPosts([]);
      } finally {
        if (mounted) setPostsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function onPick(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(url);
  }

  async function save() {
    const nextUsername = username.trim() || myUsername;
    setBusy(true);
    try {
      let nextAvatarUrl = avatarUrl;
      let uploadedUrl: string | undefined;
      if (avatarFile) {
        uploadedUrl = await api.uploadImage(avatarFile);
        nextAvatarUrl = api.resolveMediaUrl(uploadedUrl);
      }
      await api.updateMe({
        username: nextUsername,
        avatarUrl: uploadedUrl,
      });
      await refreshUser();
      db.updateMe({ username: nextUsername, avatarDataUrl: nextAvatarUrl });
      setAvatarUrl(nextAvatarUrl);
      setAvatarFile(undefined);
      setAvatarPreview(undefined);
      alert("עודכן (Mock)");
    } finally {
      setBusy(false);
    }
  }

  const displayAvatar = avatarPreview || avatarUrl;

  function openEditPost(p: Post) {
    setEditingPost(p);
    setEditText(p.text);
    setEditImageUrlRel(api.toRelativeMediaUrl(p.imageUrl));
    setEditImageFile(undefined);
    setEditImagePreview(p.imageUrl || undefined);
  }

  function onPickPostImage(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setEditImageFile(file);
    setEditImagePreview(url);
  }

  async function savePostEdit() {
    if (!editingPost) return;
    if (!editText.trim()) return alert("טקסט חובה");

    setSavingPost(true);
    try {
      let nextImageUrlRel = editImageUrlRel;
      if (editImageFile) {
        const uploadedUrl = await api.uploadImage(editImageFile);
        nextImageUrlRel = uploadedUrl;
      }

      await api.updatePost(editingPost.id, {
        text: editText.trim(),
        imageUrl: nextImageUrlRel,
      });

      const res = await api.getMyPosts(50, null);
      setPosts(res.posts);
      setEditingPost(null);
      setEditImageFile(undefined);
      setEditImagePreview(undefined);
    } finally {
      setSavingPost(false);
    }
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>הפרופיל שלי</h2>

        <div className="row" style={{ gap: 14 }}>
          <div className="avatarLg">
            {displayAvatar ? (
              <img src={displayAvatar} alt="" />
            ) : (
              <span>{myUsername[0]}</span>
            )}
          </div>

          <div className="col" style={{ flex: 1 }}>
            <div className="muted">שם משתמש</div>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <div className="muted">תמונה</div>
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) => void onPick(e.target.files?.[0])}
            />

            <div className="row" style={{ justifyContent: "space-between" }}>
              <Link className="btn" to="/feed">
                חזרה לפיד
              </Link>
              <button
                className="btn btnPrimary"
                disabled={busy}
                onClick={save}
              >
                שמירה
              </button>
            </div>

            <div className="muted" style={{ fontSize: 12 }}>
              * לפי הדרישה: כאן עורכים רק תמונה ושם משתמש (Mock)
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>הפוסטים שלי</h3>
        {postsLoading ? (
          <p className="muted">טוען...</p>
        ) : posts.length === 0 ? (
          <p className="muted">אין פוסטים</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {posts.map((p) => (
              <div key={p.id} className="miniPost">
                <div className="miniPostRow">
                  <div className="miniPostBody">
                    <div className="miniPostText">{p.text}</div>
                  <div className="miniPostMeta">
                    <span className="muted">{p.likeCount ?? 0} לייקים</span>
                    <div className="row">
                      <button
                        className="btn"
                        onClick={() => openEditPost(p)}
                      >
                        ✎
                      </button>
                      <Link className="btn" to={`/post/${p.id}/comments`}>
                        תגובות
                      </Link>
                    </div>
                  </div>
                </div>
                  {p.imageUrl && (
                    <Link to={`/post/${p.id}/comments`} className="miniPostImage">
                      <img src={p.imageUrl} alt="" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingPost && (
        <div
          className="modalBackdrop"
          onMouseDown={() => setEditingPost(null)}
        >
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>עריכת פוסט</h3>

            <textarea
              className="input"
              style={{ minHeight: 110, resize: "vertical" }}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="מה בא לך לשתף?"
            />

            <div className="row" style={{ justifyContent: "space-between" }}>
              <input
                type="file"
                accept="image/*"
                disabled={savingPost}
                onChange={(e) => void onPickPostImage(e.target.files?.[0])}
              />

              <div className="row">
                <button className="btn" onClick={() => setEditingPost(null)}>
                  ביטול
                </button>
                <button
                  className="btn btnPrimary"
                  disabled={savingPost}
                  onClick={savePostEdit}
                >
                  שמירה
                </button>
              </div>
            </div>

            {editImagePreview && (
              <div className="postImageWrap" style={{ marginTop: 10 }}>
                <img className="postImage" src={editImagePreview} alt="" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
