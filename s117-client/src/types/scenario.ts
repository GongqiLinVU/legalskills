import { LikelyResult } from "./index";

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  expected_result: LikelyResult;
  data: Record<string, unknown>;
}
