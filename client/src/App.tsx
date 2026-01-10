import { Link, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
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
        <div className="brand">CookShare</div>

        {!user ? (
          <nav className="nav">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </nav>
        ) : (
          <>
            <nav className="nav">
              <Link to="/feed">Feed</Link>
              <Link to="/ai">AI Search</Link>
              <Link to="/profile/me">Me</Link>
            </nav>
            <div className="nav">
              <button className="btn" onClick={() => void logout()}>
                Logout
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
                <div className="card">Loading…</div>
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
