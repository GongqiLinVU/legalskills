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

const app = express();
app.use(cors());
app.use(express.json());
app.use(router);

export default app;
