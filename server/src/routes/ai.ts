import { Router } from "express";
import { parseHandler, searchHandler } from "../ai/controller";
import { aiRateLimit } from "../ai/rateLimit";
import { requireAuth } from "../middlewares/requireAuth";

export const aiRouter = Router();

aiRouter.post("/v1/ai/search/parse", requireAuth, aiRateLimit, parseHandler);
aiRouter.post("/v1/ai/search", requireAuth, aiRateLimit, searchHandler);
