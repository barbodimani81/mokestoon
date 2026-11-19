import assert from "node:assert/strict";
import test from "node:test";
import { characters } from "../../../../assets/manifests/characters.ts";
import {
  characterIds,
  clipKey,
  type SpriteSheet,
  validateSheet,
} from "../../src/game/config/character-assets.ts";

test("the manifest identifies all five friends by stable ID", () => {
  assert.deepEqual(Object.keys(characters).sort(), [...characterIds].sort());
  for (const id of characterIds) {
    const asset = characters[id];
    assert.ok(asset.name.length > 0);
    if (asset.art.kind === "spritesheet") validateSheet(asset.art);
  }
});

const sheet: SpriteSheet = {
  kind: "spritesheet",
  file: "proof.png",
  frameWidth: 16,
  frameHeight: 16,
  origin: [0.5, 1],
  animations: [
    {
      action: "idle",
      direction: "south",
      firstFrame: 0,
      lastFrame: 0,
      frameMs: 100,
      loop: true,
    },
  ],
};
test("a single frame idle clip has a stable, character-specific key", () => {
  validateSheet(sheet);
  assert.equal(clipKey("parsa", sheet.animations[0]), "parsa.idle.south");
});
test("invalid files, dimensions, anchors and clips fail before loading", () => {
  for (const changes of [
    { file: "../source/person.png" },
    { frameWidth: 0 },
    { origin: [1.1, 0] },
    { animations: [] },
    { animations: [...sheet.animations, ...sheet.animations] },
    ...[
      { frameMs: 0 },
      { firstFrame: -1 },
      { firstFrame: 1, lastFrame: 0 },
    ].map((fields) => ({
      animations: [{ ...sheet.animations[0], ...fields }],
    })),
  ]) {
    assert.throws(() => validateSheet({ ...sheet, ...changes } as SpriteSheet));
  }
});
