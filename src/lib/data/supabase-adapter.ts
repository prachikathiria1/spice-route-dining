import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildSeed } from "../seed";
import { COLLECTIONS, type Collection, type DbState, type RecordOf } from "../types";
import type { ChangeEvent, DataAdapter } from "./adapter";

/**
 * Supabase (free tier) adapter. Each collection is a table with
 * `id text primary key, data jsonb, updated_at timestamptz` (see supabase/schema.sql),
 * and Realtime postgres_changes keeps every device in sync.
 */
export function createSupabaseAdapter(url: string, anonKey: string): DataAdapter {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });

  async function fetchAll(): Promise<DbState> {
    const results = await Promise.all(
      COLLECTIONS.map(async (c) => {
        const { data, error } = await sb.from(c).select("id,data").limit(5000);
        if (error) throw new Error(`Supabase: could not read "${c}" — ${error.message}. Did you run supabase/schema.sql?`);
        return [c, (data ?? []).map((r) => r.data)] as const;
      }),
    );
    return Object.fromEntries(results) as unknown as DbState;
  }

  /** Seeds the given collections. `settings` is always written last: its presence marks a complete seed. */
  async function insertAll(state: DbState, only: Collection[] = COLLECTIONS) {
    const order = [...only.filter((c) => c !== "settings"), ...only.filter((c) => c === "settings")];
    for (const c of order) {
      const rows = (state[c] as { id: string }[]).map((r) => ({ id: r.id, data: r }));
      if (!rows.length) continue;
      const { error } = await sb.from(c).upsert(rows);
      if (error) throw new Error(`Supabase: seeding "${c}" failed — ${error.message}`);
    }
  }

  return {
    mode: "supabase",
    async load() {
      const state = await fetchAll();
      if (state.settings.length && state.restaurant_tables.length && state.menu_items.length) return state;
      // Fresh project, or a seed that was interrupted: fill in whatever core data is missing.
      const seed = buildSeed();
      if (!state.settings.length && !state.restaurant_tables.length) {
        await insertAll(seed);
        return seed;
      }
      const missing = (["menu_items", "restaurant_tables", "settings"] as const).filter((c) => !state[c].length);
      await insertAll(seed, missing);
      return { ...state, ...Object.fromEntries(missing.map((c) => [c, seed[c]])) } as DbState;
    },
    async upsert<C extends Collection>(collection: C, records: RecordOf<C>[]) {
      const rows = (records as { id: string }[]).map((r) => ({ id: r.id, data: r, updated_at: new Date().toISOString() }));
      const { error } = await sb.from(collection).upsert(rows);
      if (error) console.error(`[supabase] upsert ${collection}`, error);
    },
    async remove(collection, ids) {
      const { error } = await sb.from(collection).delete().in("id", ids);
      if (error) console.error(`[supabase] delete ${collection}`, error);
    },
    async reset(seed) {
      for (const c of COLLECTIONS) {
        const { error } = await sb.from(c).delete().neq("id", "");
        if (error) throw new Error(`Supabase: clearing "${c}" failed — ${error.message}`);
      }
      await insertAll(seed);
    },
    subscribe(onChange) {
      const channel = sb.channel("spice-route-db");
      for (const c of COLLECTIONS) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: c }, (payload) => {
          let e: ChangeEvent;
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (!id) return;
            e = { type: "remove", collection: c, ids: [id] };
          } else {
            const row = payload.new as { data?: { id: string } };
            if (!row?.data) return;
            e = { type: "upsert", collection: c, records: [row.data] };
          }
          onChange(e);
        });
      }
      channel.subscribe();
      return () => {
        void sb.removeChannel(channel);
      };
    },
  };
}
