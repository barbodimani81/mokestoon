import assert from "node:assert/strict";
import test from "node:test";
import { behavior, requestTuning } from "../../src/game/config/activities.ts";
import { anchor } from "../../src/game/systems/movement.ts";
import {
  ApartmentSession,
  type Completion,
} from "../../src/game/systems/session.ts";

function advance(s: ApartmentSession, ticks: number) {
  for (let n = 0; n < ticks; n++) s.tick();
}
test("accept, approach the fridge and complete a request once", () => {
  const events: Completion[] = [];
  const s = new ApartmentSession((e) => events.push(e));
  advance(s, requestTuning.firstTick);
  assert.equal(s.command("parsa", "station.food", "jelly_eat"), false);
  assert.ok(s.command("parsa", "station.food", "jelly_prepare"));
  assert.equal(s.command("parsa", "station.food", "jelly_prepare"), false);
  for (let i = 0; i < 300 && s.request?.status !== "ready"; i++) s.tick();
  assert.equal(s.request?.status, "ready");
  assert.equal(events.length, 0);
  advance(s, 30);
  assert.equal(s.request?.status, "ready");
  assert.ok(s.command("parsa", "station.food", "jelly_eat"));
  for (let i = 0; i < 250 && events.length === 0; i++) s.tick();
  assert.equal(s.request?.status, "completed");
  assert.equal(events.length, 1);
  assert.equal(events[0].requestId, s.request?.id);
  assert.equal(events[0].activity, "jelly_eat");
  advance(s, 3);
  assert.equal(events.length, 1);
});
test("ignoring a request triggers a bounded reaction; redirecting cancels an accepted request", () => {
  const s = new ApartmentSession();
  advance(s, requestTuning.firstTick + behavior.parsa.patience);
  assert.equal(s.request?.status, "expired");
  assert.ok(s.reactions.has("parsa"));
  advance(s, requestTuning.reactionTicks);
  assert.equal(s.reactions.size, 0);
  advance(s, requestTuning.cooldown - requestTuning.reactionTicks);
  assert.ok(s.accept());
  const friend = s.request?.friend;
  assert.ok(friend);
  s.move(friend, anchor("guest_wc_inside"), "Guest WC");
  assert.equal(s.request?.status, "cancelled");
  assert.equal(s.tasks.has(friend), false);
});

test("an apartment meal creates dishes and clutter and cleaning removes them", () => {
  const s = new ApartmentSession();
  function finish(
    id: "barbod" | "kavian",
    activity: "snack" | "dishes" | "clean",
  ) {
    assert.ok(s.start(id, activity));
    for (let i = 0; i < 400 && s.tasks.has(id); i++) s.tick();
    assert.ok(!s.tasks.has(id));
  }
  const dishes = s.house.dishes,
    clutter = s.house.clutter;
  finish("barbod", "snack");
  assert.equal(s.house.dishes, dishes + 1);
  finish("kavian", "dishes");
  assert.equal(s.house.dishes, dishes);
  finish("kavian", "clean");
  assert.equal(s.house.clutter, clutter);
});

test("night rest, paired chat and gated TV setup have different effects", () => {
  const s = new ApartmentSession();
  s.ticks = 2700;
  s.house.nextAmbient.fill(10000);
  s.house.fatigue.parsa = 80;
  assert.equal(s.clock.phase, "Night");
  assert.ok(s.start("parsa", "rest"));
  advance(s, 230);
  assert.ok(s.house.fatigue.parsa < 80);
  assert.ok(s.start("parham", "chat"));
  assert.equal(s.tasks.size, 2);
  for (let i = 0; i < 300 && s.tasks.get("parham")?.activity === "chat"; i++)
    s.tick();
  assert.match(s.movement.actor("parham").message, /Finished · Chat/);
  assert.equal(s.start("parham", "tv"), false);
  s.house.tvOwned = true;
  assert.equal(s.start("parham", "setup_tv"), false);
  assert.ok(s.start("kavian", "setup_tv"));
  advance(s, 250);
  assert.ok(s.house.tvReady);
  assert.ok(s.start("parham", "tv"));
  advance(s, 250);
  advance(s, 3600 - s.ticks);
  assert.equal(s.clock.day, 2);
});
test("ambient routines leave a player task intact", () => {
  const s = new ApartmentSession();
  assert.ok(s.start("parsa", "balcony"));
  const task = s.tasks.get("parsa");
  s.house.nextAmbient.fill(0);
  s.tick();
  assert.equal(s.tasks.get("parsa"), task);
  assert.ok(s.tasks.size > 1);
});

test("PS4 setup requires ownership, a working TV and Kavian", () => {
  const s = new ApartmentSession();
  assert.ok(s.house.reason("parham", "ps4"));
  assert.ok(s.house.reason("kavian", "setup_ps4"));
  s.house.ps4Owned = true;
  assert.ok(s.house.reason("kavian", "setup_ps4"));
  s.house.tvOwned = true;
  s.house.complete("kavian", "setup_tv");
  assert.ok(s.house.reason("parham", "setup_ps4"));
  assert.equal(s.house.reason("kavian", "setup_ps4"), "");
  s.house.complete("kavian", "setup_ps4");
  assert.equal(s.house.reason("parham", "ps4"), "");
});

test("paired boxing waits for both friends and releases both reservations on interruption", () => {
  const s = new ApartmentSession();
  assert.equal(s.command("parham", "station.entertainment", "boxing"), false);
  assert.ok(s.command("mahan", "station.entertainment", "boxing"));
  assert.equal(s.tasks.get("mahan")?.partner, "kavian");
  assert.equal(s.tasks.get("kavian")?.partner, "mahan");
  s.interrupt("mahan");
  assert.equal(s.tasks.size, 0);
  assert.ok(s.command("kavian", "station.entertainment", "moonwalk"));
  assert.equal(s.command("parsa", "station.entertainment", "moonwalk"), false);
});
test("guest WC rejects simultaneous use, then becomes available on cancellation", () => {
  const s = new ApartmentSession();
  assert.ok(s.command("parham", "station.wc", "guest_wc"));
  assert.equal(s.command("barbod", "station.wc", "guest_wc"), false);
  s.interrupt("parham");
  assert.ok(s.command("barbod", "station.wc", "guest_wc"));
});
