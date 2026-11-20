import { json, request } from "./client";
import type { components } from "./schema";
export type Player = components["schemas"]["Player"];
export type Catalog = components["schemas"]["Catalog"];
export type Purchase = components["schemas"]["Purchase"];
export type Receipt = components["schemas"]["RequestCompletion"];
type BatchResult = components["schemas"]["BatchResult"];
export type PlayerSave = components["schemas"]["PlayerSave"];
export type SaveUpdate = components["schemas"]["SaveUpdate"];
export const progression = {
  getSave: (owner: string) =>
    json<PlayerSave>("players/me/save", undefined, owner),
  putSave: (owner: string, body: SaveUpdate) =>
    json<PlayerSave>("players/me/save", body, owner, "PUT"),
  catalog: () => json<Catalog>("catalog/unlocks"),
  session: () => request("development/session", {}),
  player: () => json<Player>("players/me"),
  purchase: (owner: string, body: Purchase) =>
    json<components["schemas"]["PurchaseResult"]>("purchases", body, owner),
  sync: (owner: string, events: Receipt[]) =>
    json<BatchResult>("game-events/batch", { events }, owner),
};
