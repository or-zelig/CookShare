import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ENV } from "./config/env";
import { authRouter } from "./routes/auth";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import { setupSwagger } from "./swagger/setupSwagger";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: ENV.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.use(authRouter);
  setupSwagger(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
