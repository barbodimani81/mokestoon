import {
  type ActivityId,
  activities,
  householdTuning,
} from "../game/config/activities.ts";
import {
  type CharacterId,
  characterIds,
} from "../game/config/character-assets.ts";
import type { Point } from "../game/map/apartment.ts";
import { clearOfFriends, fits } from "../game/map/routes.ts";
import type {
  ApartmentSession,
  FriendRequest,
} from "../game/systems/session.ts";

export function snapshot(s: ApartmentSession) {
  const house = s.house;
  return {
    version: 1,
    ticks: s.ticks,
    request: s.request ? { ...s.request } : null,
    requestCount: s.requestCount,
    nextRequest: s.nextRequest,
    positions: s.movement.actors.map((a) => ({ ...a.position })),
    dishes: house.dishes,
    clutter: house.clutter,
    fatigue: { ...house.fatigue },
    seed: house.seed,
    nextAmbient: [...house.nextAmbient],
    reactions: [...s.reactions],
    tvReady: house.tvReady,
    ps4Ready: house.ps4Ready,
  };
}
export type Checkpoint = ReturnType<typeof snapshot>;
const integer = (
  n: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): n is number =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= max;
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object";
function isFriend(v: unknown): v is CharacterId {
  return characterIds.includes(v as CharacterId);
}
function isPosition(v: unknown): v is Point {
  return (
    record(v) &&
    typeof v.x === "number" &&
    Number.isFinite(v.x) &&
    typeof v.y === "number" &&
    Number.isFinite(v.y) &&
    fits({ x: v.x, y: v.y })
  );
}
function validRequest(v: unknown): v is FriendRequest {
  return (
    record(v) &&
    typeof v.id === "string" &&
    v.id.length <= 64 &&
    isFriend(v.friend) &&
    Object.hasOwn(activities, v.activity as ActivityId) &&
    [
      "pending",
      "accepted",
      "in_progress",
      "cooling",
      "ready",
      "completed",
      "failed",
      "expired",
      "cancelled",
    ].includes(String(v.status)) &&
    (v.readyAt === undefined || integer(v.readyAt)) &&
    (!["cooling", "ready"].includes(String(v.status)) ||
      (v.friend === "parsa" &&
        v.activity === "jelly_eat" &&
        integer(v.readyAt))) &&
    integer(v.deadline)
  );
}
export function restore(s: ApartmentSession, v: unknown): boolean {
  if (
    !record(v) ||
    v.version !== 1 ||
    !integer(v.ticks) ||
    !integer(v.requestCount) ||
    !integer(v.nextRequest) ||
    !integer(v.seed, 0, 0xffffffff) ||
    !integer(v.dishes, 0, householdTuning.maxMess) ||
    !integer(v.clutter, 0, householdTuning.maxMess) ||
    !record(v.fatigue) ||
    typeof v.tvReady !== "boolean" ||
    !Array.isArray(v.nextAmbient) ||
    v.nextAmbient.length !== 5 ||
    !v.nextAmbient.every((n) => integer(n)) ||
    !Array.isArray(v.positions) ||
    v.positions.length !== 5 ||
    !v.positions.every(isPosition) ||
    !Array.isArray(v.reactions) ||
    !v.reactions.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        isFriend(pair[0]) &&
        integer(pair[1]),
    ) ||
    (v.request !== null && !validRequest(v.request))
  )
    return false;
  const fatigue = v.fatigue;
  if (!characterIds.every((id) => integer(fatigue[id], 0, 100))) return false;
  const positions: Point[] = v.positions;
  if (positions.some((p, i) => !clearOfFriends(p, positions.slice(0, i))))
    return false;
  s.tasks.clear();
  s.ticks = v.ticks;
  s.requestCount = v.requestCount;
  s.nextRequest = v.nextRequest;
  s.request = v.request ? { ...v.request } : null;
  // A reload releases interrupted task/partner reservations. A request that had
  // already been accepted is re-offered with the same ID, once.
  if (s.request && ["accepted", "in_progress"].includes(s.request.status)) {
    s.request.status = s.request.activity === "jelly_eat" ? "ready" : "pending";
    s.request.deadline = Math.max(s.request.deadline, s.ticks + 100);
  }
  s.reactions = new Map(v.reactions as [CharacterId, number][]);
  s.house.dishes = v.dishes;
  s.house.clutter = v.clutter;
  s.house.seed = v.seed;
  s.house.nextAmbient = [...v.nextAmbient];
  s.house.tvReady = v.tvReady && s.house.tvOwned;
  s.house.ps4Ready = v.ps4Ready === true && s.house.ps4Owned && s.house.tvReady;
  for (const [i, actor] of s.movement.actors.entries()) {
    s.movement.stop(actor, "Idle");
    actor.position = { ...positions[i] };
    actor.previous = { ...actor.position };
    s.house.fatigue[actor.id] = fatigue[actor.id] as number;
  }
  return true;
}
