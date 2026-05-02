"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldOff, ShieldCheck, UserX, UserCheck } from "lucide-react";

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  isSuperadmin: boolean;
  isActive: boolean;
}

const ROLES = ["student", "teacher", "admin"] as const;

export function UserRowActions({
  user,
  isSelf,
}: {
  user: User;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(j?.error || `HTTP ${res.status}`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <select
          aria-label="Role"
          disabled={pending || isSelf}
          value={user.role}
          onChange={(e) => patch({ role: e.target.value })}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] px-1.5 py-1 text-xs disabled:opacity-50"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={pending || (isSelf && user.isSuperadmin)}
          onClick={() =>
            patch(
              { isSuperadmin: !user.isSuperadmin },
              user.isSuperadmin
                ? `Revoke superadmin from ${user.email}?`
                : `Grant superadmin to ${user.email}?`,
            )
          }
          title={user.isSuperadmin ? "Revoke superadmin" : "Grant superadmin"}
          className={
            "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] disabled:opacity-50 " +
            (user.isSuperadmin
              ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
              : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]")
          }
        >
          {user.isSuperadmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          disabled={pending || (isSelf && user.isActive)}
          onClick={() =>
            patch(
              { isActive: !user.isActive },
              user.isActive ? `Deactivate ${user.email}?` : undefined,
            )
          }
          title={user.isActive ? "Deactivate" : "Reactivate"}
          className={
            "inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] disabled:opacity-50 " +
            (user.isActive
              ? "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-700"
              : "bg-red-50 text-red-700 hover:bg-red-100")
          }
        >
          {user.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
        </button>

        {pending && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-[var(--text-secondary)]" />}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
