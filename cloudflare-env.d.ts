declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    CONNECTORS?: import("./lib/connector-contract.mjs").ConnectorBinding;
    HY_OS_SERVICE_KEY?: string;
    HY_OS_PRIVATE_WORKER_ENABLED?: string;
    BUCKET?: R2Bucket;
  }
}
