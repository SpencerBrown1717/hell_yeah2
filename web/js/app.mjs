import { createOSController } from "./os-controller.mjs";
import { createFoundationController } from "./foundation-controller.mjs";
import { normalizeFoundation } from "./foundation-model.mjs";
import { foundationRoutes, foundationNavigation, campaignDialog } from "./foundation-views.mjs";
import { demoContext, startDemo, attachScenarioToDemo, approveDemoCampaign, designDemoExperiment, completeDemoExperiment, prepareDemoLearning, learningForExperiment, finishDemoAsset, creativeFromCapture } from "./demo-model.mjs";
import { demoPlanForm, sampleResultsDialog } from "./demo-views.mjs";
import {
  createInitialState,
  readState,
  saveState,
  simulateDraft,
  saveScenario,
  queueScenario,
  submitApproval,
  createExperiment,
  transitionExperiment,
  updateBrand,
  readiness,
  copy,
  money,
  number,
  uid,
  log,
  assert,
  draftFingerprint,
} from "./model.mjs";
import {
  shell,
  routes,
  escape,
  dialogFrame,
  assetDialog,
  experimentDialog,
  approvalDialog,
  button,
  info,
  status,
  pill,
  activityItems,
  performanceData,
  creativeArt,
} from "./views.mjs";
import { icon } from "./icons.mjs";

