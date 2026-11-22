/** Best-effort in-memory login throttle (per server instance). */
const attempts = new Map<string, { n: number; until: number }>();

export function throttled(key: string): boolean {
  const a = attempts.get(key);
  return !!a && a.until > Date.now();
}

export function recordFailure(key: string, limit = 5) {
  const n = (attempts.get(key)?.n ?? 0) + 1;
  attempts.set(key, { n, until: n >= limit ? Date.now() + 60_000 : 0 });
}

export const clearFailures = (key: string) => attempts.delete(key);

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
