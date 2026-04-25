import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/http";
import Avatar from "../components/Avatar";
import PostImage from "../components/PostImage";
import type { Post, User } from "../types/models";

export default function ProfileUser() {
  const { userId } = useParams();
  const id = userId ?? "";
  const [u, setU] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const user = await api.getUser(id);
        const res = await api.getUserPosts(id, 50, null);
        if (!mounted) return;
        setU(user);
        setPosts(res.posts);
      } catch {
        if (!mounted) return;
        setU(null);
        setPosts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (!u && !loading) {
    return (
      <div className="card">
        <h2>User Profile</h2>
        <p className="muted">userId: {id}</p>
        <p className="muted">User not found</p>
        <Link className="btn" to="/feed">
          Back to feed
        </Link>
      </div>
    );
  }

  if (!u) {
    return (
      <div className="card">
        <h2>User Profile</h2>
        <p className="muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="row" style={{ gap: 14 }}>
          <Avatar className="avatarLg" src={u.avatarUrl} name={u.username} alt={u.username} />
          <div className="col" style={{ gap: 4 }}>
            <h2 style={{ margin: 0 }}>{u.username}</h2>
            <div className="muted">{u.email ?? ""}</div>
            <Link className="btn" to="/feed" style={{ width: "fit-content" }}>
              Back to feed
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{u.username}&apos;s posts</h3>
        {posts.length === 0 ? (
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
                      <Link className="btn" to={`/post/${p.id}/comments`}>
                        Comments
                      </Link>
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
    </div>
  );
}
