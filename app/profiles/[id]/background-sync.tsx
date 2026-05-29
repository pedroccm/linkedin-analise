"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDict } from "@/lib/i18n/client";

type PendingPerson = {
  id: string;
  name: string;
};

const STEPS: Array<{ endpoint: string; label: string }> = [
  { endpoint: "sync", label: "posts" },
  { endpoint: "sync-reactions", label: "reactions" },
  { endpoint: "sync-comments", label: "comments" },
];

export function BackgroundSync({ pending }: { pending: PendingPerson[] }) {
  const router = useRouter();
  const bg = useDict().profile.bgSync;
  const startedRef = useRef<string>("");
  const [progress, setProgress] = useState<{
    index: number;
    name: string;
    step: string;
  } | null>(null);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const key = pending.map((p) => p.id).sort().join(",");
    if (key === "" || startedRef.current === key) return;
    startedRef.current = key;

    setFinished(false);
    setDone(0);
    setFailed(0);

    (async () => {
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i];
        let anyOk = false;
        let anyFail = false;
        for (const step of STEPS) {
          setProgress({ index: i + 1, name: p.name, step: step.label });
          try {
            const res = await fetch(`/api/profiles/${p.id}/${step.endpoint}`, {
              method: "POST",
            });
            if (res.ok) anyOk = true;
            else anyFail = true;
          } catch {
            anyFail = true;
          }
        }
        if (anyOk) setDone((d) => d + 1);
        if (anyFail && !anyOk) setFailed((f) => f + 1);
        router.refresh();
      }
      setProgress(null);
      setFinished(true);
    })();
  }, [pending, router]);

  if (pending.length === 0) return null;

  if (finished && collapsed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div
        className={
          "rounded-lg shadow-lg p-4 border text-sm " +
          (finished
            ? "bg-[#0f3a1f] border-[#1f5a36] text-[#7ee2a5]"
            : "bg-[var(--color-surface)] border-[var(--color-accent-2)] text-white")
        }
      >
        <div className="flex items-center gap-2">
          {!finished && (
            <span className="inline-block h-3 w-3 rounded-full bg-[var(--color-accent-2)] animate-pulse" />
          )}
          <span className="font-medium">
            {finished
              ? `${bg.done} · ${done} ${bg.ok}${failed > 0 ? ` · ${failed} ${bg.failed}` : ""}`
              : `${bg.syncing} ${progress?.index ?? 0}/${pending.length}`}
          </span>
          {finished && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="ml-auto text-xs opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
        {progress && (
          <div className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
            {progress.name} · {progress.step}
          </div>
        )}
      </div>
    </div>
  );
}
