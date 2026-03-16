import request from "supertest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createApp } from "../app";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wwAAgEB/7XlX8UAAAAASUVORK5CYII=";

async function writeTempPng(): Promise<string> {
  const buf = Buffer.from(PNG_BASE64, "base64");
  const tmpPath = path.join(os.tmpdir(), `upload-test-${Date.now()}.png`);
  await fs.writeFile(tmpPath, buf);
  return tmpPath;
}

describe("Uploads API", () => {
  const app = createApp();

  it("POST /uploads stores file and serves it back", async () => {
    const tempFile = await writeTempPng();

    const res = await request(app).post("/uploads").attach("file", tempFile);
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^\/uploads\//);

    const fileRes = await request(app).get(res.body.url);
    expect(fileRes.status).toBe(200);

    await fs.unlink(tempFile);
    const filename = String(res.body.url).replace(/^\/uploads\//, "");
    const uploadedPath = path.resolve(
      process.cwd(),
      "public",
      "uploads",
      filename
    );
    try {
      await fs.unlink(uploadedPath);
    } catch {
      // ignore cleanup failures
    }
  });
});
