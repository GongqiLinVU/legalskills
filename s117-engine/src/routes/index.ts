import { Router } from "express";
import {
  handleEvaluateS117,
} from "../controllers/s117-controller";
import {
  handleAgentEvaluate,
  handleSkillEvaluate,
  handleAgentHealthCheck,
} from "../controllers/agent-controller";
import {
  handleEvaluateDirectInfringement,
} from "../controllers/direct-infringement-controller";

const router = Router();

router.get("/api/health", handleAgentHealthCheck);

router.post("/api/s117/evaluate", handleEvaluateS117);
router.post("/api/direct-infringement/evaluate", handleEvaluateDirectInfringement);

router.post("/api/agent/evaluate", handleAgentEvaluate);
router.post("/api/skills/:skillName/evaluate", handleSkillEvaluate);

export default router;
