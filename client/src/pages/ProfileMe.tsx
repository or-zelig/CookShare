import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar";
import PostImage from "../components/PostImage";
import { db } from "../mock/db";
import type { Post } from "../types/models";

export default function ProfileMe() {
  const { user, refreshUser } = useAuth();
  const me = user;
  if (!me) return null;

  const myUsername = me.username;

  const [username, setUsername] = useState(myUsername);
  const [busy, setBusy] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl || "");

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editImageUrlRel, setEditImageUrlRel] = useState<string | undefined>(undefined);
  const [editImageFile, setEditImageFile] = useState<File | undefined>(undefined);
  const [editImagePreview, setEditImagePreview] = useState<string | undefined>(undefined);
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
    } finally {
      setBusy(false);
    }
  }

  const displayAvatar = avatarPreview || avatarUrl;

  function openEditPost(p: Post) {
    setEditingPost(p);
    setEditTitle(p.title);
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
    if (!editTitle.trim()) return alert("Title is required");
    if (!editText.trim()) return alert("Text is required");

    setSavingPost(true);
    try {
      let nextImageUrlRel = editImageUrlRel;
      if (editImageFile) {
        const uploadedUrl = await api.uploadImage(editImageFile);
        nextImageUrlRel = uploadedUrl;
      }

      await api.updatePost(editingPost.id, {
        title: editTitle.trim(),
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

  async function deletePost(p: Post) {
    if (!confirm("Delete this post?")) return;
    await api.deletePost(p.id);
    const res = await api.getMyPosts(50, null);
    setPosts(res.posts);
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>My Profile</h2>

        <div className="row" style={{ gap: 14 }}>
          <Avatar className="avatarLg" src={displayAvatar} name={myUsername} alt={myUsername} />

          <div className="col" style={{ flex: 1 }}>
            <div className="muted">Username</div>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />

            <div className="muted">Avatar</div>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <label className="btn" style={{ cursor: busy ? "not-allowed" : "pointer" }}>
                Choose image
                <input
                  className="srOnly"
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(e) => void onPick(e.target.files?.[0])}
                />
              </label>
              <span className="muted">{avatarFile?.name ?? "No file selected"}</span>
            </div>

            <div className="row" style={{ justifyContent: "space-between" }}>
              <Link className="btn" to="/feed">
                Back to feed
              </Link>
              <button className="btn btnPrimary" disabled={busy} onClick={() => void save()}>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>My Posts</h3>
        {postsLoading ? (
          <p className="muted">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="muted">No posts yet.</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {posts.map((p) => (
              <div key={p.id} className="miniPost">
                <div className="miniPostRow">
                  <div className="miniPostBody">
                    <div className="miniPostTitle">{p.title}</div>
                    <div className="miniPostText">{p.text}</div>
                    <div className="miniPostMeta">
                      <span className="muted">{p.likeCount ?? 0} likes</span>
                      <div className="row">
                        <button
                          className="btn danger"
                          onClick={() => void deletePost(p)}
                          aria-label="Delete post"
                          title="Delete post"
                        >
                          🗑️
                        </button>
                        <button
                          className="btn"
                          onClick={() => openEditPost(p)}
                          aria-label="Edit post"
                          title="Edit post"
                        >
                          ✎
                        </button>
                        <Link className="btn" to={`/post/${p.id}/comments`}>
                          Comments
                        </Link>
                      </div>
                    </div>
                  </div>
                  <Link to={`/post/${p.id}/comments`} className="miniPostImage">
                    <PostImage src={p.imageUrl} alt={p.title} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingPost && (
        <div className="modalBackdrop" onMouseDown={() => setEditingPost(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Post</h3>

            <input
              className="input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Recipe title"
            />

            <textarea
              className="input"
              style={{ minHeight: 110, resize: "vertical" }}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="What would you like to share?"
            />

            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <label className="btn" style={{ cursor: savingPost ? "not-allowed" : "pointer" }}>
                  Choose image
                  <input
                    className="srOnly"
                    type="file"
                    accept="image/*"
                    disabled={savingPost}
                    onChange={(e) => void onPickPostImage(e.target.files?.[0])}
                  />
                </label>
                <span className="muted">{editImageFile?.name ?? "No file selected"}</span>
              </div>

              <div className="row">
                <button className="btn" onClick={() => setEditingPost(null)}>
                  Cancel
                </button>
                <button className="btn btnPrimary" disabled={savingPost} onClick={() => void savePostEdit()}>
                  Save
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
