import { randomUUID } from "crypto";

export function createRequestId() {
  return `ai_${randomUUID()}`;
}
