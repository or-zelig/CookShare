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

    if (!username.trim()) return setErr("Username is required");
    if (!email.trim()) return setErr("Email is required");
    if (password.length < 6) return setErr("Password must be at least 6 characters");
    if (password !== confirm) return setErr("Passwords do not match");

    setBusy(true);
    try {
      await register(username.trim(), email.trim(), password);
      nav("/feed", { replace: true });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authLayout">
      <div className="card authCard">
        <h2 style={{ marginTop: 0 }}>Register</h2>

        <form className="col" onSubmit={onSubmit}>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
          />
          <input
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            type="password"
          />

          {err && <div className="error">{err}</div>}

          <button className="btn btnPrimary" disabled={busy}>
            {busy ? "Creating account..." : "Create account"}
          </button>

          <Link to="/login" className="muted">
            Already have an account? Login
          </Link>
        </form>
      </div>
    </div>
  );
}
