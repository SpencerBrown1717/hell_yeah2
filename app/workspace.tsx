"use client";
import { useEffect } from "react";
import { mountWorkspace } from "../web/js/app.mjs";
export default function Workspace() {
  useEffect(() => {
    const app = mountWorkspace(window);
    return () => app.destroy();
  }, []);
  return (
    <>
      <a className="skip-link" href="#main" data-action="skip-main">
        Skip to workspace
      </a>
      <div id="app">
        <p style={{ padding: 32 }}>Opening your growth workspace…</p>
      </div>
      <dialog id="dialog" aria-labelledby="dialog-title" />
      <div
        id="notifications"
        className="toast-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
    </>
  );
}
