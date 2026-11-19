import type Phaser from "phaser";
import { characters } from "../../../../../assets/manifests/characters";
import {
  characterIds,
  clipKey,
  validateSheet,
} from "../config/character-assets";

const urls = import.meta.glob<string>(
  "../../../../../assets/runtime/spritesheets/*.png",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

export function queueSheets(scene: Phaser.Scene) {
  for (const id of characterIds) {
    const { art } = characters[id];
    if (art.kind === "placeholder") continue;
    validateSheet(art);
    const url = urls[`../../../../../assets/runtime/spritesheets/${art.file}`];
    if (!url) throw new Error(`Missing spritesheet for ${id}`);
    scene.load.spritesheet(id, url, {
      frameWidth: art.frameWidth,
      frameHeight: art.frameHeight,
    });
  }
}

export function registerClips(scene: Phaser.Scene) {
  for (const id of characterIds) {
    const { art } = characters[id];
    if (art.kind === "placeholder") continue;
    if (!scene.textures.exists(id)) throw new Error(`Could not load ${id}`);
    for (const clip of art.animations) {
      if (!scene.textures.get(id).has(String(clip.lastFrame)))
        throw new Error(`Missing animation frames for ${id}`);
      scene.anims.create({
        key: clipKey(id, clip),
        frames: scene.anims.generateFrameNumbers(id, {
          start: clip.firstFrame,
          end: clip.lastFrame,
        }),
        frameRate: 1000 / clip.frameMs,
        repeat: clip.loop ? -1 : 0,
      });
    }
  }
}
