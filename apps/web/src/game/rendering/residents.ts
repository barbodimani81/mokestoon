import type Phaser from "phaser";
import { characters } from "../../../../../assets/manifests/characters";
import type { ActivityId } from "../config/activities";

import type { Point } from "../map/apartment";
import type { Actor } from "../systems/movement";

import { playClip } from "./assets";
import type { Marker } from "./resident-labels";

export interface ResidentState {
  performing?: ActivityId;
  request?: ActivityId;
  reacting: boolean;
  happy?: boolean;
  carrying?: boolean;
}

export function residentClip(actor: Actor, state: ResidentState) {
  if (state.reacting) return "react.south";
  if (state.carrying) return "carry.south";
  if (actor.state === "walking") return `walk.${actor.direction}`;
  if (state.performing) {
    if (state.performing === "boxing" || state.performing === "moonwalk")
      return `${state.performing}.south`;
    if (state.performing === "chat" && actor.id === "parsa")
      return "greet.south";
    if (state.performing === "iqos") return "iqos.south";
    if (state.performing === "cigarette") return "smoke.south";
    if (state.performing === "jelly_store") return "carry.south";
    if (state.performing === "jelly_eat" || state.performing === "snack")
      return "eat.south";
    if (state.performing === "dance") return "dance.south";
    if (["rest", "tv", "balcony"].includes(state.performing))
      return "rest.south";
    return "interact.south";
  }
  if (state.happy) return "happy.south";
  return `idle.${actor.direction}`;
}

export class ResidentView {
  readonly foot: Point = { x: 0, y: 0 };
  private sprite: Phaser.GameObjects.Sprite;

  private ring: Phaser.GameObjects.Ellipse;
  private leader: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, actor: Actor) {
    const { art } = characters[actor.id];
    this.ring = scene.add.ellipse(0, 0, 28, 9, 0x39291f, 0.45).setDepth(2020);
    this.sprite = scene.add.sprite(0, 0, actor.id).setOrigin(...art.origin);
    this.leader = scene.add.graphics().setDepth(2015);
  }

  render(
    actor: Actor,
    state: ResidentState,
    alpha: number,
    selected: boolean,
    reduced: boolean,
    units: number,
  ): Marker {
    this.foot.x =
      actor.previous.x + (actor.position.x - actor.previous.x) * alpha;
    this.foot.y =
      actor.previous.y + (actor.position.y - actor.previous.y) * alpha;
    const { art } = characters[actor.id];
    // Keep the whole apartment in view and the body readable even at portrait FIT.
    const height = Math.max(71, Math.min(110, 151 / units));
    this.sprite.setScale((height * units) / art.frameHeight);
    const key = `${actor.id}.${residentClip(actor, state)}`;
    const clip = this.sprite.scene.anims.exists(key)
      ? key
      : `${actor.id}.idle.south`;
    playClip(this.sprite, clip, reduced);
    this.ring
      .setScale(units)
      .setFillStyle(selected ? 0xffcf53 : 0x39291f, selected ? 1 : 0.45)
      .setStrokeStyle(selected ? 1.8 : 0, 0x493b26);
    return {
      x: this.foot.x / units,
      y: this.foot.y / units,
      width: 42,
      height: 22,
      headroom: state.request ? 26 : 0,
      bodyWidth: height * 0.61,
      bodyHeight: height * 0.89,
    };
  }

  placeFigure(foot: Point, units: number) {
    const x = foot.x * units,
      y = foot.y * units;
    this.ring.setPosition(x, y);
    this.sprite.setPosition(x, y).setDepth(2030 + y);
    this.leader.clear();
    if (Math.hypot(x - this.foot.x, y - this.foot.y) > 3 * units)
      this.leader
        .lineStyle(1.5 * units, 0x473931)
        .lineBetween(this.foot.x, this.foot.y, x, y);
  }

  containsBody(p: Point) {
    const b = this.sprite.getBounds();
    // Exclude the transparent margins of the frame, especially next to furniture icons.
    return (
      Math.abs(p.x - b.centerX) <=
        Math.max(22 * this.sprite.scene.scale.displayScale.x, b.width * 0.35) &&
      p.y >= b.bottom - b.height * 0.9 &&
      p.y <= b.bottom
    );
  }

  get depth() {
    return this.sprite.depth;
  }
}
