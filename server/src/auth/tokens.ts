import jwt, { type JwtPayload } from "jsonwebtoken";
import crypto from "node:crypto";
import ms, { type StringValue } from "ms";
import { ENV } from "../config/env";

// ---------- Access token ----------
export type AccessJwtPayload = JwtPayload & {
  sub: string; // userId
  username: string;
};

export function signAccessToken(userId: string, username: string) {
  const token = jwt.sign(
    { sub: userId, username } satisfies AccessJwtPayload,
    String(ENV.ACCESS_TOKEN_SECRET),
    { expiresIn: ENV.ACCESS_TOKEN_TTL as StringValue }
  );

  const expiresAt = new Date(Date.now() + ms(ENV.ACCESS_TOKEN_TTL as StringValue));
  return { token, expiresAt };
}

export function verifyAccessToken(token: string): AccessJwtPayload {
  return jwt.verify(token, String(ENV.ACCESS_TOKEN_SECRET)) as AccessJwtPayload;
}

// ---------- Refresh token ----------
export type RefreshJwtPayload = JwtPayload & {
  sub: string; // userId
  jti: string; // token id
};

export function signRefreshToken(userId: string) {
  const jti = crypto.randomUUID();

  const token = jwt.sign(
    { sub: userId, jti } satisfies RefreshJwtPayload,
    String(ENV.REFRESH_TOKEN_SECRET),
    { expiresIn: ENV.REFRESH_TOKEN_TTL as StringValue }
  );

  const expiresAt = new Date(Date.now() + ms(ENV.REFRESH_TOKEN_TTL as StringValue));
  return { token, jti, expiresAt };
}

export function verifyRefreshToken(token: string): RefreshJwtPayload {
  return jwt.verify(token, String(ENV.REFRESH_TOKEN_SECRET)) as RefreshJwtPayload;
}

// ---------- Helpers ----------
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
