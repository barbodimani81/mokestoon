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

The uploaded plan used for the M1 prototype is described below. It shows the guest WC beside the entrance on the right. The earlier verbal description above remains recorded for comparison.

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
- **Master bathroom:** the uploaded plan shows access through the bedroom. Fixture interactions remain to be specified.

Furniture examples are subject to photo/floor-plan confirmation; this list does not establish exact positions.

## 9. Map validation

Before final art polish:
- Overlay the game map against the owner-confirmed floor plan.
- Verify room topology, door connectivity and dimensions.
- Verify every room is reachable as intended.
- Test all five characters in all narrow paths.
- Test collision around furniture and interaction anchors.
- Confirm the entire map remains visible on target mobile viewports.

## M1 map prototype

The [uploaded image](../assets/source/apartment/floor-plan/e04d5d13-0579-4e92-a314-059c60b64e05.jpg) shows the entrance at the bottom, kitchen at lower left, balcony at upper left and both bathrooms on the right. The master bathroom opens into the bedroom above the bed. The prototype uses the image's orientation. Its source has no metric scale bar.

Open [f7.json](../assets/runtime/maps/f7.json) in Tiled to edit the map. Its image layers use the adjacent WebP files. The upper layer carries a sample of the hallway floor across the confirmed kitchen opening. Floor rectangles include all six rooms and the connecting hall. Wall, furniture collision, doorway and point-anchor layers are registered to the same art. Toggle their eye icons in Tiled or use **Map geometry** on the web page. The furniture and TV are baked into the supplied illustration. Interactive objects and equipment unlocks belong to later milestones.

One world pixel corresponds to one cropped source pixel. The image is 1,200 × 912 pixels, starting at (288, 32) in the 1,792 × 1,008 upload. Cropping removes outer margin and retains the entrance steps and balcony railing. The 8-pixel Tiled grid is an authoring and reachability-test resolution. Room boundaries and door endpoints retain sub-tile precision. To reproduce the runtime images from the repository root:

```sh
cwebp -quiet -q 91 -m 6 -crop 288 32 1200 912 assets/source/apartment/floor-plan/e04d5d13-0579-4e92-a314-059c60b64e05.jpg -o assets/runtime/maps/f7.webp
cwebp -quiet -lossless -crop 954 636 40 52 assets/source/apartment/floor-plan/e04d5d13-0579-4e92-a314-059c60b64e05.jpg -o assets/runtime/maps/kitchen-threshold.webp
```

The interior walkable area is the union of floors and traced interior thresholds, minus walls and furniture footprints. The entrance anchor sits inside the front door. Furniture footprints are prototype traces of visible silhouettes. The map tests check point clearance and flood-fill connectivity at cell centers. Character clearance through narrow gaps requires M2 movement tests.

| Crossing | Current evidence and implementation |
| --- | --- |
| Hall to bedroom, bedroom to master bathroom, hall to guest WC | The source shows an interior door at each location. All three thresholds connect in the walkability test. |
| Entrance hall to kitchen | The owner confirmed entry on the kitchen’s right (east) side above the fridge. The prototype uses the gap from the hall-facing counter to the top of the fridge. The walkability test reaches the kitchen counter from the entrance. |
| Living room to balcony | The owner accepted the balcony as drawn. The prototype uses the traced sill above the dining table for passage. |

The owner also identified a kitchen counter facing the large hall/living room. The prototype uses the existing trace of the horizontal divider below the sofa for its collision footprint. Its dimensions come from the drawing and are approximate.

The connectivity test reaches all six spaces from the entrance. The camera fits the complete image in portrait and landscape. A measured wall length would allow a future metric conversion.
