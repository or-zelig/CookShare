import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { db } from "../mock/db";

export default function ProfileMe() {
  const { user } = useAuth();
  const me = user;

  // ג… ׳—׳™׳™׳‘ ׳׳”׳™׳•׳× ׳׳₪׳ ׳™ hooks + ׳₪׳×׳¨׳•׳ null
  if (!me) return null;

  // ג… ׳₪׳×׳¨׳•׳ #2: ׳¦׳™׳׳•׳ ׳¢׳¨׳ ׳©׳׳—׳¨׳™ ׳”-guard ׳”׳•׳ ׳‘׳•׳•׳“׳׳•׳× string
  const myUsername = me.username;

  const [username, setUsername] = useState(myUsername);
  const [busy, setBusy] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    undefined
  );
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl || "");

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

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
      if (avatarFile) {
        nextAvatarUrl = await api.uploadImage(avatarFile);
      }
      db.updateMe({ username: nextUsername, avatarDataUrl: nextAvatarUrl });
      setAvatarUrl(nextAvatarUrl);
      setAvatarFile(undefined);
      setAvatarPreview(undefined);
      alert("׳¢׳•׳“׳›׳ (Mock)");
    } finally {
      setBusy(false);
    }
  }

  const displayAvatar = avatarPreview || avatarUrl;

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>׳”׳₪׳¨׳•׳₪׳™׳ ׳©׳׳™</h2>

        <div className="row" style={{ gap: 14 }}>
          <div className="avatarLg">
            {displayAvatar ? (
              <img src={displayAvatar} alt="" />
            ) : (
              <span>{myUsername[0]}</span>
            )}
          </div>

          <div className="col" style={{ flex: 1 }}>
            <div className="muted">׳©׳ ׳׳©׳×׳׳©</div>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <div className="muted">׳×׳׳•׳ ׳”</div>
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) => void onPick(e.target.files?.[0])}
            />

            <div className="row" style={{ justifyContent: "space-between" }}>
              <Link className="btn" to="/feed">
                ׳—׳–׳¨׳” ׳׳₪׳™׳“
              </Link>
              <button
                className="btn btnPrimary"
                disabled={busy}
                onClick={save}
              >
                ׳©׳׳™׳¨׳”
              </button>
            </div>

            <div className="muted" style={{ fontSize: 12 }}>
              * ׳׳₪׳™ ׳”׳“׳¨׳™׳©׳”: ׳›׳׳ ׳¢׳•׳¨׳›׳™׳ ׳¨׳§ ׳×׳׳•׳ ׳” ׳•׳©׳ ׳׳©׳×׳׳© (Mock)
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>׳”׳₪׳•׳¡׳˜׳™׳ ׳©׳׳™</h3>
        <p className="muted">׳‘׳©׳׳‘ ׳”׳–׳” ׳¨׳•׳׳™׳ ׳׳× ׳–׳” ׳“׳¨׳ ׳₪׳™׳׳˜׳¨ ג€׳©׳׳™ג€ ׳‘׳₪׳™׳“.</p>
        <Link className="btn" to="/feed">
          ׳¢׳‘׳•׳¨׳™ ׳׳₪׳™׳“
        </Link>
      </div>
    </div>
  );
}
