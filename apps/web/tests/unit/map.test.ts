import assert from "node:assert/strict";
import test from "node:test";
import {
  apartment,
  isWalkable,
  type Point,
} from "../../src/game/map/apartment.ts";

test("all named anchors lie on open floor; walls and furniture block their centers", () => {
  const names = new Set(apartment.anchors.map((a) => a.name));
  assert.equal(names.size, apartment.anchors.length);
  for (const anchor of apartment.anchors)
    assert.ok(isWalkable(anchor), anchor.name);
  for (const rect of [...apartment.walls, ...apartment.obstacles]) {
    assert.equal(
      isWalkable({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }),
      false,
      rect.name,
    );
  }
  for (const point of [
    { x: 0, y: 0 },
    { x: -1, y: 300 },
    { x: apartment.width, y: apartment.height },
  ]) {
    assert.equal(isWalkable(point), false);
  }
});

test("the hall enters the kitchen above the fridge and cannot cross the lower wall or counter", () => {
  const kitchen = apartment.floors.find((r) => r.name === "kitchen");
  const hall = apartment.floors.find((r) => r.name === "entrance_hall");
  const living = apartment.floors.find((r) => r.name === "living_room");
  const counter = apartment.obstacles.find(
    (r) => r.name === "kitchen.hall_counter",
  );
  const fridge = apartment.obstacles.find((r) => r.name === "kitchen.fridge");
  const edge = apartment.doors.find(
    (r) => r.name === "kitchen.east_entry_edge",
  );
  assert.ok(kitchen && hall && living && counter && fridge && edge);
  assert.equal(edge.x, kitchen.x + kitchen.width);
  assert.equal(edge.x + edge.width, hall.x);
  assert.equal(counter.y, living.y + living.height);
  assert.equal(counter.y + counter.height, kitchen.y);
  assert.equal(edge.y, counter.y + counter.height);
  assert.equal(edge.y + edge.height, fridge.y);
  for (let x = edge.x - 1; x <= hall.x; x++) {
    assert.ok(isWalkable({ x, y: edge.y + edge.height / 2 }));
  }
  const boundaryX = edge.x + edge.width / 2;
  for (let y = counter.y; y < kitchen.y + kitchen.height; y++) {
    assert.equal(isWalkable({ x: boundaryX, y }), y >= edge.y && y < fridge.y);
  }
});

test("the entrance reaches every anchor and interior threshold", () => {
  const step = apartment.cellSize;
  const cols = apartment.width / step;
  const rows = apartment.height / step;
  const key = (p: Point) =>
    Math.floor(p.y / step) * cols + Math.floor(p.x / step);
  const start = apartment.anchors.find((a) => a.name === "entrance_spawn");
  assert.ok(start);
  const queue = [key(start)];
  const seen = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    const x = queue[i] % cols,
      y = Math.floor(queue[i] / cols);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      const id = ny * cols + nx;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen.has(id))
        continue;
      if (!isWalkable({ x: (nx + 0.5) * step, y: (ny + 0.5) * step })) continue;
      seen.add(id);
      queue.push(id);
    }
  }
  for (const anchor of apartment.anchors) {
    assert.equal(seen.has(key(anchor)), true, anchor.name);
  }
  for (const door of apartment.doors)
    assert.ok(
      seen.has(
        key({ x: door.x + door.width / 2, y: door.y + door.height / 2 }),
      ),
      door.name,
    );
});
