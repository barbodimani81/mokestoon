import map from "../../../../../assets/runtime/maps/f7.json" with {
  type: "json",
};

export interface Point {
  x: number;
  y: number;
}
export interface MapRect extends Point {
  name: string;
  type?: string;
  width: number;
  height: number;
}

function objects(name: string): MapRect[] {
  const layer = map.layers.find(
    (layer) => layer.type === "objectgroup" && layer.name === name,
  );
  if (!layer?.objects) throw new Error(`Missing Tiled layer: ${name}`);
  return layer.objects;
}

const crossings = objects("doors_windows");
export const apartment = {
  width: map.width * map.tilewidth,
  height: map.height * map.tileheight,
  cellSize: map.tilewidth,
  art: map.layers.filter(
    (layer) => layer.type === "imagelayer" && layer.visible,
  ),
  floors: objects("floor"),
  walls: objects("walls"),
  obstacles: objects("collision"),
  doors: crossings.filter((object) => object.type === "interior_threshold"),
  pendingThresholds: crossings.filter(
    (object) => object.type === "unconfirmed_threshold",
  ),
  anchors: objects("anchors"),
};

function contains(rect: MapRect, { x, y }: Point) {
  return (
    x >= rect.x &&
    y >= rect.y &&
    x < rect.x + rect.width &&
    y < rect.y + rect.height
  );
}

// Point clearance only. Character footprints and movement belong to M2.
export function isWalkable(point: Point): boolean {
  const inside = (rect: MapRect) => contains(rect, point);
  return (
    (apartment.floors.some(inside) || apartment.doors.some(inside)) &&
    !apartment.walls.some(inside) &&
    !apartment.obstacles.some(inside)
  );
}
