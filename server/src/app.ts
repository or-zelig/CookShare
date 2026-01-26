import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ENV } from "./config/env";
import { authRouter } from "./routes/auth";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import { setupSwagger } from "./swagger/setupSwagger";
import postsRouter from "./routes/posts";
import { usersRouter } from "./routes/users";
import { aiRouter } from "./routes/ai";
import path from "path";

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

  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

   app.use(postsRouter);
   app.use(usersRouter);
   app.use(aiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
