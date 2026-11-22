import type { Collection, DbState, RecordOf } from "../types";

export type ChangeEvent =
  | { type: "upsert"; collection: Collection; records: { id: string }[] }
  | { type: "remove"; collection: Collection; ids: string[] }
  | { type: "replace"; state: DbState };

/** Thrown by load() when the restaurant doesn't exist. */
export class RestaurantNotFound extends Error {
  constructor(public slug: string) {
    super(`Restaurant "${slug}" not found`);
  }
}

/** One adapter instance serves exactly one restaurant. */
export interface DataAdapter {
  mode: "local" | "supabase";
  restaurantId: string;
  load(): Promise<DbState>;
  upsert<C extends Collection>(collection: C, records: RecordOf<C>[]): Promise<void>;
  remove(collection: Collection, ids: string[]): Promise<void>;
  /** Changes made by *other* tabs/devices. */
  subscribe(onChange: (e: ChangeEvent) => void): () => void;
  reset(seed: DbState): Promise<void>;
}

/** Storage-level ids are namespaced per restaurant so many restaurants share the same tables. */
export const rowId = (rid: string, id: string) => `${rid}::${id}`;
export const stripRowId = (rid: string, id: string) => (id.startsWith(`${rid}::`) ? id.slice(rid.length + 2) : null);

export function applyChange(state: DbState, e: ChangeEvent): DbState {
  if (e.type === "replace") return e.state;
  const list = state[e.collection] as { id: string }[];
  if (e.type === "upsert") {
    const byId = new Map(list.map((r) => [r.id, r]));
    for (const r of e.records) byId.set(r.id, r);
    return { ...state, [e.collection]: Array.from(byId.values()) };
  }
  const drop = new Set(e.ids);
  return { ...state, [e.collection]: list.filter((r) => !drop.has(r.id)) };
}

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
