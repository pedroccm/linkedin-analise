"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ProfileRef = { id: string; label: string };

export function SyncAllButton({ profiles }: { profiles: ProfileRef[] }) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<{ ok: number; failed: number }>({
    ok: 0,
    failed: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function handleClick() {
    if (profiles.length === 0) return;
    setIsRunning(true);
    setError(null);
    setResults({ ok: 0, failed: 0 });

    let ok = 0;
    let failed = 0;

    for (let i = 0; i < profiles.length; i++) {
      const p = profiles[i];
      setProgress(`Syncing ${i + 1}/${profiles.length} · ${p.label}`);
      try {
        const res = await fetch(`/api/profiles/${p.id}/sync`, {
          method: "POST",
        });
        if (res.ok) ok += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
      setResults({ ok, failed });
    }

    setProgress(null);
    setIsRunning(false);
    startTransition(() => router.refresh());
    if (failed > 0) {
      setError(`${failed} profile${failed === 1 ? "" : "s"} failed`);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isRunning || profiles.length === 0}
        className="text-sm px-4 py-2 rounded border border-[var(--color-border)] hover:border-[var(--color-accent-2)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        {isRunning ? "Syncing…" : `Sync all (${profiles.length})`}
      </button>
      {progress && (
        <span className="text-xs text-[var(--color-text-muted)] truncate max-w-xs">
          {progress}
        </span>
      )}
      {!progress && (results.ok > 0 || results.failed > 0) && (
        <span className="text-xs text-[var(--color-success)]">
          {results.ok} ok
          {results.failed > 0 && (
            <span className="text-[var(--color-danger)] ml-2">
              · {results.failed} failed
            </span>
          )}
        </span>
      )}
      {error && !progress && (
        <span className="text-xs text-[var(--color-danger)]">{error}</span>
      )}
    </div>
  );
}
