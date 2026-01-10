import { Router } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/User";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../auth/tokens";
import { ENV } from "../config/env";
import { requireAuth, AuthedRequest } from "../middlewares/requireAuth";

export const authRouter = Router();

function setRefreshCookie(res: any, refreshToken: string) {
  res.cookie("rt", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: ENV.NODE_ENV === "production",
    path: "/",
  });
}

function clearRefreshCookie(res: any) {
  res.clearCookie("rt", { path: "/" });
}

authRouter.post("/auth/register", async (req, res) => {
  const { username, email, password } = req.body ?? {};

  if (!username || !email || !password) {
    return res.status(400).json({ message: "username, email, password are required" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ message: "password must be at least 6 chars" });
  }

  const exists = await User.findOne({ $or: [{ username }, { email: String(email).toLowerCase() }] });
  if (exists) return res.status(409).json({ message: "User already exists" });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    email: String(email).toLowerCase(),
    passwordHash,
    refreshTokens: [],
  });

  const refreshToken = signRefreshToken(user.id);
  const refreshHash = hashToken(refreshToken);

  user.refreshTokens.push(refreshHash);
  await user.save();

  setRefreshCookie(res, refreshToken);

  const accessToken = signAccessToken(user.id, user.username);

  return res.status(201).json({
    user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || "" },
    accessToken,
  });
});

authRouter.post("/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ message: "username and password are required" });
  }

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const refreshToken = signRefreshToken(user.id);
  const refreshHash = hashToken(refreshToken);

  user.refreshTokens.push(refreshHash);
  await user.save();

  setRefreshCookie(res, refreshToken);

  const accessToken = signAccessToken(user.id, user.username);

  return res.json({
    user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || "" },
    accessToken,
  });
});

authRouter.post("/auth/refresh", async (req, res) => {
  const token = req.cookies?.rt as string | undefined;
  if (!token) return res.status(401).json({ message: "Missing refresh token" });

  let payload: { sub: string; jti: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearRefreshCookie(res);
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const oldHash = hashToken(token);
  const hasToken = user.refreshTokens.includes(oldHash);

  // reuse detection: token is valid but not in DB
  if (!hasToken) {
    user.refreshTokens = [];
    await user.save();
    clearRefreshCookie(res);
    return res.status(403).json({ message: "Refresh token reuse detected" });
  }

  // rotate: remove old, add new
  user.refreshTokens = user.refreshTokens.filter((t) => t !== oldHash);

  const newRefresh = signRefreshToken(user.id);
  user.refreshTokens.push(hashToken(newRefresh));
  await user.save();

  setRefreshCookie(res, newRefresh);

  const accessToken = signAccessToken(user.id, user.username);

  return res.json({
    user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || "" },
    accessToken,
  });
});

authRouter.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.rt as string | undefined;
  clearRefreshCookie(res);

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      const user = await User.findById(payload.sub);
      if (user) {
        const h = hashToken(token);
        user.refreshTokens = user.refreshTokens.filter((t) => t !== h);
        await user.save();
      }
    } catch {
      // ignore
    }
  }

  return res.json({ ok: true });
});

authRouter.get("/auth/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId).select("_id username email avatarUrl");
  if (!user) return res.status(404).json({ message: "User not found" });

  return res.json({
    user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || "" },
  });
});
