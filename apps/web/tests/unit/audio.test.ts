import assert from "node:assert/strict";
import test from "node:test";
import { defaults, readPreferences } from "../../src/audio/preferences.ts";
import { behavior, requestTuning } from "../../src/game/config/activities.ts";
import { ApartmentSession } from "../../src/game/systems/session.ts";

test("audio preferences preserve silence and recover from corrupt or out-of-range values", () => {
  for (const invalid of [null, "null", "42", "broken"])
    assert.deepEqual(readPreferences(invalid), defaults);
  assert.deepEqual(
    readPreferences('{"master":0,"music":0.2,"alerts":2,"muted":true}'),
    {
      master: 0,
      music: 0.2,
      alerts: defaults.alerts,
      muted: true,
    },
  );
  assert.deepEqual(
    readPreferences('{"master":"1","music":-1,"muted":"true"}'),
    defaults,
  );
});

test("request notifications sound once for each new, completed or expired request", () => {
  for (const accept of [true, false]) {
    const world = new ApartmentSession(undefined, () => "first");
    const notices: string[] = [];
    world.onRequestNotice = (id, status) => notices.push(`${id}.${status}`);
    for (let n = 0; n < requestTuning.firstTick; n++) world.tick();
    if (accept) assert.ok(world.accept());
    const expected = accept ? "completed" : "expired";
    for (
      let n = 0;
      n <= behavior.parsa.patience && world.request?.status !== expected;
      n++
    ) {
      if (accept && world.request?.status === "ready")
        world.command("parsa", "station.food", "jelly_eat");
      world.tick();
    }
    world.tick();
    assert.deepEqual(notices, ["first.pending", `first.${expected}`]);
  }
});
