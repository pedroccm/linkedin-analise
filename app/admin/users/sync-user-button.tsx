"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncUserButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(e: React.MouseEvent) {
    // Prevent row click navigation
    e.stopPropagation();
    e.preventDefault();

    if (
      !confirm(
        "Sync EVERYTHING for this user?\n\n" +
          "This calls Apify for every profile (companies, people, employees, reactions, comments). " +
          "May take a few minutes and consume Apify credits."
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/sync-all`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(
        `${body.profiles} profiles · ${body.ok} ok` +
          (body.failed > 0 ? ` · ${body.failed} failed` : "")
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs px-3 py-1 rounded border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-[var(--color-text-muted)] hover:text-white disabled:opacity-50 disabled:cursor-wait transition-colors"
      >
        {loading ? "Syncing…" : "Sync"}
      </button>
      {result && (
        <span className="text-[10px] text-[var(--color-success)]">{result}</span>
      )}
      {error && (
        <span className="text-[10px] text-[var(--color-danger)] max-w-[180px] truncate">
          {error}
        </span>
      )}
    </div>
  );
}
