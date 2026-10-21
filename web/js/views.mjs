import { demoHome, demoBanner } from "./demo-views.mjs";
import { foundationShell, foundationRoutes } from "./foundation-views.mjs";
import { siteHeader } from "./site-views.mjs";
import { walletGrowthPanel } from "./optimization-views.mjs";
import { learningHome } from "./os-views.mjs";
import { growthHome as growth } from "./growth-home.mjs";
import { icon } from "./icons.mjs";
import {
  money,
  number,
  totals,
  readiness,
  draftFingerprint,
} from "./model.mjs";
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const routes = {
  home: { title: "Overview", icon: "grid" },
  onboarding: { title: "Set up your business", icon: "globe" },
  studio: { title: "Studio", icon: "creative" },
  tracking: { title: "Tracking", icon: "globe" },
  "new-campaign": { title: "New Campaign", icon: "campaign" },
  "wallet-lab": { title: "Wallet research", icon: "wallet" },
  demo: { title: "Campaign guide", icon: "play" },
  growth: { title: "Growth OS", icon: "spark" },
  learning: { title: "Learning lab", icon: "experiment" },
  overview: { title: "Overview", icon: "grid" },
  campaigns: { title: "Campaigns", icon: "campaign" },
  simulator: { title: "Campaign simulator", icon: "simulate" },
  creative: { title: "Creative intelligence", icon: "creative" },
  experiments: { title: "Experiments", icon: "experiment" },
  brand: { title: "Brand", icon: "globe" },
  wallet: { title: "Wallet", icon: "wallet" },
  settings: { title: "Workspace settings", icon: "settings" },
};
export const button = (
  label,
  action,
  { kind = "", data = "", iconName = "", small = false, disabled = false } = {},
) =>
  `<button type="button" class="btn ${kind} ${small ? "small" : ""}" data-action="${action}" ${data} ${disabled ? "disabled" : ""}>${iconName ? icon(iconName) : ""}${label}</button>`;
export const status = (value) =>
  `<span class="status-label status-${escape(value.toLowerCase().replaceAll(" ", "-"))}"><span class="dot"></span>${escape(value)}</span>`;
export const pill = (text, cls = "") =>
  `<span class="pill ${cls}">${text}</span>`;
export const empty = (title, text, action = "") =>
  `<div class="empty">${icon("layers")}<h3>${title}</h3><p>${text}</p>${action}</div>`;
export const info = (text) =>
  `<div class="info-bar">${icon("info")}<span>${text}</span></div>`;
export function heading(kicker, title, subtitle, actions = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
}
export const footer = () =>
  `<footer class="footer"><div class="footer-left">${icon("shield")}<span>Demo workspace · Fictional data. No real ad spend.</span></div><span>Built to learn. Designed to grow.</span><a href="https://docs.hellyeahai.com" target="_blank" rel="noopener noreferrer">Hellyeah docs ↗</a></footer>`;
const nav = (key, s, u) =>
  `<a href="#${key}" class="nav-link ${u.route === key ? "active" : ""}" aria-label="${routes[key].title}" ${u.route === key ? 'aria-current="page"' : ""} title="${routes[key].title}">${icon(routes[key].icon)}<span class="nav-text">${routes[key].title.replace("Growth overview", "Overview").replace("Campaign simulator", "Simulator").replace("Creative intelligence", "Creative intelligence")}</span>${key === "experiments" ? `<span class="nav-count">${s.experiments.filter((e) => e.status === "Running").length}</span>` : ""}</a>`;
