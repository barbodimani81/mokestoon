import {
  type AnimationClip,
  type CharacterId,
  characterIds,
} from "../config/character-assets.ts";
import { apartment, type Point } from "../map/apartment.ts";
import { clearSegment, distance, findRoute } from "../map/routes.ts";

export const movementTuning = {
  tickMs: 100,
  speed: 144,
  retryTicks: 5,
  maxRetries: 2,
};
export const anchorLabels: Record<string, string> = {
  entrance_spawn: "Entrance",
  fridge_front: "Fridge",
  sink_front: "Kitchen sink",
  living_room_center: "Living room",
  tv_front: "TV",
  master_bed_side: "Bed",
  master_bathroom_sink_front: "Bathroom sink",
  guest_wc_queue_1: "WC queue",
  guest_wc_inside: "Guest WC",
  kitchen_counter_front: "Kitchen counter",
  balcony_center: "Balcony",
};
const spawnAnchors: Record<CharacterId, string> = {
  barbod: "living_room_center",
  kavian: "kitchen_counter_front",
  mahan: "tv_front",
  parsa: "balcony_center",
  parham: "entrance_spawn",
};
export function anchor(name: string): Point {
  const point = apartment.anchors.find((p) => p.name === name);
  if (!point) throw new Error(`Missing anchor ${name}`);
  return { x: point.x, y: point.y };
}
export class Actor {
  readonly id: CharacterId;
  position: Point;
  previous: Point;
  direction: AnimationClip["direction"] = "south";
  state: "idle" | "walking" | "blocked" = "idle";
  message = "Idle";
  route: Point[] = [];
  target: Point | null = null;
  label = "";
  retries = 0;
  wait = 0;
  constructor(id: CharacterId) {
    this.id = id;
    this.position = anchor(spawnAnchors[id]);
    this.previous = { ...this.position };
  }
}

export class Movement {
  actors = characterIds.map((id) => new Actor(id));
  actor(id: CharacterId) {
    return this.actors[characterIds.indexOf(id)];
  }
  private peers(actor: Actor) {
    return this.actors
      .filter((other) => other !== actor)
      .map((other) => other.position);
  }
  stop(actor: Actor, message: string, blocked = false) {
    actor.route = [];
    actor.target = null;
    actor.state = blocked ? "blocked" : "idle";
    actor.message = message;
    actor.wait = 0;
    actor.retries = 0;
  }
  move(id: CharacterId, point: Point, label: string) {
    const actor = this.actor(id);
    const reserved = this.actors.some(
      (other) =>
        other !== actor && other.target && distance(other.target, point) < 12,
    );
    const path = reserved
      ? null
      : findRoute(actor.position, point, this.peers(actor));
    if (!path) {
      this.stop(actor, `Can't reach ${label}. Choose another spot.`, true);
      return false;
    }
    actor.route = path;
    actor.target = { ...point };
    actor.label = label;
    actor.state = "walking";
    actor.message = `Walking to ${label}`;
    actor.wait = 0;
    actor.retries = 0;
    return true;
  }
  tick() {
    for (const actor of this.actors) {
      actor.previous = { ...actor.position };
      if (actor.state !== "walking" || !actor.target) continue;
      let remaining = (movementTuning.speed * movementTuning.tickMs) / 1000;
      const peers = this.peers(actor);
      while (remaining > 0 && actor.route.length) {
        const point = actor.route[0],
          dist = distance(actor.position, point);
        if (dist < 0.001) {
          actor.position = { ...point };
          actor.route.shift();
          continue;
        }
        const dx = point.x - actor.position.x,
          dy = point.y - actor.position.y;
        const amount = Math.min(1, remaining / dist);
        const next =
          amount === 1
            ? point
            : {
                x: actor.position.x + dx * amount,
                y: actor.position.y + dy * amount,
              };
        if (!clearSegment(actor.position, next, peers)) {
          if (++actor.wait >= movementTuning.retryTicks) {
            actor.wait = 0;
            if (++actor.retries > movementTuning.maxRetries) {
              this.stop(
                actor,
                "The way is blocked. Choose another spot.",
                true,
              );
              break;
            }
            const route = findRoute(actor.position, actor.target, peers);
            if (route) actor.route = route;
          }
          break;
        }
        actor.direction =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? "east"
              : "west"
            : dy > 0
              ? "south"
              : "north";
        actor.position = { ...next };
        remaining -= dist;
        actor.wait = 0;
        if (amount === 1) actor.route.shift();
      }
      if (actor.state === "walking" && !actor.route.length)
        this.stop(actor, `At ${actor.label}`);
    }
  }
}
