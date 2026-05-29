"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useDict } from "@/lib/i18n/client";

export function UserMenu({
  email,
  planLabel,
}: {
  email: string;
  planLabel: string;
}) {
  const t = useDict().nav;
  const a = useDict().account;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-white"
      >
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
          ⚙
        </span>
        <span className="hidden sm:inline max-w-[160px] truncate">{email}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-text-muted)] truncate">{email}</div>
            <div className="text-xs text-white font-medium mt-0.5">{planLabel}</div>
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-2)] no-underline"
          >
            {a.title}
          </Link>
          <Link
            href="/billing"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-2)] no-underline"
          >
            {a.manageBilling}
          </Link>
          <form action="/auth/signout" method="post" className="border-t border-[var(--color-border)] mt-1 pt-1">
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-bg-2)]"
            >
              {t.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
