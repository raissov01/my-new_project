import { redirect } from "next/navigation";
import { HardDrive, AlertTriangle, FolderOpen } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { AdminPageHeader } from "../_components/coming-soon";

export const metadata = { title: "Storage — Admin" };
export const dynamic = "force-dynamic";

interface FileInfo {
  name: string;
  path: string;
  bytes: number;
  modified: string;
  orphan?: boolean;
}

interface DirReport {
  name: string;
  path: string;
  exists: boolean;
  totalBytes: number;
  fileCount: number;
  largest: FileInfo[];
  orphanCount: number;
  orphanBytes: number;
  orphans?: FileInfo[];
  error?: string;
}

interface StorageResponse {
  generatedAt: string;
  dirs: DirReport[];
}

export default async function AdminStoragePage() {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  let data: StorageResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await fetchBackendJson<StorageResponse>({
      path: `/api/v1/admin/storage`,
      userId: auth.user.id,
      timeoutMs: 20_000,
    });
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load storage";
  }

  const totalBytes = data?.dirs.reduce((sum, d) => sum + d.totalBytes, 0) ?? 0;
  const totalFiles = data?.dirs.reduce((sum, d) => sum + d.fileCount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Storage"
        description="Disk usage of upload directories. Cached for 60s — sizes refresh on the next request after that."
      />

      {loadError && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {data && (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Tile
              icon={HardDrive}
              label="Total uploads"
              value={fmtBytes(totalBytes)}
              hint={`${totalFiles.toLocaleString()} files across ${data.dirs.length} dirs`}
            />
            <Tile
              icon={FolderOpen}
              label="Largest dir"
              value={largestDirLabel(data.dirs)}
            />
            <Tile
              icon={AlertTriangle}
              label="Scanned at"
              value={data.generatedAt.slice(0, 19).replace("T", " ")}
              hint="Cache TTL is 60 seconds"
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {data.dirs.map((d) => (
              <DirCard key={d.path} dir={d} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DirCard({ dir }: { dir: DirReport }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)]">
      <header className="flex items-start gap-2 border-b border-[var(--border)] px-4 py-3">
        <FolderOpen className="mt-0.5 h-4 w-4 text-[var(--text-secondary)]" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{dir.name}</h2>
          <p className="font-mono text-[10px] text-[var(--text-secondary)]">{dir.path}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
            {dir.exists ? fmtBytes(dir.totalBytes) : "—"}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {dir.exists ? `${dir.fileCount.toLocaleString()} files` : "not provisioned"}
          </div>
          {dir.exists && dir.orphanCount > 0 && (
            <div className="mt-1 text-[10px] font-semibold text-amber-700">
              {dir.orphanCount.toLocaleString()} orphan · {fmtBytes(dir.orphanBytes)}
            </div>
          )}
        </div>
      </header>

      {dir.error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {dir.error}
        </div>
      )}

      {dir.exists && dir.largest && dir.largest.length > 0 ? (
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-soft)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Largest files</th>
              <th className="px-3 py-2 text-right font-semibold">Size</th>
              <th className="px-3 py-2 text-right font-semibold">Modified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
            {dir.largest.map((f) => (
              <tr key={f.path}>
                <td className="px-3 py-2 break-all text-[var(--text-primary)]">
                  {f.name}
                  {f.orphan && (
                    <span className="ml-2 rounded-[var(--radius-sm)] bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-800">
                      orphan
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtBytes(f.bytes)}</td>
                <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                  {f.modified.slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : dir.exists ? (
        <div className="p-4 text-center text-xs text-[var(--text-secondary)]">Empty.</div>
      ) : null}

      {dir.orphans && dir.orphans.length > 0 && (
        <details className="border-t border-[var(--border)]">
          <summary className="cursor-pointer bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
            Top {dir.orphans.length} orphan candidates (no DB reference)
          </summary>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[var(--border)] font-mono text-xs">
              {dir.orphans.map((f) => (
                <tr key={f.path}>
                  <td className="px-3 py-2 break-all text-[var(--text-primary)]">{f.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtBytes(f.bytes)}</td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                    {f.modified.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-soft)] text-[var(--primary)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</div>}
    </div>
  );
}

function fmtBytes(n: number): string {
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function largestDirLabel(dirs: DirReport[]): string {
  const real = dirs.filter((d) => d.exists);
  if (real.length === 0) return "—";
  const winner = real.reduce((a, b) => (a.totalBytes >= b.totalBytes ? a : b));
  return `${winner.name} (${fmtBytes(winner.totalBytes)})`;
}
