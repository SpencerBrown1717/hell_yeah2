# Durable ingestion and background operations

Revision: 2026-10-19. Applies to hell_yeah2's owner-private pilot. The queue is executable infrastructure, not a live Hellyeah reporting connection. Production source bindings still require the joint integration work in [integration-readiness.md](integration-readiness.md).

## Operator journey

Open **Learning Lab → Keep learning when you leave**. Queue a learning refresh or an isolated mock campaign. The accepted job is stored on the server, so navigating away does not lose it. **Process pending jobs** runs a bounded drain for the signed-in workspace. **Background learning refresh** enrolls that workspace for periodic reevaluation of its existing evidence. This setting is independent of consent to contribute to aggregate learning. Disabling periodic refresh does not discard already accepted work.

The dashboard shows waiting, processing, completed and failed work, total attempts and safe error codes. It displays received/applied source checkpoint revisions without exposing opaque cursor tokens. A failed source page holds later pages for that source account. Other source partitions and workspaces can continue. **Retry saved job** retries the same immutable payload after its cause is resolved; it cannot change measured facts or reset an advanced cursor.

Permanent schema, source conflict and capacity failures need investigation. The pilot deliberately has no “skip bad data” control. An irreparable accepted payload requires a reviewed source reconciliation/resynchronization procedure, which is a production integration gate. Do not mutate job payloads or advance applied cursors by hand.

## Modules

| Module | Responsibility |
| --- | --- |
| `src/os/job-contracts.mjs` | Strict job/page schemas, source scope, size limits, stable keys and safe public projection |
| `src/os/job-repository.mjs` | Atomic acceptance, received/applied cursors, ordered claims, leases, bounded retries and enrollment |
| `src/os/job-worker.mjs` | Stateless bounded runner; stable OS operation key per batch item |
| `src/os/jobs-http.mjs` | Authorized queue controls and narrow shared worker boundary |
| `src/os/http-boundary.mjs` | Shared identity, service authentication, origin, JSON limits and sanitized errors |
| `contracts/os-ports.ts` | Proposed internal source and worker integration interfaces |
| `drizzle/0002_famous_veda.sql` | Append-only schema migration for jobs, cursors and enrollment |

The OS reducer, model and money policy do not know whether a command arrived synchronously or through the queue. A real Mastra evaluation still runs for each accepted outcome revision. Feedback remains qualitative evidence; it is never converted into revenue or conversions.

## Delivery guarantees

1. A source page includes a stable idempotency key, expected cursor revision, previous opaque cursor, next cursor and 1–10 normalized reports from one workspace/source/account. A 48 KB job limit and 64 KB HTTP body limit bound decoding and persistence.
2. The immutable job and the received cursor advance in one D1 batch transaction. A racing page with an outdated precondition is rejected. A replay with the same request key and normalized payload returns the existing job. A conflicting payload is rejected.
3. Workers atomically claim the first eligible job in a partition. A source/account partition retains acceptance order; workspace feedback/evaluation jobs use their own ordered partition. A 120-second lease and fresh token identify the current attempt.
4. Each source report uses `job:<job-id>:<item-index>` as the OS operation key. Business state, audit and its compact operation receipt commit atomically through the existing repository. A restarted worker replays completed items instead of counting them again.
5. Only after all reports finish does one fenced transaction mark the job complete and advance the applied cursor. A crash after model commit but before acknowledgement leaves the cursor behind until recovery, not ahead of missing data.
6. An expired lease can be reclaimed. An old owner cannot mark a new attempt successful or failed. At-least-once execution is expected; stable business receipts provide one committed effect per operation. This is not an assertion of exactly-once network execution.
7. Transient failures back off for 1, 2, 4 and 8 minutes before the fifth attempt exhausts the automatic retry budget. Final abandoned leases also enter the failed queue. Validation/source conflicts fail immediately. No raw exception text, customer feedback, source payload or lease token is returned by the queue status API.
8. A workspace may have at most 200 outstanding jobs. Admission enforces this limit in SQL, including concurrent requests. Completed jobs and compact receipts are retained; archive/retention automation is a separate production task.

D1's [batch transaction contract](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch) supplies rollback of multi-statement acceptance and acknowledgement. The implementation uses parameterized SQL and the primary binding. If read replicas are introduced, preserve sequential consistency explicitly.

## Source adapter contract

The current normalized schema explicitly accepts fixture Hellyeah/Google account reports. It is not a public API claimed to exist in Hellyeah. A production adapter must establish real membership, source permissions, account identity, corrections, currencies and calibrated marginal evidence before a new schema version is allowed.

Trusted adapter requests use the existing server-only `HY_OS_SERVICE_KEY` plus `X-HY-Workspace`. Browser clients cannot select a tenant, submit measured source pages or read opaque source cursors. Never expose that secret in browser code or logs.

1. `GET /api/os/source-cursor?source=fixture_hellyeah_google&account=<fixture-account>` returns the accepted and applied cursor/revision pairs to the trusted adapter.
2. Fetch the next page from the source using the **received** cursor. The source reader and pagination logic are external port implementations; this release does not fabricate a Hellyeah endpoint.
3. `POST /api/os/jobs`, with a stable `Idempotency-Key`, accepts the page:

