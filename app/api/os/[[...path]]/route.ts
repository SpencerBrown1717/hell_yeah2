import { env } from "cloudflare:workers";
import { OSRepository } from "../../../../src/os/repository.mjs";
import { handleOS } from "../../../../src/os/http.mjs";
import { runGrowthLearning } from "../../../../src/os/workflow.mjs";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  if (!env.DB)
    return Response.json(
      {
        error: "DATABASE_UNAVAILABLE",
        message: "The OS database is not connected.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const repository = new OSRepository(env.DB, { evaluate: runGrowthLearning });
  return handleOS(request, { repository, serviceKey: env.HY_OS_SERVICE_KEY, privateWorkerEnabled: env.HY_OS_PRIVATE_WORKER_ENABLED === "true" });
}
export const GET = handle;
export const POST = handle;
