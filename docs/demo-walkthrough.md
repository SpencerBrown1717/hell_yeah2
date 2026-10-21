# Connected four-product demo

This is the retained demonstration of the four proposed products. Open `/#demo` directly to use it. The default `/` and `/#home` now open the existing-product dashboard; they do not open a marketing homepage or this guide. The four additions are intentionally absent from the baseline navigation and search until that experience is reviewed.

For the main customer journey, follow [the dashboard foundation walkthrough](dashboard-foundation.md): business setup → Brand → Studio → campaign draft → Tracking → Wallet → exact launch review. That journey does not require the Simulator or an experiment. The instructions below apply only to the separate four-product demonstration. Its companion deep links are `/#growth`, `/#simulator`, `/#creative`, and `/#experiments`.

## Present the loop

1. **Creative + simulator:** keep the default creative, $3,000 budget and 14-day Search purchase plan. Select **Create demo plan**. Inspect the creative or scenario if useful. The forecast is explicitly uncalibrated.
2. **Approval + Wallet:** select **Review & submit plan**, check the exact-budget confirmation, and submit. Available fictional funds fall from $12,000 to $9,000; reserved funds increase by $3,000 once.
3. **Campaign:** select **Approve demo review**. The campaign moves from In Review to Serving without a real ad-platform call.
4. **Experiment:** select **Design linked experiment** and start the demo test. Close its inspector to choose Healthy returns, Poor returns, or Too little evidence directly in the guide. Alternatively, use **Generate sample results** in the experiment inspector. The same creative and campaign IDs stay attached to the experiment.
5. **OS:** choose **Learn from these results**. The server runs the repository and Mastra evaluation workflow against an isolated synthetic account. Inspect the before/after decision and expand **Why this decision?** for the checks. A completed linked experiment also offers **Learn from results** directly in its inspector.

The guide shows only one active stage. Completed stages can be revisited without recreating plans or reservations. Unavailable prerequisites link to their repair screen. Draft input and keyboard focus survive asynchronous OS refreshes. Growth OS opens with a recommendation, feedback and learning controls; detailed history and checks are available under an expandable section.

For the default healthy example, campaign spend is $2,400, sample revenue is $9,600, contribution after the illustrative 5% fee and 55% margin is $2,760, and the suggested budget increase is $300. The remaining $600 of the reservation returns to the fictional Wallet. Illustrative fees are included in OS economics but are not charged to this browser-local Wallet.

Choose **Try another outcome** to repeat the same settings. Poor returns hold the budget and request economic repairs. Limited evidence holds the budget. Different budgets or available funds can also prevent an increase; the checks explain why. No result is a promise of ROI or a certified experiment winner.

## Explore beyond the guide

- Saved Search purchase scenarios have **Try full demo**, including scenarios already submitted through the normal campaign screen.
- Creative assets marked Generating or Needs Attention have **Complete sample creative**. This completes bundled sample formats and increments the creative version; it does not invoke live image generation.
- Research captures accept labelled sample copy. **Open sample creative** creates a visible sample asset; **Design a test** preserves the capture-to-creative-to-experiment relationship. No URL is fetched.
- Running standalone experiments can generate explicitly labelled sample results without affecting a campaign or Wallet.
- **Send design to OS** sends a research design. **Learn from results** sends a completed linked campaign's frozen outcome recipe for evaluation. They are intentionally distinct operations.
- Experiment inspectors show the saved creative snapshot, including its version. Editing Studio assets later does not replace the tested content.
- Performance Max plans can be sent to OS research using the server's `PMax` channel contract. The connected economic replay is scoped to Search purchases.
- **Add demo funds** updates only the fictional local Wallet. Server Wallet intents remain unpaid until an actual checkout adapter is connected.

## Persistence and implementation

- Browser plans, campaign state, experiment counts, balance and journey resume from existing local workspace storage.
- The OS stores the ten latest completed demo receipts under the signed-in owner. They remain visible after reloading; the latest receipt is also available when local demo progress was reset.
- `web/js/demo-evidence.mjs` is the deterministic synthetic outcome generator shared by the browser and server.
- `web/js/demo-model.mjs` owns local lifecycle transitions and one-time settlement. `demo-views.mjs` owns the guide. The existing product screens use the same records.
- `src/os/product-demo.mjs` validates a strict demo recipe. It derives outcome numbers itself, ingests provisional and final revisions, and saves the before/after evaluation. It does not accept arbitrary browser-provided measured economics.
- The API requires the existing authenticated Site identity and same-origin checks. Stable request receipts and isolated source keys make retries safe even if the final save is interrupted.
- Archived experiment replays retain their run ID, creative snapshot and original learning funding context, including when funds changed before the first evaluation. Replaying an archived experiment does not replace a newer active campaign.
- Demo evaluations do not replace the owner's financial snapshot, opt into aggregate learning, enroll a background workspace, launch ads, or move funds. Existing background jobs continue to use persisted evidence and their original authorization boundaries.

## Acceptance coverage

Automated DOM → HTTP → SQLite/D1 repository → Mastra tests cover healthy, poor and limited outcomes, exact creative/campaign/experiment lineage, Wallet settlement, reloads and repeat demos. Additional tests cover duplicate retries, interrupted final saves, pause gates, immutable request keys, unauthorized or arbitrary economic submissions, and the PMax contract. Browser layout inspection requires an available browser QA surface; DOM tests do not certify visual layout.
