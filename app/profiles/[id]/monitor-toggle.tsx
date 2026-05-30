"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMonitor } from "./monitor-actions";
import { useDict } from "@/lib/i18n/client";

export function MonitorToggle({
  profileId,
  enabled,
}: {
  profileId: string;
  enabled: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = useDict().profile;

  function toggle() {
    const next = !on;
    setOn(next); // optimistic
    startTransition(async () => {
      await setMonitor(profileId, next);
      router.refresh();
    });
  }

  const base =
    "text-sm px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const cls = on
    ? `${base} bg-[#0f3a1f] text-[#7ee2a5] border border-[#1f5a36] hover:bg-[#14492a]`
    : `${base} border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-white`;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={on ? t.monitorOnHint : t.monitorOffHint}
      className={cls}
    >
      {on ? `🔔 ${t.monitoring}` : `🔕 ${t.monitor}`}
    </button>
  );
}
