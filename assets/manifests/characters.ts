import type {
  AnimationClip,
  CharacterAsset,
  CharacterId,
} from "../../apps/web/src/game/config/character-assets.ts";
import temporary from "./temporary-residents.json" with { type: "json" };

function provisional(id: CharacterId, name: string): CharacterAsset {
  return {
    name,
    art: {
      kind: "placeholder",
      sampling: "linear",
      file: `${id}-temporary.png`,
      frameWidth: temporary.frameWidth,
      frameHeight: temporary.frameHeight,
      origin: [temporary.origin[0], temporary.origin[1]],
      animations: temporary.animations as AnimationClip[],
    },
  };
}

export const characters: Record<CharacterId, CharacterAsset> = {
  barbod: provisional("barbod", "Barbod"),
  kavian: provisional("kavian", "Kavian"),
  mahan: provisional("mahan", "Mahan"),
  parsa: provisional("parsa", "Parsa"),
  parham: provisional("parham", "Parham"),
};
