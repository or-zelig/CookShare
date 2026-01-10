import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../auth/tokens";

export type AuthedRequest = Request & { userId?: string; username?: string };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = (req.header("Authorization") || "").trim();
  const parts = auth.split(/\s+/);

  if (parts.length < 2) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  let scheme = parts[0];
  let token = parts.slice(1).join(" ");

  if (scheme !== "Bearer" && scheme !== "JWT") {
    return res.status(401).json({ message: "Invalid auth scheme" });
  }

  // Handle "Bearer Bearer <token>"
  if (token.startsWith("Bearer ")) {
    token = token.slice("Bearer ".length).trim();
  }
}
