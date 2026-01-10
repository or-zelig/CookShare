import jwt, { type SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { ENV } from "../config/env";

export type AccessPayload = { sub: string; username: string };
export type RefreshPayload = { sub: string; jti: string };

export function signAccessToken(userId: string, username: string) {
  const payload: AccessPayload = { sub: userId, username };
  const opts: SignOptions = { expiresIn: ENV.ACCESS_TOKEN_TTL };
  return jwt.sign(payload, ENV.ACCESS_TOKEN_SECRET, opts);
}

export function signRefreshToken(userId: string) {
  const payload: RefreshPayload = { sub: userId, jti: crypto.randomUUID() };
  const opts: SignOptions = { expiresIn: ENV.REFRESH_TOKEN_TTL };
  return jwt.sign(payload, ENV.REFRESH_TOKEN_SECRET, opts);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, ENV.ACCESS_TOKEN_SECRET) as AccessPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, ENV.REFRESH_TOKEN_SECRET) as RefreshPayload;
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
