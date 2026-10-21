import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
export function drizzleMigrations() {
  return readdirSync(new URL("../../drizzle/", import.meta.url))
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => ({
      tag: file.replace(/\.sql$/, ""),
      sql: readFileSync(new URL(`../../drizzle/${file}`, import.meta.url), "utf8"),
    }));
}
export function sqliteD1({ migrate = true } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  if (migrate) for (const { sql } of drizzleMigrations()) sqlite.exec(sql);
  // Like D1, statements compile when they execute, not when they are bound, so
  // a batch may create a table and then index it.
  const prepare = (sql) => ({
    bind(...args) {
      const stmt = () => sqlite.prepare(sql);
      return {
        async first() {
          return stmt().get(...args) ?? null;
        },
        async all() {
          return { results: stmt().all(...args) };
        },
        async run() {
          return { meta: { changes: Number(stmt().run(...args).changes) } };
        },
        exec: () => ({ meta: { changes: Number(stmt().run(...args).changes) } }),
      };
    },
  });
  return {
    prepare,
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const r = statements.map((x) => x.exec());
        sqlite.exec("COMMIT");
        return r;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
    close: () => sqlite.close(),
    sqlite,
  };
}
