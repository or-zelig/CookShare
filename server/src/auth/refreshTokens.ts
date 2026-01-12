import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ENV } from "../config/env";
import jwt, { type JwtPayload, type SignOptions, type Secret } from "jsonwebtoken";


export type RefreshJwtPayload = {
  sub: string; // userId
  jti: string; // unique id per refresh token
};

export function signRefreshToken(userId: string) {
    const jti = crypto.randomUUID();

    const secret: Secret = ENV.REFRESH_TOKEN_SECRET;
    const expiresIn = ENV.REFRESH_TOKEN_TTL as SignOptions["expiresIn"];

    const token = jwt.sign(
    { sub: userId, jti } satisfies RefreshJwtPayload,
    secret,
    { expiresIn }
    );


    const expiresAt = new Date(Date.now() + ttlToMs(ENV.REFRESH_TOKEN_TTL));
    return { token, jti, expiresAt };
}

export function verifyRefreshToken(token: string): RefreshJwtPayload {
  const decoded = jwt.verify(token, ENV.REFRESH_TOKEN_SECRET) as JwtPayload;

  const sub = decoded.sub;
  const jti = decoded.jti;

  if (typeof sub !== "string" || typeof jti !== "string") {
    throw new Error("Invalid refresh token payload");
  }

  return { sub, jti };
}

export async function hashToken(token: string) {
  return bcrypt.hash(token, 10);
}

export async function verifyTokenHash(token: string, tokenHash: string) {
  return bcrypt.compare(token, tokenHash);
}

// Supports: "30s" "15m" "1h" "7d"
function ttlToMs(ttl: string): number {
  const m = ttl.trim().match(/^(\d+)(s|m|h|d)$/);
  if (!m) throw new Error(`Bad TTL format: ${ttl}`);
  const n = Number(m[1]);
  const unit = m[2];

  const mult =
    unit === "s" ? 1000 :
    unit === "m" ? 60_000 :
    unit === "h" ? 3_600_000 :
    86_400_000;

  return n * mult;
}
