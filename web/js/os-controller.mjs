import { createOSClient } from "./os-client.mjs";
import { productProposal } from "./product-proposals.mjs";
import { optimizationSettingsDialog, optimizationReviewDialog, walletIntentDialog } from "./optimization-views.mjs";
import {
  feedbackDialog,
  policyDialog,
  decisionDialog,
  responseDialog,
  proposalDialog,
} from "./os-views.mjs";
import { dialogFrame, button, info } from "./views.mjs";
export function createOSController({
  win,
  storage,
  ui,
  getState,
  render,
  openDialog,
  closeDialog,
  notify,
}) {
  const client = createOSClient({ fetcher: win.fetch?.bind(win), storage });
  let alive = true;
  let reloadEpoch = 0;
  ui.os = {
    loading: true,
    error: null,
    busy: false,
    pending: client.pending().length,
    data: null,
    authRequired: false,
    jobs: null,
  };
  const paint = () => {
    if (alive && ["demo", "growth", "learning", "wallet-lab"].includes(ui.route)) render();
  };
  const acceptData = (data) => {
    if (
      !ui.os.data ||
      data.state.organization_id !== ui.os.data.state.organization_id ||
      data.revision >= ui.os.data.revision
    )
      ui.os.data = data;
  };
  const state = () => ui.os.data?.state;
  const decision = (id) => {
    const d = state()?.decisions.find((x) => x.id === id);
    if (!d) throw new Error("Reload the workspace to inspect this decision.");
    return d;
  };
  async function reload() {
    const epoch = ++reloadEpoch;
    ui.os.loading = !ui.os.data;
    ui.os.error = null;
    paint();
    try {
      let data = await client.load();
      if (!alive || epoch !== reloadEpoch) return;
      if (
        ui.os.data &&
        data.state.organization_id !== ui.os.data.state.organization_id
      ) {
        ui.os.data = null;
        ui.os.jobs = null;
        closeDialog();
      }
      client.setWorkspace(data.state.organization_id);
      const pending = client.pending().length;
      await client.flush();
      if (pending) data = await client.load();
      if (!alive || epoch !== reloadEpoch) return;
      if (alive && data.learning_refresh_required && !ui.os.busy)
        data = await client.command("evaluate", {});
      const jobs = await client.loadJobs();
      if (jobs.organization_id !== data.state.organization_id)
        throw Object.assign(new Error("Your signed-in workspace changed. Reload to continue."), { code: "WORKSPACE_CHANGED" });
      if (alive && epoch === reloadEpoch) {
        ui.os.jobs = jobs;
        acceptData(data);
        ui.os.authRequired = false;
      }
    } catch (e) {
      if (alive && epoch === reloadEpoch) {
        ui.os.error = e.message;
        if (e.code === "AUTH_REQUIRED" || e.code === "WORKSPACE_CHANGED") {
          ui.os.data = null;
          ui.os.jobs = null;
          client.setWorkspace(null);
          ui.os.authRequired = e.code === "AUTH_REQUIRED";
        }
      }
    } finally {
      if (alive && epoch === reloadEpoch) {
        ui.os.loading = false;
        ui.os.pending = client.pending().length;
        paint();
      }
    }
  }
  async function command(kind, payload, form) {
    if (ui.os.busy)
      throw new Error(
        "The OS is recording the previous update. Try again when it finishes.",
      );
    ui.os.busy = true;
    paint();
    if (form)
      for (const b of form.querySelectorAll("[type=submit]")) b.disabled = true;
    try {
      const key = form
        ? (form.dataset.requestKey ??= crypto.randomUUID())
        : crypto.randomUUID();
      const data = await client.command(kind, payload, key);
      if (!alive) return;
      if (
        ui.os.data &&
        ui.os.data.state.organization_id !== data.state.organization_id
      )
        throw Object.assign(
          new Error(
            "Your signed-in workspace changed. Reload before submitting another update.",
          ),
          { code: "WORKSPACE_CHANGED" },
        );
      acceptData(data);
      ui.os.error = null;
      ui.os.authRequired = false;
      closeDialog();
      notify("Saved. The OS has recorded this update.");
      return data;
    } catch (e) {
      if (
        [
          "STALE_POLICY",
          "STALE_DECISION",
          "STALE_OPTIMIZATION",
          "STALE_OPTIMIZATION_CONFIG",
          "STALE_WALLET_PREFERENCES",
          "AUTH_REQUIRED",
          "WORKSPACE_CHANGED",
        ].includes(e.code)
      )
        await reload();
      throw e;
    } finally {
      if (alive) {
        ui.os.busy = false;
        paint();
        if (form)
          for (const b of form.querySelectorAll("[type=submit]"))
            b.disabled = false;
      }
    }
  }
  async function jobCommand(kind, payload, el) {
    if (ui.os.busy) throw new Error("Wait for the current update to finish.");
    ui.os.busy = true;
    paint();
    try {
      const key = el ? (el.dataset.requestKey ??= crypto.randomUUID()) : crypto.randomUUID();
      const result = await client.jobCommand(kind, payload, key);
      if (!alive) return;
      if (result.organization_id !== state()?.organization_id)
        throw Object.assign(new Error("Your signed-in workspace changed. Reload to continue."), { code: "WORKSPACE_CHANGED" });
      ui.os.jobs = result;
      notify(kind === "drain" ? `${result.processed.succeeded} jobs completed.` : "Background work saved.");
      closeDialog();
      await reload();
    } catch (error) {
      if (["AUTH_REQUIRED", "WORKSPACE_CHANGED", "SETTINGS_CHANGED", "JOB_CHANGED"].includes(error.code)) await reload();
      throw error;
    } finally {
      if (alive) { ui.os.busy = false; paint(); }
    }
  }
  const noteDialog = (title, id, kind) =>
    dialogFrame(
      title,
      "Your reason stays with the evidence.",
      `<form id="os-note-form" data-kind="${kind}" data-id="${id}" class="form-fields"><label>What changed?<textarea name="note" required minlength="10" maxlength="1000"></textarea></label><div class="dialog-actions">${button("Cancel", "close-dialog")}<button type="submit" class="btn primary">Record update</button></div></form>`,
    );
  const actions = {
    "os-optimization-settings": el => openDialog(optimizationSettingsDialog(state(), el.dataset.mode)),
    "os-optimization-review": el => openDialog(optimizationReviewDialog(state().optimization[el.dataset.mode], el.dataset.strategy)),
    "os-wallet-intent": () => openDialog(walletIntentDialog()),
    "os-wallet-checkout": el => command("wallet_prepare_checkout", { intent_id: el.dataset.id }, el),
    "os-optimization-send": el => command("optimization_prepare_draft", { proposal_id: el.dataset.id, source_mode: el.dataset.mode }, el),
    "os-wallet-prompts": () => command("wallet_preferences", { expected_version: state().wallet_growth?.preferences.version ?? 0, prompts_enabled: !state().wallet_growth?.preferences.prompts_enabled, snooze: false }),
    "os-wallet-snooze": () => command("wallet_preferences", { expected_version: state().wallet_growth?.preferences.version ?? 0, prompts_enabled: state().wallet_growth?.preferences.prompts_enabled ?? false, snooze: true }),
    "os-experience-rating": el => command("feedback", { source: "customer", external_id: (el.dataset.externalId ??= crypto.randomUUID()), category: "experience", polarity: el.dataset.polarity, severity: "low", action: "rated", text: el.dataset.polarity === "positive" ? "The campaign learning explanation was clear and useful." : "The campaign learning explanation needs improvement." }, el),
    "os-share-proposal": async (el) => {
      await command(
        "submit_proposal",
        productProposal(getState(), el.dataset.product, el.dataset.id),
        el,
      );
      if (alive) win.location.hash = "growth";
    },
    "os-proposal": (el) => {
      const p = state()?.proposals?.find((p) => p.id === el.dataset.id);
      if (!p) throw new Error("Reload the OS to inspect this evidence.");
      openDialog(
        proposalDialog(
          p,
          state().proposals.some((x) => x.supersedes === p.id),
        ),
      );
    },
    "os-reload": reload,
    "os-queue-evaluate": (el) => jobCommand("evaluate", {}, el),
    "os-queue-trial": (el) => jobCommand("mock_campaign", {}, el),
    "os-drain-jobs": (el) => jobCommand("drain", {}, el),
    "os-retry-job": (el) => jobCommand("retry", { id: el.dataset.id, expected_attempts: Number(el.dataset.attempts) }, el),
    "os-background": (el) => jobCommand("background", { enabled: !ui.os.jobs?.background.enabled, expected_revision: ui.os.jobs?.background.revision ?? 0 }, el),
    "os-evaluate": () => command("evaluate", {}),
    "os-feedback": () => openDialog(feedbackDialog(getState())),
    "os-policy": () => {
      if (state()) openDialog(policyDialog(state()));
    },
    "os-decision": (el) =>
      openDialog(decisionDialog(decision(el.dataset.id), state()?.latest?.id)),
    "os-respond": (el) =>
      openDialog(responseDialog(decision(el.dataset.id), el.dataset.response)),
    "os-resolve": (el) =>
      openDialog(
        noteDialog(
          "Close the loop on this concern.",
          el.dataset.id,
          "resolve_feedback",
        ),
      ),
    "os-withdraw": (el) =>
      openDialog(
        noteDialog(
          "Withdraw this review draft.",
          el.dataset.id,
          "withdraw_handoff",
        ),
      ),
    "os-import": () =>
      openDialog(
        dialogFrame(
          "Bring customer feedback into the loop.",
          "Import 1–100 structured feedback records. Stable source IDs prevent duplicates.",
          `<form id="os-import-form" class="form-fields"><label>JSON array<textarea class="code-input" name="items" required rows="12" placeholder='[{"source":"manual_import","external_id":"survey-001","category":"lead_quality","polarity":"negative","severity":"medium","text":"Most leads are outside our service area."}]'></textarea></label>${info("Import feedback you are authorized to use. Do not include credentials or unnecessary personal information.")}<div class="dialog-actions">${button("Cancel", "close-dialog")}<button type="submit" class="btn primary">Import & evaluate</button></div></form>`,
        ),
      ),
    "os-learning-sample": () => command("learning_sample", {}),
    "os-benchmark": () => command("benchmark", {}),
    "os-mock-campaign": () => command("mock_campaign", {}),
    "os-consent": () =>
      command("learning_consent", { opt_in: !state()?.learning?.opt_in }),
    "os-export": () => {
      if (!state()) return;
      const blob = new win.Blob([JSON.stringify(ui.os.data, null, 2)], {
        type: "application/json",
      });
      const url = win.URL.createObjectURL(blob),
        a = win.document.createElement("a");
      a.href = url;
      a.download = "hell-yeah-os-evidence.json";
      a.click();
      win.URL.revokeObjectURL(url);
    },
  };
  async function submit(form) {
    const data = Object.fromEntries(new win.FormData(form));
    if (form.id === "os-optimization-settings-form") {
      const old = state().optimization?.[form.dataset.mode]?.config;
      return command("optimization_configure", { expected_version: Number(form.dataset.version), config: {
        source_mode: form.dataset.mode, enabled: data.enabled === "on", share_learning: data.share_learning === "on",
        industry: data.industry ?? old?.industry, country: data.country, channel: "Search", currency: "USD", metric: "qualified_conversion_v1", min_roi_bps: Math.round(Number(data.min_roi) * 100),
      } }, form);
    }
    if (form.id === "os-optimization-review-form") {
      if (!data.confirmed) throw new Error("Confirm this exact draft packet.");
      return command("optimization_propose", { source_mode: form.dataset.mode, strategy_id: form.dataset.strategy, input_hash: form.dataset.hash }, form);
    }
    if (form.id === "os-wallet-intent-form") {
      if (!data.confirmed) throw new Error("Confirm the unpaid funding request.");
      return command("wallet_intent", { source_mode: data.source_mode, amount_cents: Math.round(Number(data.amount) * 100), currency: "USD", confirmed: true }, form);
    }
    if (form.id === "os-proposal-form")
      return command(
        "review_proposal",
        {
          id: form.dataset.id,
          content_hash: form.dataset.hash,
          response: data.response,
          reason: data.reason,
        },
        form,
      );
    if (form.id === "os-feedback-form")
      return command(
        "feedback",
        {
          ...data,
          campaign_id: data.campaign_id || null,
          source: "customer",
          external_id: (form.dataset.externalId ??= crypto.randomUUID()),
        },
        form,
      );
    if (form.id === "os-policy-form") {
      const policy = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k,
          Math.round(Number(v) * (k.endsWith("_micros") ? 1e6 : 100)),
        ]),
      );
      return command(
        "policy",
        { policy, expected_version: Number(form.dataset.version) },
        form,
      );
    }
    if (form.id === "os-response-form") {
      if (form.dataset.response === "accept" && !data.confirmed)
        throw new Error("Confirm the exact review draft.");
      return command(
        "respond",
        {
          decision_id: form.dataset.id,
          response: form.dataset.response,
          reason: data.reason,
        },
        form,
      );
    }
    if (form.id === "os-note-form")
      return command(
        form.dataset.kind,
        { id: form.dataset.id, note: data.note },
        form,
      );
    if (form.id === "os-import-form") {
      let items;
      try {
        items = JSON.parse(data.items);
      } catch {
        throw new Error("Enter a valid JSON array.");
      }
      return command("feedback_batch", { items }, form);
    }
  }
  const timer = win.fetch
    ? win.setInterval(() => {
        if (
          alive &&
          !ui.os.busy &&
          !win.document.hidden &&
          ["growth", "learning"].includes(ui.route)
        )
          void reload();
      }, 60000)
    : null;
  return {
    actions,
    runProductDemo: (payload, key) => command("product_demo", payload, { dataset: { requestKey: key }, querySelectorAll: () => [] }),
    submit,
    reload,
    start: () => {
      if (win.fetch) void reload();
      else {
        ui.os.loading = false;
        ui.os.error =
          "Connect to the published workspace to use the persistent OS.";
      }
    },
    change: (el) => command("sample", { name: el.value }),
    capture(previous, next) {
      if (!win.fetch) return;
      const ids = new Set(previous.activity.map((x) => x.id));
      for (const a of next.activity.filter((x) => !ids.has(x.id))) {
        let action = /declin|dismiss/i.test(a.text)
          ? "dismissed"
          : /approv|submitted/i.test(a.text)
            ? "approved"
            : /paus/i.test(a.text)
              ? "paused"
              : /start|resum/i.test(a.text)
                ? "started"
                : null;
        if (!action) continue;
        const ok = client.enqueue({
          source: "product_action",
          external_id: `activity:${a.id}`,
          category: "recommendation",
          polarity: "neutral",
          severity: "low",
          text: a.text,
          action,
          occurred_at: a.at,
        });
        if (!ok)
          notify(
            "Feedback could not be queued. Export your workspace to keep this action.",
            true,
          );
      }
      ui.os.pending = client.pending().length;
      if (win.fetch && ui.os.pending) void reload();
    },
    destroy() {
      alive = false;
      if (timer) win.clearInterval(timer);
    },
  };
}
