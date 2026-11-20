import Phaser from "phaser";
import { characters } from "../../../../../assets/manifests/characters";
import type { CharacterId } from "../config/character-assets";
import { playClip, queueSheets, registerClips } from "../rendering/assets";

interface PreviewEvents {
  ready(select: (id: CharacterId, key: string) => void): void;
  failed(): void;
}

export class Preview extends Phaser.Scene {
  private readonly eventsUI: PreviewEvents;
  private failed = false;

  constructor(events: PreviewEvents) {
    super("asset-preview");
    this.eventsUI = events;
  }

  preload() {
    try {
      queueSheets(this);
    } catch {
      this.failed = true;
      this.eventsUI.failed();
    }
  }

  create() {
    if (this.failed) return;
    try {
      registerClips(this);
    } catch {
      this.eventsUI.failed();
      return;
    }
    this.eventsUI.ready((id, key) => this.show(id, key));
  }

  private show(id: CharacterId, key: string) {
    this.children.removeAll(true);
    const { art } = characters[id];
    const { width, height } = this.scale;
    const x = width / 2;
    const y = height / 2;
    // A registration grid for comparing asset scale. It has no world coordinates.
    const grid = this.add.graphics().lineStyle(1, 0xc8bfa6);
    for (let i = 0; i <= width; i += 24) grid.lineBetween(i, 0, i, height);
    for (let i = 0; i <= height; i += 24) grid.lineBetween(0, i, width, i);
    const sprite = this.add.sprite(x, y + 72, id).setOrigin(...art.origin);
    sprite.setScale(Math.min(180 / art.frameWidth, 180 / art.frameHeight));
    playClip(
      sprite,
      key,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }
}
