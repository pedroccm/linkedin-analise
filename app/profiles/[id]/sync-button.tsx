"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDict } from "@/lib/i18n/client";

export function SyncButton({
  endpoint,
  label = "Sync",
  variant = "primary",
}: {
  endpoint: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const c = useDict().common;

  async function handleClick() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? c.syncFailed);
        return;
      }
      setMessage(`+${body.inserted ?? 0} · ${body.total ?? 0} total`);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : c.syncFailed);
    } finally {
      setBusy(false);
    }
  }

  const base =
    "text-sm px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    variant === "primary"
      ? `${base} bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white`
      : `${base} border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-white`;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || isPending}
        className={cls}
      >
        {busy ? c.syncing : label}
      </button>
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
      {message && (
        <span className="text-xs text-[var(--color-success)]">{message}</span>
      )}
    </div>
  );
}
