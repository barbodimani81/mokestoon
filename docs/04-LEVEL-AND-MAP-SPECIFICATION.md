# 04 — Level and Map Specification

## 1. Apartment facts

- Name: F7.
- Approximate area: 55 m².
- Theme: bright wood.
- Rooms/spaces: one master bedroom, one large hall/living room, kitchen, guest WC, master bathroom and balcony.
- One fixed top-down view shows the complete apartment. No scrolling and no room-to-room scene transitions.

## 2. Verbal layout information currently available

- Enter through the front door into a hallway approximately 2 m long.
- Guest WC is directly in front of the entrance.
- Kitchen is to the left after the hallway.
- Master bedroom is behind the guest WC.
- Square-shaped hall/living room is on the left, in front of the kitchen counter.
- Balcony is at the upper-left of the hall/living room.

A hand-drawn plan has been provided in the earlier design conversation, but the exact dimensions, orientation and geometry must be rechecked against the actual source image before building the production map. Do not treat uncertain inferred furniture positions as confirmed.

## 3. Required map source

Before final geometry is authored, obtain/locate:
- The original floor-plan drawing at readable resolution.
- Confirmation of the drawing's orientation and entrance location.
- Room wall dimensions or an agreed scale reference.
- Door positions, opening direction and walkable thresholds.
- Window and balcony-door positions.
- Master-bathroom location and entrance.
- Main furniture and appliance positions.

Record confirmed data in a map manifest. Unknown values must be marked unknown, not guessed.

## 4. Recommended representation

Use a tile-based map authored in Tiled (or a comparable editable map editor) and loaded by Phaser. The map should contain separate layers:

1. `floor`: floor material and room surface.
2. `walls`: visible wall art.
3. `collision`: blocked tiles/shapes.
4. `doors_windows`: doors, windows and thresholds.
5. `furniture`: visible non-interactive furniture.
6. `interactables`: object sprites and stable object IDs.
7. `navigation`: walkable areas and pathfinding cost metadata.
8. `anchors`: character spawn points, interaction points, seating positions and event gathering points.
9. `lighting`: room/light masks or metadata for atmosphere modes.

Keep render art separate from collision and interaction metadata. Every interactive object requires a stable `object_id`, `interaction_anchor` and optional unlock ID.

## 5. Coordinate conventions

**Default:** use integer tile coordinates with a documented tile size, and convert to world pixels in one utility layer. Pick tile size after testing how the entire apartment fits at common mobile viewport sizes. Do not store gameplay coordinates in CSS pixels.

Define stable semantic anchors, e.g. `entrance_spawn`, `kitchen_counter_front`, `living_room_center`, `balcony_seat_1`, `guest_wc_queue_1`, `master_bed_1`. These are names, not assumed coordinates. Map them to positions only after confirming the floor plan.

## 6. Navigation and collision

- Characters must navigate through valid door openings and not through walls/furniture.
- Use a navigation grid or navigation polygons derived from collision geometry.
- Add path costs to discourage walking through crowded areas or around furniture where appropriate.
- Interaction begins only within a target radius/anchor.
- If a path becomes blocked, re-path once or twice, then fail gracefully and inform the player.
- Avoid character overlap through soft separation; do not let separation push a character through walls.
- Doorway and narrow-corridor queueing must be tested, especially the entrance hallway and guest WC queue.

## 7. Camera and responsive fit

- Fit the whole map in the game viewport using a contain/letterbox strategy.
- Never crop a room to fill the viewport.
- UI can use reserved screen space; calculate map viewport after UI safe areas.
- Support portrait and landscape. Do not hard-lock orientation before testing the actual map aspect ratio.
- Pinch zoom is not part of the initial design because the entire apartment must remain visible. A future optional accessibility zoom would need owner approval and must preserve full-map context when inactive.

## 8. Room-specific content

- **Hall/living room:** central shared activities, sofa, TV/console when unlocked, social gathering and dancing.
- **Kitchen:** fridge, food/snacks, counter, sink/dishes and cleaning tasks.
- **Balcony:** sitting and social atmosphere; furniture/access may be unlocked without changing the balcony structure.
- **Master bedroom:** sleep/rest anchors.
- **Guest WC:** bathroom queue and use interaction.
- **Master bathroom:** location/door/interaction details need owner confirmation.

Furniture examples are subject to photo/floor-plan confirmation; this list does not establish exact positions.

## 9. Map validation

Before final art polish:
- Overlay the game map against the owner-confirmed floor plan.
- Verify room topology, door connectivity and dimensions.
- Verify every room is reachable as intended.
- Test all five characters in all narrow paths.
- Test collision around furniture and interaction anchors.
- Confirm the entire map remains visible on target mobile viewports.
