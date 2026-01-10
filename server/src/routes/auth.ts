import { Router } from "express";

export const authRouter = Router();

authRouter.post("/auth/register", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

authRouter.post("/auth/login", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

authRouter.post("/auth/refresh", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

authRouter.post("/auth/logout", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

authRouter.get("/auth/me", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});
