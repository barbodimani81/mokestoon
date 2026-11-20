import type { components } from "../api/schema";
import { characterIds } from "../game/config/character-assets.ts";
import type { ApartmentSession } from "../game/systems/session.ts";
import { restore, snapshot } from "./checkpoint.ts";

type Payload = components["schemas"]["ApartmentCheckpoint"];
export function backup(world: ApartmentSession): Payload {
  const {
    positions,
    fatigue,
    nextAmbient,
    reactions,
    request,
    version: _version,
    ...house
  } = snapshot(world);
  const deadlines = new Map(reactions);
  const residents = {} as Payload["residents"];
  for (const [index, id] of characterIds.entries()) {
    residents[id] = {
      position: positions[index],
      fatigue: fatigue[id],
      nextAmbient: nextAmbient[index],
      reactionUntil: deadlines.get(id),
    };
  }
  return { ...house, residents, request: request ?? undefined };
}
export function loadBackup(world: ApartmentSession, p: Payload): boolean {
  const { residents, request, ...house } = p;
  return restore(world, {
    ...house,
    version: 1,
    request: request ?? null,
    positions: characterIds.map((id) => residents[id].position),
    fatigue: Object.fromEntries(
      characterIds.map((id) => [id, residents[id].fatigue]),
    ),
    nextAmbient: characterIds.map((id) => residents[id].nextAmbient),
    reactions: characterIds
      .filter((id) => residents[id].reactionUntil !== undefined)
      .map((id) => [id, residents[id].reactionUntil]),
  });
}
