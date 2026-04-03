"use client";

import { useEffect } from "react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error-boundary]", error);
  }, [error]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem", fontFamily: "system-ui, sans-serif", background: "#0b1020", color: "#f6f7fb" }}>
      <div style={{ maxWidth: "28rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h2>
        <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#a5b1c5" }}>
          An unexpected error occurred. Please try again.
        </p>
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button onClick={reset} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.75rem", background: "#635bff", color: "white", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
            Try again
          </button>
          <button onClick={() => (window.location.href = "/")} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.75rem", background: "transparent", color: "#a5b1c5", border: "1px solid rgba(148,163,184,0.2)", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
