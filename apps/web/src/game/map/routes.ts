import { apartment, type Point } from "./apartment.ts";

export const footRadius = 6;
const grid = apartment.cellSize;
const cols = apartment.width / grid;
const rows = apartment.height / grid;
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

// Summed occupancy gives exact footprint clearance across adjoining rectangles,
// including the thin thresholds between otherwise disconnected floor regions.
const stride = apartment.width + 1;
const surface = new Uint32Array(stride * (apartment.height + 1));
function paint(rects: typeof apartment.floors, value: number) {
  for (const rect of rects)
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      const first = (y + 1) * stride + rect.x + 1;
      surface.fill(value, first, first + rect.width);
    }
}
paint([...apartment.floors, ...apartment.doors], 1);
paint([...apartment.walls, ...apartment.obstacles], 0);
for (let y = 1; y <= apartment.height; y++) {
  let sum = 0;
  for (let x = 1; x <= apartment.width; x++) {
    const i = y * stride + x;
    sum += surface[i];
    surface[i] = sum + surface[i - stride];
  }
}

export function fits(p: Point) {
  const x = Math.floor(p.x - footRadius),
    y = Math.floor(p.y - footRadius);
  const right = Math.ceil(p.x + footRadius),
    bottom = Math.ceil(p.y + footRadius);
  if (x < 0 || y < 0 || right > apartment.width || bottom > apartment.height)
    return false;
  const area =
    surface[bottom * stride + right] -
    surface[y * stride + right] -
    surface[bottom * stride + x] +
    surface[y * stride + x];
  return area === (right - x) * (bottom - y);
}
function center(i: number): Point {
  return {
    x: ((i % cols) + 0.5) * grid,
    y: (Math.floor(i / cols) + 0.5) * grid,
  };
}
const open = Uint8Array.from({ length: cols * rows }, (_, i) =>
  Number(fits(center(i))),
);
export function clearOfFriends(p: Point, others: readonly Point[]) {
  return others.every((other) => distance(p, other) >= footRadius * 2);
}
export function clearSegment(from: Point, to: Point, others: readonly Point[]) {
  const samples = Math.max(1, Math.ceil(distance(from, to)));
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    if (!fits(p) || !clearOfFriends(p, others)) return false;
  }
  return true;
}
function connectors(point: Point, others: readonly Point[]) {
  const x = Math.floor(point.x / grid),
    y = Math.floor(point.y / grid);
  const cells: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx,
        ny = y + dy,
        i = ny * cols + nx;
      if (
        nx >= 0 &&
        ny >= 0 &&
        nx < cols &&
        ny < rows &&
        open[i] &&
        clearSegment(point, center(i), others)
      )
        cells.push(i);
    }
  return cells.sort(
    (a, b) => distance(point, center(a)) - distance(point, center(b)),
  );
}

export function findRoute(
  from: Point,
  to: Point,
  others: readonly Point[] = [],
): Point[] | null {
  if (!fits(from) || !fits(to) || !clearOfFriends(to, others)) return null;
  if (clearSegment(from, to, others)) return [{ ...to }];
  const targets = new Set(connectors(to, others));
  if (!targets.size) return null;
  const parent = new Int32Array(open.length).fill(-1);
  const usable = open.slice();
  for (const other of others) {
    // A cell clearance margin also protects the segments between adjacent centers.
    const cx = Math.floor(other.x / grid),
      cy = Math.floor(other.y / grid);
    for (let y = Math.max(0, cy - 3); y <= Math.min(rows - 1, cy + 3); y++)
      for (let x = Math.max(0, cx - 3); x <= Math.min(cols - 1, cx + 3); x++) {
        const i = y * cols + x;
        if (distance(center(i), other) < 2 * footRadius + grid / 2)
          usable[i] = 0;
      }
  }
  const queue = connectors(from, others).filter((i) => usable[i]);
  for (const i of queue) parent[i] = i;
  for (let head = 0; head < queue.length; head++) {
    const here = queue[head];
    if (targets.has(here)) {
      const path: Point[] = [{ ...to }];
      let i = here;
      while (parent[i] !== i) {
        path.push(center(i));
        i = parent[i];
      }
      path.push(center(i));
      return path.reverse();
    }
    // Outer cells are entirely outside the traced apartment.
    for (const next of [here - cols, here - 1, here + 1, here + cols]) {
      if (!usable[next] || parent[next] !== -1) continue;
      parent[next] = here;
      queue.push(next);
    }
  }
  return null;
}
