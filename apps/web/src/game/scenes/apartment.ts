import Phaser from "phaser";
import type { CharacterId } from "../config/character-assets";
import { type StationId, stationIds, stations } from "../config/stations";
import type { Point } from "../map/apartment";
import { apartment, type MapRect } from "../map/apartment";

import { queueSheets, registerClips } from "../rendering/assets";
import {
  bodyBox,
  type LabelBox,
  placeFigures,
  placeIcon,
  placeLabels,
} from "../rendering/resident-labels";
import { ResidentView } from "../rendering/residents";
import { movementTuning } from "../systems/movement";
import type { ApartmentSession } from "../systems/session";

const images = import.meta.glob<string>(
  "../../../../../assets/runtime/maps/*.webp",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

interface ApartmentControls {
  paused: boolean;
  selected: CharacterId | null;
  select(id: CharacterId): void;
  mapTap(point: Point): void;
  bounds(canvas: HTMLCanvasElement): void;
  placeFriend(
    id: CharacterId,
    x: number,
    y: number,
    headX: number,
    headY: number,
  ): void;
  placeStation(id: StationId, x: number, y: number): void;
  refresh(): void;
}

export class ApartmentScene extends Phaser.Scene {
  private controls?: ApartmentControls;
  private views: ResidentView[] = [];

  private iconLeaders?: Phaser.GameObjects.Graphics;
  private accumulator = 0;
  private mess?: Phaser.GameObjects.Graphics;
  private messKey = "";
  private light?: Phaser.GameObjects.Rectangle;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  private assetError = false;
  constructor(
    private readonly world: ApartmentSession,
    private readonly onReady: (
      showDetails: (show: boolean) => void,
    ) => ApartmentControls,
    private readonly onError: () => void,
  ) {
    super("apartment");
  }
  preload() {
    try {
      queueSheets(this);
    } catch {
      this.assetError = true;
    }
    for (const layer of apartment.art) {
      const url = images[`../../../../../assets/runtime/maps/${layer.image}`];
      if (url) this.load.image(layer.name, url);
    }
  }
  create() {
    try {
      if (this.assetError) throw new Error();
      registerClips(this);
    } catch {
      this.onError();
      return;
    }
    for (const layer of apartment.art) {
      if (!this.textures.exists(layer.name)) {
        this.onError();
        return;
      }
      const image = this.textures.get(layer.name).getSourceImage();
      if (
        image.width !== layer.imagewidth ||
        image.height !== layer.imageheight
      ) {
        this.onError();
        return;
      }
      this.add
        .image(layer.offsetx ?? 0, layer.offsety ?? 0, layer.name)
        .setOrigin(0)
        .setAlpha(layer.opacity);
    }
    const overlay = this.add.graphics().setVisible(false);
    const rectangles = (rects: MapRect[], color: number, opacity: number) => {
      overlay.fillStyle(color, opacity);
      for (const r of rects) overlay.fillRect(r.x, r.y, r.width, r.height);
    };
    rectangles(apartment.walls, 0x873825, 0.72);
    rectangles(apartment.obstacles, 0x873825, 0.6);
    rectangles(apartment.doors, 0x007372, 0.82);
    overlay.lineStyle(4, 0x724988);
    for (const edge of apartment.pendingThresholds) {
      overlay.strokeRect(edge.x, edge.y, edge.width, edge.height);
    }
    overlay.fillStyle(0xffde78).lineStyle(2, 0x333527);
    for (const point of apartment.anchors) {
      overlay.fillCircle(point.x, point.y, 7).strokeCircle(point.x, point.y, 7);
    }
    this.controls = this.onReady((show) => overlay.setVisible(show));
    this.light = this.add
      .rectangle(0, 0, apartment.width, apartment.height, 0x263752, 0)
      .setOrigin(0)
      .setDepth(2000);

    this.mess = this.add.graphics().setDepth(1990);
    this.iconLeaders = this.add.graphics().setDepth(2005);
    this.views = this.world.movement.actors.map(
      (actor) => new ResidentView(this, actor),
    );
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.controls) return;
      const point = { x: pointer.worldX, y: pointer.worldY };

      const body = this.views
        .filter((view) => view.containsBody(point))
        .sort((a, b) => b.depth - a.depth)[0];
      const index = this.views.indexOf(body);
      if (index >= 0) {
        const id = this.world.movement.actors[index].id;
        this.controls.select(id);
        return;
      }
      const hits = this.views
        .map((view, i) => ({
          id: this.world.movement.actors[i].id,
          distance: Math.hypot(view.foot.x - point.x, view.foot.y - point.y),
        }))
        .sort((a, b) => a.distance - b.distance);
      if (hits[0].distance <= Math.max(18, 22 * this.scale.displayScale.x))
        this.controls.select(hits[0].id);
      else this.controls.mapTap(point);
    });
  }
  update(_time: number, delta: number) {
    if (!this.controls || document.hidden) return;
    if (!this.controls.paused) this.accumulator += Math.min(delta, 250);
    while (this.accumulator >= movementTuning.tickMs) {
      this.world.tick();
      this.accumulator -= movementTuning.tickMs;
      this.controls.refresh();
      const phase = this.world.clock.phase;
      this.light?.setFillStyle(
        phase === "Evening" ? 0xbd622d : 0x172747,
        phase === "Night" ? 0.32 : phase === "Evening" ? 0.16 : 0,
      );
    }
    const { dishes, clutter } = this.world.house;
    const messKey = `${dishes}/${clutter}`;
    if (messKey !== this.messKey && this.mess) {
      this.messKey = messKey;
      this.mess.clear();
      const sink = apartment.obstacles.find(
        (o) => o.name === "kitchen.west_counter",
      );
      const counter = apartment.obstacles.find(
        (o) => o.name === "kitchen.hall_counter",
      );
      if (sink)
        for (let n = 0; n < dishes; n++) {
          const x = sink.x + sink.width / 2,
            y = sink.y + sink.height * 0.38 - n * 3;
          this.mess
            .fillStyle(0xe2e8da)
            .fillEllipse(x, y, 18, 7)
            .lineStyle(1.8, 0x526749)
            .strokeEllipse(x, y, 18, 7);
        }
      if (counter)
        for (let n = 0; n < clutter; n++)
          this.mess
            .fillStyle(0x8e6442)
            .fillCircle(
              counter.x + ((n + 1) * counter.width) / 10,
              counter.y + counter.height / 2 + (n % 2) * 2,
              2.8,
            );
    }
    const units = this.scale.displayScale.x;
    if (!Number.isFinite(units) || units <= 0) return;
    const width = apartment.width / units,
      height = apartment.height / units;
    const markers = this.views.map((view, i) => {
      const actor = this.world.movement.actors[i];
      const task = this.world.tasks.get(actor.id),
        request = this.world.request;
      return view.render(
        actor,
        {
          performing: task?.stage === "performing" ? task.activity : undefined,
          carrying: task?.activity === "jelly_store",
          happy: request?.friend === actor.id && request.status === "completed",
          reacting: this.world.reactions.has(actor.id),
          request: request?.friend === actor.id ? request.activity : undefined,
        },
        this.accumulator / movementTuning.tickMs,
        actor.id === this.controls?.selected,
        this.reduced.matches,
        units,
      );
    });
    const figures = placeFigures(markers, width, height);
    const size = 32;
    const occupied = figures.map(bodyBox);
    const furniture: LabelBox[] = [];
    const leaders = this.iconLeaders?.clear();
    this.controls.bounds(this.game.canvas);
    const request = this.world.request;
    if (request) {
      const i = this.world.movement.actors.findIndex(
          (a) => a.id === request.friend,
        ),
        f = figures[i];
      const bubbleBox = {
        x: Math.max(0, Math.min(width - 110, f.x - 55)),
        y: f.y - (f.bodyHeight ?? 0) - 24,
        width: 110,
        height: 24,
      };
      occupied.push(bubbleBox);
      furniture.push(bubbleBox);
    }
    for (const id of stationIds) {
      const r = apartment.obstacles.find((o) => o.name === stations[id].object);
      if (!r) continue;
      const center = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      const box = placeIcon(
        { x: center.x / units, y: center.y / units },
        size,
        width,
        height,
        occupied,
      );
      this.controls.placeStation(id, box.x + size / 2, box.y + size / 2);
      leaders
        ?.lineStyle(units, 0x344634)
        .lineBetween(
          center.x,
          center.y,
          (box.x + size / 2) * units,
          (box.y + size / 2) * units,
        );
      furniture.push(box);
      occupied.push(box);
    }
    const labels = placeLabels(figures, width, height, furniture);
    this.views.forEach((view, i) => {
      view.placeFigure(figures[i], units);
      const box = labels[i],
        f = figures[i];
      this.controls?.placeFriend(
        this.world.movement.actors[i].id,
        box.x + box.width / 2,
        box.y + box.height / 2,
        Math.max(55, Math.min(width - 55, f.x)),
        Math.max(12, f.y - (f.bodyHeight ?? 0) - 12),
      );
    });
  }
}
