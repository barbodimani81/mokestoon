import type Phaser from "phaser";
import { type ActivityId, activities } from "../config/activities";
import { activityIcon, type IconId, iconPaths } from "../config/activity-icons";
import { apartment } from "../map/apartment";

export const iconKey = (id: IconId, request = false) =>
  `icon.${request ? "request" : "object"}.${id}`;

export function registerIcons(scene: Phaser.Scene) {
  for (const [key, path] of Object.entries(iconPaths)) {
    for (const request of [false, true]) {
      const texture = scene.textures.createCanvas(
        iconKey(key as IconId, request),
        72,
        72,
      );
      if (!texture) continue;
      const ctx = texture.context;
      ctx.scale(3, 3);
      ctx.fillStyle = request ? "#ffdb67" : "#fff8de";
      ctx.strokeStyle = "#344634";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(12, 12, 11, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.translate(4.5, 4.5);
      ctx.scale(15 / 24, 15 / 24);
      ctx.strokeStyle = "#263e32";
      ctx.lineWidth = 2.7;
      ctx.lineJoin = ctx.lineCap = "round";
      ctx.stroke(new Path2D(path));
      texture.refresh();
    }
  }
}

// One tap target per group of actions. Put badges on the furniture, leaving
// the floor anchor available to the approaching resident.
export function objectBadges(scene: Phaser.Scene) {
  const objects: ActivityId[] = [
    "snack",
    "dishes",
    "clean",
    "balcony",
    "rest",
    "chat",
    "tv",
  ];
  return objects.map((activity) => {
    const spec = activities[activity];
    const object = apartment.obstacles.find((o) => o.name === spec.objects[0]);
    if (!object) throw new Error(`Missing map object for ${activity}`);
    const image = scene.add
      .image(
        object.x + object.width / 2,
        object.y + object.height / 2,
        iconKey(activityIcon(activity)),
      )
      .setDepth(2010);
    return { anchor: spec.anchor, center: { x: image.x, y: image.y }, image };
  });
}
