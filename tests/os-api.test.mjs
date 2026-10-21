import test from "node:test";
import assert from "node:assert/strict";
import { sqliteD1 } from "./helpers/sqlite-d1.mjs";
import { OSRepository } from "../src/os/repository.mjs";
import { evaluateGrowth, ORG } from "../src/os/kernel.mjs";
import { learnCustomer } from "../src/os/learning.mjs";
import { handleOS } from "../src/os/http.mjs";
const at = "2026-10-19T00:00:00.000Z",
  serviceKey = "test-service-key-is-at-least-thirty-two-characters";
function setup(t) {
  const db = sqliteD1();
  t.after(() => db.close());
  const evaluate = async (s, c) => {
    s.learning.model = learnCustomer(s, c.aggregate, c.at);
    return {
      ...evaluateGrowth(s, { at: c.at, runId: c.operation_id }),
      learning: s.learning.model,
    };
  };
  return { db, repo: new OSRepository(db, { evaluate, clock: () => at }) };
}
const feedback = {
  source: "customer",
  external_id: "api-feedback",
  category: "lead_quality",
  polarity: "negative",
  severity: "high",
  text: "The recent leads are outside our market.",
};
const exec = (repo, key, kind, payload = {}, organization_id = ORG) =>
  repo.execute({
    actor_id: "owner",
    organization_id,
    key,
    command: { kind, payload },
  });
