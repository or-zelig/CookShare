import { Link, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import ProfileMe from "./pages/ProfileMe";
import ProfileUser from "./pages/ProfileUser";
import Comments from "./pages/Comments";
import AiSearch from "./pages/AiSearch";
import OAuthCallback from "./pages/OAuthCallback";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">CookShare</div>
        <nav className="nav">
          <Link to="/feed">Feed</Link>
          <Link to="/ai">AI</Link>
          <Link to="/profile/me">Me</Link>
        </nav>
        <div className="nav">
          <Link to="/login">Login</Link>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />

          <Route path="/feed" element={<Feed />} />
          <Route path="/post/:id/comments" element={<Comments />} />
          <Route path="/profile/me" element={<ProfileMe />} />
          <Route path="/profile/:userId" element={<ProfileUser />} />
          <Route path="/ai" element={<AiSearch />} />

          <Route path="*" element={<div className="card">Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}
