import Phaser from "phaser";
import { characters } from "../../../../../assets/manifests/characters";
import type { CharacterId } from "../config/character-assets";
import { queueSheets, registerClips } from "../rendering/assets";

interface PreviewEvents {
  ready(select: (id: CharacterId) => void): void;
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
    this.eventsUI.ready((id) => this.show(id));
  }

  private show(id: CharacterId) {
    this.children.removeAll(true);
    const { art, name } = characters[id];
    const { width, height } = this.scale;
    const x = width / 2;
    const y = height / 2;
    // A registration grid for comparing asset scale. It has no world coordinates.
    const grid = this.add.graphics().lineStyle(1, 0xc8bfa6);
    for (let i = 0; i <= width; i += 24) grid.lineBetween(i, 0, i, height);
    for (let i = 0; i <= height; i += 24) grid.lineBetween(0, i, width, i);
    if (art.kind === "spritesheet") {
      const sprite = this.add.sprite(x, y, id).setOrigin(...art.origin);
      sprite.setScale(Math.min(160 / art.frameWidth, 160 / art.frameHeight));
      sprite.play(`${id}.idle.south`);
      return;
    }
    // A typeset initial keeps the proof identifiable without depicting a person.
    this.add.rectangle(x + 5, y + 6, 134, 134, 0xb9ac91);
    this.add.rectangle(x, y, 134, 134, 0xfaf5e7).setStrokeStyle(2, 0x494a36);
    this.add
      .text(x, y, name[0], {
        fontFamily: "Georgia, serif",
        fontSize: "90px",
        color: "#394533",
      })
      .setOrigin(0.5);
  }
}
