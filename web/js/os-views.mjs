import { demoRunSummary } from "./demo-views.mjs";
import { optimizationPanel, walletGrowthPanel } from "./optimization-views.mjs";
import { icon } from "./icons.mjs";
import { money } from "./model.mjs";
import {
  escape,
  button,
  heading,
  pill,
  info,
  dialogFrame,
  empty,
} from "./views.mjs";
const dollars = (n) =>
  n === null || n === undefined ? "Unknown" : money(n / 1e6);
const percent = (b) =>
  b === null || b === undefined ? "Unknown" : `${(b / 100).toFixed(1)}%`;
const category = (c) =>
  ({
    lead_quality: "Lead quality",
    brand_fit: "Brand fit",
    budget: "Budget & cash",
    inventory: "Inventory & capacity",
    experience: "Product experience",
    general: "General feedback",
    recommendation: "Recommendation",
  })[c] ?? c;
const time = (s) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
function connectionAction(os) {
  return os?.authRequired
    ? '<a class="btn primary" href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in to workspace</a>'
    : button("Retry connection", "os-reload", {
        kind: "primary",
        iconName: "refresh",
      });
}
export function growth(s, u, embedded = false) {
  const os = u.os ?? { loading: true },
    data = os.data,
    state = data?.state,
    d = state?.latest;
  const head = embedded ? "" : heading(
    "AUTONOMOUS GROWTH OS",
    "Better feedback. Better next moves.",
    "Customer returns lead. Productive growth follows.",
    `${button("Share feedback", "os-feedback", { iconName: "plus", disabled: !state || os.busy })}${button(os.busy ? "Evaluating…" : "Run learning cycle", "os-evaluate", { kind: "primary", iconName: "spark", disabled: !state || os.busy })}`,
  );
  if (!state)
    return (
      head +
      `<section class="panel">${empty(os.loading ? "Connecting to your learning workspace…" : "The OS connection needs attention.", os.loading ? "Loading persistent feedback and growth decisions." : escape(os.error || "Please retry the connection."), os.loading ? "" : connectionAction(os))}</section>`
    );
  const explicit = state.feedback.filter((f) => f.source !== "product_action"),
    unresolved = explicit.filter((f) => f.status !== "resolved"),
    material = unresolved.filter(
      (f) =>
        f.polarity === "negative" &&
        (f.severity === "high" ||
          ["budget", "inventory", "lead_quality", "brand_fit"].includes(
            f.category,
          )),
    );
  const econ = d?.economics,
    p = state.policy;
  return (
    head +
    (embedded ? "" : demoRunSummary(os)) +
    `<div class="os-sourcebar"><div class="row"><span class="os-connected"></span><strong>Persistent workspace</strong><span class="muted">·</span><span>Revision ${data.revision}</span>${os.pending ? pill(`${os.pending} actions waiting to sync`, "orange-pill") : ""}</div><label><span class="sr-only">Synthetic economics scenario</span><select data-change="os-sample" ${os.busy || state.bound_managed_account_id ? "disabled" : ""}>${state.bound_managed_account_id ? `<option selected>Source report · v${state.snapshot.version}</option>` : ""}${[
      ["baseline", "Sample: missing marginal evidence"],
      ["scale_ready", "Sample: ready for bounded growth"],
      ["poor_returns", "Sample: poor returns"],
      ["tracking_gap", "Sample: tracking gap"],
    ]
      .map(
        ([value, label]) =>
          `<option value="${value}" ${state.snapshot.name === value ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label></div>${os.error ? `<div class="info-bar mb16">${icon("info")}<span>${escape(os.error)}</span></div>` : ""}
 <section class="os-objective"><div><span class="eyebrow">THE OPERATING PRINCIPLE</span><h2 class="display">Earn the right to scale.</h2><p>Improve customer contribution. Reinvest a chosen share of the gains. Keep the next commitment inside clear limits.</p></div><div class="os-objective-numbers"><div><strong>${percent(p.min_roi_bps)}</strong><span>Minimum contribution ROI</span></div><div><strong>${percent(p.reinvest_bps)}</strong><span>Profit reinvestment limit</span></div><button class="btn small" data-action="os-policy">Your growth controls ${icon("arrow")}</button></div></section>
 <section class="metrics os-metrics"><div class="metric"><div class="metric-label">Contribution after acquisition ${icon("wallet")}</div><div class="metric-value">${econ ? dollars(econ.contribution_micros) : "—"}</div><div class="metric-note">Synthetic · After media and platform fees</div></div><div class="metric"><div class="metric-label">Contribution ROI ${icon("simulate")}</div><div class="metric-value">${econ ? percent(econ.roi_bps) : "—"}</div><div class="metric-note">Attributed economics, not causal lift</div></div><div class="metric"><div class="metric-label">Customer feedback ${icon("creative")}</div><div class="metric-value">${explicit.length}</div><div class="metric-note">${unresolved.length} open · ${material.length} material concerns</div></div><div class="metric"><div class="metric-label">Decisions recorded ${icon("layers")}</div><div class="metric-value">${state.decisions.length}</div><div class="metric-note">${state.last_evaluated_at ? `Latest ${time(state.last_evaluated_at)}` : "Run the first learning cycle"}</div></div></section>
 <div class="os-decision-grid"><section class="panel os-recommendation"><div class="panel-head"><div><span class="eyebrow orange">THE NEXT INFORMED MOVE</span><h2 class="display">${d ? escape(d.title) : "Let the evidence set the direction."}</h2></div>${pill(d?.type === "bounded_expansion" ? "Growth opportunity" : "Learning before scaling", "orange-pill")}</div><div class="panel-body">${d ? `<p class="os-reason">${d.type === "bounded_expansion" ? "The synthetic marginal return clears your chosen floor. A limited increase is ready for your review." : d.type === "resolve_feedback" ? "Customer concerns are part of the decision. Address the open issues before considering a larger budget." : "The current evidence does not support a budget increase. The checklist shows what needs to change."}</p><div class="os-proposal"><div><span>Proposed additional budget</span><strong>${dollars(d.chosen.increment_micros)}</strong></div><div><span>Conservative extra contribution</span><strong>${dollars(d.chosen.lower_contribution_micros)}</strong></div><div><span>Customer funds moved</span><strong>$0</strong></div></div><div class="row spread mt24"><span class="tiny muted">${escape(d.status)} · ${escape(d.orchestrator || "Decision kernel")}</span><div class="row">${button("Inspect decision", "os-decision", { small: true, data: `data-id="${d.id}"`, iconName: "arrow" })}${d.type === "bounded_expansion" && d.status === "Pending" ? button("Review opportunity", "os-respond", { kind: "primary", small: true, data: `data-id="${d.id}" data-response="accept"` }) : ""}</div></div>` : `<p class="os-reason">The OS combines customer feedback, your return floor, available capacity and evidence about the next ad dollar.</p><div class="mt24">${button("Evaluate the sample account", "os-evaluate", { kind: "primary", iconName: "spark", disabled: os.busy })}</div>`}</div><div class="source-note">Economic evidence is synthetic. Accepting an opportunity creates a review draft; it never spends funds.</div></section><section class="panel"><div class="panel-head"><div><h2>What unlocks growth?</h2><p>Every condition has to earn its check.</p></div></div><div class="panel-body os-gates">${d ? d.gates.map((g) => `<div class="os-gate ${g.pass ? "pass" : "hold"}"><span>${icon(g.pass ? "check" : "clock")}</span><p>${escape(g.label)}</p><small>${g.pass ? "Ready" : "Needed"}</small></div>`).join("") : '<p class="muted tiny">Run an evaluation to see the readiness checklist.</p>'}</div></section></div>
 <div class="bottom-grid"><section class="panel"><div class="panel-head"><div><h2>The customer signal</h2><p>Actual submitted feedback, kept separate from sample economics.</p></div>${button("Add feedback", "os-feedback", { small: true, iconName: "plus", disabled: os.busy })}</div>${
   explicit.length
     ? `<div class="os-feedback-list">${explicit
         .slice(0, 8)
         .map(
           (f) =>
             `<article class="os-feedback-row"><div class="row spread"><strong>${escape(category(f.category))}</strong>${pill(f.status === "resolved" ? "Resolved" : f.polarity === "negative" ? "Concern" : f.polarity === "positive" ? "Positive" : "Observation", f.polarity === "negative" && f.status !== "resolved" ? "orange-pill" : "outline")}</div><p>${escape(f.text)}</p><div class="row spread"><span class="tiny muted">${time(f.received_at)} · ${escape(f.source.replaceAll("_", " "))}</span>${f.status !== "resolved" ? button("Resolve", "os-resolve", { small: true, data: `data-id="${f.id}"` }) : '<span class="tiny muted">Resolution recorded</span>'}</div>${f.resolution ? `<div class="os-resolution">${escape(f.resolution.note)}</div>` : ""}</article>`,
         )
         .join("")}</div>`
     : empty(
         "The loop starts with listening.",
         "Share lead quality, brand fit, budget constraints or product feedback. The next evaluation will take it into account.",
       )
 }<div class="source-note">${state.feedback.filter((f) => f.source === "product_action").length} product actions also captured · Approval is intent, not proof of ROI.</div></section><section class="panel"><div class="panel-head"><h2>Your growth envelope</h2><button class="text-btn" data-action="os-policy">Edit ${icon("arrow")}</button></div><div class="panel-body"><div class="os-limit"><span>Monthly media ceiling</span><strong>${dollars(p.monthly_cap_micros)}</strong></div><div class="os-limit"><span>Maximum single step</span><strong>${percent(p.max_step_bps)}</strong></div><div class="os-limit"><span>Cash capacity</span><strong>${dollars(p.cash_capacity_micros)}</strong></div><div class="os-limit"><span>Inventory capacity</span><strong>${dollars(p.inventory_capacity_micros)}</strong></div><div class="os-limit"><span>Maximum reinvestment</span><strong>${percent(p.reinvest_bps)}</strong></div><div class="divider"></div><p class="tiny muted">These controls shape recommendations. Each exact spending plan still requires customer approval and the existing Hellyeah review.</p></div></section></div>
 <section class="panel mt24"><div class="panel-head"><div><h2>A system that shows its work</h2><p>Immutable decisions, customer responses, and the evidence available at the time.</p></div>${button("Import feedback batch", "os-import", { small: true, iconName: "download" })}</div>${
   state.decisions.length
     ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Decision</th><th>Proposed increase</th><th>Status</th><th>Policy</th><th>Recorded</th><th></th></tr></thead><tbody>${state.decisions
         .slice(0, 10)
         .map(
           (x) =>
             `<tr><td><button class="table-link" data-action="os-decision" data-id="${x.id}">${escape(x.title)}</button></td><td>${dollars(x.chosen.increment_micros)}</td><td>${escape(x.status)}</td><td>v${x.policy_version}</td><td>${time(x.at)}</td><td><button class="btn ghost icon-only" data-action="os-decision" data-id="${x.id}" aria-label="Inspect recorded decision">${icon("arrow")}</button></td></tr>`,
         )
         .join("")}</tbody></table></div>`
     : '<div class="small-empty">The first evaluation starts your decision history.</div>'
 }</section>${walletGrowthPanel(os)}${proposalInbox(state.proposals ?? [])}
 ${state.review_handoffs.length ? `<section class="panel mt24"><div class="panel-head"><h2>Review handoffs</h2>${pill("No live execution")}</div>${state.review_handoffs.map((h) => `<div class="scenario-row"><span class="decision-icon">${icon("shield")}</span><div class="scenario-copy"><strong>${dollars(h.maximum_additional_micros)} bounded growth plan</strong><p>${escape(h.state)} · Exact evidence snapshot retained</p></div>${h.state !== "Withdrawn" ? button("Withdraw draft", "os-withdraw", { small: true, data: `data-id="${h.id}"` }) : ""}</div>`).join("")}</section>` : ""}`
  );
}
export function feedbackDialog(s) {
  return dialogFrame(
    "Tell the OS what you are seeing.",
    "Your feedback becomes a traceable input to the next decision.",
    `<form id="os-feedback-form" class="form-fields"><div class="paired-fields"><label>Feedback category<select name="category">${["lead_quality", "brand_fit", "budget", "inventory", "experience", "general"].map((c) => `<option value="${c}">${category(c)}</option>`).join("")}</select></label><label>Signal<select name="polarity"><option value="negative">Concern</option><option value="positive">Positive result</option><option value="neutral">Observation</option></select></label></div><div class="paired-fields"><label>Importance<select name="severity"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></label><label>Campaign context<select name="campaign_id"><option value="">Whole account</option>${s.campaigns
      .filter((c) => ["c1", "c2", "c3", "c4"].includes(c.id))
      .map((c) => `<option value="${c.id}">${escape(c.name)}</option>`)
      .join(
        "",
      )}</select></label></div><label>What should change?<textarea name="text" required minlength="3" maxlength="2000" placeholder="e.g. Leads are coming in, but most are outside our target customer profile."></textarea></label>${info("Feedback can change priorities or block expansion. A positive comment does not change measured revenue or certify a forecast.")}<div class="dialog-actions">${button("Cancel", "close-dialog")}<button type="submit" class="btn primary">Save feedback & evaluate ${icon("arrow")}</button></div></form>`,
  );
}
function proposalInbox(proposals) {
  const names = {
    simulator: "Simulator",
    creative: "Creative intelligence",
    experiments: "Experimentation",
  };
  return `<section class="panel mt24"><div class="panel-head"><div><h2>Evidence from every product</h2><p>Saved research, scenarios and test designs in one durable review inbox.</p></div>${pill(`${proposals.length} snapshots`)}</div>${
    proposals.length
      ? proposals
          .slice(0, 12)
          .map(
            (p) =>
              `<div class="scenario-row"><span class="decision-icon">${icon("layers")}</span><div class="scenario-copy"><strong>${escape(p.title)}</strong><p>${names[p.product]} · v${p.revision} · ${escape(p.status)}</p></div>${button("Inspect evidence", "os-proposal", { small: true, data: `data-id="${p.id}"` })}</div>`,
          )
          .join("")
      : '<div class="small-empty">Choose Send to OS on a saved scenario, creative or experiment design. Each snapshot keeps its source and limitations.</div>'
  }<div class="source-note">Research acceptance grants no spend authority. Financial recommendations still require measured outcomes and the existing review flow.</div></section>`;
}
export function proposalDialog(p, superseded = false) {
  const labels = {
    budget_micros: "Planned media budget",
    days: "Duration (days)",
    channel: "Channel",
    goal: "Goal",
    creative_id: "Source creative",
    creative_version: "Creative version",
    brand_version: "Brand version",
    calibration: "Calibration",
    angle: "Creative angle",
    observation: "Observed sample",
    evidence_grade: "Evidence grade",
    hypothesis: "Hypothesis",
    unit: "Assignment unit",
    metric: "Primary metric",
    allocation_bps: "Treatment allocation",
    target_assignments: "Fixed sample target",
    inference: "Inference",
  };
  const value = (k, v) =>
    k.endsWith("_micros")
      ? dollars(v)
      : k.endsWith("_bps")
        ? percent(v)
        : escape(String(v).replaceAll("_", " "));
  return dialogFrame(
    escape(p.title),
    `Evidence snapshot v${p.revision} · Fixture source`,
    `<div class="plan-summary"><dl>${Object.entries(p.data)
      .map(
        ([k, v]) => `<dt>${labels[k] ?? escape(k)}</dt><dd>${value(k, v)}</dd>`,
      )
      .join(
        "",
      )}</dl></div>${info("Accepting this snapshot means it is worth researching. It does not certify a forecast, declare a winning test, launch a campaign or move money.")}${superseded ? info("A newer revision exists. Review the newest snapshot in the inbox.") : p.status === "Queued for evidence review" ? `<form id="os-proposal-form" data-id="${p.id}" data-hash="${p.content_hash}" class="form-fields mt24"><label>Research decision<select name="response"><option value="accept_research">Accept for research</option><option value="dismiss">Dismiss</option></select></label><label>Reason<textarea name="reason" required minlength="3" maxlength="1000"></textarea></label><div class="dialog-actions">${button("Cancel", "close-dialog")}<button type="submit" class="btn primary">Save research decision</button></div></form>` : `<div class="evidence-card"><h3>${escape(p.status)}</h3><p>${escape(p.review?.reason ?? "")}</p></div>`}`,
  );
}
export function policyDialog(state) {
  const p = state.policy;
  const fields = [
    [
      "monthly_cap_micros",
      "Monthly media ceiling ($)",
      p.monthly_cap_micros / 1e6,
      100,
      10000000,
      100,
    ],
    [
      "min_roi_bps",
      "Minimum contribution ROI (%)",
      p.min_roi_bps / 100,
      0,
      500,
      1,
    ],
    [
      "max_step_bps",
      "Maximum budget increase (%)",
      p.max_step_bps / 100,
      0,
      20,
      1,
    ],
    [
      "reinvest_bps",
      "Maximum profit reinvestment (%)",
      p.reinvest_bps / 100,
      0,
      100,
      1,
    ],
    [
      "cash_capacity_micros",
      "Cash available for expansion ($)",
      p.cash_capacity_micros / 1e6,
      0,
      10000000,
      100,
    ],
    [
      "inventory_capacity_micros",
      "Capacity-supported additional spend ($)",
      p.inventory_capacity_micros / 1e6,
      0,
      10000000,
      100,
    ],
  ];
  return dialogFrame(
    "Let growth work on your terms.",
    "Customer controls · Policy version " + state.policy_version,
    `<form id="os-policy-form" data-version="${state.policy_version}" class="form-fields"><div class="os-policy-fields">${fields.map(([name, label, value, min, max, step]) => `<label>${label}<input name="${name}" type="number" value="${value}" min="${min}" max="${max}" step="${step}" required></label>`).join("")}</div>${info("The OS takes the smallest of all capacity limits. These preferences never authorize a charge. Saving a new policy starts a new opportunity-review cycle.")}<div class="dialog-actions">${button("Cancel", "close-dialog")}<button class="btn primary" type="submit">Save growth controls ${icon("check")}</button></div></form>`,
  );
}
export function decisionDialog(d, latestId) {
  return dialogFrame(
    escape(d.title),
    "Decision history · Synthetic economic evidence",
    `<div class="row spread">${pill(escape(d.status), "orange-pill")}<span class="tiny muted">Policy v${d.policy_version} · ${time(d.at)}</span></div><div class="plan-summary mt24"><dl><dt>Proposed additional spend</dt><dd>${dollars(d.chosen.increment_micros)}</dd><dt>Conservative added contribution</dt><dd>${dollars(d.chosen.lower_contribution_micros)}</dd><dt>Marginal contribution ROI</dt><dd>${percent(d.chosen.marginal_roi_bps)}</dd><dt>Current media ROAS</dt><dd>${d.economics.roas_bps === null ? "Unknown" : (d.economics.roas_bps / 10000).toFixed(2) + "×"}</dd><dt>Current contribution ROI</dt><dd>${percent(d.economics.roi_bps)}</dd><dt>Orchestration</dt><dd>${escape(d.orchestrator || "Deterministic kernel")}</dd></dl></div><div class="os-gates">${d.gates
      .filter((g) => !g.pass)
      .map(
        (g) =>
          `<div class="os-gate hold">${icon("clock")}<p>${escape(g.label)}</p></div>`,
      )
      .join(
        "",
      )}</div><h3 class="mt24 mb16">Every alternative stays visible</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Increase</th><th>Low contribution</th><th>Result</th></tr></thead><tbody>${d.candidates.map((c) => `<tr><td>${dollars(c.increment_micros)}</td><td>${dollars(c.lower_contribution_micros)}</td><td style="white-space:normal">${c.eligible ? "Within the envelope" : escape(c.reasons.join("; "))}</td></tr>`).join("")}</tbody></table></div><div class="mt24">${info("The margin, source outcomes and marginal bounds in this release are synthetic. The calculation is real, but it is not a recommendation to spend real money. No platform fee or spend metric overrides the customer return floor.")}</div>${d.response ? `<div class="evidence-card"><h3>Customer response</h3><p>${escape(d.response.reason)}</p></div>` : ""}<div class="dialog-actions">${d.status === "Pending" ? button("Decline / keep budget", "os-respond", { data: `data-id="${d.id}" data-response="decline"` }) : ""}${d.type === "bounded_expansion" && d.status === "Pending" && d.id === latestId ? button("Review opportunity", "os-respond", { kind: "primary", data: `data-id="${d.id}" data-response="accept"` }) : button("Close", "close-dialog", { kind: "primary" })}</div>`,
  );
}
export function responseDialog(d, response) {
  return dialogFrame(
    response === "accept"
      ? "Review a bounded next step."
      : "Keep the budget. Keep the learning.",
    response === "accept"
      ? "A draft handoff for existing Hellyeah review."
      : "Your decision is a useful signal.",
    `<form id="os-response-form" data-id="${d.id}" data-response="${response}" class="form-fields">${response === "accept" ? `<div class="plan-summary"><dl><dt>Maximum additional budget</dt><dd>${dollars(d.chosen.increment_micros)}</dd><dt>Required contribution ROI</dt><dd>${percent(d.chosen.marginal_roi_bps)} marginal lower-bound case</dd><dt>Next state</dt><dd>Draft for Hellyeah review</dd><dt>Wallet reservation now</dt><dd>$0</dd></dl></div>` : info("New growth prompts will pause for seven days, or until you explicitly save a new growth policy. No campaign or Wallet balance changes.")}<label>Reason<textarea name="reason" required minlength="3" maxlength="1000" placeholder="What matters most in this decision?"></textarea></label>${response === "accept" ? '<label class="confirmation"><input type="checkbox" name="confirmed" required>I approve creating this exact synthetic review draft. I understand this does not launch a campaign or spend funds.</label>' : ""}<div class="dialog-actions">${button("Cancel", "close-dialog")}<button class="btn primary" type="submit">${response === "accept" ? "Create review draft" : "Record decision"} ${icon("arrow")}</button></div></form>`,
  );
}
export function learningHome(s, u) {
  const state = u.os?.data?.state,
    l = state?.learning,
    m = l?.model,
    b = l?.benchmark;
  const head = heading(
    "COMPOUNDING INTELLIGENCE",
    "Learn locally. Improve together.",
    "Customer-specific evidence, bounded aggregate learning, and a challenger that has to prove its value.",
    button("Export evidence", "os-export", {
      iconName: "download",
      disabled: !state,
    }),
  );
  if (!state)
    return (
      head +
      info(u.os?.error || "Connecting to your learning workspace…") +
      connectionAction(u.os)
    );
  const pct = (v) => `${Math.round(v * 100)}%`;
  return (
    head + optimizationPanel(state, u.os) +
    `<section class="os-objective"><div><span class="eyebrow">THE 2× STANDARD</span><h2>Better is a result.<br>Not a promise.</h2><p>Measure customer contribution against a baseline. Keep challengers in shadow until the evidence earns promotion.</p></div><div class="os-objective-stat"><strong>${b?.observed_factor ? b.observed_factor.toFixed(2) + "×" : "—"}</strong><span>${b ? "Synthetic replay result" : "No benchmark yet"}</span></div></section>
 <div class="metrics-grid"><div class="metric"><div class="metric-label">Your mature outcome windows</div><div class="metric-value">${m?.mature_rows ?? 0}</div><div class="metric-note">${m?.pending_rows ?? 0} awaiting maturity</div></div><div class="metric"><div class="metric-label">Personal evidence weight</div><div class="metric-value">${m ? pct(m.personal_weight) : "—"}</div><div class="metric-note">Your outcomes outweigh the prior</div></div><div class="metric"><div class="metric-label">Aggregate participants</div><div class="metric-value">${m?.aggregate?.participants ?? 0}</div><div class="metric-note">At least 5 other workspaces required</div></div><div class="metric"><div class="metric-label">Release mode</div><div class="metric-value os-word-value">Shadow</div><div class="metric-note">Real-world 2× improvement unproven</div></div></div>
 <div class="work-grid"><section class="panel"><div class="panel-head"><div><h2>Your customer model</h2><p>A recency-weighted qualification model with a bounded prior.</p></div>${pill(m?.drift.detected ? "Drift detected" : "Shadow model", m?.drift.detected ? "orange-pill" : "outline")}</div><div class="panel-body">${m ? `<div class="os-model-number">${pct(m.qualification.mean)}<span>modeled qualified-outcome rate</span></div><div class="os-range" role="img" aria-label="Approximate qualification interval ${pct(m.qualification.lower)} to ${pct(m.qualification.upper)}"><span style="left:${m.qualification.lower * 100}%;width:${(m.qualification.upper - m.qualification.lower) * 100}%"></span><i style="left:${m.qualification.mean * 100}%"></i></div><div class="row spread tiny muted"><span>${pct(m.qualification.lower)} lower</span><span>${pct(m.qualification.upper)} upper</span></div><div class="divider"></div><div class="os-limit"><span>Weighted observations</span><strong>${m.weighted_observations}</strong></div><div class="os-limit"><span>Aggregate prior strength</span><strong>${m.prior_strength} observations</strong></div><div class="os-limit"><span>Quality veto</span><strong>${m.expansion_veto ? "Expansion blocked" : "No quality veto"}</strong></div><p class="os-reason">${escape(m.next_best_learning)}</p>` : '<p class="muted">Load a labeled synthetic outcome history to inspect the first model update.</p>'}<div class="mt24">${button("Load sample outcomes", "os-learning-sample", { kind: "primary", iconName: "plus", disabled: u.os.busy })}</div><p class="tiny muted mt16">Sample outcomes are synthetic and replace only the sample learning history. The interval describes quality, not predicted financial return.</p></div></section>
 <section class="panel"><div class="panel-head"><div><h2>Collective learning, with boundaries</h2><p>Aggregate evidence never exposes another customer's feedback.</p></div></div><div class="panel-body"><div class="setting-row"><div><h3>Contribute to aggregate learning</h3><p>Share clipped numerical counts. Feedback text, campaign IDs and customer identities stay in your workspace.</p></div><button class="switch" role="switch" aria-checked="${l?.opt_in ?? false}" aria-label="Contribute to aggregate learning" data-action="os-consent" ${u.os.busy ? "disabled" : ""}><span></span></button></div><div class="os-gates">${["Opt-in required for every contributor", "At least five other workspaces per cohort", "Equal maximum weight per workspace", "At most 20 prior observations in your model", "Feedback preferences stay personal"].map((t) => `<div class="os-gate pass">${icon("check")}<p>${t}</p></div>`).join("")}</div>${info(m?.aggregate?.available ? "Eligible aggregate evidence is contributing to this model." : "Aggregate learning is withheld until the cohort has enough independent contributors.")}<p class="tiny muted mt16">This pilot uses thresholding and rounded statistics, not differential privacy. Production cohort releases require a separate privacy review.</p></div></section></div>
 <section class="panel mt24"><div class="panel-head"><div><h2>Challenger versus baseline</h2><p>A repeatable evidence gate for the 2× ambition.</p></div>${button("Run replay benchmark", "os-benchmark", { kind: "primary", iconName: "play", disabled: u.os.busy })}</div><div class="panel-body">${b ? `<div class="os-result-metrics"><div><span>Observed contribution factor</span><strong>${b.observed_factor?.toFixed(2) ?? "Undefined"}×</strong></div><div><span>95% lower factor bound</span><strong>${b.factor_lower_bound?.toFixed(2) ?? "Undefined"}×</strong></div><div><span>Target</span><strong>2.00×</strong></div><div><span>Independent synthetic units</span><strong>${b.independent_units}</strong></div></div><div class="mt24">${info(b.target_met ? "Synthetic target met. Production promotion still requires real randomized evidence." : "Target not met. Keep the challenger in shadow and improve the policy.")}</div><p class="tiny muted mt16">${escape(b.method)}</p>` : '<p class="muted">Run the fixed synthetic replay to inspect paired contribution, uncertainty, and promotion criteria. A replay pass is not a claim of real customer lift.</p>'}</div><div class="source-note">No self-reported win, approval click, or aggregate popularity signal can certify a financial uplift.</div></section>${mockCampaignPanel(state.last_mock_trial, u.os.busy)}${backgroundJobsPanel(u.os)}`
  );
}

function mockCampaignPanel(trial, busy) {
  return `<section class="panel mt24"><div class="panel-head"><div><h2>A campaign that tests the whole loop</h2><p>Mock managed Google Ads → source outcomes → revised recommendation.</p></div>${button("Run mock campaign", "os-mock-campaign", { kind: "primary", iconName: "play", disabled: busy })}</div><div class="panel-body">${trial ? `<div class="row spread mb16">${pill(trial.passed ? "End-to-end checks passed" : "Needs investigation", trial.passed ? "outline" : "orange-pill")}<span class="tiny muted">${time(trial.at)} · ${trial.network_calls} ad-network calls</span></div><div class="os-trial-flow">${trial.events.map((e, i) => `<div><span>0${i + 1}</span><strong>${escape(e.state)}</strong><p>${escape(e.action)}</p></div>`).join("")}<div><span>03</span><strong>Learn & revise</strong><p>Corrected outcomes replace the prior source revision.</p></div></div>${trial.products ? `<div class="os-product-checks"><a href="#creative"><strong>Creative intelligence</strong><span>${escape(trial.products.creative.status)}</span></a><a href="#simulator"><strong>Campaign simulator</strong><span>${escape(trial.products.simulator.status)}</span></a><a href="#experiments"><strong>Experimentation</strong><span>${escape(trial.products.experimentation.status)}</span></a><a href="#growth"><strong>Autonomous OS</strong><span>${escape(trial.products.os.status)}</span></a></div>` : ""}<div class="os-result-metrics"><div><span>Healthy outcome proposal</span><strong>${dollars(trial.healthy.increment_micros)}</strong></div><div><span>After poor-quality correction</span><strong>${dollars(trial.corrected.increment_micros)}</strong></div><div><span>Active outcome windows</span><strong>${trial.active_outcome_windows}</strong></div><div><span>Duplicate reservation</span><strong>${trial.reservation_once ? "Prevented" : "Failed"}</strong></div></div><p class="tiny muted mt16">${escape(trial.healthy.orchestrator)} evaluated both source revisions. A correction reduced the modeled qualification rate from ${Math.round(trial.healthy.qualification * 100)}% to ${Math.round(trial.corrected.qualification * 100)}%. Financial and quality gates prevented an increase.</p>` : '<p class="muted">Run an isolated mock account through the existing review and reservation sequence. Healthy results should permit a bounded draft; corrected poor results should hold spend. Duplicate reports must never double-count evidence.</p>'}</div><div class="source-note">Synthetic account and funds. No Google API request, real campaign, charge or change to your customer evidence.</div></section>`;
}


function backgroundJobsPanel(os) {
  const q = os.jobs;
  if (!q) return "";
  const labels = { evaluate: "Learning refresh", mock_campaign: "Mock campaign rehearsal", source_batch: "Source report batch", feedback_batch: "Feedback import", optimization_register: "Trial registration", optimization_batch: "Trial outcomes" };
  const states = { queued: "Waiting", running: "Processing", succeeded: "Completed", dead_letter: "Needs attention" };
  return `<section class="panel mt24" id="background-jobs"><div class="panel-head"><div><span class="eyebrow orange">DURABLE PROCESSING</span><h2>Keep learning when you leave.</h2><p>Accepted work stays on the server through reloads and interruptions.</p></div>${button("Process pending jobs", "os-drain-jobs", { kind: "primary", iconName: "play", disabled: os.busy || !(q.counts.queued + q.counts.running) })}</div>
  <div class="panel-body"><div class="setting-row"><div><h3>Background learning refresh</h3><p>Use the hourly worker to refresh your model from saved evidence. Existing queued imports continue even when this setting is off.</p></div><button class="switch" role="switch" aria-checked="${q.background.enabled}" aria-label="Background learning refresh" data-action="os-background" ${os.busy ? "disabled" : ""}><span></span></button></div>
  <div class="os-result-metrics"><div><span>Waiting</span><strong>${q.counts.queued}</strong></div><div><span>Processing</span><strong>${q.counts.running}</strong></div><div><span>Completed</span><strong>${q.counts.succeeded}</strong></div><div><span>Needs attention</span><strong>${q.counts.dead_letter}</strong></div></div>
  ${q.counts.dead_letter ? info("A failed job needs review. Retries preserve the original input. Later reports from that source wait until the failure is resolved.") : ""}
  <div class="row os-job-actions mt24">${button("Queue learning refresh", "os-queue-evaluate", { disabled: os.busy })}${button("Queue mock rehearsal", "os-queue-trial", { disabled: os.busy })}${button("Refresh status", "os-reload", { disabled: os.busy })}</div>
  ${q.jobs.length ? `<div class="table-wrap mt24"><table><thead><tr><th>Work</th><th>Status</th><th>Attempts</th><th>Updated</th><th><span class="sr-only">Recovery</span></th></tr></thead><tbody>${q.jobs.map((j) => `<tr><td><strong>${escape(labels[j.kind] ?? j.kind)}</strong>${j.error_code ? `<div class="tiny muted">${escape(j.error_code)}</div>` : ""}</td><td>${pill(states[j.status] ?? j.status, j.status === "dead_letter" ? "orange-pill" : "outline")}</td><td>${j.total_attempts}</td><td>${time(j.updated_at)}</td><td>${j.status === "dead_letter" ? button("Retry saved job", "os-retry-job", { small: true, disabled: os.busy, data: `data-id="${j.id}" data-attempts="${j.total_attempts}"` }) : ""}</td></tr>`).join("")}</tbody></table></div>` : '<p class="tiny muted mt24">No background work yet. Queue a learning refresh to exercise durable processing.</p>'}
  ${q.cursors.length ? `<div class="divider"></div><h3>Source checkpoints</h3>${q.cursors.map((c) => `<div class="os-limit"><span>${escape(c.managed_account_id)}</span><strong>${c.applied_revision} applied / ${c.received_revision} received</strong></div>`).join("")}` : ""}
  </div><div class="source-note">Jobs use saved evidence and preserve all ROI, consent and review gates. A background refresh cannot move funds or launch an ad.</div></section>`;
}
