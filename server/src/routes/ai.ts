import { Router } from "express";
import { postAiSuggestionsController } from "../ai/controller";

const aiRouter = Router();

aiRouter.post("/ai/suggestions", postAiSuggestionsController);

export default aiRouter;
