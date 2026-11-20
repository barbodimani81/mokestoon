import {
  type ActivityId,
  activities,
  behavior,
  pacing,
  requestTuning,
  routines,
} from "../config/activities.ts";
import { type CharacterId, characterIds } from "../config/character-assets.ts";
import { type StationId, stationIds, stations } from "../config/stations.ts";
import type { Point } from "../map/apartment.ts";
import { distance } from "../map/routes.ts";
import { gameClock, Household } from "./household.ts";
import { anchor, Movement } from "./movement.ts";

type RequestStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "cooling"
  | "ready"
  | "completed"
  | "expired"
  | "cancelled"
  | "failed";
export type RequestNotice = "pending" | "completed" | "expired";
export interface FriendRequest {
  id: string;
  friend: CharacterId;
  activity: ActivityId;
  status: RequestStatus;
  deadline: number;
  readyAt?: number;
}
interface Task {
  friend: CharacterId;
  activity: ActivityId;
  stage: "approaching" | "performing";
  remaining: number;
  requestId: string | null;
  source: "player" | "ambient";
  partner?: CharacterId;
  guest?: boolean;
  startedAt: number;
}
export interface Completion {
  eventId: string;
  requestId: string;
  friend: CharacterId;
  activity: ActivityId;
  tick: number;
  duration: number;
}
export class ApartmentSession {
  readonly movement = new Movement();
  readonly house = new Household();
  get clock() {
    return gameClock(this.ticks);
  }
  ticks = 0;
  request: FriendRequest | null = null;
  tasks = new Map<CharacterId, Task>();
  reactions = new Map<CharacterId, number>();
  nextRequest: number = requestTuning.firstTick;
  requestCount = 0;
  private readonly onCompletion: (event: Completion) => void;
  onMusicChoice?: (play: boolean) => void;
  onActivitySettled?: () => void;
  onRequestNotice?: (id: string, status: RequestNotice) => void;
  private readonly newId: () => string;
  constructor(
    onCompletion: (event: Completion) => void = () => {},
    newId = () => crypto.randomUUID() as string,
  ) {
    this.onCompletion = onCompletion;
    this.newId = newId;
  }
  private finishRequest(status: RequestStatus) {
    if (!this.request) return;
    this.request.status = status;
    this.nextRequest = this.ticks + requestTuning.cooldown;
    if (status === "completed" || status === "expired")
      this.onRequestNotice?.(this.request.id, status);
  }
  private cancelTask(id: CharacterId) {
    const old = this.tasks.get(id);
    if (old?.partner) {
      const peer = this.tasks.get(old.partner);
      if (peer?.requestId && this.request?.id === peer.requestId)
        this.finishRequest("cancelled");
      this.tasks.delete(old.partner);
      this.movement.stop(
        this.movement.actor(old.partner),
        "Conversation ended",
      );
    }
    if (old?.requestId && this.request?.id === old.requestId)
      this.finishRequest("cancelled");
    this.tasks.delete(id);
  }
  interrupt(id: CharacterId) {
    this.cancelTask(id);
    this.movement.stop(this.movement.actor(id), "Cancelled");
    this.house.nextAmbient[characterIds.indexOf(id)] =
      this.ticks + pacing.ambientDelay;
    this.onActivitySettled?.();
  }
  move(id: CharacterId, point: Point, label: string) {
    this.cancelTask(id);
    this.house.nextAmbient[characterIds.indexOf(id)] =
      this.ticks + pacing.ambientDelay;
    return this.movement.move(id, point, label);
  }
  start(
    id: CharacterId,
    activity: ActivityId,
    source: "player" | "ambient" = "player",
    requestId: string | null = null,
  ) {
    const old = this.tasks.get(id);
    const reason = this.house.reason(id, activity);
    if (reason) {
      if (source === "player") this.movement.actor(id).message = reason;
      return false;
    }
    if (old && old.activity === activity && old.requestId === requestId)
      return false;
    if (
      source === "ambient" &&
      (old || this.movement.actor(id).state === "walking")
    )
      return false;
    this.cancelTask(id);
    if (activity === "chat" || activity === "boxing") {
      const guest = this.movement.actors
        .filter(
          (a) =>
            a.id !== id &&
            (activity !== "boxing" || a.id === "mahan" || a.id === "kavian") &&
            !this.tasks.has(a.id) &&
            a.state !== "walking" &&
            !(
              this.request?.friend === a.id &&
              ["pending", "cooling", "ready"].includes(this.request.status)
            ),
        )
        .sort(
          (a, b) =>
            distance(a.position, this.movement.actor(id).position) -
            distance(b.position, this.movement.actor(id).position),
        )[0];
      if (
        !guest ||
        !this.approach(id, activity, source, requestId) ||
        !this.approach(guest.id, activity, "ambient", null)
      ) {
        this.tasks.delete(id);
        this.movement.stop(
          this.movement.actor(id),
          "No friend is free to chat here",
        );
        return false;
      }
      const hostTask = this.tasks.get(id),
        guestTask = this.tasks.get(guest.id);
      if (hostTask && guestTask) {
        hostTask.partner = guest.id;
        guestTask.partner = id;
        guestTask.guest = true;
      }
      return true;
    }
    return this.approach(id, activity, source, requestId);
  }
  private approach(
    id: CharacterId,
    activity: ActivityId,
    source: Task["source"],
    requestId: string | null,
  ) {
    const spec = activities[activity],
      spot = anchor(spec.anchor);
    // Try spots at the same interaction anchor when another friend occupies its center.
    for (const [dx, dy] of [
      [0, 0],
      [18, 0],
      [-18, 0],
      [0, 18],
      [0, -18],
    ]) {
      if (
        !this.movement.move(id, { x: spot.x + dx, y: spot.y + dy }, spec.label)
      )
        continue;
      this.tasks.set(id, {
        friend: id,
        activity,
        source,
        requestId,
        stage: "approaching",
        remaining: spec.ticks,
        startedAt: this.ticks,
      });
      return true;
    }
    return false;
  }
  options(id: CharacterId, station: StationId): readonly ActivityId[] {
    const r = this.request;
    const choices: readonly ActivityId[] = stations[station].actions;
    if (r?.friend === id && ["pending", "ready"].includes(r.status)) {
      return choices.filter(
        (a) => a === r.activity || (r.activity === "cigarette" && a === "iqos"),
      );
    }
    return choices.filter(
      (a) =>
        !a.startsWith("jelly_") &&
        (a !== "moonwalk" || id === "kavian") &&
        (a !== "boxing" || id === "kavian" || id === "mahan"),
    );
  }
  reason(id: CharacterId, action: ActivityId) {
    if (action === "boxing") {
      const peer = id === "mahan" ? "kavian" : "mahan";
      if (
        this.tasks.has(peer) ||
        this.movement.actor(peer).state === "walking" ||
        (this.request?.friend === peer &&
          ["pending", "ready", "cooling"].includes(this.request.status))
      )
        return "partner busy";
    }
    if (this.tasks.get(id)?.source === "player") return "busy";
    if (
      action === "guest_wc" &&
      [...this.tasks.values()].some(
        (t) => t.friend !== id && t.activity === action,
      )
    )
      return "occupied";
    return this.house.reason(id, action);
  }
  command(id: CharacterId, station: StationId, action: ActivityId) {
    if (!this.options(id, station).includes(action) || this.reason(id, action))
      return false;
    const r = this.request;
    const requested =
      r?.friend === id && ["pending", "ready"].includes(r.status);
    if (!this.start(id, action, "player", requested ? r.id : null))
      return false;
    if (requested) r.status = "accepted";
    this.onActivitySettled?.();
    return true;
  }
  // Legacy simulation callers still route through the same checked command.
  accept() {
    const r = this.request;
    if (r?.status !== "pending") return false;
    const station = stationIds.find((id) =>
      this.options(r.friend, id).includes(r.activity),
    );
    return !!station && this.command(r.friend, station, r.activity);
  }
  tick() {
    this.ticks++;
    this.movement.tick();
    this.house.tick(
      this.ticks,
      (id) => this.tasks.get(id)?.activity === "rest",
    );
    for (const [id, until] of this.reactions)
      if (this.ticks >= until) this.reactions.delete(id);
    for (const [id, task] of this.tasks) {
      const actor = this.movement.actor(id),
        spec = activities[task.activity];
      const matching = !!task.requestId && this.request?.id === task.requestId;
      if (task.stage === "approaching") {
        if (actor.state === "walking") continue;
        if (
          actor.state === "blocked" ||
          distance(actor.position, anchor(spec.anchor)) > 20 ||
          this.house.reason(id, task.activity)
        ) {
          this.cancelTask(id);
          if (matching && this.request) {
            this.request.status =
              task.activity === "jelly_eat" ? "ready" : "pending";
            this.request.deadline = Math.max(
              this.request.deadline,
              this.ticks + 100,
            );
          }
          continue;
        }
        task.stage = "performing";
        actor.message =
          task.activity === "rest" && this.clock.phase === "Night"
            ? "Sleeping"
            : spec.doing;
        if (task.partner) actor.message = "Waiting for a friend";
        if (matching && this.request) this.request.status = "in_progress";
      } else {
        if (task.guest) continue;
        if (task.partner) {
          if (this.tasks.get(task.partner)?.stage !== "performing") continue;
          actor.message = spec.doing;
          this.movement.actor(task.partner).message = spec.doing;
        }
        if (--task.remaining > 0) continue;
        this.house.complete(id, task.activity);
        this.house.nextAmbient[characterIds.indexOf(id)] =
          this.ticks + pacing.ambientDelay;
        if (task.partner) {
          this.tasks.delete(task.partner);
          this.movement.actor(task.partner).message = "Finished chatting";
          this.house.nextAmbient[characterIds.indexOf(task.partner)] =
            this.ticks + pacing.ambientDelay;
        }
        actor.message = `Finished · ${spec.label}`;
        this.tasks.delete(id);
        if (task.activity === "music_play" || task.activity === "music_quiet")
          this.onMusicChoice?.(task.activity === "music_play");
        if (matching && task.requestId && this.request) {
          if (task.activity === "jelly_prepare") {
            this.request.activity = "jelly_store";
            this.request.status = this.approach(
              id,
              "jelly_store",
              "player",
              task.requestId,
            )
              ? "accepted"
              : "pending";
            this.request.deadline = Math.max(
              this.request.deadline,
              this.ticks + 100,
            );
            this.onActivitySettled?.();
            continue;
          }
          if (task.activity === "jelly_store") {
            this.request.activity = "jelly_eat";
            this.request.status = "cooling";
            this.request.readyAt = this.ticks + requestTuning.jellyCoolingTicks;
            this.onActivitySettled?.();
            continue;
          }
          this.finishRequest("completed");
          this.onCompletion({
            eventId: this.newId(),
            requestId: task.requestId,
            friend: id,
            activity: task.activity,
            tick: this.ticks,
            duration:
              this.ticks -
              task.startedAt +
              (task.activity === "jelly_eat"
                ? activities.jelly_prepare.ticks +
                  activities.jelly_store.ticks +
                  requestTuning.jellyCoolingTicks
                : 0),
          });
        }
        this.onActivitySettled?.();
      }
    }
    const r = this.request;
    if (
      r?.status === "cooling" &&
      r.readyAt !== undefined &&
      this.ticks >= r.readyAt
    ) {
      r.status = "ready";
      this.onActivitySettled?.();
    }
    if (r?.status === "pending" && this.ticks >= r.deadline) {
      this.finishRequest("expired");
      this.reactions.set(r.friend, this.ticks + requestTuning.reactionTicks);
    }
    if (
      this.ticks >= this.nextRequest &&
      (!r ||
        !["pending", "accepted", "in_progress", "cooling", "ready"].includes(
          r.status,
        ))
    ) {
      const order: CharacterId[] = [
        "parsa",
        "mahan",
        "barbod",
        "kavian",
        "parham",
      ];
      const friend = order[this.requestCount++ % order.length];
      this.request = {
        id: this.newId(),
        friend,
        activity:
          friend === "parsa" &&
          (this.requestCount === 1 || this.house.pick([true, false]))
            ? "jelly_prepare"
            : friend === "mahan" &&
                (this.requestCount === 2 || this.house.pick([true, false]))
              ? "cigarette"
              : this.house.pick(
                  routines[friend].filter(
                    (a) => a !== "chat" && !this.house.reason(friend, a),
                  ),
                ),
        status: "pending",
        deadline: this.ticks + behavior[friend].patience,
      };
      this.onRequestNotice?.(this.request.id, "pending");
    }
    for (const [index, id] of characterIds.entries()) {
      if (
        this.ticks < this.house.nextAmbient[index] ||
        this.tasks.has(id) ||
        this.movement.actor(id).state === "walking" ||
        this.reactions.has(id)
      )
        continue;
      if (
        this.request?.friend === id &&
        ["pending", "ready", "cooling"].includes(this.request.status)
      )
        continue;
      this.house.nextAmbient[index] = this.ticks + pacing.ambientDelay;
      this.start(id, this.house.ambient(id, this.ticks), "ambient");
    }
  }
}
