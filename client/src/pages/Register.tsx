import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!username.trim()) return setErr("שם משתמש חובה");
    if (!email.trim()) return setErr("אימייל חובה");
    if (password.length < 4) return setErr("סיסמה קצרה מדי (מינימום 4)");
    if (password !== confirm) return setErr("הסיסמאות לא תואמות");

    setBusy(true);
    try {
      await register(username.trim(), email.trim(), password);
      nav("/feed", { replace: true });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authLayout">
      <div className="card authCard">
        <h2 style={{ marginTop: 0 }}>הרשמה</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Mock בלבד — יוצר משתמש מקומי בדפדפן.
        </p>

        <form className="col" onSubmit={onSubmit}>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="שם משתמש"
          />
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="אימייל"
          />
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה"
            type="password"
          />
          <input
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="אישור סיסמה"
            type="password"
          />

          {err && <div className="error">{err}</div>}

          <button className="btn btnPrimary" disabled={busy}>
            {busy ? "נרשמת…" : "צרי חשבון"}
          </button>

          <Link to="/login" className="muted">
            כבר יש לך משתמש? התחברות
          </Link>
        </form>
      </div>
    </div>
  );
}
