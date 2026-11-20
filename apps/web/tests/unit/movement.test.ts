import assert from "node:assert/strict";
import test from "node:test";
import { apartment } from "../../src/game/map/apartment.ts";
import { clearSegment, findRoute, fits } from "../../src/game/map/routes.ts";
import { anchor, Movement } from "../../src/game/systems/movement.ts";

test("every anchor is reachable with foot clearance at every step", () => {
  const from = anchor("entrance_spawn");
  for (const target of apartment.anchors) {
    const route = findRoute(from, target);
    assert.ok(route, target.name);
    let previous = from;
    for (const p of route) {
      assert.ok(clearSegment(previous, p, []), target.name);
      previous = p;
    }
    assert.deepEqual(previous, { ...target });
  }
  assert.equal(findRoute(from, { x: -1, y: 12 }), null);
  assert.equal(fits({ x: 78, y: 603 }), false);
});
test("all five friends can be redirected and stop exactly at valid destinations", () => {
  const world = new Movement();
  for (const a of world.actors) {
    const target = anchor("master_bed_side");
    const start = { ...a.position };
    assert.ok(world.move(a.id, target, "Bedroom"));
    world.tick();
    assert.ok(world.move(a.id, start, "Start"));
    for (let n = 0; n < 400 && a.state === "walking"; n++) {
      world.tick();
      assert.ok(fits(a.position));
    }
    assert.equal(a.message, "At Start");
    assert.deepEqual(a.position, start);
  }
});
test("occupied targets fail and an obstructed route recovers without walking through a peer", () => {
  const w = new Movement(),
    a = w.actor("barbod"),
    peer = w.actor("kavian");
  assert.equal(w.move(a.id, peer.position, "Kitchen"), false);
  const to = anchor("master_bed_side");
  assert.ok(w.move(a.id, to, "Bed"));
  peer.position = { ...to };
  for (let i = 0; i < 400; i++) w.tick();
  assert.equal(a.state, "blocked");
  assert.ok(w.move(a.id, anchor("guest_wc_inside"), "Guest WC"));
  for (let i = 0; i < 400; i++) w.tick();
  assert.equal(a.message, "At Guest WC");
});
