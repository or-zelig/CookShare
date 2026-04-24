import http from "http";
import https from "https";
import fs from "fs";

import { createApp } from "./app";
import { ENV } from "./config/env";
import { connectDb } from "./config/db";

async function main() {
  await connectDb();

  const app = createApp();

  if (ENV.NODE_ENV !== "production") {
    http.createServer(app).listen(ENV.PORT, "0.0.0.0", () => {
      console.log(`[server] development listening on http://0.0.0.0:${ENV.PORT}`);
    });

    return;
  }

  const httpsPort = Number(process.env.HTTPS_PORT || 4001);

  const sslKeyPath =
    process.env.SSL_KEY_PATH || "/home/node93/certs/cookshare/client-key.pem";

  const sslCertPath =
    process.env.SSL_CERT_PATH || "/home/node93/certs/cookshare/client-cert.pem";

  const options = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath),
  };

  https.createServer(options, app).listen(httpsPort, "0.0.0.0", () => {
    console.log(`[server] production listening on https://0.0.0.0:${httpsPort}`);
  });
}

main().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});