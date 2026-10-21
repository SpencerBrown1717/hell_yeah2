import test from "node:test";
import assert from "node:assert/strict";
import { sqliteD1, drizzleMigrations } from "./helpers/sqlite-d1.mjs";
import {
  applyLocalMigrations,
  splitStatements,
  migrationTag,
  LOCAL_MIGRATIONS_TABLE,
} from "../src/os/local-migrations.mjs";
import { OSRepository } from "../src/os/repository.mjs";
import { handleOS } from "../src/os/http.mjs";
import { evaluateGrowth } from "../src/os/kernel.mjs";
import { learnCustomer } from "../src/os/learning.mjs";

const at = "2026-10-21T00:00:00.000Z";
const tables = (db) =>
  db.sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
const bookkeeping = (db) =>
  db.sqlite.prepare(`SELECT tag FROM ${LOCAL_MIGRATIONS_TABLE} ORDER BY tag`).all().map((row) => row.tag);

test("splitStatements separates drizzle breakpoints and drops blank fragments", () => {
  const statements = splitStatements(
    "CREATE TABLE `a` (\n`id` text PRIMARY KEY NOT NULL\n);\n--> statement-breakpoint\n\nCREATE INDEX `a_id` ON `a` (`id`);-->statement-breakpoint\n",
  );
  assert.deepEqual(statements, [
    "CREATE TABLE `a` (\n`id` text PRIMARY KEY NOT NULL\n);",
    "CREATE INDEX `a_id` ON `a` (`id`);",
  ]);
  assert.equal(migrationTag("../drizzle/0000_slimy_silver_surfer.sql"), "0000_slimy_silver_surfer");
});

test("an empty local D1 gains every committed migration once, in order, and then serves the OS API", async (t) => {
  const db = sqliteD1({ migrate: false });
  t.after(() => db.close());
  assert.deepEqual(tables(db), [], "the fixture starts with no schema");
  const migrations = drizzleMigrations();
  assert.ok(migrations.length >= 4, "the committed migration set is present");

  const first = await applyLocalMigrations(db, migrations, { clock: () => at });
  assert.deepEqual(first.applied, migrations.map((m) => m.tag));
  assert.deepEqual(first.skipped, []);
  assert.deepEqual(bookkeeping(db), migrations.map((m) => m.tag));
  const migrated = sqliteD1();
  t.after(() => migrated.close());
  assert.deepEqual(
    tables(db).filter((name) => name !== LOCAL_MIGRATIONS_TABLE),
    tables(migrated),
    "the bootstrapped schema matches the test fixture's schema",
  );

  const second = await applyLocalMigrations(db, migrations, { clock: () => at });
  assert.deepEqual(second.applied, [], "a second run applies nothing");
  assert.deepEqual(second.skipped, migrations.map((m) => m.tag));

  const evaluate = async (s, c) => {
    s.learning.model = learnCustomer(s, c.aggregate, c.at);
    return { ...evaluateGrowth(s, { at: c.at, runId: c.operation_id }), learning: s.learning.model };
  };
  const repository = new OSRepository(db, { evaluate, clock: () => at });
  const response = await handleOS(
    new Request("http://localhost:5173/api/os", { headers: { "oai-authenticated-user-id": "local-dev-user" } }),
    { repository },
  );
  assert.equal(response.status, 200, "the OS API answers once the schema exists");
  const body = await response.json();
  assert.equal(body.state.mode, "fixture");
});

test("a later migration is applied on top of an already bootstrapped database", async (t) => {
  const db = sqliteD1({ migrate: false });
  t.after(() => db.close());
  const migrations = drizzleMigrations();
  const earlier = migrations.slice(0, -1);
  await applyLocalMigrations(db, earlier, { clock: () => at });
  assert.deepEqual(bookkeeping(db), earlier.map((m) => m.tag));

  const result = await applyLocalMigrations(db, migrations, { clock: () => at });
  assert.deepEqual(result.applied, [migrations.at(-1).tag]);
  assert.deepEqual(result.skipped, earlier.map((m) => m.tag));
  assert.deepEqual(bookkeeping(db), migrations.map((m) => m.tag));
});

test("a failing migration leaves no partial schema or bookkeeping row", async (t) => {
  const db = sqliteD1({ migrate: false });
  t.after(() => db.close());
  const broken = [
    {
      tag: "0000_ok",
      sql: "CREATE TABLE `ok` (`id` text PRIMARY KEY NOT NULL);",
    },
    {
      tag: "0001_broken",
      sql: "CREATE TABLE `half` (`id` text PRIMARY KEY NOT NULL);\n--> statement-breakpoint\nCREATE TABLE `half` (`id` text);",
    },
  ];
  await assert.rejects(() => applyLocalMigrations(db, broken, { clock: () => at }));
  assert.deepEqual(bookkeeping(db), ["0000_ok"], "only the successful migration is recorded");
  assert.deepEqual(tables(db), ["ok", LOCAL_MIGRATIONS_TABLE], "the failed batch rolled back its table");
});
