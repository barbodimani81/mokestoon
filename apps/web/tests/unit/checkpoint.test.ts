import assert from "node:assert/strict";
import test from "node:test";
import { ApartmentSession } from "../../src/game/systems/session.ts";
import { restore, snapshot } from "../../src/persistence/checkpoint.ts";

test("checkpoint restores apartment state and reoffers an interrupted request exactly once", () => {
  const s = new ApartmentSession();
  for (let n = 0; n < 18; n++) s.tick();
  assert.ok(s.accept());
  s.house.clutter = 5;
  s.house.tvOwned = true;
  s.house.tvReady = true;
  const saved = snapshot(s),
    copy = new ApartmentSession();
  assert.ok(restore(copy, saved));
  assert.equal(copy.ticks, s.ticks);
  assert.equal(copy.house.clutter, 5);
  assert.deepEqual(
    copy.movement.actors.map((a) => a.position),
    saved.positions,
  );
  assert.equal(copy.request?.status, "pending");
  assert.equal(copy.request?.id, s.request?.id);
  assert.equal(copy.house.tvReady, false);
  assert.ok(copy.accept());
  assert.equal(copy.accept(), false);
});
test("invalid, newer and overlapping saves cannot partly overwrite a running session", () => {
  const s = new ApartmentSession();
  const initial = snapshot(s);
  for (const change of [
    { version: 2 },
    { clutter: -1 },
    { positions: initial.positions.map(() => initial.positions[0]) },
    { positions: [{ x: NaN, y: 0 }] },
    { fatigue: {} },
    { reactions: [["other", 8]] },
  ]) {
    assert.equal(restore(s, { ...initial, ...change }), false);
    assert.deepEqual(snapshot(s), initial);
  }
});

test("restoring releases a moving actor and conversation reservations", () => {
  const s = new ApartmentSession();
  const initial = snapshot(s);
  assert.ok(s.start("parham", "chat"));
  assert.ok(s.tasks.size > 1);
  assert.ok(restore(s, initial));
  assert.equal(s.tasks.size, 0);
  assert.ok(
    s.movement.actors.every(
      (a) => a.state === "idle" && a.target === null && !a.route.length,
    ),
  );
});

test("stored jelly resumes at its interrupted stage and never pays for cooking or cooling", () => {
  let payments = 0;
  const world = new ApartmentSession(() => payments++);
  function waitFor(test: () => boolean) {
    for (let i = 0; i < 450 && !test(); i++) world.tick();
    assert.ok(test());
  }
  waitFor(() => !!world.request);
  const id = world.request?.id;
  assert.ok(world.command("parsa", "station.food", "jelly_prepare"));
  waitFor(() => world.request?.activity === "jelly_store");
  assert.ok(restore(world, snapshot(world)));
  assert.equal(world.request?.status, "pending");
  assert.ok(world.command("parsa", "station.food", "jelly_store"));
  waitFor(() => world.request?.status === "cooling");
  const deadline = world.request?.readyAt;
  assert.ok(deadline);
  assert.ok(restore(world, snapshot(world)));
  assert.equal(world.request?.readyAt, deadline);
  assert.equal(world.command("parsa", "station.food", "jelly_eat"), false);
  waitFor(() => world.request?.status === "ready");
  assert.equal(world.ticks, deadline);
  assert.ok(world.command("parsa", "station.food", "jelly_eat"));
  assert.ok(restore(world, snapshot(world)));
  assert.equal(world.request?.status, "ready");
  assert.equal(payments, 0);
  assert.ok(world.command("parsa", "station.food", "jelly_eat"));
  waitFor(() => world.request?.status === "completed");
  assert.equal(world.request?.id, id);
  assert.equal(payments, 1);
  assert.equal(world.command("parsa", "station.food", "jelly_eat"), false);
});
