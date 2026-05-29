"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatPrice, type Plan } from "@/lib/plans";

type PixState = {
  paymentId: string;
  brCode: string;
  brCodeBase64: string;
  amount: number;
  expiresAt: string;
};

export function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  const router = useRouter();
  const [pix, setPix] = useState<PixState | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [copied, setCopied] = useState(false);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: plan.tier }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Checkout failed");
        return;
      }
      setPix(body);
      setStatus("PENDING");
      pollStatus(body.paymentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  async function pollStatus(paymentId: string) {
    setPolling(true);
    for (let i = 0; i < 90; i++) {
      // ~3 min total (90 * 2s)
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/checkout/status?paymentId=${paymentId}`);
        const body = await res.json();
        if (body.status === "PAID") {
          setStatus("PAID");
          setPolling(false);
          setTimeout(() => router.refresh(), 1500);
          return;
        }
        if (body.status === "EXPIRED" || body.status === "CANCELLED") {
          setStatus(body.status);
          setPolling(false);
          return;
        }
      } catch {
        // keep polling
      }
    }
    setPolling(false);
  }

  async function simulatePaid() {
    if (!pix) return;
    const res = await fetch(
      `/api/checkout/status?paymentId=${pix.paymentId}&simulate=true`
    );
    if (res.ok) {
      setStatus("PAID");
      setTimeout(() => router.refresh(), 1000);
    }
  }

  async function copyBrCode() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (status === "PAID") {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-success)] rounded-lg p-6 text-center">
        <div className="text-2xl mb-2">✓</div>
        <div className="text-lg font-semibold mb-1">Payment confirmed</div>
        <div className="text-sm text-[var(--color-text-muted)]">
          Your {plan.name} plan is now active. Refreshing…
        </div>
      </div>
    );
  }

  if (pix) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
        <div className="text-sm text-[var(--color-text-muted)] mb-3">
          {plan.name} · {formatPrice(plan.priceCents)}
        </div>
        <div className="flex justify-center mb-4">
          <Image
            src={`data:image/png;base64,${pix.brCodeBase64}`}
            alt="PIX QR code"
            width={220}
            height={220}
            className="rounded bg-white p-2"
            unoptimized
          />
        </div>
        <button
          type="button"
          onClick={copyBrCode}
          className="w-full text-xs bg-[var(--color-bg-2)] hover:bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 mb-3 break-all"
        >
          {copied ? "✓ Copied!" : "Tap to copy PIX code"}
        </button>
        <div className="text-xs text-[var(--color-text-muted)] text-center">
          {polling ? (
            <span>Waiting for payment…</span>
          ) : status === "EXPIRED" ? (
            <span className="text-[var(--color-danger)]">PIX expired</span>
          ) : (
            <span>Status: {status}</span>
          )}
        </div>
        {process.env.NODE_ENV !== "production" && (
          <button
            type="button"
            onClick={simulatePaid}
            className="w-full mt-3 text-[10px] text-[var(--color-text-muted)] hover:text-white border border-dashed border-[var(--color-border)] rounded py-1.5"
          >
            [dev] Simulate paid
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={
        "bg-[var(--color-surface)] border rounded-lg p-6 flex flex-col " +
        (isCurrent
          ? "border-[var(--color-success)]"
          : "border-[var(--color-border)]")
      }
    >
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {isCurrent && (
          <span className="text-xs text-[var(--color-success)] uppercase tracking-wide">
            Current
          </span>
        )}
      </div>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">{plan.description}</p>
      <div className="text-3xl font-semibold mb-1">{formatPrice(plan.priceCents)}</div>
      <div className="text-xs text-[var(--color-text-muted)] mb-5">
        for 30 days · pay via PIX
      </div>
      <ul className="space-y-2 mb-6 text-sm flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-[var(--color-success)] shrink-0">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] disabled:opacity-50 text-white font-medium py-2.5 rounded text-sm transition-colors"
      >
        {loading ? "Generating PIX…" : isCurrent ? "Renew (+30 days)" : `Get ${plan.name}`}
      </button>
      {error && (
        <p className="text-xs text-[var(--color-danger)] mt-2">{error}</p>
      )}
    </div>
  );
}
