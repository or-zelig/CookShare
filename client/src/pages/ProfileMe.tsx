import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { db } from "../mock/db";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ProfileMe() {
  const { user } = useAuth();
  const me = user;

  // ✅ חייב להיות לפני hooks + פתרון null
  if (!me) return null;

  // ✅ פתרון #2: צילום ערך שאחרי ה-guard הוא בוודאות string
  const myUsername = me.username;

  const [username, setUsername] = useState(myUsername);
  const [busy, setBusy] = useState(false);

  async function onPick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await readFileAsDataUrl(file);
      db.updateMe({ avatarDataUrl: url });
    } finally {
      setBusy(false);
    }
  }

  function save() {
    db.updateMe({ username: username.trim() || myUsername });
    alert("עודכן (Mock)");
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>הפרופיל שלי</h2>

        <div className="row" style={{ gap: 14 }}>
          <div className="avatarLg">
            {me.avatarUrl ? (
              <img src={me.avatarUrl} alt="" />
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
              <button className="btn btnPrimary" onClick={save}>
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
        <p className="muted">בשלב הזה רואים את זה דרך פילטר “שלי” בפיד.</p>
        <Link className="btn" to="/feed">
          עבורי לפיד
        </Link>
      </div>
    </div>
  );
}
