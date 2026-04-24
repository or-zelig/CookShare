import { createApp } from "./app";
import { ENV } from "./config/env";
import { connectDb } from "./config/db";

async function main() {
  await connectDb();

  const app = createApp();
  const host = ENV.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0";

  app.listen(ENV.PORT, host, () => {
    console.log(`[server] listening on http://${host}:${ENV.PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
