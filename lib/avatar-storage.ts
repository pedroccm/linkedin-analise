import { createServiceClient } from "@/lib/supabase/server";

// Downloads an image from a (fresh) source URL and stores it in the public
// `avatars` bucket, returning a stable public URL. Used at sync time because
// LinkedIn media URLs expire and block hotlinking. Returns null on any failure
// so callers can fall back to the original URL.
export async function mirrorImage(
  sourceUrl: string | null | undefined,
  destPath: string
): Promise<string | null> {
  if (!sourceUrl) return null;
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0) return null;

    const admin = createServiceClient();
    const { error } = await admin.storage
      .from("avatars")
      .upload(destPath, bytes, { contentType, upsert: true });
    if (error) return null;

    const { data } = admin.storage.from("avatars").getPublicUrl(destPath);
    // Bust any CDN/browser cache after re-sync by appending a version param.
    return `${data.publicUrl}?v=${Date.now()}`;
  } catch {
    return null;
  }
}
