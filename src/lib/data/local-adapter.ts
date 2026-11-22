import { buildSeed } from "../seed";
import { COLLECTIONS, type Collection, type DbState, type RecordOf } from "../types";
import { applyChange, type ChangeEvent, type DataAdapter } from "./adapter";

const STORAGE_KEY = "spice-route:db:v1";
const CHANNEL = "spice-route:db";

/**
 * Zero-config adapter: state lives in localStorage (in-memory if storage is blocked)
 * and changes fan out to other tabs of the same browser via BroadcastChannel,
 * with the `storage` event as a fallback.
 */
export function createLocalAdapter(): DataAdapter {
  let memory: DbState | null = null;
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
  const tabId = Math.random().toString(36).slice(2);

  function read(): DbState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return memory;
      const parsed = JSON.parse(raw) as Partial<DbState>;
      // Tolerate older shapes: ensure every collection exists.
      const state = {} as DbState;
      for (const c of COLLECTIONS) (state as unknown as Record<string, unknown[]>)[c] = (parsed[c] as unknown[]) ?? [];
      return state;
    } catch {
      return memory;
    }
  }

  function write(state: DbState) {
    memory = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep in memory */
    }
  }

  function broadcast(e: ChangeEvent) {
    channel?.postMessage({ from: tabId, e });
  }

  function mutate(e: ChangeEvent) {
    const current = read() ?? buildSeed();
    write(applyChange(current, e));
    broadcast(e);
  }

  return {
    mode: "local",
    async load() {
      const existing = read();
      if (existing && existing.settings.length) return existing;
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
      broadcast({ type: "replace", state: seed });
    },
    subscribe(onChange) {
      const onMsg = (ev: MessageEvent<{ from: string; e: ChangeEvent }>) => {
        if (ev.data?.from !== tabId) onChange(ev.data.e);
      };
      const onStorage = (ev: StorageEvent) => {
        if (ev.key !== STORAGE_KEY || channel) return; // BroadcastChannel already covers it
        const s = read();
        if (s) onChange({ type: "replace", state: s });
      };
      channel?.addEventListener("message", onMsg);
      window.addEventListener("storage", onStorage);
      return () => {
        channel?.removeEventListener("message", onMsg);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}
