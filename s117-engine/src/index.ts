import express from "express";
import cors from "cors";
import router from "./routes";
import { registerSkill } from "./agent/skill-registry";
import { issueClassifierSkill } from "./skills/issue-classifier-skill";
import { s117Skill } from "./skills/s117-skill";
import { directInfringementSkill } from "./skills/direct-infringement-skill";
import { claimConstructionSkill } from "./skills/claim-construction-skill";

registerSkill(issueClassifierSkill);
registerSkill(claimConstructionSkill);
registerSkill(s117Skill);
registerSkill(directInfringementSkill);

const PORT = process.env.PORT ?? 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(router);

app.listen(PORT, () => {
  console.log(`Legal Decision Agent v0.5.0 running on http://localhost:${PORT}`);
  console.log(`Health:              GET  http://localhost:${PORT}/api/health`);
  console.log(`Agent:               POST http://localhost:${PORT}/api/agent/evaluate`);
  console.log(`s117 (legacy):       POST http://localhost:${PORT}/api/s117/evaluate`);
  console.log(`Direct infringement: POST http://localhost:${PORT}/api/direct-infringement/evaluate`);
});