export function shell(s, u) {
  if (foundationRoutes.includes(u.route)) return foundationShell(s,u);
  return `${siteHeader(u.route)}<div class="workspace-frame"><div class="workspace-bar"><button class="workspace-org" data-action="organization"><span class="org-mark">${escape(s.brand.name[0])}</span><strong>${escape(s.brand.name)}</strong>${icon("down")}</button><nav class="workspace-nav" aria-label="Workspace navigation">${["demo", "overview", "campaigns", "brand", "wallet", "learning", "settings"].map(key => nav(key, s, u)).join("")}</nav><div class="workspace-tools"><button class="btn ghost icon-only" data-action="search" aria-label="Search workspace">${icon("search")}</button><button class="demo-badge" data-action="about-demo">Demo mode</button></div></div><main id="main" class="content" tabindex="-1">${demoBanner(s, u)}${content(s, u)}${footer()}</main></div>`;
}
function content(s, u) {
  return (
    {
      demo: demoHome,
      growth,
      learning: learningHome,
      overview: overview,
      campaigns: campaigns,
      simulator: simulator,
      creative: creative,
      experiments: experiments,
      brand: brand,
      wallet: wallet,
      "wallet-lab": wallet,
      settings: settings,
    }[u.route] ?? overview
  )(s, u);
}
export function performanceData(s) {
  const total =
    totals(s)[s.chartMetric === "purchases" ? "purchases" : "spend"];
  const weights = [
    0.045, 0.049, 0.051, 0.059, 0.063, 0.069, 0.076, 0.085, 0.091, 0.096, 0.101,
    0.105, 0.11,
  ];
  const sum = weights.reduce((a, b) => a + b, 0);
  let assigned = 0;
  return weights.map((w, i) => {
    const value =
      i === weights.length - 1
        ? total - assigned
        : Math.round((total * w) / sum);
    assigned += value;
    return { label: `Period ${i + 1}`, value };
  });
}
function performanceChart(s) {
  const data = performanceData(s),
    max = Math.ceil(Math.max(...data.map((d) => d.value)) / 20) * 20;
  const point = (v, i) => `${45 + i * 40},${190 - (v / max) * 145}`;
  const points = data.map((d, i) => point(d.value, i));
  return `<div class="chart"><svg viewBox="0 0 555 225" role="img" aria-label="Illustrative ${s.chartMetric} trend over the selected demo period. Data table available below."><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FF4301" stop-opacity=".13"/><stop offset="1" stop-color="#FF4301" stop-opacity="0"/></linearGradient></defs>${[0, 1, 2, 3].map((i) => `<line x1="45" y1="${45 + i * 48.33}" x2="525" y2="${45 + i * 48.33}" stroke="#eeeeef" stroke-dasharray="3 4"/><text x="31" y="${49 + i * 48.33}" text-anchor="end">${number(max * (1 - i / 3))}</text>`).join("")}<path d="M45,190 L${points.join(" L")} L525,190 Z" fill="url(#chart-fill)"/><polyline points="${points.join(" ")}" fill="none" stroke="#FF4301" stroke-width="2.6" stroke-linejoin="round"/><circle cx="525" cy="${190 - (data.at(-1).value / max) * 145}" r="4" fill="#FF4301" stroke="white" stroke-width="2"/><text x="45" y="215">Start</text><text x="205" y="215" text-anchor="middle">Day ${Math.round(s.range / 3)}</text><text x="365" y="215" text-anchor="middle">Day ${Math.round((s.range * 2) / 3)}</text><text x="525" y="215" text-anchor="end">Day ${s.range}</text></svg></div>`;
}
function metric(label, value, note, ic) {
  return `<div class="metric"><div class="metric-label">${label}${icon(ic)}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>`;
}
function overview(s, u) {
  const t = totals(s),
    pending = s.approvals.filter((a) => a.status === "Pending");
  const recommendations = [
    {
      id: "research",
      icon: "creative",
      title: "Turn a creative observation into a test.",
      sub: "Creative intelligence · Observed evidence",
      action: "asset",
      data: 'data-id="a1"',
      label: "Explore idea",
    },
    {
      id: "simulate",
      icon: "simulate",
      title: "Model the next $3,000 before committing.",
      sub: "Campaign simulator · Planning scenario",
      action: "navigate",
      data: 'data-route="simulator"',
      label: "Simulate",
    },
    {
      id: "experiment",
      icon: "experiment",
      title: "Give the landing-page test more time.",
      sub: "Experiments · 400 of 5,000 sample assignments",
      action: "experiment-detail",
      data: 'data-id="e1"',
      label: "View experiment",
    },
  ].filter((r) => !s.dismissed.includes(r.id));
  return `${heading("YOUR GROWTH, CONNECTED", "Good things are taking shape.", "A clear view of what’s working. An informed next move.", `<label class="sr-only" for="date-range">Reporting period</label><select id="date-range" data-change="range" aria-label="Reporting period">${[7, 14, 30].map((n) => `<option value="${n}" ${s.range === n ? "selected" : ""}>Last ${n} days</option>`).join("")}</select>${button("Review queue", "review-queue", { kind: "primary", iconName: "arrow" })}`)}
 ${s.autonomyPaused ? `<div class="info-bar mb16">${icon("pause")}<span>New submissions are paused. Research and planning remain available. <button class="text-btn" data-action="navigate" data-route="settings">Manage controls</button></span></div>` : ""}
 <section class="metrics" aria-label="Demo performance">${metric("Ad spend", money(t.spend), "Google delivery · Sample period", "wallet")}${metric("Purchases", number(t.purchases), "X-Ray · Deduplicated sample events", "simulate")}${metric("Cost per purchase", money(t.cpa), "Spend ÷ attributed sample purchases", "campaign")}${metric("Active experiments", number(t.active), "Learning in progress", "experiment")}</section>
 <div class="main-grid"><section class="panel chart-panel"><div class="panel-head"><div><h2>Momentum, measured.</h2><p>Sample performance over the last ${s.range} days</p></div><div class="segmented" aria-label="Chart metric">${["purchases", "spend"].map((m) => `<button data-action="chart-metric" data-value="${m}" aria-pressed="${s.chartMetric === m}">${m === "purchases" ? "Purchases" : "Spend"}</button>`).join("")}</div></div>${performanceChart(s)}<div class="chart-key"><span><i class="legend-line"></i>${s.chartMetric === "purchases" ? "Purchases" : "Spend (USD)"}</span><span>Illustrative distribution</span><button class="text-btn" data-action="chart-data" style="margin-left:auto">View data ${icon("arrow")}</button></div></section><section class="panel next-move"><div class="row spread"><span class="eyebrow">THE NEXT GOOD MOVE</span>${icon("spark")}</div><h2 class="display">A stronger message starts with a better question.</h2><p>Your “everyday utility” angle is ready to test. Find out whether clearer benefits change the outcome.</p><div class="evidence-line">${icon("link")}Creative Set v1 · Observed, not proven</div>${button("Explore the hypothesis", "asset", { kind: "primary", data: 'data-id="a1"', iconName: "arrow" })}</section></div>
 <div class="bottom-grid"><section class="panel"><div class="panel-head"><h2>Decisions, with context</h2><span class="pill outline">${recommendations.length + pending.length} to explore</span></div><div class="decision-list">${pending.map((a) => `<div class="decision-row"><span class="decision-icon">${icon("shield")}</span><div class="decision-content"><h3>${escape(a.name)}</h3><p>Exact-plan review · ${money(Number(a.draft.budget))} total</p></div><div class="decision-meta">${button("Review plan", "approval", { small: true, data: `data-id="${a.id}"` })}</div></div>`).join("")}${recommendations.map((r) => `<div class="decision-row"><span class="decision-icon">${icon(r.icon)}</span><div class="decision-content"><h3>${r.title}</h3><p>${r.sub}</p></div><div class="decision-meta">${button(r.label, r.action, { small: true, data: r.data, iconName: "arrow" })}</div></div>`).join("")}</div></section><section class="panel"><div class="panel-head"><h2>The learning log</h2><button class="text-btn" data-action="activity" aria-label="View all activity">${icon("up")}</button></div><div class="activity-list">${activityItems(s.activity.slice(0, 3))}</div><div class="source-note">Every decision leaves a trail.</div></section></div>
 <section class="panel mt24"><div class="panel-head"><div><h2>Campaign pulse</h2><p>One campaign lifecycle. One Wallet. All in view.</p></div><a class="text-btn" href="#campaigns">View campaigns ${icon("arrow")}</a></div>${campaignTable(s, s.campaigns.slice(0, 3))}</section>`;
}
export function activityItems(items) {
  return items
    .map(
      (a) =>
        `<div class="activity-item"><p>${escape(a.text)}</p><time datetime="${escape(a.at)}">${new Date(a.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })} CT · Demo event</time></div>`,
    )
    .join("");
}
function campaignTable(s, rows) {
  return rows.length
    ? `<div class="table-wrap"><table class="data-table"><thead><tr><th scope="col">Campaign</th><th scope="col">Status</th><th scope="col">Channel</th><th scope="col">Spend</th><th scope="col">Purchases</th><th scope="col">Cost / purchase</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead><tbody>${rows.map((c) => `<tr><td><div class="table-label"><span class="campaign-mark">${icon(c.channel === "Search" ? "search" : "spark")}</span><button class="table-link" data-action="campaign-detail" data-id="${c.id}">${escape(c.name)}<span class="table-sub">Hellyeah managed account</span></button></div></td><td>${status(c.status)}</td><td>${escape(c.channel)}</td><td class="number-cell">${money(c.spend)}</td><td class="number-cell">${number(c.purchases)}</td><td class="number-cell">${c.purchases ? money(c.spend / c.purchases) : "—"}</td><td><button class="btn ghost icon-only" data-action="campaign-detail" data-id="${c.id}" aria-label="View ${escape(c.name)}">${icon("arrow")}</button></td></tr>`).join("")}</tbody></table></div>`
    : empty("No campaigns in this view.", "Try another status or search term.");
}
function tabs(items, selected, action) {
  return `<div class="tabs" role="group" aria-label="Filter view">${items.map(([name, count]) => `<button aria-pressed="${name === selected}" data-action="${action}" data-value="${name}">${name}${count !== undefined ? `<span class="tab-count">${count}</span>` : ""}</button>`).join("")}</div>`;
}
const searchInput = (id, placeholder, value = "") =>
  `<label class="input-search">${icon("search")}<span class="sr-only">${placeholder}</span><input id="${id}" data-input="${id}" type="search" placeholder="${placeholder}" value="${escape(value)}" autocomplete="off"></label>`;
