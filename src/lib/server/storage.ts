/**
 * Server-only access to Supabase Storage with the secret (service) key.
 * Never import from client components.
 */
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = () => process.env.SUPABASE_SECRET_KEY;

export const hasServiceStorage = () => !!(url() && key());

const headers = (extra: Record<string, string> = {}) => ({ apikey: key()!, Authorization: `Bearer ${key()}`, ...extra });

export async function readPrivateJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${url()}/storage/v1/object/authenticated/secure/${path}`, { headers: headers(), cache: "no-store" });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`storage read ${res.status}`);
  return (await res.json()) as T;
}

export async function writePrivateJson(path: string, value: unknown): Promise<void> {
  const res = await fetch(`${url()}/storage/v1/object/secure/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json", "x-upsert": "true" }),
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`storage write ${res.status}: ${await res.text()}`);
}

/** Uploads to the public "media" bucket and returns its public URL. */
export async function uploadMedia(path: string, body: ArrayBuffer, contentType: string): Promise<string> {
  const res = await fetch(`${url()}/storage/v1/object/media/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": contentType, "x-upsert": "true", "cache-control": "max-age=31536000" }),
    body,
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${await res.text()}`);
  return `${url()}/storage/v1/object/public/media/${path}`;
}
