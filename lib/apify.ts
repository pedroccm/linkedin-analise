export async function runApifyActor<T = unknown>(
  actorId: string,
  input: unknown
): Promise<T[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN not configured");

  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify ${actorId} returned ${res.status}: ${text.slice(0, 500)}`);
  }

  return (await res.json()) as T[];
}

export function pickNumber(...candidates: unknown[]): number {
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (c && typeof c === "object" && "total" in c) {
      const t = (c as { total?: unknown }).total;
      if (typeof t === "number" && Number.isFinite(t)) return t;
    }
  }
  return 0;
}

export function pickDate(value: unknown): string | null {
  if (typeof value === "number" && value > 0) {
    return new Date(value > 1e12 ? value : value * 1000).toISOString();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (value && typeof value === "object") {
    const v = value as { timestamp?: unknown; date?: unknown };
    if (typeof v.timestamp === "number") {
      return new Date(v.timestamp > 1e12 ? v.timestamp : v.timestamp * 1000).toISOString();
    }
    if (typeof v.date === "string") {
      const d = new Date(v.date);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}
