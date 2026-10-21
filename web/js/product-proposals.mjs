/** Browser records become explicitly unvalidated, immutable research snapshots in the OS. */
export function productProposal(state, product, id) {
  const common = { external_id: id, evidence_mode: "fixture" };
  if (product === "simulator") {
    const s = state.scenarios.find((x) => x.id === id);
    if (!s) throw new Error("Saved scenario was not found.");
    if (
      s.brandVersion !== state.brand.version ||
      s.assetVersion !==
        state.assets.find((a) => a.id === s.draft.assetId)?.version
    )
      throw new Error(
        "Brand or creative changed. Save a fresh scenario before sending it to the OS.",
      );
    return {
      ...common,
      product,
      title: s.name,
      data: {
        budget_micros: Math.round(Number(s.draft.budget) * 1e6),
        days: Number(s.draft.days),
        channel: s.draft.channel === "Performance Max" ? "PMax" : s.draft.channel,
        goal: s.draft.goal,
        creative_id: s.draft.assetId,
        creative_version: s.assetVersion,
        brand_version: s.brandVersion,
        calibration: "unvalidated",
      },
    };
  }
  if (product === "creative") {
    const a = state.assets.find((x) => x.id === id);
    if (!a) throw new Error("Creative was not found.");
    return {
      ...common,
      product,
      title: a.name,
      data: {
        creative_id: a.id,
        creative_version: a.version,
        angle: a.angle,
        observation: `${a.headline.replaceAll("\n", " ")} — ${a.subline}`,
        evidence_grade: "observed_fixture",
      },
    };
  }
  if (product === "experiments") {
    const e = state.experiments.find((x) => x.id === id);
    if (!e) throw new Error("Experiment was not found.");
    return {
      ...common,
      product,
      title: e.name,
      data: {
        hypothesis: e.hypothesis,
        creative_id: e.assetId,
        unit: "owned_site_visitor",
        metric: "purchases_per_assigned_visitor",
        allocation_bps: 5000,
        target_assignments: e.target,
        inference: "not_certified",
      },
    };
  }
  throw new Error("Unsupported product evidence.");
}
