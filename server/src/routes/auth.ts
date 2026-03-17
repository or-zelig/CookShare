import { Router } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/User";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../auth/tokens";
import { ENV } from "../config/env";
import { requireAuth, AuthedRequest } from "../middlewares/requireAuth";
import type { Request, Response, NextFunction } from "express";
import { verifyGoogleIdToken } from "../auth/google";

// catches async errors and forwards to error middleware (prevents hanging requests)
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const authRouter = Router();

function toPublicUser(user: { id: string; username: string; email?: string; avatarUrl?: string | null }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? "",
    avatarUrl: user.avatarUrl ?? "",
  };
}

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

authRouter.post("/auth/register", asyncHandler(async (req, res) => {
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

  const { token: refreshToken, jti, expiresAt } = signRefreshToken(user.id);

  user.refreshTokens.push({
    jti,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  } as any);

  await user.save();
  setRefreshCookie(res, refreshToken);

const { token: accessToken, expiresAt: accessTokenExpiresAt } =
  signAccessToken(user.id, user.username);

return res.status(201).json({ user: toPublicUser(user), accessToken, accessTokenExpiresAt });
}));

authRouter.post("/auth/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ message: "username and password are required" });
  }

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const { token: refreshToken, jti, expiresAt } = signRefreshToken(user.id);

  user.refreshTokens.push({
    jti,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  } as any);

  await user.save();
  setRefreshCookie(res, refreshToken);

const { token: accessToken, expiresAt: accessTokenExpiresAt } =
  signAccessToken(user.id, user.username);

return res.json({ user: toPublicUser(user), accessToken, accessTokenExpiresAt });
}));

authRouter.post("/auth/refresh", asyncHandler(async (req, res) => {
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
const idx = user.refreshTokens.findIndex((t) => t.tokenHash === oldHash);

if (idx === -1) {
  // reuse detected -> wipe all
  user.refreshTokens.splice(0, user.refreshTokens.length);
  await user.save();
  clearRefreshCookie(res);
  return res.status(403).json({ message: "Refresh token reuse detected" });
}

// remove old token
user.refreshTokens.splice(idx, 1);

// rotate
const { token: newRefresh, jti, expiresAt } = signRefreshToken(user.id);
user.refreshTokens.push({ jti, tokenHash: hashToken(newRefresh), expiresAt } as any);

await user.save();
setRefreshCookie(res, newRefresh);

const { token: accessToken, expiresAt: accessTokenExpiresAt } = signAccessToken(user.id, user.username);
return res.json({
  user: toPublicUser(user),
  accessToken,
  accessTokenExpiresAt,
});

}));

authRouter.post("/auth/logout", asyncHandler(async (req, res) => {
const token = req.cookies?.rt as string | undefined;
clearRefreshCookie(res);

if (token) {
  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (user) {
      const h = hashToken(token);
      for (let i = user.refreshTokens.length - 1; i >= 0; i--) {
        if (user.refreshTokens[i].tokenHash === h) user.refreshTokens.splice(i, 1);
      }
      await user.save();
    }
  } catch {
    // ignore
  }
}

return res.json({ ok: true });

}));

authRouter.get("/auth/me", requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Invalid/expired token" });

    const user = await User.findById(req.userId).select("_id username email avatarUrl");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user: toPublicUser(user) });
  })
);

authRouter.post("/auth/google", async (req, res, next) => {
  try {
    const { credential } = req.body ?? {};
    if (!credential) return res.status(400).json({ message: "credential is required" });

    const p = await verifyGoogleIdToken(String(credential));

    const googleId = p.sub;
    const email = (p.email || "").toLowerCase();
    const username = p.name || email.split("@")[0] || "user";
    const avatarUrl = p.picture || "";
    const emailVerified = Boolean((p as any).email_verified);

    if (!googleId || !email) return res.status(401).json({ message: "Invalid Google token" });
    if (!emailVerified) return res.status(401).json({ message: "Google email not verified" });

    // 1) נסה לפי googleId
    let user = await User.findOne({ googleId });

    // 2) אם לא נמצא — נסה לפי email (link account)
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        // link
        user.googleId = googleId;
        if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
        // לא מחייב לשנות provider אם כבר local, אבל זה בסדר לשים google
        user.provider = "google";
        await user.save();
      }
    }

    // 3) אם עדיין אין — צור חדש
    if (!user) {
      user = await User.create({
        username,
        email,
        passwordHash: "GOOGLE_OAUTH", // או ריק. העיקר שהשדה קיים אצלכם
        avatarUrl,
        refreshTokens: [],
        googleId,
        provider: "google",
      });
    }

  const { token: refreshToken, jti, expiresAt } = signRefreshToken(user.id);

  user.refreshTokens.push({
    jti,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  } as any);

  await user.save();
  setRefreshCookie(res, refreshToken);

const { token: accessToken, expiresAt: accessTokenExpiresAt } =
  signAccessToken(user.id, user.username);

return res.json({ user: toPublicUser(user), accessToken, accessTokenExpiresAt });
  } catch (err) {
    next(err);
  }
});



