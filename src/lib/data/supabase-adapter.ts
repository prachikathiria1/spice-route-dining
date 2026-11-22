import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildSeed, DEMO_SLUG } from "../seed";
import { COLLECTIONS, type Collection, type DbState, type RecordOf, type Settings } from "../types";
import { RestaurantNotFound, rowId, stripRowId, type ChangeEvent, type DataAdapter } from "./adapter";

let shared: SupabaseClient | null = null;
export function supabaseClient(url: string, anonKey: string): SupabaseClient {
  shared ??= createClient(url, anonKey, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 20 } } });
  return shared;
}

/**
 * Supabase (free tier) adapter for one restaurant. Collections are tables of
 * `id text primary key, data jsonb`; row ids are "<restaurant>::<id>" and data carries restaurantId.
 */
export function createSupabaseAdapter(url: string, anonKey: string, rid: string): DataAdapter {
  const sb = supabaseClient(url, anonKey);
  const prefix = `${rid}::%`;

  async function fetchAll(): Promise<DbState> {
    const results = await Promise.all(
      COLLECTIONS.map(async (c) => {
        const { data, error } = await sb.from(c).select("id,data").like("id", prefix).limit(10000);
        if (error) throw new Error(`Supabase: could not read "${c}": ${error.message}. Did you run supabase/schema.sql?`);
        return [c, (data ?? []).map((r) => r.data)] as const;
      }),
    );
    return Object.fromEntries(results) as unknown as DbState;
  }

  const toRows = (records: { id: string }[]) => records.map((r) => ({ id: rowId(rid, r.id), data: { ...r, restaurantId: rid }, updated_at: new Date().toISOString() }));

  /** `settings` is written last: its presence marks a complete restaurant. */
  async function insertAll(state: DbState, only: Collection[] = COLLECTIONS) {
    const order = [...only.filter((c) => c !== "settings"), ...only.filter((c) => c === "settings")];
    for (const c of order) {
      const rows = toRows(state[c] as { id: string }[]);
      if (!rows.length) continue;
      const { error } = await sb.from(c).upsert(rows);
      if (error) throw new Error(`Supabase: writing "${c}" failed: ${error.message}`);
    }
  }

  return {
    mode: "supabase",
    restaurantId: rid,
    async load() {
      const state = await fetchAll();
      if (state.settings.length) return state;
      if (rid !== DEMO_SLUG) throw new RestaurantNotFound(rid);
      const seed = buildSeed();
      await insertAll(seed);
      return seed;
    },
    async upsert<C extends Collection>(collection: C, records: RecordOf<C>[]) {
      const { error } = await sb.from(collection).upsert(toRows(records as { id: string }[]));
      if (error) console.error(`[supabase] upsert ${collection}`, error);
    },
    async remove(collection, ids) {
      const { error } = await sb.from(collection).delete().in("id", ids.map((i) => rowId(rid, i)));
      if (error) console.error(`[supabase] delete ${collection}`, error);
    },
    async reset(seed) {
      for (const c of COLLECTIONS) {
        const { error } = await sb.from(c).delete().like("id", prefix);
        if (error) throw new Error(`Supabase: clearing "${c}" failed: ${error.message}`);
      }
      await insertAll(seed);
    },
    subscribe(onChange) {
      const channel = sb.channel(`smartdine-${rid}-${Math.random().toString(36).slice(2, 8)}`);
      for (const c of COLLECTIONS) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: c }, (payload) => {
          let e: ChangeEvent;
          if (payload.eventType === "DELETE") {
            const id = stripRowId(rid, (payload.old as { id?: string }).id ?? "");
            if (!id) return;
            e = { type: "remove", collection: c, ids: [id] };
          } else {
            const row = payload.new as { id?: string; data?: { id: string; restaurantId?: string } };
            if (!row?.data || !row.id || stripRowId(rid, row.id) === null) return;
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

/** Create a whole restaurant (settings last). */
export async function supabaseCreateRestaurant(url: string, anonKey: string, rid: string, state: DbState) {
  const a = createSupabaseAdapter(url, anonKey, rid);
  const sb = supabaseClient(url, anonKey);
  const { data } = await sb.from("settings").select("id").eq("id", rowId(rid, "main")).maybeSingle();
  if (data) throw new Error(`The address /r/${rid} is already taken.`);
  await a.reset(state);
}

/** Every restaurant's settings row (for the super admin list). */
export async function supabaseListRestaurants(url: string, anonKey: string): Promise<Settings[]> {
  const sb = supabaseClient(url, anonKey);
  const { data, error } = await sb.from("settings").select("id,data").like("id", "%::main").limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...(r.data as Settings), slug: (r.data as Settings).slug || r.id.split("::")[0] }));
}
