export const characterIds = [
  "barbod",
  "kavian",
  "mahan",
  "parsa",
  "parham",
] as const;
export type CharacterId = (typeof characterIds)[number];

export interface AnimationClip {
  action: string;
  direction: "north" | "south" | "east" | "west";
  firstFrame: number;
  lastFrame: number;
  frameMs: number;
  loop: boolean;
}

export interface SpriteSheet {
  kind: "spritesheet" | "placeholder";
  /** PNG filename relative to assets/runtime/spritesheets. */
  file: string;
  /** Sampling for this artwork. Pixel sheets default to nearest. */
  sampling?: "linear" | "nearest";
  frameWidth: number;
  frameHeight: number;
  origin: [number, number];
  animations: AnimationClip[];
}

export interface CharacterAsset {
  name: string;
  art: SpriteSheet;
}

export function clipKey(id: CharacterId, clip: AnimationClip): string {
  return `${id}.${clip.action}.${clip.direction}`;
}

export function validateSheet(sheet: SpriteSheet): void {
  const positive = (n: number) => Number.isSafeInteger(n) && n > 0;
  if (
    !/^[a-z0-9_-]+\.png$/.test(sheet.file) ||
    (sheet.sampling !== undefined &&
      sheet.sampling !== "nearest" &&
      sheet.sampling !== "linear") ||
    !positive(sheet.frameWidth) ||
    !positive(sheet.frameHeight) ||
    !sheet.origin.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)
  ) {
    throw new Error("Invalid spritesheet metadata");
  }
  const keys = new Set<string>();
  for (const clip of sheet.animations) {
    const key = `${clip.action}.${clip.direction}`;
    if (
      keys.has(key) ||
      !/^[a-z0-9_]+$/.test(clip.action) ||
      !["north", "south", "east", "west"].includes(clip.direction) ||
      !positive(clip.frameMs) ||
      !Number.isSafeInteger(clip.firstFrame) ||
      clip.firstFrame < 0 ||
      !Number.isSafeInteger(clip.lastFrame) ||
      clip.lastFrame < clip.firstFrame
    ) {
      throw new Error("Invalid animation clip");
    }
    keys.add(key);
  }
  if (!keys.has("idle.south")) throw new Error("Missing idle.south animation");
}
