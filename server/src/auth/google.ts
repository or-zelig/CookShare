import { OAuth2Client } from "google-auth-library";
import { ENV } from "../config/env";

const client = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);

export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: ENV.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid Google token payload");
  return payload;
}
