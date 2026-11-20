import type { CharacterId } from "../config/character-assets.ts";
import type { Point } from "../map/apartment.ts";

// Stable nameplate colors for the five friends.
export const markerColors: Record<CharacterId, string> = {
  barbod: "#733451",
  kavian: "#245644",
  mahan: "#344d7a",
  parsa: "#604277",
  parham: "#805023",
};

export interface Marker extends Point {
  headroom?: number;
  bodyWidth?: number;
  bodyHeight?: number;
  width: number;
  height: number;
}
export interface LabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlap(a: LabelBox, b: LabelBox) {
  return (
    Math.max(
      0,
      Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) + 2,
    ) *
    Math.max(
      0,
      Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) + 2,
    )
  );
}

export function bodyBox(marker: Marker): LabelBox {
  const width = marker.bodyWidth ?? 0,
    height = marker.bodyHeight ?? 0;
  return { x: marker.x - width / 2, y: marker.y - height, width, height };
}

// Separate only overlapping figures in display space. The simulation keeps
// its actual positions and a short leader points back to a displaced foot.
export function placeFigures(
  markers: readonly Marker[],
  width: number,
  height: number,
): Marker[] {
  const placed: Marker[] = [];
  for (const marker of markers) {
    const w = marker.bodyWidth ?? 0,
      h = marker.bodyHeight ?? 0;
    let best = marker,
      lowest = Infinity;
    for (const row of [0, -1, 1]) {
      for (const col of [0, -1, 1, -2, 2, -3, 3]) {
        const x = Math.max(
          w / 2,
          Math.min(width - w / 2, marker.x + col * (w + 3)),
        );
        const y = Math.max(
          h + (marker.headroom ?? 0),
          Math.min(height - 3, marker.y + row * (h + 3)),
        );
        const candidate = { ...marker, x, y };
        const score =
          Math.hypot(x - marker.x, y - marker.y) +
          placed.reduce(
            (n, p) => n + overlap(bodyBox(p), bodyBox(candidate)) * 100,
            0,
          );
        if (score < lowest) {
          best = candidate;
          lowest = score;
        }
        if (score === 0) break;
      }
      if (lowest === 0) break;
    }
    placed.push(best);
  }
  return placed;
}

// Keep pictograms close to their furniture as people pass in front of it.
export function placeIcon(
  center: Point,
  size: number,
  width: number,
  height: number,
  occupied: readonly LabelBox[],
): LabelBox {
  let best: LabelBox | undefined;
  let least = Infinity;
  for (const radius of [
    0,
    size * 0.75,
    size * 1.25,
    size * 1.45,
    size * 1.75,
    size * 2,
  ]) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, -1],
      [0, 1],
      [0.7, -0.7],
      [-0.7, -0.7],
      [0.7, 0.7],
      [-0.7, 0.7],
    ]) {
      const box = {
        x: Math.max(
          1,
          Math.min(width - size - 1, center.x + dx * radius - size / 2),
        ),
        y: Math.max(
          1,
          Math.min(height - size - 1, center.y + dy * radius - size / 2),
        ),
        width: size,
        height: size,
      };
      const covered = occupied.reduce((sum, b) => sum + overlap(box, b), 0);
      if (covered === 0) return box;
      if (covered < least) {
        best = box;
        least = covered;
      }
      if (radius === 0) break;
    }
  }
  return (
    best ?? {
      x: center.x - size / 2,
      y: center.y - size / 2,
      width: size,
      height: size,
    }
  );
}

// Lay out in displayed pixels so that FIT scaling never shrinks the lettering.
// Choose a nearby clear label position, then expand the search in a crowd.
export function placeLabels(
  markers: readonly Marker[],
  width: number,
  height: number,
  keepClear: readonly LabelBox[] = [],
): LabelBox[] {
  const placed: LabelBox[] = [];
  const occupied = [
    ...keepClear,
    ...markers.filter((m) => m.bodyHeight).map(bodyBox),
  ];
  for (const marker of markers) {
    let best: LabelBox | undefined;
    let leastOverlap = Infinity,
      shortest = Infinity;
    const consider = (left: number, top: number) => {
      const x = Math.max(1, Math.min(width - marker.width - 1, left));
      const y = Math.max(1, Math.min(height - marker.height - 1, top));
      const box = { x, y, width: marker.width, height: marker.height };
      const covered = occupied.reduce(
        (sum, label) => sum + overlap(label, box),
        0,
      );
      const length = Math.hypot(
        x + box.width / 2 - marker.x,
        y + box.height / 2 - marker.y,
      );
      if (
        covered < leastOverlap ||
        (covered === leastOverlap && length < shortest)
      ) {
        best = box;
        leastOverlap = covered;
        shortest = length;
      }
    };
    const side = (marker.bodyWidth ?? 0) / 2 + 4;
    consider(marker.x + side, marker.y - marker.height);
    consider(marker.x - side - marker.width, marker.y - marker.height);
    for (let lane = 0; lane <= markers.length; lane++) {
      const offset = 3 + lane * (marker.height + 4);
      for (const dx of [0, -marker.width / 2 - 4, marker.width / 2 + 4]) {
        const left = marker.x - marker.width / 2 + dx;
        consider(left, marker.y + offset);
        consider(
          left,
          marker.y - (marker.bodyHeight ?? 4) - marker.height - offset,
        );
      }
      if (leastOverlap === 0) break;
    }
    if (best) {
      placed.push(best);
      occupied.push(best);
    }
  }
  return placed;
}
