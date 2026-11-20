import type { Player, Purchase, Receipt } from "../api/progression";
import { characterIds } from "../game/config/character-assets.ts";

export interface ProgressData {
  backup?: { owner: string; version: number };
  player: Player | null;
  pending: { owner: string; event: Receipt }[];
  purchase: { owner: string; body: Purchase } | null;
}
export function emptyProgress(): ProgressData {
  return { player: null, pending: [], purchase: null };
}
function record(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
const natural = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
function validPlayer(v: unknown): boolean {
  return (
    v === null ||
    (record(v) &&
      uuid(v.player_id) &&
      natural(v.faaz) &&
      natural(v.f7_score) &&
      Array.isArray(v.unlocks) &&
      v.unlocks.every((id) => typeof id === "string"))
  );
}
export function validProgress(v: unknown): v is ProgressData {
  if (!record(v) || !validPlayer(v.player) || !Array.isArray(v.pending))
    return false;
  if (
    !v.pending.every((p) => {
      if (!record(p) || !uuid(p.owner) || !record(p.event)) return false;
      const friend = p.event.character_id;
      return (
        uuid(p.event.event_id) &&
        uuid(p.event.request_id) &&
        characterIds.some((id) => id === friend) &&
        typeof p.event.activity_id === "string" &&
        natural(p.event.duration_ticks) &&
        p.event.duration_ticks > 0
      );
    })
  )
    return false;
  if (
    v.backup !== undefined &&
    (!record(v.backup) || !uuid(v.backup.owner) || !natural(v.backup.version))
  )
    return false;
  const p = v.purchase;
  return (
    p === null ||
    (record(p) &&
      uuid(p.owner) &&
      record(p.body) &&
      uuid(p.body.idempotency_key) &&
      typeof p.body.unlock_id === "string")
  );
}
