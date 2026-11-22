import type { Collection, DbState, RecordOf } from "../types";

export type ChangeEvent =
  | { type: "upsert"; collection: Collection; records: { id: string }[] }
  | { type: "remove"; collection: Collection; ids: string[] }
  | { type: "replace"; state: DbState };

export interface DataAdapter {
  mode: "local" | "supabase";
  load(): Promise<DbState>;
  upsert<C extends Collection>(collection: C, records: RecordOf<C>[]): Promise<void>;
  remove(collection: Collection, ids: string[]): Promise<void>;
  /** Changes made by *other* tabs/devices. */
  subscribe(onChange: (e: ChangeEvent) => void): () => void;
  reset(seed: DbState): Promise<void>;
}

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
