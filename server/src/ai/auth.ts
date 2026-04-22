import { verifyAccessToken } from "../auth/tokens";
import { AiAppError } from "./errors";

export function parseAiAuthHeader(headerValue: string | undefined) {
  const auth = (headerValue || "").trim();
  const parts = auth.split(/\s+/);

  if (parts.length < 2) {
    throw new AiAppError("Authentication required", 401, "unauthorized");
  }

  const scheme = parts[0];
  let token = parts.slice(1).join(" ");

  if (scheme !== "Bearer" && scheme !== "JWT") {
    throw new AiAppError("Invalid auth scheme", 401, "unauthorized");
  }

  if (token.startsWith("Bearer ")) {
    token = token.slice("Bearer ".length).trim();
  }

  try {
    const payload: any = verifyAccessToken(token);
    const userId = payload.sub ?? payload.userId ?? payload.id;
    if (!userId) {
      throw new AiAppError("Invalid/expired token", 401, "unauthorized");
    }

    return {
      userId: String(userId),
      username: payload.username ? String(payload.username) : undefined,
    };
  } catch (error) {
    if (error instanceof AiAppError) throw error;
    throw new AiAppError("Invalid/expired token", 401, "unauthorized");
  }
}
