import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/tokens";

export type AuthedRequest = Request & { userId?: string; username?: string };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.header("Authorization") || "";
  const [scheme, token] = auth.split(" ");

  if (!token || !scheme) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  // support both: "Bearer <token>" and "JWT <token>"
  if (scheme !== "Bearer" && scheme !== "JWT") {
    return res.status(401).json({ message: "Invalid auth scheme" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.username = payload.username;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid/expired token" });
  }
}
