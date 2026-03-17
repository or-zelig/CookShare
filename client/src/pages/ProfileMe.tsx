import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { db } from "../mock/db";

export default function ProfileMe() {
  const { user, refresh } = useAuth();
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
      const url = await readFileAsDataUrl(file);
      await db.updateMe({ avatarDataUrl: url });
      await refresh();
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

  async function save() {
    await db.updateMe({ username: username.trim() || myUsername });
    await refresh();
  }
  const displayAvatar = avatarPreview || avatarUrl;

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
              * לפי הדרישה: כאן עורכים רק תמונה ושם משתמש
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>הפוסטים שלי</h3>
        <p className="muted">בשלב הזה רואים את זה דרך פילטר “שלי” בפיד.</p>
        <Link className="btn" to="/feed">
          עבורי לפיד
        </Link>
      </div>
    </div>
  );
}
