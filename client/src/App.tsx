import { Link, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import ProfileMe from "./pages/ProfileMe";
import ProfileUser from "./pages/ProfileUser";
import Comments from "./pages/Comments";
import AiSearch from "./pages/AiSearch";
import OAuthCallback from "./pages/OAuthCallback";

import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";

export default function App() {
  const { user, loading, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark" aria-hidden="true">
            🍳
          </span>
          <span className="brandText">CookShare</span>
          <span className="badge">beta</span>
        </div>

        {!user ? (
          <nav className="nav">
            <Link className="navLink" to="/login">
              התחברות
            </Link>
            <Link className="navLink navLinkPrimary" to="/register">
              הרשמה
            </Link>
          </nav>
        ) : (
          <>
            <nav className="nav">
              <Link className="navLink" to="/feed">
                פיד
              </Link>
              <Link className="navLink" to="/ai">
                חיפוש AI
              </Link>
              <Link className="navLink" to="/profile/me">
                הפרופיל שלי
              </Link>
            </nav>

            <div className="nav right">
              <div className="userChip" title={user.username}>
                <span className="userDot" aria-hidden="true" />
                <span className="userName">{user.username}</span>
              </div>

              <button className="btn" onClick={() => void logout()}>
                התנתקות
              </button>
            </div>
          </>
        )}
      </header>

      <main className="container">
        <Routes>
          <Route
            path="/"
            element={
              loading ? (
                <div className="card">טוען…</div>
              ) : user ? (
                <Navigate to="/feed" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />

          {/* Protected */}
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/post/:id/comments"
            element={
              <ProtectedRoute>
                <Comments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/me"
            element={
              <ProtectedRoute>
                <ProfileMe />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <ProtectedRoute>
                <ProfileUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai"
            element={
              <ProtectedRoute>
                <AiSearch />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<div className="card">Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}
