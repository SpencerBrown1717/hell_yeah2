const OUTBOX = "hell_yeah2.os-feedback-outbox.v2";
export function createOSClient({ fetcher, storage }) {
  let flushing = false,
    workspace = null;
  const request = async (path, options = {}) => {
    if (!fetcher)
      throw new Error("The OS service is unavailable in this local preview.");
    const res = await fetcher(`/api/os${path}`, {
      credentials: "same-origin",
      ...options,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("The OS returned an unreadable response.");
    }
    if (!res.ok)
      throw Object.assign(new Error(data.message || "The OS request failed."), {
        code: data.error,
      });
    return data;
  };
  const command = (
    kind,
    payload,
    key = crypto.randomUUID(),
    scope = workspace,
    path = "",
  ) => {
    if (!scope)
      throw new Error(
        "Connect to your signed-in workspace before submitting an update.",
      );
    return request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        "X-HY-Expected-Workspace": scope,
      },
      body: JSON.stringify({ kind, payload }),
    });
  };
  const pending = (scope = workspace) => {
    if (!scope) return [];
    try {
      const data = JSON.parse(storage.getItem(`${OUTBOX}:${scope}`) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };
  const save = (q, scope = workspace) => {
    if (!scope) return false;
    try {
      storage.setItem(`${OUTBOX}:${scope}`, JSON.stringify(q));
      return true;
    } catch {
      return false;
    }
  };
  return {
    load: () => request(""),
    command,
    loadJobs: () => request("/jobs", { headers: workspace ? { "X-HY-Expected-Workspace": workspace } : {} }),
    jobCommand: (kind, payload, key) => command(kind, payload, key, workspace, "/jobs"),
    setWorkspace(id) {
      if (
        id !== null &&
        (typeof id !== "string" ||
          !/^(org_[a-f0-9]{32}|fixture_[a-z0-9_]{1,60})$/.test(id))
      )
        throw new Error("The OS returned an invalid workspace identity.");
      workspace = id;
    },
    pending: () => pending(),
    enqueue(payload) {
      if (!workspace) return false;
      const q = pending();
      if (q.some((x) => x.payload.external_id === payload.external_id))
        return true;
      if (q.length >= 100) return false;
      q.push({ key: crypto.randomUUID(), payload });
      return save(q);
    },
    async flush() {
      if (flushing || !fetcher || !workspace) return;
      const scope = workspace;
      flushing = true;
      try {
        while (workspace === scope && pending(scope).length) {
          const first = pending(scope)[0];
          await command("feedback", first.payload, first.key, scope);
          if (
            !save(
              pending(scope).filter((x) => x.key !== first.key),
              scope,
            )
          )
            throw new Error(
              "Feedback was received but the local queue could not be updated. Retry after browser storage is available.",
            );
        }
      } finally {
        flushing = false;
      }
    },
  };
}
