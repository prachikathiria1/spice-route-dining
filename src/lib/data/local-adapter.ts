import { buildSeed, DEMO_SLUG } from "../seed";
import { COLLECTIONS, type Collection, type DbState, type RecordOf, type Settings } from "../types";
import { applyChange, RestaurantNotFound, type ChangeEvent, type DataAdapter } from "./adapter";

const keyFor = (rid: string) => `smartdine:db:v2:${rid}`;
const LEGACY_KEY = "spice-route:db:v1";

/**
 * Zero-config adapter for one restaurant: state lives in localStorage (in-memory if
 * storage is blocked) and changes fan out to other tabs via BroadcastChannel.
 */
export function createLocalAdapter(rid: string): DataAdapter {
  const KEY = keyFor(rid);
  let memory: DbState | null = null;
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`smartdine:${rid}`) : null;
  const tabId = Math.random().toString(36).slice(2);

  function normalise(parsed: Partial<DbState>): DbState {
    const state = {} as DbState;
    for (const c of COLLECTIONS) (state as unknown as Record<string, unknown[]>)[c] = (parsed[c] as unknown[]) ?? [];
    return state;
  }

  function read(): DbState | null {
    try {
      let raw = localStorage.getItem(KEY);
      // One-time migration of the single-restaurant demo data.
      if (!raw && rid === DEMO_SLUG && (raw = localStorage.getItem(LEGACY_KEY))) localStorage.setItem(KEY, raw);
      return raw ? normalise(JSON.parse(raw)) : memory;
    } catch {
      return memory;
    }
  }

  function write(state: DbState) {
    memory = state;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep in memory */
    }
  }

  function mutate(e: ChangeEvent) {
    const current = read();
    if (!current) return;
    write(applyChange(current, e));
    channel?.postMessage({ from: tabId, e });
  }

  return {
    mode: "local",
    restaurantId: rid,
    async load() {
      const existing = read();
      if (existing && existing.settings.length) {
        // Older demo data has no slug on its settings row.
        if (!existing.settings[0].slug) existing.settings[0] = { ...existing.settings[0], slug: rid };
        return existing;
      }
      if (rid !== DEMO_SLUG) throw new RestaurantNotFound(rid);
      const seed = buildSeed();
      write(seed);
      return seed;
    },
    async upsert<C extends Collection>(collection: C, records: RecordOf<C>[]) {
      mutate({ type: "upsert", collection, records: records as { id: string }[] });
    },
    async remove(collection, ids) {
      mutate({ type: "remove", collection, ids });
    },
    async reset(seed) {
      write(seed);
      channel?.postMessage({ from: tabId, e: { type: "replace", state: seed } });
    },
    subscribe(onChange) {
      const onMsg = (ev: MessageEvent<{ from: string; e: ChangeEvent }>) => {
        if (ev.data?.from !== tabId) onChange(ev.data.e);
      };
      const onStorage = (ev: StorageEvent) => {
        if (ev.key !== KEY || channel) return;
        const s = read();
        if (s) onChange({ type: "replace", state: s });
      };
      channel?.addEventListener("message", onMsg);
      window.addEventListener("storage", onStorage);
      return () => {
        channel?.removeEventListener("message", onMsg);
        window.removeEventListener("storage", onStorage);
        channel?.close();
      };
    },
  };
}

/** Local mode: every restaurant stored in this browser (for the super admin list). */
export function listLocalRestaurants(): Settings[] {
  const out: Settings[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith("smartdine:db:v2:")) continue;
      const s = (JSON.parse(localStorage.getItem(k) ?? "{}") as Partial<DbState>).settings?.[0];
      if (s) out.push({ ...s, slug: s.slug || k.slice("smartdine:db:v2:".length) });
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function writeLocalRestaurant(rid: string, state: DbState) {
  localStorage.setItem(keyFor(rid), JSON.stringify(state));
}
