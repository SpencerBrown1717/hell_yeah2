// Development-only: bring the local Miniflare D1 database up to the committed
// `drizzle/` schema before the Worker serves its first OS request. The hosted
// Site applies the same files through the platform; production bundles never
// import this module (see the `import.meta.env.DEV` branch in sites-worker.ts).
import { applyLocalMigrations, migrationTag } from "../src/os/local-migrations.mjs";

const files = import.meta.glob("../drizzle/*.sql", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const migrations = Object.entries(files).map(([path, sql]) => ({ tag: migrationTag(path), sql }));

let pending: Promise<void> | null = null;

export function ensureLocalSchema(db: D1Database): Promise<void> {
  pending ??= applyLocalMigrations(db, migrations)
    .then(({ applied }) => {
      if (applied.length > 0) console.info(`Applied ${applied.length} local D1 migration(s): ${applied.join(", ")}`);
    })
    .catch((error: unknown) => {
      pending = null;
      console.error("Local D1 migration failed. Stop the dev server and delete `.wrangler/state` to reset the local database.", error);
      throw error;
    });
  return pending;
}