function campaigns(s, u) {
  const rows = s.campaigns.filter(
    (c) =>
      (u.campaignFilter === "All campaigns" || c.status === u.campaignFilter) &&
      c.name.toLowerCase().includes(u.campaignSearch.toLowerCase()),
  );
  return `${heading("FROM PLAN TO PERFORMANCE", "Campaigns", "Review, approve, and follow every campaign.", button("Plan a campaign", "navigate", { kind: "primary", iconName: "plus", data: 'data-route="simulator"' }))}${tabs(
    ["All campaigns", "Serving", "In Review", "Paused", "Completed"].map((n) => [
      n,
      n === "All campaigns"
        ? s.campaigns.length
        : s.campaigns.filter((c) => c.status === n).length,
    ]),
    u.campaignFilter,
    "campaign-filter",
  )}<div class="filterbar">${searchInput("campaign-search", "Search campaigns", u.campaignSearch)}<span class="tiny muted">USD · Fictional campaign totals</span></div><section class="panel">${campaignTable(s, rows)}</section><div class="info-bar mt24">${icon("shield")}<span>Brand → Studio → X-Ray readiness → exact approval → Wallet reservation → review → managed launch. Submitted creative snapshots stay fixed.</span></div>`;
}
export function forecastChart(r) {
  const max = Math.max(r.high * 1.13, 1),
    px = (i) => 48 + i * 66,
    py = (v) => 208 - (v / max) * 170;
  const seq = Array.from({ length: 8 }, (_, i) => i / 7),
    mean = seq.map((f, i) => `${px(i)},${py(r.expected * f)}`),
    low = seq.map((f, i) => `${px(i)},${py(r.low * f)}`),
    high = seq.map((f, i) => `${px(i)},${py(r.high * f)}`);
  return `<div class="chart"><svg viewBox="0 0 555 240" role="img" aria-label="Illustrative cumulative purchases under fixed assumptions. ${Math.round(r.expected)} expected; ${r.low} to ${r.high} outcome interval at day ${r.days}.">${[0, 1, 2, 3].map((i) => `<line x1="48" y1="${38 + i * 56.66}" x2="510" y2="${38 + i * 56.66}" stroke="#eaeaec" stroke-dasharray="3 4"/><text x="35" y="${42 + i * 56.66}" text-anchor="end">${number(max * (1 - i / 3))}</text>`).join("")}<path d="M${high.join(" L")} L${low.reverse().join(" L")} Z" fill="#ff4301" opacity=".12"/><polyline points="${mean.join(" ")}" fill="none" stroke="#ff4301" stroke-width="2.5"/><polyline points="${high.join(" ")}" fill="none" stroke="#ff4301" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/><circle cx="510" cy="${py(r.expected)}" r="4" fill="#ff4301" stroke="white" stroke-width="2"/><text x="48" y="232">Day 1</text><text x="246" y="232" text-anchor="middle">Day ${Math.round(r.days / 2)}</text><text x="510" y="232" text-anchor="end">Day ${r.days}</text></svg></div>`;
}
function simulator(s, u) {
  const d = u.simDraft,
    r = u.simResult,
    stale = r && r.fingerprint !== draftFingerprint(d);
  return `${heading("PLAN BEFORE YOU SPEND", "Campaign simulator", "Choose a budget, compare outcomes, and save a plan for review.", button("Compare scenarios", "compare", { iconName: "layers", disabled: s.scenarios.length < 2 }))}<div class="sim-grid"><section class="panel sim-controls"><h2>Shape your scenario</h2><form id="sim-form" class="form-fields"><label>Total campaign budget<div class="amount-input"><span>$</span><input name="budget" id="sim-budget" data-input="sim-budget" type="number" min="100" max="25000" step="100" value="${d.budget}" required aria-label="Total campaign budget in USD"></div></label><div><input id="budget-slider" type="range" min="100" max="25000" step="100" value="${d.budget}" data-input="budget-slider" aria-label="Adjust total campaign budget"><div class="range-labels"><span>$100</span><span>$25,000 USD</span></div></div><div class="paired-fields"><label>Channel<select name="channel" data-change="sim-channel"><option ${d.channel === "Search" ? "selected" : ""}>Search</option><option ${d.channel === "Performance Max" ? "selected" : ""}>Performance Max</option></select></label><label>Duration<select name="days" data-change="sim-days">${[7, 14, 30, 60, 90].map((n) => `<option value="${n}" ${Number(d.days) === n ? "selected" : ""}>${n} days</option>`).join("")}</select></label></div><label>Campaign goal<select name="goal" data-change="sim-goal"><option value="conversions" ${d.goal === "conversions" ? "selected" : ""}>Purchases</option><option value="impressions" ${d.goal === "impressions" ? "selected" : ""}>Impressions</option></select></label><label>Creative Set<select name="assetId" data-change="sim-asset">${s.assets
    .filter((a) => a.textReady)
    .map(
      (a) =>
        `<option value="${a.id}" ${d.assetId === a.id ? "selected" : ""}>${escape(a.name)} · v${a.version}</option>`,
    )
    .join(
      "",
    )}</select><span class="field-hint">Existing Studio assets. Priced Search keywords stay read-only.</span></label><div class="sim-action"><button class="btn primary w-full" type="submit">${icon("simulate")}Run scenario${icon("arrow")}</button><div class="tiny muted mt8">Planning only. Running a scenario spends $0.</div></div></form><div class="divider"></div><p class="eyebrow muted">CAMPAIGN READINESS</p><div class="checklist">${readiness(
    s,
    d.channel,
    d.goal,
    d.assetId,
  )
    .map(
      (g) =>
        `<li class="${g.ok ? "" : "blocked"}">${icon(g.ok ? "check" : "info")}${g.label}</li>`,
    )
    .join(
      "",
    )}</div></section><div class="sim-results"><section class="panel"><div class="panel-head"><div><h2>Your possible outcomes</h2><p>${r ? `${money(r.budget)} total · ${r.days} days · ${escape(r.channel)}` : "Set a budget to begin."}</p></div>${pill("Planning fidelity", "orange-pill")}</div>${stale ? '<div class="stale-note">Inputs changed. Run again to update this result.</div>' : ""}<div data-forecast class="${stale ? "stale" : ""}">${r?.planningOnly ? `<div class="panel-body">${empty("Plan the campaign. Hold the prediction.", "This preview has no calibrated outcome model for this channel or goal. You can save the budget plan and use the existing campaign review flow.")}<div class="result-summary"><div><div class="result-label">Total budget</div><div class="result-value">${money(r.budget)}</div></div><div><div class="result-label">Daily plan</div><div class="result-value">${money(r.budget / r.days)}</div></div><div><div class="result-label">Duration</div><div class="result-value">${r.days} days</div></div></div></div>` : r ? `<div class="result-summary"><div><div class="result-label">Modelled purchases</div><div class="result-value">${number(r.expected)}</div><div class="result-note">Under fixed demo assumptions</div></div><div><div class="result-label">80% outcome range</div><div class="result-value">${r.low}–${r.high}</div><div class="result-note">Outcome noise only</div></div><div><div class="result-label">Cost / purchase</div><div class="result-value">${money(r.cpa)}</div><div class="result-note">No treatment uplift assumed</div></div></div>${forecastChart(r)}<div class="chart-caption">Illustrative cumulative path · Shaded band shows outcome variation under fixed CPC and conversion rate. It is not a validated prediction interval.</div>` : ""}</div><div class="result-footer"><p>Demo model · Uncalibrated. A scenario is a planning input, not a guarantee.</p>${button("Save scenario", "save-scenario", { kind: "dark", iconName: "plus", disabled: !!stale || !r })}</div></section><details class="panel assumptions"><summary>What goes into this scenario?</summary><dl><dt>Cost per click</dt><dd>$2.00 · Fixed assumption</dd><dt>Conversion rate</dt><dd>5.5% · Fixed assumption</dd><dt>Numerical method</dt><dd>800 seeded binomial draws</dd><dt>Creative lift</dt><dd>None assumed</dd><dt>Calibration</dt><dd>Not yet validated</dd></dl><p class="tiny muted mt16">Duration changes the illustrative distribution, not the total modelled outcome. The demo does not model auctions, seasonality, saturation or parameter uncertainty.</p></details><section class="panel"><div class="panel-head"><h2>Saved scenarios</h2><span class="count-pill">${s.scenarios.length}</span></div>${s.scenarios.length ? s.scenarios.map((c) => `<div class="scenario-row"><span class="decision-icon">${icon("simulate")}</span><div class="scenario-copy"><strong>${escape(c.name)}</strong><p>${c.draft.days} days · ${c.result.planningOnly ? "Budget plan" : `${number(c.result.expected)} modelled purchases`} · Uncalibrated</p></div>${button(s.approvals.some((a) => a.scenarioId === c.id) ? "View review" : "Review demo plan", "queue-scenario", { small: true, iconName: "arrow", data: `data-id="${c.id}"` })}${c.draft.channel === "Search" && c.draft.goal === "conversions" ? button("Try full demo", "demo-use-scenario", { small: true, data: `data-id="${c.id}"` }) : ""}${button("Send to OS", "os-share-proposal", { small: true, data: `data-product="simulator" data-id="${c.id}"` })}</div>`).join("") : '<div class="small-empty">Save a scenario to compare plans or send it to the OS.</div>'}</section></div></div>`;
}
export function creativeArt(a) {
  return `<div class="creative-art ${escape(a.theme)}" role="img" aria-label="Sample ${escape(a.brandName || a.brandSnapshot?.name || 'Forma')} creative: ${escape(a.headline.replaceAll("\n", " "))}"><div class="art-brand">${escape((a.brandName || a.brandSnapshot?.name || 'Forma').toUpperCase())}</div><div class="art-head">${escape(a.headline)}</div><div class="bottle" aria-hidden="true"></div><div class="art-sub">${escape(a.subline)}</div><div class="art-link">Discover the collection ↗</div>${a.status !== "Ready" ? `<div class="art-status">${icon(a.status === "Generating" ? "clock" : "info")}${a.status === "Generating" ? "Image generation · Sample status" : "Square selection needed"}</div>` : ""}</div>`;
}
function creative(s, u) {
  const rows = s.assets.filter(
    (a) =>
      (u.assetFilter === "All assets" || a.status === u.assetFilter) &&
      (u.assetFormat === "All formats" || a.format === u.assetFormat) &&
      `${a.name} ${a.angle}`
        .toLowerCase()
        .includes(u.assetSearch.toLowerCase()),
  );
  return `${heading("CREATIVE INTELLIGENCE", "Creative intelligence", "Choose a message. Inspect its source. Turn it into a plan or a test.", button("Add research capture", "capture", { kind: "primary", iconName: "plus" }))}<div class="creative-intro"><div><h2>Your creative library</h2><p>Connect Studio assets to observed messages and testable hypotheses. Every insight keeps its source.</p></div><div class="intro-stats"><div><strong>${s.assets.length}</strong><span>Studio assets</span></div><div><strong>${new Set(s.assets.map((a) => a.angle)).size}</strong><span>Creative angles</span></div><div><strong>${s.captures.length + 1}</strong><span>Sample captures</span></div></div></div>${tabs(
    ["All assets", "Ready", "Generating", "Needs Attention"].map((n) => [
      n,
      n === "All assets"
        ? s.assets.length
        : s.assets.filter((a) => a.status === n).length,
    ]),
    u.assetFilter,
    "asset-filter",
  )}<div class="filterbar">${searchInput("asset-search", "Search creative or angle", u.assetSearch)}<label><span class="sr-only">Creative format</span><select data-change="asset-format">${["All formats", "Search copy", "Image set", "Landing page"].map((f) => `<option ${f === u.assetFormat ? "selected" : ""}>${f}</option>`).join("")}</select></label></div>${rows.length ? `<div class="creative-grid">${rows.map((a) => `<button class="creative-card" data-action="asset" data-id="${a.id}" aria-label="Inspect ${escape(a.name)}">${creativeArt(a)}<div class="creative-card-meta"><h3>${escape(a.name)}</h3><div class="row">${status(a.status)}${pill(escape(a.format), "outline")}</div><p>${escape(a.angle)} · Creative Set v${a.version} · Sample asset</p></div></button>`).join("")}</div>` : empty("No creative matches this view.", "Try another format, status, or search term.")}${s.captures.length ? `<section class="panel mt24"><div class="panel-head"><h2>Research captures</h2>${pill("Sample content")}</div>${s.captures.map((c) => `<div class="scenario-row"><span class="decision-icon">${icon("globe")}</span><div class="scenario-copy"><strong>${escape(c.label)}</strong><p>Labelled sample copy · Creative preview · No live capture</p></div>${button("Inspect", "capture-detail", { small: true, data: `data-id="${c.id}"` })}</div>`).join("")}</section>` : ""}`;
}
function experiments(s, u) {
  const rows = s.experiments.filter(
    (e) =>
      (u.experimentFilter === "All experiments" ||
        e.status === u.experimentFilter) &&
      `${e.name} ${e.hypothesis}`
        .toLowerCase()
        .includes(u.experimentSearch.toLowerCase()),
  );
  return `${heading("EXPERIMENTATION", "Experiments", "Test an idea, record the outcome, and share the learning.", button("Design an experiment", "new-experiment", { kind: "primary", iconName: "plus" }))}<div class="experiment-summary"><div><h2 class="display">Tests in your workspace</h2><p>First-party landing-page tests · Purchase rate per assigned visitor</p></div><div class="summary-numbers"><div><strong>${s.experiments.filter((e) => e.status === "Running").length}</strong><span>Running</span></div><div><strong>${s.experiments.filter((e) => e.status === "Draft").length}</strong><span>In planning</span></div><div><strong>${s.experiments.filter((e) => e.status === "Concluded").length}</strong><span>Concluded</span></div></div></div>${tabs(
    ["All experiments", "Running", "Draft", "Paused", "Concluded"].map((n) => [
      n,
      n === "All experiments"
        ? s.experiments.length
        : s.experiments.filter((e) => e.status === n).length,
    ]),
    u.experimentFilter,
    "experiment-filter",
  )}<div class="filterbar">${searchInput("experiment-search", "Search experiments", u.experimentSearch)}<span class="tiny muted">No real traffic assigned</span></div>${rows.length ? rows.map((e) => `<article class="experiment-card"><div class="row spread"><h3>${escape(e.name)}</h3>${status(e.status)}</div><p>${escape(e.hypothesis)}</p><div class="experiment-meta"><span class="row gap8">${icon("globe")}Owned landing page</span><span class="row gap8">${icon("simulate")}${e.metric}</span><div class="experiment-progress"><div class="progress-track"><div class="progress-fill" style="width:${Math.min(((e.control + e.treatment) / e.target) * 100, 100)}%"></div></div><span>${Math.round(((e.control + e.treatment) / e.target) * 100)}%</span></div>${button(e.status === "Draft" ? "Review design" : "View evidence", "experiment-detail", { small: true, iconName: "arrow", data: `data-id="${e.id}"` })}</div></article>`).join("") : empty("Room for a new question.", "Create a hypothesis or change the filters to find an existing experiment.", button("Design an experiment", "new-experiment", { kind: "primary", iconName: "plus" }))}${info("Sample results remain descriptive and inconclusive. Differences in conversion rate do not establish a causal winner.")}`;
}
function brand(s) {
  return `${heading("THE SHARED FOUNDATION", "Brand & tracking", "Keep your business context and measurement ready for campaigns.")}<div class="work-grid"><section class="panel settings-panel"><h2>Brand Profile</h2><p>Your approved business context follows every new plan.</p><form id="brand-form" class="form-fields"><label>Brand name<input name="name" required minlength="2" maxlength="60" value="${escape(s.brand.name)}"></label><label>Website<input name="website" type="url" required value="${escape(s.brand.website)}"></label><label>Brand promise<textarea name="tagline" maxlength="160">${escape(s.brand.tagline)}</textarea></label><div class="row spread"><span class="tiny muted">Profile v${s.brand.version} · ${escape(s.brand.market)}</span><button class="btn primary" type="submit">Save demo profile ${icon("check")}</button></div></form></section><div class="stack"><section class="panel settings-panel"><div class="row spread"><h2>X-Ray tracking</h2>${status(s.tracker.enabled ? "Ready" : "Paused")}</div><p>Readiness is based on accepted events, not just a successful collection request.</p><div class="setting-row"><div><h3>Tracking enabled</h3><p>Toggle the fixture to explore readiness gates.</p></div><button class="switch" role="switch" aria-checked="${s.tracker.enabled}" aria-label="Enable demo X-Ray tracking" data-action="toggle-tracker"><span></span></button></div><div class="setting-row"><div><h3>Event receipt</h3><p>${s.tracker.enabled ? "Verified in sample internal reporting" : "Disabled · Events are not accepted"}</p></div>${icon(s.tracker.enabled ? "check" : "info")}</div><div class="setting-row"><div><h3>Purchase event</h3><p>cv_purchase · Deduplicated sample events</p></div>${pill("X-Ray")}</div></section>${info("Conversion campaigns require verified receiving events. Impression campaigns can proceed without X-Ray. Goals never change automatically.")}</div></div><div class="info-bar mt24">${icon("layers")}<span>Editing this demo profile changes future plans and invalidates pending exact-plan reviews. Existing submitted campaign snapshots stay unchanged.</span></div>`;
}
function wallet(s, u) {
  return `${heading("ONE WALLET, CLEAR BOUNDARIES", "Wallet", "Available funds, reservations, and campaign settlement.", button("Add demo funds", "fund-wallet", { kind: "primary", iconName: "plus" }))}<div class="work-grid"><div><section class="wallet-main"><div class="eyebrow">AVAILABLE FOR NEW CAMPAIGNS</div><div class="display">${money(s.wallet.available)}</div><p>USD · Fictional prepaid Wallet</p><img class="wallet-mark" src="./assets/glyph-orange.svg" alt="">${button("Plan your next campaign", "navigate", { data: 'data-route="simulator"', iconName: "arrow" })}</section><div class="wallet-stats"><div><span>Reserved for campaigns</span><strong>${money(s.wallet.reserved)}</strong></div><div><span>Sample spend</span><strong>${money(s.wallet.spent)}</strong></div><div><span>Pending refund</span><strong>${money(s.wallet.pendingRefund)}</strong></div></div>${info("Pending refunds are unavailable for new campaigns. Pausing a campaign does not cancel it or release a reservation.")}</div><section class="panel settings-panel"><h2>What happens to the budget?</h2><div class="setting-row"><div><h3>01 · Review the exact plan</h3><p>Confirm the campaign’s maximum budget and its creative version.</p></div></div><div class="setting-row"><div><h3>02 · Reserve once</h3><p>The maximum moves from available to reserved at submission.</p></div></div><div class="setting-row"><div><h3>03 · Review, then launch</h3><p>Existing Hellyeah review precedes managed campaign setup.</p></div></div><div class="setting-row"><div><h3>04 · Reconcile actual spend</h3><p>The live build will bind to the existing Wallet’s settlement records.</p></div></div></section></div><section class="panel mt24"><div class="panel-head"><h2>Recent demo activity</h2>${pill("Local records")}</div><div class="activity-list">${activityItems(s.activity.filter((a) => a.kind === "campaign" || a.kind === "wallet").slice(0, 6)) || '<div class="small-empty">No new Wallet activity.</div>'}</div></section>${walletGrowthPanel(u.os)}`;
}
function settings(s) {
  return `${heading("WORKSPACE CONTROLS", "Workspace settings", "Manage demo controls and export your work.")}<div class="work-grid"><section class="panel settings-panel"><h2>Operating mode</h2><p>The OS stores your feedback, research snapshots and decisions in your signed-in workspace. Product drafts use fictional browser-local records.</p><div class="setting-row"><div><h3>Demo mode</h3><p>Live credentials and ad-platform writes are not connected.</p></div>${pill("Always on", "orange-pill")}</div><div class="setting-row"><div><h3>Pause new submissions</h3><p>Stops demo approvals and experiment starts. Does not pause serving campaigns.</p></div><button class="switch" role="switch" aria-checked="${s.autonomyPaused}" aria-label="Pause new submissions" data-action="toggle-autonomy"><span></span></button></div><div class="setting-row"><div><h3>Export workspace</h3><p>Download your plans, observations, and review history as JSON.</p></div>${button("Export", "export", { small: true, iconName: "download" })}</div><div class="setting-row"><div><h3>Reset demo data</h3><p>Restore the starting scenario in this browser.</p></div>${button("Reset", "reset", { small: true, iconName: "refresh" })}</div></section><section class="panel settings-panel"><h2>What this build connects</h2><p>The OS stores feedback and decisions durably. Campaign execution and economic evidence remain synthetic until the existing Hellyeah adapters are connected.</p><div class="checklist">${["Shared brand and navigation", "Scenario → exact-plan review", "Creative observation → experiment", "Review → demo Wallet reservation", "Durable cross-product evidence inbox", "Server-side Mastra decision workflow", "Durable, isolated customer feedback", "Personal and opt-in aggregate learning"].map((t) => `<li>${icon("check")}${t}</li>`).join("")}</div><div class="divider"></div><p class="tiny muted">The published UI uses a deterministic fixture adapter. It does not run remote autonomous agents, capture live websites, fit calibrated forecasts, or manage real spend.</p></section></div>`;
}
export function dialogFrame(title, subtitle, body) {
  return `<header class="dialog-header"><div><h2 id="dialog-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div><button class="btn ghost icon-only" data-action="close-dialog" aria-label="Close dialog">${icon("close")}</button></header><div class="dialog-body">${body}<div id="dialog-error" class="dialog-error" role="alert"></div></div>`;
}
export function assetDialog(s, a) {
  return dialogFrame(
    escape(a.name),
    "Creative intelligence · Studio-linked sample asset",
    `<div class="asset-large">${creativeArt(a)}</div><div class="asset-detail-grid"><div><div class="detail-label">Creative status</div>${status(a.status)}</div><div><div class="detail-label">Source</div><div class="detail-value">${escape(a.source)} · Version ${a.version}</div></div><div><div class="detail-label">Observed angle</div><div class="detail-value">${escape(a.angle)}</div></div><div><div class="detail-label">PMax selections</div><div class="detail-value">Landscape ${a.landscape ? "✓" : "missing"} · Square ${a.square ? "✓" : "missing"}</div></div></div><div class="evidence-card"><div class="row spread"><h3>What we can observe</h3>${pill("Observed only", "orange-pill")}</div><p>“${escape(a.headline.replaceAll("\n", " "))}” leads with ${escape(a.angle.toLowerCase())}. The supporting line reads “${escape(a.subline)}”</p><p class="tiny">Source: sample Creative Set v${a.version}, headline and supporting-copy regions. No causal or performance claim is attached.</p></div><div class="evidence-card"><h3>A question worth testing</h3><p>Does a more explicit product benefit improve purchase rate per assigned visitor on the landing page?</p></div>${a.status === "Needs Attention" ? `<div class="mt16">${info("A final square image selection is still missing. Search can use ready text; Performance Max stays blocked until both final images are selected.")}</div>` : ""}<div class="dialog-actions">${a.status !== "Ready" ? button("Complete sample creative", "demo-finish-asset", { data: `data-id="${a.id}"` }) : ""}${button("Send to OS", "os-share-proposal", { data: `data-product="creative" data-id="${a.id}"` })}${button("Use in simulator", "asset-simulate", { data: `data-id="${a.id}"`, iconName: "simulate" })}${button("Create experiment", "new-experiment", { kind: "primary", data: `data-id="${a.id}"`, iconName: "experiment" })}</div>`,
  );
}
export function experimentDialog(s, e) {
  const rate = (c, n) => (n ? `${((c / n) * 100).toFixed(1)}%` : "—"),
    assigned = e.control + e.treatment,
    asset = e.creativeSnapshot ?? { ...s.assets.find((a) => a.id === e.assetId), version: e.creativeVersion ?? s.assets.find((a) => a.id === e.assetId)?.version };
  return dialogFrame(
    escape(e.name),
    "First-party landing-page experiment · Demo only",
    `<div class="row spread">${status(e.status)}${pill(e.sampleEvidence ? "Sample replay complete" : e.status === "Draft" ? "Registered design" : "Inconclusive", "orange-pill")}</div><p class="mt16" style="font-size:13px">${escape(e.hypothesis)}</p><div class="experiment-detail-metrics"><div class="experiment-arm"><div class="eyebrow muted">CONTROL</div><div class="arm-rate">${rate(e.controlConversions, e.control)}</div><p>${e.controlConversions} purchases / ${number(e.control)} assigned visitors</p></div><div class="experiment-arm"><div class="eyebrow muted">TREATMENT</div><div class="arm-rate">${rate(e.treatmentConversions, e.treatment)}</div><p>${e.treatmentConversions} purchases / ${number(e.treatment)} assigned visitors</p></div></div><div class="row spread mt24"><span class="tiny muted">${number(assigned)} of ${number(e.target)} planned sample assignments</span><span class="tiny">${Math.round((assigned / e.target) * 100)}%</span></div><div class="progress-track progress-wide"><div class="progress-fill" style="width:${Math.min(100, (assigned / e.target) * 100)}%"></div></div><div class="evidence-card"><h3>Read the evidence, not just the difference.</h3><p>${assigned ? "These fixture counts are descriptive. A larger observed rate is not a validated winner." : "This registered demo design has no assignments or outcomes yet."}</p><p class="tiny">Unit: owned site visitor · Allocation: 50/50 · Metric: purchases per assigned visitor · Fixed horizon: 5,000 total assignments. These sample results have no certified inference or real visitor assignments.</p></div><div class="asset-detail-grid"><div><div class="detail-label">Creative source</div><div class="detail-value">${escape(asset?.name)} · v${asset?.version}</div></div><div><div class="detail-label">Campaign impact</div><div class="detail-value">None. No ad campaign is changed.</div></div></div><div class="dialog-actions">${e.status === "Running" ? button("Generate sample results", "demo-results", { kind: "primary", data: `data-id="${e.id}"` }) : ""}${e.demoCampaignId ? button("Continue connected demo", "navigate", { data: 'data-route="demo"' }) : ""}${e.sampleEvidence && e.demoCampaignId ? button("Learn from results", "experiment-learn", { kind: "primary", data: `data-id="${e.id}"` }) : ""}${button("Send design to OS", "os-share-proposal", { data: `data-product="experiments" data-id="${e.id}"` })}${button("Inspect creative", "experiment-creative", { data: `data-id="${e.id}"`, iconName: "creative" })}${e.status !== "Concluded" ? button(e.status === "Running" ? "Pause demo test" : e.status === "Paused" ? "Resume demo test" : "Start demo test", "transition-experiment", { kind: "primary", iconName: e.status === "Running" ? "pause" : "play", data: `data-id="${e.id}"` }) : button("Design a follow-up", "new-experiment", { kind: "primary", data: `data-id="${e.assetId}"`, iconName: "plus" })}</div>`,
  );
}
export function approvalDialog(s, a) {
  const asset = s.assets.find((x) => x.id === a.draft.assetId);
  return dialogFrame(
    "Review the exact plan.",
    "This confirms a demo campaign. No real money can be spent.",
    `<div class="plan-summary"><dl><dt>Campaign</dt><dd>${escape(a.name)}</dd><dt>Maximum total budget</dt><dd>${money(Number(a.draft.budget))} USD</dd><dt>Duration</dt><dd>${a.draft.days} days</dd><dt>Channel / goal</dt><dd>${escape(a.draft.channel)} / ${a.draft.goal === "conversions" ? "Purchases" : "Impressions"}</dd><dt>Creative snapshot</dt><dd>${escape(asset?.name)} · v${a.assetVersion}</dd><dt>Brand snapshot</dt><dd>v${a.brandVersion}</dd><dt>Available demo funds</dt><dd>${money(s.wallet.available)}</dd></dl></div><div class="checklist mb16">${readiness(
      s,
      a.draft.channel,
      a.draft.goal,
      a.draft.assetId,
    )
      .map(
        (g) =>
          `<li class="${g.ok ? "" : "blocked"}">${icon(g.ok ? "check" : "info")}${g.label}</li>`,
      )
      .join(
        "",
      )}</div>${a.status === "Pending" ? `<form id="approval-form" data-id="${a.id}">${info("Submission reserves the maximum budget once and enters existing campaign review. It does not mark the campaign as Serving.")}<label class="confirmation"><input type="checkbox" name="confirmed" required>I approve this exact demo plan and its ${money(Number(a.draft.budget))} maximum budget. I understand the forecast is uncalibrated.</label><div class="dialog-actions">${button("Dismiss plan", "dismiss-approval", { data: `data-id="${a.id}"` })}<button type="submit" class="btn primary">Submit demo campaign ${icon("arrow")}</button></div></form>` : info(`This review is ${escape(a.status.toLowerCase())}. ${a.status === "Submitted" ? "The campaign is available in Campaigns. Its Wallet reservation is not repeated." : "Create a new scenario to request another review."}`)}`,
  );
}
