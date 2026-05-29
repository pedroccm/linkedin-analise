"use client";

import { useState } from "react";

export function CopyInvite({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:border-[var(--color-accent-2)] text-[var(--color-text-muted)] hover:text-white"
    >
      {copied ? "✓" : label}
    </button>
  );
}
