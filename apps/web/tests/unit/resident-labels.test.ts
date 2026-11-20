import assert from "node:assert/strict";
import test from "node:test";
import {
  bodyBox,
  placeFigures,
  placeIcon,
  placeLabels,
} from "../../src/game/rendering/resident-labels.ts";

test("all five names fit inside the phone map when the residents gather in a corner", () => {
  for (const [x, y] of [
    [5, 5],
    [305, 210],
    [145, 70],
  ]) {
    const markers = Array.from({ length: 5 }, () => ({
      x,
      y,
      width: 66,
      height: 22,
    }));
    const boxes = placeLabels(markers, 310, 215);
    assert.equal(boxes.length, 5);
    for (const [i, b] of boxes.entries()) {
      assert.ok(
        b.x >= 0 && b.y >= 0 && b.x + b.width <= 310 && b.y + b.height <= 215,
      );
      for (const a of boxes.slice(0, i)) {
        assert.ok(
          b.x + b.width <= a.x ||
            a.x + a.width <= b.x ||
            b.y + b.height <= a.y ||
            a.y + a.height <= b.y,
          "overlapping labels",
        );
      }
    }
  }
});

test("when five friends gather beside an object on a phone, the figures and icon each keep their own space", () => {
  const markers = Array.from({ length: 5 }, () => ({
    x: 72,
    y: 90,
    width: 55,
    height: 20,
    bodyWidth: 30,
    bodyHeight: 44,
  }));
  const figures = placeFigures(markers, 320, 240);
  const boxes = figures.map(bodyBox);
  const icon = placeIcon(markers[0], 22, 320, 240, boxes);
  const occupied = [...boxes, icon];
  for (const [index, b] of occupied.entries()) {
    assert.ok(
      b.x >= 0 && b.y >= 0 && b.x + b.width <= 320 && b.y + b.height <= 240,
    );
    for (const a of occupied.slice(0, index))
      assert.ok(
        b.x + b.width <= a.x ||
          a.x + a.width <= b.x ||
          b.y + b.height <= a.y ||
          a.y + a.height <= b.y,
      );
  }
});