export function mountWorkspace(win) {
  const doc = win.document,
    root = doc.getElementById("app"),
    dialog = doc.getElementById("dialog"),
    notifications = doc.getElementById("notifications");
  let storage;
  try {
    storage = win.localStorage;
  } catch {
    storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("Storage unavailable");
      },
    };
  }
  const saved = readState(storage);
  let state = normalizeFoundation(saved.state),
    toastTimer,
    searchTimer,
    lastFocus;
  const ui = {
    route: parseRoute(),
    homeProduct: "growth",
    demoStep: null,
    demoDraft: null,
    assetFilter: "All assets",
    assetFormat: "All formats",
    assetSearch: "",
    campaignFilter: "All campaigns",
    campaignSearch: "",
    experimentFilter: "All experiments",
    experimentSearch: "",
    simDraft: {
      budget: 3000,
      days: 14,
      channel: "Search",
      goal: "conversions",
      assetId: "a1",
    },
    simResult: null,
  };
  const os = createOSController({
    win,
    storage,
    ui,
    getState: () => state,
    render,
    openDialog,
    closeDialog,
    notify,
    fail,
  });
  const foundation = createFoundationController({win,ui,getState:()=>state,mutate,render,navigate,openDialog,closeDialog,notify});
  let osStarted=false;
  function ensureOS(){if(!foundationRoutes.includes(ui.route)&&!osStarted){osStarted=true;os.start();}}
  ui.simResult = simulateDraft(ui.simDraft);
  function parseRoute() {
    return Object.hasOwn(routes, win.location.hash.slice(1))
      ? win.location.hash.slice(1)
      : "overview";
  }
  function notify(message, error = false) {
    win.clearTimeout(toastTimer);
    notifications.innerHTML = `<div class="toast ${error ? "error" : ""}">${escape(message)}</div>`;
    toastTimer = win.setTimeout(() => {
      notifications.innerHTML = "";
    }, 5500);
  }
  function persist() {
    try {
      saveState(storage, state);
    } catch {
      notify(
        "Changes work in this tab, but browser storage is unavailable. Export your workspace to keep them.",
        true,
      );
    }
  }
  function render() {
    const focused = doc.activeElement;
    const field = root.contains(focused) && /^(INPUT|SELECT|TEXTAREA)$/.test(focused?.tagName)
      ? { id: focused.id, name: focused.name, form: focused.form?.id, start: focused.selectionStart, end: focused.selectionEnd }
      : null;
    root.innerHTML = shell(state, ui);
    doc.title = `${routes[ui.route].title} · HellYeah`;
    const next = field && (field.id ? doc.getElementById(field.id) : doc.getElementById(field.form)?.elements?.namedItem(field.name));
    if (next) {
      next.focus({ preventScroll: true });
      if (field.start !== null && field.start !== undefined && next.setSelectionRange) next.setSelectionRange(field.start, field.end);
    }
  }
  function navigate(route) {
    if (!Object.hasOwn(routes, route)) return;
    closeDialog();
    if (ui.route === route) {
      render();
      return;
    }
    win.location.hash = route;
  }
  function openDialog(html) {
    lastFocus = doc.activeElement;
    dialog.innerHTML = html;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }
  function closeDialog() {
    if (dialog.open) dialog.close();
    if (lastFocus?.isConnected) lastFocus.focus?.();
  }
  function fail(error) {
    const field = dialog.open && doc.getElementById("dialog-error");
    if (field) {
      field.textContent = error.message;
      field.setAttribute("tabindex", "-1");
      field.focus();
    } else notify(error.message, true);
  }
  function mutate(callback) {
    const previous = state;
    const draft = copy(state);
    const result = callback(draft);
    state = draft;
    ui.demoStep = null;
    if (!foundationRoutes.includes(ui.route)) os.capture(previous, state);
    persist();
    render();
    return result;
  }
  function findAsset(id) {
    const a = state.assets.find((a) => a.id === id);
    assert(a, "Creative not found.");
    return a;
  }
  function findExperiment(id) {
    const e = state.experiments.find((e) => e.id === id);
    assert(e, "Experiment not found.");
    return e;
  }
  function showApproval(id) {
    const a = state.approvals.find((a) => a.id === id);
    assert(a, "Review item not found.");
    openDialog(approvalDialog(state, a));
  }
  function showExperiment(id) {
    openDialog(experimentDialog(state, findExperiment(id)));
  }
  function newExperiment(assetId = "a1") {
    const a = findAsset(assetId);
    openDialog(
      dialogFrame(
        "A good question comes first.",
        "Design a first-party landing-page experiment.",
        `<form id="experiment-form" class="form-fields"><label>Experiment name<input name="name" required minlength="3" maxlength="100" placeholder="e.g. Lead with the everyday benefit"></label><label>Hypothesis<textarea name="hypothesis" required minlength="15" maxlength="1000">Making the ${escape(a.angle.toLowerCase())} benefit explicit may increase purchases per assigned visitor.</textarea></label><label>Source creative<select name="assetId">${state.assets.map((x) => `<option value="${x.id}" ${x.id === assetId ? "selected" : ""}>${escape(x.name)} · v${x.version}</option>`).join("")}</select></label><div class="plan-summary"><dl><dt>Unit / allocation</dt><dd>Owned visitor · 50/50</dd><dt>Primary metric</dt><dd>Purchases / assigned visitor</dd><dt>Fixed horizon</dt><dd>5,000 total assignments</dd><dt>Launch behavior</dt><dd>Save as Draft</dd></dl></div>${info("This creates a local experiment design. Starting the demo test does not assign real visitors or change ad delivery.")}<div class="dialog-actions">${button("Cancel", "close-dialog")}<button class="btn primary" type="submit">Create experiment ${icon("arrow")}</button></div></form>`,
      ),
    );
  }
  function showCampaign(id) {
    if (foundationRoutes.includes(ui.route)) return openDialog(campaignDialog(state,id));
    const c = state.campaigns.find((c) => c.id === id);
    assert(c, "Campaign not found.");
    const asset = state.assets.find((a) => a.id === c.creativeId);
    openDialog(
      dialogFrame(
        escape(c.name),
        "Existing Hellyeah campaign lifecycle · Demo record",
        `<div class="row spread">${status(c.status)}${pill(escape(c.channel), "outline")}</div><div class="plan-summary mt24"><dl><dt>Maximum campaign budget</dt><dd>${money(c.maximum)}</dd><dt>Sample spend</dt><dd>${money(c.spend)}</dd><dt>Purchases</dt><dd>${number(c.purchases)}</dd><dt>Execution</dt><dd>Hellyeah managed account</dd><dt>Goal</dt><dd>${c.goal === "conversions" ? "Purchases" : "Impressions"}</dd><dt>Creative</dt><dd>${escape(asset?.name)}</dd><dt>Submitted snapshot</dt><dd>Brand v${c.snapshot?.brandVersion ?? 1} · Creative v${c.snapshot?.assetVersion ?? 1}</dd></dl></div>${info(c.status === "In Review" ? "The campaign is awaiting review. Approve the demo review to make sample delivery available." : "Pausing delivery does not cancel this campaign or release funds. All actions here affect the demo only.")}<div class="dialog-actions">${c.status === "In Review" ? button("Approve demo review", "demo-approve", { kind: "primary", data: `data-id="${c.id}"` }) : ""}${demoContext(state).campaign?.id === c.id ? button("Continue connected demo", "navigate", { data: 'data-route="demo"' }) : ""}${button("Inspect creative", "asset", { data: `data-id="${c.creativeId}"`, iconName: "creative" })}${["Serving", "Paused"].includes(c.status) ? button(c.status === "Serving" ? "Pause demo campaign" : "Resume demo campaign", "toggle-campaign", { kind: "primary", data: `data-id="${c.id}"`, iconName: c.status === "Serving" ? "pause" : "play" }) : button("View Wallet", "navigate", { data: 'data-route="wallet"', iconName: "wallet" })}</div>`,
      ),
    );
  }
  function showSearch() {
    openDialog(
      dialogFrame(
        "Find your next move.",
        "Search workspaces, campaigns, creative, and experiments.",
        `<label class="input-search w-full" style="max-width:none">${icon("search")}<span class="sr-only">Search workspace</span><input id="global-search" data-input="global-search" type="search" autofocus autocomplete="off" placeholder="Search the workspace…"></label><div id="global-results" class="global-results"></div>`,
      ),
    );
    fillSearch("");
    doc.getElementById("global-search")?.focus();
  }
  function fillSearch(query) {
    const q = query.trim().toLowerCase();
    const entries = [
      ...Object.entries(routes).filter(([id])=>!foundationRoutes.includes(ui.route)||[...foundationNavigation.map(([key])=>key),'onboarding','new-campaign','settings'].includes(id)).map(([id, r]) => ({
        name: r.title,
        kind: "Workspace",
        action: "navigate",
        attrs: `data-route="${id}"`,
        icon: r.icon,
      })),
      ...state.campaigns.map((c) => ({
        name: c.name,
        kind: "Campaign",
        action: "campaign-detail",
        attrs: `data-id="${c.id}"`,
        icon: "campaign",
      })),
      ...state.assets.map((a) => ({
        name: a.name,
        kind: "Creative",
        action: foundationRoutes.includes(ui.route) ? "f-studio-asset" : "asset",
        attrs: `data-id="${a.id}"`,
        icon: "creative",
      })),
      ...(foundationRoutes.includes(ui.route) ? [] : state.experiments).map((e) => ({
        name: e.name,
        kind: "Experiment",
        action: "experiment-detail",
        attrs: `data-id="${e.id}"`,
        icon: "experiment",
      })),
    ]
      .filter((e) => `${e.name} ${e.kind}`.toLowerCase().includes(q))
      .slice(0, 8);
    doc.getElementById("global-results").innerHTML = entries.length
      ? entries
          .map(
            (e) =>
              `<button class="global-result" data-action="${e.action}" ${e.attrs}>${icon(e.icon)}<span><strong>${escape(e.name)}</strong><small>${e.kind}</small></span>${icon("arrow")}</button>`,
          )
          .join("")
      : '<p class="small-empty">No matches. Try a campaign or creative name.</p>';
  }
  function showReviewQueue() {
    const pending = state.approvals.filter((a) => a.status === "Pending");
    openDialog(
      dialogFrame(
        "A little judgment goes a long way.",
        "Exact-plan review queue",
        pending.length
          ? pending
              .map(
                (a) =>
                  `<div class="scenario-row"><span class="decision-icon">${icon("shield")}</span><div class="scenario-copy"><strong>${escape(a.name)}</strong><p>${money(Number(a.draft.budget))} maximum · ${a.draft.days} days</p></div>${button("Review", "approval", { small: true, data: `data-id="${a.id}"` })}</div>`,
              )
              .join("")
          : `<div class="empty">${icon("shield")}<h3>No plans waiting for review.</h3><p>Run a simulation, save the scenario, and send it to the OS. It will appear here with its exact budget and creative snapshot.</p>${button("Open simulator", "navigate", { kind: "primary", data: 'data-route="simulator"', iconName: "arrow" })}</div>`,
      ),
    );
  }
  function showCompare() {
    const scenarios = state.scenarios.slice(0, 4);
    openDialog(
      dialogFrame(
        "See the tradeoffs side by side.",
        "Latest four saved scenarios · All uncalibrated",
        `<div class="table-wrap"><table class="data-table comparison-table"><thead><tr><th>Scenario</th><th>Duration</th><th>Modelled purchases</th><th>80% range</th></tr></thead><tbody>${scenarios.map((c) => `<tr><td>${escape(c.name)}</td><td>${c.draft.days} days</td><td>${c.result.planningOnly ? "—" : number(c.result.expected)}</td><td>${c.result.planningOnly ? "—" : `${c.result.low}–${c.result.high}`}</td></tr>`).join("")}</tbody></table></div><div class="mt24">${info("All Search outcomes share the same fixed CPC and conversion assumptions. A higher budget is not evidence of a better strategy; no creative uplift is assumed.")}</div><div class="dialog-actions">${button("Keep exploring", "close-dialog", { kind: "primary" })}</div>`,
      ),
    );
  }
  const actions = {
    ...os.actions,
    ...foundation.actions,
    "home-explore": () => doc.getElementById("platform-products")?.scrollIntoView?.({ behavior: "smooth", block: "start" }),
    "home-product": el => {
      ui.homeProduct = el.dataset.product;
      render();
      doc.querySelector(`[data-action="home-product"][data-product="${ui.homeProduct}"]`)?.focus({ preventScroll: true });
    },
    "demo-step": el => {
      const step = Number(el.dataset.step);
      assert(Number.isInteger(step) && step >= 0 && step <= demoContext(state).step, "Complete the current step first.");
      ui.demoStep = step;
      render();
    },
    "demo-new": () => openDialog(dialogFrame("A new idea. A new learning loop.", "Your completed OS runs remain saved. No data or balance is reset.", demoPlanForm(state))),
    "demo-use-scenario": el => {
      mutate(s => attachScenarioToDemo(s, el.dataset.id));
      navigate("demo");
    },
    "demo-review": () => {
      const c = demoContext(state);
      assert(c.scenario, "Create a demo plan first.");
      const approval = mutate(s => queueScenario(s, c.scenario.id));
      showApproval(approval.id);
    },
    "demo-inspect-scenario": () => {
      const { scenario } = demoContext(state);
      assert(scenario, "Create a demo plan first.");
      ui.simDraft = copy(scenario.draft); ui.simResult = copy(scenario.result);
      navigate("simulator");
    },
    "demo-approve": el => {
      mutate(s => approveDemoCampaign(s, el.dataset.id));
      closeDialog();
      notify("Demo review approved. Start the experiment to generate sample delivery.");
    },
    "demo-design": () => {
      const e = mutate(designDemoExperiment);
      showExperiment(e.id);
    },
    "demo-results": el => openDialog(sampleResultsDialog(findExperiment(el.dataset.id))),
    "demo-outcome": el => {
      mutate(s => completeDemoExperiment(s, el.dataset.id, el.dataset.outcome));
      notify("Sample results recorded. Your demo budget is settled; the OS can now learn from this outcome.");
    },
    "demo-learn": async () => {
      const payload = mutate(prepareDemoLearning);
      await os.runProductDemo(payload, `demo:${payload.run_id}`);
      notify("Learning loop saved. The OS evaluated this campaign’s sample evidence.");
    },
    "experiment-learn": async el => {
      const payload = mutate(s => learningForExperiment(s, el.dataset.id));
      await os.runProductDemo(payload, `demo:${payload.run_id}`);
      navigate("growth");
      notify("Experiment results saved. The OS has evaluated the same campaign evidence.");
    },
    "demo-finish-asset": el => {
      mutate(s => finishDemoAsset(s, el.dataset.id));
      openDialog(assetDialog(state, findAsset(el.dataset.id)));
      notify("Sample creative is ready. Its version was updated.");
    },
    "skip-main": () => doc.getElementById("main")?.focus(),
    "close-dialog": closeDialog,
    navigate: (el) => navigate(el.dataset.route),
    search: showSearch,
    organization: () =>
      openDialog(
        dialogFrame(
          "Your organization",
          `${escape(state.brand.name)} · Demo organization`,
          `<div class="plan-summary"><dl><dt>Brand Profile</dt><dd>v${state.brand.version}</dd><dt>Campaigns</dt><dd>${state.campaigns.length} demo records</dd><dt>Wallet</dt><dd>${money(state.wallet.available)} available</dd><dt>Owner</dt><dd>Spencer</dd></dl></div><div class="dialog-actions">${button("View Brand Profile", "navigate", { kind: "primary", data: 'data-route="brand"' })}</div>`,
        ),
      ),
    "about-demo": () =>
      openDialog(
        dialogFrame(
          "Hellyeah dashboard preview",
          "Interactive replica based on the documented customer workflow",
          `<p>Try Brand, Studio, Campaigns, Wallet, and Tracking with labeled sample data. Changes stay in this browser.</p><div class="divider"></div>${info("Campaign creation, review, Wallet reservations, and X-Ray events are simulated. No real ads, payments, website research, or image generation run here.")}<div class="dialog-actions">${button("Continue", "close-dialog", { kind: "primary" })}</div>`,
        ),
      ),
    activity: () =>
      openDialog(
        dialogFrame(
          "The learning log.",
          "A traceable record of your demo workspace.",
          `<div class="activity-list">${activityItems(state.activity)}</div>`,
        ),
      ),
    "chart-metric": (el) => {
      mutate((s) => {
        s.chartMetric = el.dataset.value;
      });
    },
    "chart-data": () =>
      openDialog(
        dialogFrame(
          "The numbers behind the line.",
          "Illustrative distribution of the selected demo total.",
          `<div class="table-wrap"><table class="data-table"><thead><tr><th>Sample interval</th><th>${state.chartMetric === "purchases" ? "Purchases" : "Spend (USD)"}</th></tr></thead><tbody>${performanceData(
            state,
          )
            .map(
              (d) =>
                `<tr><td>${d.label}</td><td>${state.chartMetric === "purchases" ? number(d.value) : money(d.value)}</td></tr>`,
            )
            .join("")}</tbody></table></div>`,
        ),
      ),
    "review-queue": showReviewQueue,
    approval: (el) => showApproval(el.dataset.id),
    "campaign-detail": (el) => showCampaign(el.dataset.id),
    "toggle-campaign": (el) => {
      const id = el.dataset.id;
      mutate((s) => {
        const c = s.campaigns.find((c) => c.id === id);
        assert(
          c && ["Serving", "Paused"].includes(c.status),
          "Campaign state changed. Reopen this record.",
        );
        if (c.status === "Paused") {
          assert(!s.autonomyPaused, "New submissions and resumes are paused.");
          assert(
            readiness(s, c.channel, c.goal, c.creativeId).every((g) => g.ok),
            "Campaign readiness is incomplete.",
          );
        }
        c.status = c.status === "Serving" ? "Paused" : "Serving";
        log(
          s,
          `Demo campaign “${c.name}” is ${c.status.toLowerCase()}. Its reservation is unchanged.`,
          "campaign",
        );
      });
      showCampaign(id);
      notify("Demo campaign state updated. Wallet funds are unchanged.");
    },
    "campaign-filter": (el) => {
      ui.campaignFilter = el.dataset.value;
      render();
    },
    "asset-filter": (el) => {
      ui.assetFilter = el.dataset.value;
      render();
    },
    "experiment-filter": (el) => {
      ui.experimentFilter = el.dataset.value;
      render();
    },
    asset: (el) => openDialog(assetDialog(state, findAsset(el.dataset.id))),
    "experiment-creative": el => {
      const e = findExperiment(el.dataset.id), a = e.creativeSnapshot;
      if (!a) return openDialog(assetDialog(state, findAsset(e.assetId)));
      openDialog(dialogFrame(`${escape(a.name)} · v${a.version}`, "Creative snapshot used by this experiment", `<div class="asset-large">${creativeArt(a)}</div><p class="field-hint mt16">This is the saved version. Later Studio edits do not change it.</p><div class="dialog-actions">${button("Back to experiment", "experiment-detail", {data:`data-id="${e.id}"`})}${button("View current Studio version", "asset", {data:`data-id="${a.id}"`})}</div>`));
    },
    "demo-snapshot": () => {
      const a = demoContext(state).run?.creative;
      assert(a, "Create a plan first.");
      openDialog(dialogFrame(`${escape(a.name)} · v${a.version}`, "Creative snapshot used by this plan", `<div class="asset-large">${creativeArt(a)}</div><div class="dialog-actions">${button("Back to plan", "close-dialog")}</div>`));
    },
    "asset-simulate": (el) => {
      ui.simDraft.assetId = el.dataset.id;
      ui.simResult = null;
      navigate("simulator");
      notify("Creative selected. Run a new planning scenario.");
    },
    "new-experiment": (el) => newExperiment(el.dataset.id || "a1"),
    "experiment-detail": (el) => showExperiment(el.dataset.id),
    "transition-experiment": (el) => {
      const id = el.dataset.id;
      mutate((s) => transitionExperiment(s, id));
      showExperiment(id);
      notify("Demo experiment updated. No real visitors were assigned.");
    },
    "save-scenario": () => {
      const saved = mutate((s) => saveScenario(s, ui.simDraft, ui.simResult));
      notify(`${saved.name} saved. Send it to the OS when you’re ready.`);
    },
    "queue-scenario": (el) => {
      const approval = mutate((s) => queueScenario(s, el.dataset.id));
      showApproval(approval.id);
    },
    "dismiss-approval": (el) => {
      mutate((s) => {
        const a = s.approvals.find((a) => a.id === el.dataset.id);
        assert(a?.status === "Pending", "This plan is no longer pending.");
        a.status = "Dismissed";
        log(
          s,
          "An exact-plan review was dismissed. No funds were reserved.",
          "approval",
        );
      });
      closeDialog();
      notify("Plan dismissed. No funds were reserved.");
    },
    compare: showCompare,
    capture: () =>
      openDialog(
        dialogFrame(
          "Start with a source.",
          "Edit a bundled sample, then turn its message into an experiment.",
          `<form id="capture-form" class="form-fields"><label>Owned landing-page URL<input name="url" type="url" required value="https://forma.example/collection" placeholder="https://your-brand.com/collection"></label><label>Capture label<input name="label" required maxlength="100" value="Forma collection · Sample" placeholder="e.g. Daily collection · Mobile"></label><label>Sample headline<input name="headline" required maxlength="160" value="Made for your everyday."></label><label>Sample supporting copy<input name="subline" required maxlength="300" value="Everyday essentials. Made to move."></label><label>Observed creative angle<input name="angle" required maxlength="100" value="Everyday utility"></label>${info("This stores your labelled sample copy and provides a visual creative preview. It does not visit or capture the URL. Live capture requires the isolated collection adapter.")}<label class="confirmation"><input type="checkbox" name="owned" required>I own this page or have permission to research it.</label><div class="dialog-actions">${button("Cancel", "close-dialog")}<button class="btn primary" type="submit">Add sample capture ${icon("plus")}</button></div></form>`,
        ),
      ),
    "capture-creative": el => { const a = mutate(s => creativeFromCapture(s, el.dataset.id)); openDialog(assetDialog(state, a)); },
    "capture-experiment": el => { const a = mutate(s => creativeFromCapture(s, el.dataset.id)); newExperiment(a.id); },
    "capture-detail": (el) => {
      const c = state.captures.find((c) => c.id === el.dataset.id);
      assert(c, "Capture not found.");
      openDialog(
        dialogFrame(
          escape(c.label),
          "Sample capture · No live page retrieval",
          `<div class="plan-summary"><dl><dt>URL label</dt><dd style="overflow-wrap:anywhere;max-width:350px">${escape(c.url)}</dd><dt>Evidence grade</dt><dd>Observed sample only</dd><dt>Collection method</dt><dd>Fixture demonstration</dd></dl></div>${info("The URL is a user-provided label. No text or image has been extracted from that URL.")}<div class="evidence-card"><h3>Sample creative observation</h3><p>“${escape(c.headline ?? "Made for your everyday.")}” leads with ${escape((c.angle ?? "Everyday utility").toLowerCase())}. Supporting copy: “${escape(c.subline ?? "Everyday essentials. Made to move.")}”</p><p class="tiny">Origin: bundled fixture. Extraction confidence and outcome effects are not measured.</p></div><div class="dialog-actions">${button("Open sample creative", "capture-creative", { data: `data-id="${c.id}"` })}${button("Design a test", "capture-experiment", { kind: "primary", data: `data-id="${c.id}"` })}</div>`,
        ),
      );
    },
    "toggle-tracker": () => {
      mutate((s) => {
        s.tracker.enabled = !s.tracker.enabled;
        s.tracker.receiving = s.tracker.enabled;
        s.tracker.verified = s.tracker.enabled;
        log(
          s,
          `Demo X-Ray ${s.tracker.enabled ? "enabled with verified sample events" : "disabled"}.`,
        );
      });
      notify("Demo tracking readiness updated.");
    },
    "toggle-autonomy": () => {
      mutate((s) => {
        s.autonomyPaused = !s.autonomyPaused;
        log(
          s,
          `New demo submissions ${s.autonomyPaused ? "paused" : "enabled"}.`,
        );
      });
      notify(
        state.autonomyPaused
          ? "New submissions paused."
          : "New demo submissions enabled.",
      );
    },
    "fund-wallet": () =>
      openDialog(
        dialogFrame(
          "Top Up",
          "Add fictional funds to the shared demo Wallet.",
          `<form id="fund-form" class="form-fields"><label>Amount in USD<input name="amount" type="number" min="100" max="100000" step="100" value="5000" required></label>${info("No payment is processed. This changes only the local demo balance.")}<div class="dialog-actions">${button("Cancel", "close-dialog")}<button class="btn primary" type="submit">Add demo funds ${icon("plus")}</button></div></form>`,
        ),
      ),
    export: () => {
      const blob = new win.Blob(
          [
            JSON.stringify(
              { exportedAt: new Date().toISOString(), ...state },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
        url = win.URL.createObjectURL(blob),
        a = doc.createElement("a");
      a.href = url;
      a.download = "hell-yeah2-demo-workspace.json";
      a.click();
      win.setTimeout(() => win.URL.revokeObjectURL(url), 1000);
      notify("Workspace JSON exported.");
    },
    reset: () =>
      openDialog(
        dialogFrame(
          "Start with a fresh canvas.",
          "Reset this browser’s demo workspace.",
          `<p>Your saved scenarios, experiment drafts, and local review history will be replaced with the original sample data.</p><div class="dialog-actions">${button("Keep my work", "close-dialog")}${button("Reset demo workspace", "confirm-reset", { kind: "primary", iconName: "refresh" })}</div>`,
        ),
      ),
    "confirm-reset": () => {
      state = normalizeFoundation(createInitialState());
      persist();
      ui.assetFilter = "All assets";
      ui.campaignFilter = "All campaigns";
      ui.experimentFilter = "All experiments";
      ui.assetSearch = ui.campaignSearch = ui.experimentSearch = "";
      ui.simDraft = {
        budget: 3000,
        days: 14,
        channel: "Search",
        goal: "conversions",
        assetId: "a1",
      };
      ui.simResult = simulateDraft(ui.simDraft);
      closeDialog();
      render();
      notify("Demo restored to its starting state.");
    },
  };
  function onClick(event) {
    const el = event.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const action = actions[el.dataset.action];
    if (!action) return;
    if (el.tagName === "A") event.preventDefault();
    try {
      Promise.resolve(action(el)).catch(fail);
    } catch (error) {
      fail(error);
    }
  }
  function updateSimDirty() {
    const dirty =
      !ui.simResult ||
      ui.simResult.fingerprint !== draftFingerprint(ui.simDraft);
    const save = root.querySelector('[data-action="save-scenario"]');
    if (save) save.disabled = dirty;
    const panel = root.querySelector(".sim-results>.panel");
    if (panel && dirty && !panel.querySelector(".stale-note")) {
      const node = doc.createElement("div");
      node.className = "stale-note";
      node.textContent = "Inputs changed. Run again to update this result.";
      panel.querySelector(".panel-head").after(node);
    }
    if (panel && !dirty) panel.querySelector(".stale-note")?.remove();
    panel?.querySelector("[data-forecast]")?.classList.toggle("stale", dirty);
  }
  function onInput(event) {
    const el = event.target,
      key = el.dataset.input;
    foundation.input(el);
    if (el.form?.id === "demo-plan-form") ui.demoDraft = Object.fromEntries(new win.FormData(el.form));
    if (!key) return;
    if (key === "global-search") {
      fillSearch(el.value);
      return;
    }
    if (key === "sim-budget" || key === "budget-slider") {
      ui.simDraft.budget = el.value;
      const twin = doc.getElementById(
        key === "sim-budget" ? "budget-slider" : "sim-budget",
      );
      if (twin) twin.value = el.value;
      updateSimDirty();
      return;
    }
    const mapping = {
      "asset-search": "assetSearch",
      "campaign-search": "campaignSearch",
      "experiment-search": "experimentSearch",
    };
    if (mapping[key]) {
      ui[mapping[key]] = el.value;
      win.clearTimeout(searchTimer);
      searchTimer = win.setTimeout(() => {
        const pos = el.selectionStart;
        render();
        const next = doc.getElementById(key);
        next?.focus();
        if (next && pos !== null) next.setSelectionRange?.(pos, pos);
      }, 140);
    }
  }
  function onChange(event) {
    const el = event.target,
      key = el.dataset.change;
    try {
      foundation.change(el);
      if (el.form?.id === "demo-plan-form") {
        ui.demoDraft = Object.fromEntries(new win.FormData(el.form));
        if (root.contains(el)) render();
      }
      if (key === "os-sample") {
        void os.change(el).catch(fail);
      } else if (key === "range") {
        mutate((s) => (s.range = Number(el.value)));
      } else if (key === "asset-format") {
        ui.assetFormat = el.value;
        render();
      } else if (key?.startsWith("sim-")) {
        const prop = {
          "sim-channel": "channel",
          "sim-days": "days",
          "sim-goal": "goal",
          "sim-asset": "assetId",
        }[key];
        if (prop) {
          ui.simDraft[prop] = el.value;
          render();
        }
      }
    } catch (error) {
      fail(error);
    }
  }
  function onSubmit(event) {
    const form = event.target;
    if(form.id?.startsWith('f-')){event.preventDefault();try{foundation.submit(form);}catch(error){fail(error);}return;}
    if (form.id?.startsWith("os-")) {
      event.preventDefault();
      void os.submit(form).catch(fail);
      return;
    }
    if (
      ![
        "sim-form",
        "experiment-form",
        "approval-form",
        "brand-form",
        "capture-form",
        "fund-form",
        "demo-plan-form",
        "demo-results-form",
      ].includes(form.id)
    )
      return;
    event.preventDefault();
    try {
      const data = Object.fromEntries(new win.FormData(form));
      if (form.id === "demo-plan-form") {
        mutate(s => startDemo(s, data));
        ui.demoDraft = null;
        navigate("demo");
        notify("Plan saved. Review the exact budget to continue.");
      }
      if (form.id === "demo-results-form") {
        mutate(s => completeDemoExperiment(s, form.dataset.id, data.outcome));
        showExperiment(form.dataset.id);
        notify("Sample results recorded. The connected demo is ready for OS learning.");
      }
      if (form.id === "sim-form") {
        ui.simDraft = { ...ui.simDraft, ...data };
        ui.simResult = simulateDraft(ui.simDraft);
        render();
        notify(
          ui.simResult.planningOnly
            ? "Budget plan ready. No outcome model is available for this scope."
            : "Scenario calculated using fixed demo assumptions.",
        );
      }
      if (form.id === "experiment-form") {
        const e = mutate((s) => createExperiment(s, data));
        showExperiment(e.id);
        notify("Experiment design saved as Draft.");
      }
      if (form.id === "approval-form") {
        const c = mutate((s) =>
          submitApproval(s, form.dataset.id, data.confirmed === "on"),
        );
        showCampaign(c.id);
        notify("Demo campaign entered review. Budget reserved once.");
      }
      if (form.id === "brand-form") {
        mutate((s) => updateBrand(s, data));
        notify(
          "Demo Brand Profile saved. Pending plans require a new snapshot.",
        );
      }
      if (form.id === "capture-form") {
        const url = new URL(data.url);
        assert(url.protocol === "https:", "Use an https:// URL.");
        assert(
          data.owned === "on",
          "Confirm permission to research this page.",
        );
        assert(data.label.trim(), "Add a capture label.");
        mutate((s) => {
          s.captures.unshift({
            id: uid("capture"),
            url: url.href,
            label: data.label.trim().slice(0, 100),
            source: "fixture",
            headline: (data.headline || "Made for your everyday.").trim().slice(0, 160),
            subline: (data.subline || "Everyday essentials. Made to move.").trim().slice(0, 300),
            angle: (data.angle || "Everyday utility").trim().slice(0, 100),
            createdAt: new Date().toISOString(),
          });
          log(
            s,
            "Added a labelled research sample. No live URL was captured.",
            "creative",
          );
        });
        closeDialog();
        notify("Sample capture added. The URL has not been visited.");
      }
      if (form.id === "fund-form") {
        const amount = Number(data.amount);
        assert(
          Number.isFinite(amount) &&
            amount >= 100 &&
            amount <= 100000 &&
            Number.isInteger(amount),
          "Enter a whole-dollar amount between $100 and $100,000.",
        );
        mutate((s) => {
          s.wallet.available += amount;
          log(
            s,
            `${money(amount)} in fictional funds added to the demo Wallet.`,
            "wallet",
          );
        });
        closeDialog();
        notify(`${money(amount)} in demo funds added. No payment processed.`);
      }
    } catch (error) {
      fail(error);
    }
  }
  function onHash() {
    ui.route = parseRoute();
    ensureOS();
    closeDialog();
    render();
    win.scrollTo?.(0, 0);
    doc.getElementById("main")?.focus({ preventScroll: true });
  }
  function onKey(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault();
      showSearch();
    }
  }
  function onOnline() { if (osStarted && !foundationRoutes.includes(ui.route)) void os.reload(); }
  function onStorage(event) {
    if (event.key !== "hell_yeah2.workspace.v1") return;
    state = normalizeFoundation(readState(storage).state);
    closeDialog();
    render();
    notify("Workspace refreshed from another tab.");
  }
  doc.addEventListener("click", onClick);
  doc.addEventListener("input", onInput);
  doc.addEventListener("change", onChange);
  doc.addEventListener("submit", onSubmit);
  doc.addEventListener("keydown", onKey);
  win.addEventListener("hashchange", onHash);
  win.addEventListener("storage", onStorage);
  win.addEventListener("online", onOnline);
  ensureOS();
  render();
  if (saved.recovered)
    notify(
      "Saved demo data could not be read. The starting scenario has been restored.",
      true,
    );
  return {
    getState: () => copy(state),
    getUI: () => copy(ui),
    render,
    destroy() {
      os.destroy();
      win.removeEventListener("online", onOnline);
      for (const [event, fn] of [
        ["click", onClick],
        ["input", onInput],
        ["change", onChange],
        ["submit", onSubmit],
        ["keydown", onKey],
      ])
        doc.removeEventListener(event, fn);
      win.removeEventListener("hashchange", onHash);
      win.removeEventListener("storage", onStorage);
      win.clearTimeout(toastTimer);
      win.clearTimeout(searchTimer);
    },
  };
}