Use the exported schema when implementing the port:

```json
{
  "kind": "source_batch",
  "payload": {
    "source": "fixture_hellyeah_google",
    "managed_account_id": "fixture_managed_account",
    "expected_revision": 0,
    "from_cursor": null,
    "next_cursor": "source-owned-next-token",
    "reports": ["Replace with validated report objects; this string is illustrative only."]
  }
}
```

Use the exported schema, not the illustrative JSON string, when implementing the port:

```js
import { sourceBatchSchema } from "../src/os/job-contracts.mjs";
const payload = sourceBatchSchema.parse({
  source: "fixture_hellyeah_google",
  managed_account_id: account.id,
  expected_revision: checkpoint.received_revision,
  from_cursor: checkpoint.received_cursor,
  next_cursor: page.next_cursor.opaque_cursor,
  reports: page.reports,
});
// POST { kind: "source_batch", payload } with the same key on a lost response.
// HTTP 202 = persisted for processing, not a claim that model evaluation finished.
```

A page cannot advance to the same cursor or mix organizations/accounts. Empty source pages need no job; the current port requires a nonempty page and does not implement heartbeat-only cursor advancement. Late corrections use the source's new report revision, preserve the same business window and replace its active learning fact. Overlapping windows or conflicting source revisions are quarantined, never silently treated as independent outcomes.

## Unattended run instructions

The linked Site is the durable task context. A future cloud run must obtain supported access from a fresh Sites `get_site`, not from this conversation's memory, local environment files or a copied token. The hosted `GET /api/os/worker` returns the same short operational instructions as JSON. It is readable through the Site's owner-private service access path; it does not return customer data.

For each run:

1. Read the linked Site using `get_site`; verify that it remains owner-private. If it was shared more broadly, stop and report that the private worker boundary needs review. Never change the audience to make processing work.
2. Obtain the returned service-access bearer in session memory and send it only to this Site in `OAI-Sites-Authorization`. Sites dispatch consumes it. It supplies no visitor identity or connected-app consent.
3. Read `GET /api/os/worker` and follow its saved instruction version. If supported access is absent, report the blocker rather than invent credentials.
4. Send `POST /api/os/worker` with `{"limit":10}`. One invocation schedules at most ten due enrolled workspaces and drains at most ten jobs within a 25-second loop budget. One job can contain up to ten reports. The budget prevents starting more jobs; it does not forcibly interrupt an in-flight evaluation.
5. Read the response: successful, retrying, failed and lost-lease counts plus aggregate backlog. Report HTTP failures or a nonzero failed backlog. A retry retains the job's original input and operation keys. Do not invent outcomes, create new demonstrations, launch campaigns or move funds during scheduled processing.

The linked schedule **Process HellYeah Growth OS jobs** is enabled for minute 30 each hour (America/Denver). Its first autonomous run was pending at publication. The hourly linked schedule is a pilot driver, not a high-throughput queue consumer. A large backlog requires an appropriately provisioned deployment-specific scheduler/consumer. Freshness can lag the next scheduled tick; the financial policy continues to reject stale evidence. A browser polling timer is never used as evidence of unattended execution.

`HY_OS_PRIVATE_WORKER_ENABLED=true` enables this narrow shared updater only behind a confirmed owner-private Sites boundary. It can process previously authorized jobs and due opted-in workspaces, but cannot accept arbitrary commands or return tenant content. It is disabled by default in source. **Disable it before changing the Site audience.** A future multi-organization deployment must require independently scoped worker authentication. The existing authenticated service path also supports worker drains.

## Recovery checks and remaining gates

`node --test tests/os-jobs.test.mjs` exercises real Mastra with SQLite/D1 transaction semantics: atomic rollback, racing cursors, healthy-to-corrected recommendations, process loss after business commit, partial batches, expired leases, stale acknowledgements, failed partitions, retry exhaustion, scope protection, backpressure, background enrollment and isolated mock campaigns. The UI suite covers enqueue/process/toggle/account-switch behavior.

Mastra's intermediate step storage is still in memory. Durable job inputs and OS receipts recover whole short evaluations and source batches; suspended long-running Mastra workflows still need a persistent workflow storage adapter. No live report reader, credentialed screen capture, Google write or financial uplift is implied. Before production, normalize the bounded workspace evidence, add operational alerting/retention and source resynchronization, benchmark concurrent throughput, bind real organization roles, and verify source parity in Hellyeah staging.

## Continuous trial reporting

The worker also accepts service-authorized `optimization_register` and `optimization_batch` jobs. A trial batch contains 1–10 strictly validated report revisions for one workspace. They use workspace job ordering and individual report receipts, not the legacy account-report cursor. Enrolled `evaluate` jobs refresh every configured learning context from saved evidence and current eligible cohorts. No source polling is implied: the Hellyeah reporting producer must push durable batches and checkpoint their acknowledgement. Registration must commit before enrollment starts; a queue delayed past the start time cannot backdate a trial. See [continuous-learning.md](continuous-learning.md) for exact contracts and producer responsibilities.
