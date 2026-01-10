import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const redirectTo = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st: any = loc.state;
    return st?.from ?? "/feed";
  }, [loc.state]);

  const [username, setUsername] = useState("Noa");
  const [password, setPassword] = useState("1234");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
      nav(redirectTo, { replace: true });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>התחברות</h2>
      <p className="muted">UI + Mock. נסי: Noa / 1234</p>

      <form className="col" onSubmit={onSubmit}>
        <input
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="שם משתמש"
        />
        <input
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          type="password"
        />

        {err && <div className="error">{err}</div>}

        <button className="btn btnPrimary" disabled={busy}>
          {busy ? "מתחברת…" : "התחברי"}
        </button>

        <div className="row" style={{ justifyContent: "space-between" }}>
          <Link to="/register" className="muted">
            אין לך משתמש? הרשמה
          </Link>

          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => alert("Mock: Google OAuth")}
            >
              Google
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => alert("Mock: Facebook OAuth")}
            >
              Facebook
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