test("D1 transaction persists feedback, decision, audit and idempotent response together", async (t) => {
  const { repo, db } = setup(t);
  const a = await exec(repo, "test-feedback-1", "feedback", feedback),
    b = await exec(repo, "test-feedback-1", "feedback", feedback);
  assert.equal(b.replayed, true);
  assert.equal(b.revision, a.revision);
  assert.equal((await repo.load()).state.feedback.length, 1);
  assert.equal((await repo.audit()).length, 2);
  assert.equal(
    db.sqlite.prepare("SELECT count(*) n FROM os_operations").get().n,
    1,
  );
  await assert.rejects(
    () => exec(repo, "test-feedback-1", "evaluate"),
    /different payload/,
  );
});
test("racing requests do not lose feedback or duplicate same-key records", async (t) => {
  const { repo } = setup(t);
  const results = await Promise.all([
    exec(repo, "race-event-01", "feedback", {
      ...feedback,
      external_id: "race-a",
    }),
    exec(repo, "race-event-02", "feedback", {
      ...feedback,
      external_id: "race-b",
    }),
    exec(repo, "race-event-01", "feedback", {
      ...feedback,
      external_id: "race-a",
    }),
  ]);
  assert.equal((await repo.load()).state.feedback.length, 2);
  assert.ok(results.some((x) => x.replayed));
});
test("invalid batch rolls back every record and decision", async (t) => {
  const { repo } = setup(t);
  await assert.rejects(() =>
    exec(repo, "invalid-batch", "feedback_batch", {
      items: [feedback, { ...feedback, external_id: "bad", text: "" }],
    }),
  );
  const state = await repo.load();
  assert.equal(state.state.feedback.length, 0);
  assert.equal(state.revision, 0);
});
test("tenant reads, writes, audit and cohort inputs remain isolated", async (t) => {
  const { repo } = setup(t);
  await exec(repo, "tenant-a-01", "feedback", feedback, "fixture_a");
  await exec(repo, "tenant-b-01", "evaluate", {}, "fixture_b");
  assert.equal((await repo.load("fixture_b")).state.feedback.length, 0);
  assert.equal((await repo.audit("fixture_b")).length, 1);
  assert.ok(
    !JSON.stringify(await repo.load("fixture_b")).includes(feedback.text),
  );
});
test("aggregate receives eligible opt-in contributions and removes withdrawn consent", async (t) => {
  const { repo } = setup(t);
  for (let i = 0; i < 6; i++) {
    await exec(repo, `outcomes-${i}`, "learning_sample", {}, `fixture_${i}`);
    await exec(
      repo,
      `consent-${i}`,
      "learning_consent",
      { opt_in: true },
      `fixture_${i}`,
    );
  }
  assert.equal((await repo.cohort("fixture_0")).participants, 5);
  await exec(
    repo,
    "withdraw-consent",
    "learning_consent",
    { opt_in: false },
    "fixture_5",
  );
  assert.equal((await repo.cohort("fixture_0")).available, false);
});
test("HTTP rejects anonymous, cross-origin and browser-measured outcome imports", async (t) => {
  const { repo } = setup(t),
    deps = { repository: repo, serviceKey };
  let res = await handleOS(new Request("https://test.local/api/os"), deps);
  assert.equal(res.status, 401);
  res = await handleOS(
    new Request("https://test.local/api/os", {
      method: "POST",
      headers: {
        "oai-authenticated-user-id": "user-a",
        origin: "https://evil.test",
        "content-type": "application/json",
      },
      body: "{}",
    }),
    deps,
  );
  assert.equal(res.status, 403);
  res = await handleOS(
    new Request("https://test.local/api/os", {
      method: "POST",
      headers: {
        "oai-authenticated-user-id": "user-a",
        origin: "https://test.local",
        "content-type": "application/json",
        "idempotency-key": "outcome-123",
      },
      body: JSON.stringify({ kind: "outcomes", payload: { items: [] } }),
    }),
    deps,
  );
  assert.equal(res.status, 403);
});
test("signed-in identities map to distinct workspaces; browser cannot select another tenant", async (t) => {
  const { repo } = setup(t),
    deps = { repository: repo, serviceKey };
  const a = await (
    await handleOS(
      new Request("https://test.local/api/os", {
        headers: {
          "oai-authenticated-user-id": "alice",
          "x-hy-workspace": ORG,
        },
      }),
      deps,
    )
  ).json();
  const b = await (
    await handleOS(
      new Request("https://test.local/api/os", {
        headers: { "oai-authenticated-user-id": "bob" },
      }),
      deps,
    )
  ).json();
  assert.notEqual(a.state.organization_id, b.state.organization_id);
  assert.notEqual(a.state.organization_id, ORG);
});
test("authenticated service writes use strict schema and stable operation key", async (t) => {
  const { repo } = setup(t),
    deps = { repository: repo, serviceKey };
  const request = (body) =>
    new Request("https://test.local/api/os", {
      method: "POST",
      headers: {
        "x-hy-service-key": serviceKey,
        "content-type": "application/json",
        "idempotency-key": "service-evaluate",
      },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await handleOS(
        request({
          kind: "evaluate",
          payload: {},
          organization_id: "someone-else",
        }),
        deps,
      )
    ).status,
    400,
  );
  const response = await handleOS(
    request({ kind: "evaluate", payload: {} }),
    deps,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).state.latest.type, "hold_for_evidence");
});
test("stale browser workspace expectations cannot write to a different signed-in account", async (t) => {
  const { repo } = setup(t),
    deps = { repository: repo };
  const old = await (
    await handleOS(
      new Request("https://test.local/api/os", {
        headers: { "oai-authenticated-user-id": "alice" },
      }),
      deps,
    )
  ).json();
  const res = await handleOS(
    new Request("https://test.local/api/os", {
      method: "POST",
      headers: {
        "oai-authenticated-user-id": "bob",
        origin: "https://test.local",
        "x-hy-expected-workspace": old.state.organization_id,
        "idempotency-key": "stale-account-key",
        "content-type": "application/json",
      },
      body: JSON.stringify({ kind: "feedback", payload: feedback }),
    }),
    deps,
  );
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "WORKSPACE_CHANGED");
  const b = await (
    await handleOS(
      new Request("https://test.local/api/os", {
        headers: { "oai-authenticated-user-id": "bob" },
      }),
      deps,
    )
  ).json();
  assert.equal(b.revision, 0);
  assert.equal(b.state.feedback.length, 0);
  const missing = await handleOS(
    new Request("https://test.local/api/os", {
      headers: { "oai-authenticated-user-email": "fixture@example.test" },
    }),
    deps,
  );
  assert.equal(missing.status, 401);
});
test("time-dependent decisions refresh without new clicks and audit is read-only", async (t) => {
  const { repo } = setup(t),
    deps = { repository: repo, serviceKey };
  await exec(repo, "time-initial-evaluation", "evaluate");
  const headers = { "x-hy-service-key": serviceKey };
  const read = async () =>
    (
      await handleOS(
        new Request("https://test.local/api/os", { headers }),
        deps,
      )
    ).json();
  assert.equal((await read()).learning_refresh_required, false);
  repo.clock = () => "2026-10-19T01:01:00.000Z";
  assert.equal((await read()).learning_refresh_required, true);
  const revision = (await repo.load()).revision;
  const response = await handleOS(
    new Request("https://test.local/api/os/audit", {
      method: "POST",
      headers: {
        ...headers,
        "content-type": "application/json",
        "idempotency-key": "bad-audit-write",
      },
      body: JSON.stringify({ kind: "evaluate", payload: {} }),
    }),
    deps,
  );
  assert.equal(response.status, 405);
  assert.equal((await repo.load()).revision, revision);
});

test("HTTP rejects unknown routes and oversized UTF-8 bodies before evaluating", async (t) => {
  const { repo } = setup(t),
    deps = { repository: repo, serviceKey };
  const headers = {
    "x-hy-service-key": serviceKey,
    "Content-Type": "application/json",
    "Idempotency-Key": "payload-limit-key",
  };
  assert.equal(
    (
      await handleOS(
        new Request("https://test.local/api/os/unknown", { headers }),
        deps,
      )
    ).status,
    404,
  );
  const res = await handleOS(
    new Request("https://test.local/api/os", {
      method: "POST",
      headers,
      body: JSON.stringify({
        kind: "feedback",
        payload: { text: "😀".repeat(17000) },
      }),
    }),
    deps,
  );
  assert.equal(res.status, 413);
  assert.equal((await repo.load()).revision, 0);
});
