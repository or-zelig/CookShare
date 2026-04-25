import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

declare global {
  interface Window {
    google?: any;
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")));
      return;
    }

    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google script"));
    document.body.appendChild(s);
  });
}

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const googleButtonRenderedRef = useRef(false);

  const redirectTo = useMemo(() => {
    const st: any = loc.state;
    return st?.from ?? "/feed";
  }, [loc.state]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const googleDivRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!googleClientId) return;

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleScript();
        if (cancelled) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (resp: { credential?: string }) => {
            if (!resp?.credential) {
              setErr("Google credential missing");
              return;
            }

            setErr(null);
            setBusy(true);
            try {
              await loginWithGoogle(resp.credential);
              nav(redirectTo, { replace: true });
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Google login failed");
            } finally {
              setBusy(false);
            }
          },
        });

        if (googleDivRef.current && !googleButtonRenderedRef.current) {
          googleDivRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleDivRef.current, {
            type: "standard",
            theme: "filled_black",
            size: "large",
            text: "continue_with",
            shape: "pill",
            logo_alignment: "left",
            width: 260,
          });
          googleButtonRenderedRef.current = true;
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to initialize Google login");
      }
    })();

    return () => {
      cancelled = true;
      googleButtonRenderedRef.current = false;
      if (googleDivRef.current) {
        googleDivRef.current.innerHTML = "";
      }
    };
  }, [googleClientId, loginWithGoogle, nav, redirectTo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!username.trim()) return setErr("Username is required");
    if (!password) return setErr("Password is required");

    setBusy(true);
    try {
      await login(username.trim(), password);
      nav(redirectTo, { replace: true });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const hasGoogleClientId = Boolean(googleClientId);

  return (
    <div className="authLayout">
      <div className="card authCard">
        <h2 style={{ marginTop: 0 }}>Login</h2>

        <form className="col" onSubmit={onSubmit}>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
          />
          <input
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
          />

          {err && <div className="error">{err}</div>}

          <button className="btn btnPrimary" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <Link to="/register" className="muted">
              Don&apos;t have an account? Register
            </Link>
          </div>

          {hasGoogleClientId ? (
            <div className="col" style={{ alignItems: "center", marginTop: 6 }}>
              <div className="muted" style={{ fontSize: 12 }}>
                Or continue with Google
              </div>
              <div className="googleButtonMount">
                <div ref={googleDivRef} />
              </div>
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 12 }}>
              To enable Google Login, add `VITE_GOOGLE_CLIENT_ID` to the client `.env` file.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
