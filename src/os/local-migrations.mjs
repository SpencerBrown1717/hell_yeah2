// Local-development schema bootstrap for the OS D1 database.
//
// Hosted Sites apply `drizzle/*.sql` through the platform when a revision is
// published. A clean clone's local Miniflare D1 starts empty and nothing else
// applies the migrations, so every `/api/os` request failed with
// SERVICE_FAILURE until this ran. The development Worker calls
// `applyLocalMigrations` before the first OS request; production bundles never
// import this module.
//
// Each migration is applied once, in file order, inside one D1 batch together
// with its bookkeeping row, so a failed migration leaves no partial state.
export const LOCAL_MIGRATIONS_TABLE = "os_local_migrations";
const BREAKPOINT = /-->\s*statement-breakpoint/g;

export function splitStatements(sql) {
  return sql
    .split(BREAKPOINT)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export function migrationTag(path) {
  return path.split("/").pop().replace(/\.sql$/, "");
}

export async function applyLocalMigrations(db, migrations, { clock = () => new Date().toISOString() } = {}) {
  await db
    .prepare(`CREATE TABLE IF NOT EXISTS ${LOCAL_MIGRATIONS_TABLE} (tag TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL)`)
    .bind()
    .run();
  const { results } = await db.prepare(`SELECT tag FROM ${LOCAL_MIGRATIONS_TABLE} ORDER BY tag`).bind().all();
  const done = new Set(results.map((row) => row.tag));
  const applied = [];
  for (const { tag, sql } of [...migrations].sort((a, b) => a.tag.localeCompare(b.tag))) {
    if (done.has(tag)) continue;
    const statements = splitStatements(sql).map((statement) => db.prepare(statement).bind());
    if (statements.length === 0) throw new Error(`Local migration ${tag} contains no SQL statements.`);
    statements.push(db.prepare(`INSERT INTO ${LOCAL_MIGRATIONS_TABLE} (tag, applied_at) VALUES (?, ?)`).bind(tag, clock()));
    await db.batch(statements);
    applied.push(tag);
    done.add(tag);
  }
  return { applied, skipped: results.map((row) => row.tag) };
}
