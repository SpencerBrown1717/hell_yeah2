import { OSRepository } from "./repository.mjs";
import { runGrowthLearning } from "./workflow.mjs";
import { runMockCampaignTrial } from "./mock-campaign-trial.mjs";
import { sqliteD1 } from "../../tests/helpers/sqlite-d1.mjs";
const db = sqliteD1();
try {
  const repository = new OSRepository(db, { evaluate: runGrowthLearning });
  const result = await runMockCampaignTrial({
    repository,
    actor_id: "fixture_operator",
    organization_id: "fixture_mock_demo",
    key: "mock-google-demo-001",
  });
  console.log(JSON.stringify(result.state.last_mock_trial, null, 2));
  if (!result.state.last_mock_trial.passed) process.exitCode = 1;
} finally {
  db.close();
}
