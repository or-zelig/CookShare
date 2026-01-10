import { createApp } from "./app";
import { ENV } from "./config/env";
import { connectDb } from "./config/db";

async function main() {
  await connectDb();

  const app = createApp();
  app.listen(ENV.PORT, () => {
    console.log(`[server] listening on http://localhost:${ENV.PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
