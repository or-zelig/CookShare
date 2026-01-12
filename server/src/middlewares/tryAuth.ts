import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/tokens";
import { AuthedRequest } from "./requireAuth";

export function tryAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const auth = (req.header("Authorization") || "").trim();
  const parts = auth.split(/\s+/);
  if (parts.length < 2) return next();

  const scheme = parts[0];
  let token = parts.slice(1).join(" ");
  if (scheme !== "Bearer" && scheme !== "JWT") return next();
  if (token.startsWith("Bearer ")) token = token.slice("Bearer ".length).trim();

  try {
    const payload: any = verifyAccessToken(token);
    const userId = payload.sub ?? payload.userId ?? payload.id;
    if (userId) req.userId = String(userId);
    if (payload.username) req.username = String(payload.username);
  } catch {
    // ignore
  }

  return next();
}
