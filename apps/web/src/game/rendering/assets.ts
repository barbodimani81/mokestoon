import Phaser from "phaser";
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
    if (!scene.textures.exists(id)) throw new Error(`Could not load ${id}`);
    const filter = Phaser.Textures.FilterMode;
    scene.textures
      .get(id)
      .setFilter(art.sampling === "linear" ? filter.LINEAR : filter.NEAREST);
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

/** Show the second drawing of a gesture as its still pose when motion is reduced. */
export function playClip(
  sprite: Phaser.GameObjects.Sprite,
  key: string,
  reduced: boolean,
) {
  if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
  if (reduced && !sprite.anims.isPaused) {
    const frames = sprite.anims.currentAnim?.frames;
    sprite.anims.pause(frames?.[1] ?? frames?.[0]);
  } else if (!reduced && sprite.anims.isPaused) {
    sprite.anims.resume();
  }
}
