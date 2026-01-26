import { Link, useParams } from "react-router-dom";
import { db } from "../mock/db";

export default function ProfileUser() {
  const { userId } = useParams();
  const id = userId ?? "";
  const u = db.getUser(id);

  if (!u) {
    return (
      <div className="card">
        <h2>User Profile</h2>
        <p className="muted">userId: {id}</p>
        <p className="muted">המשתמש לא נמצא</p>
        <Link className="btn" to="/feed">
          חזרה לפיד
        </Link>
      </div>
    );
  }

  const posts = db.listPosts({ limit: 999, cursor: 0, authorId: u.id }).items;

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="row" style={{ gap: 14 }}>
          <div className="avatarLg">
            {u.avatarDataUrl ? (
              <img src={u.avatarDataUrl} alt="" />
            ) : (
              <span>{u.username[0]}</span>
            )}
          </div>
          <div className="col" style={{ gap: 4 }}>
            <h2 style={{ margin: 0 }}>{u.username}</h2>
            <div className="muted">{u.email}</div>
            <Link className="btn" to="/feed" style={{ width: "fit-content" }}>
              ← חזרה לפיד
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>פוסטים של {u.username}</h3>
        {posts.length === 0 ? (
          <p className="muted">אין פוסטים</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {posts.map((p) => (
              <div key={p.id} className="miniPost">
                <div>{p.text}</div>
                <div
                  className="row"
                  style={{ justifyContent: "space-between" }}
                >
                  <span className="muted">{p.likedBy.length} לייקים</span>
                  <Link className="btn" to={`/post/${p.id}/comments`}>
                    תגובות
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
