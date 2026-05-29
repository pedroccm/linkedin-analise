"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDict } from "@/lib/i18n/client";

type Step = {
  label: string;
  endpoint: string;
};

export function AutoSync({
  profileId,
  profileType,
}: {
  profileId: string;
  profileType: "person" | "company";
}) {
  const router = useRouter();
  const as = useDict().profile.autoSync;
  const startedRef = useRef(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    // StrictMode runs effects twice in dev; ref guard prevents double-firing
    if (startedRef.current) return;
    startedRef.current = true;

    const steps: Step[] =
      profileType === "company"
        ? [
            { label: as.details_posts, endpoint: `/api/profiles/${profileId}/sync` },
            { label: as.employees, endpoint: `/api/profiles/${profileId}/sync-employees` },
          ]
        : [
            { label: as.details_posts, endpoint: `/api/profiles/${profileId}/sync` },
            { label: as.reactions, endpoint: `/api/profiles/${profileId}/sync-reactions` },
            { label: as.comments, endpoint: `/api/profiles/${profileId}/sync-comments` },
          ];

    (async () => {
      const out: string[] = [];
      for (const s of steps) {
        setCurrentStep(s.label);
        try {
          const res = await fetch(s.endpoint, { method: "POST" });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            out.push(`✗ ${s.label}: ${body.error ?? `HTTP ${res.status}`}`);
            setResults([...out]);
            continue;
          }
          const got =
            typeof body.total === "number"
              ? `${body.total} items`
              : `OK`;
          out.push(`✓ ${s.label}: ${got}`);
          setResults([...out]);
        } catch (err) {
          out.push(`✗ ${s.label}: ${err instanceof Error ? err.message : "failed"}`);
          setResults([...out]);
        }
      }
      setCurrentStep(null);
      setDone(true);
      // Strip ?autosync=1 from URL and refresh data
      router.replace(`/profiles/${profileId}`, { scroll: false });
      router.refresh();
    })().catch((err) => setError(err instanceof Error ? err.message : "Auto-sync failed"));
  }, [profileId, profileType, router]);

  return (
    <div
      className={
        "rounded-lg p-4 text-sm border " +
        (done
          ? "bg-[#0f3a1f] border-[#1f5a36] text-[#7ee2a5]"
          : "bg-[var(--color-surface)] border-[var(--color-accent-2)]")
      }
    >
      <div className="flex items-center gap-2 font-medium">
        {!done && (
          <span className="inline-block h-3 w-3 rounded-full bg-[var(--color-accent-2)] animate-pulse" />
        )}
        <span>
          {done
            ? as.done
            : `${as.syncing} ${currentStep ? `(${currentStep})` : ""}`}
        </span>
      </div>
      {results.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-[var(--color-text-muted)]">
          {results.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      {error && <p className="text-[var(--color-danger)] text-xs mt-2">{error}</p>}
    </div>
  );
}
