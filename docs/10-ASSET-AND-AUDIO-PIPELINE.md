# 10 — Asset and Audio Pipeline

## 1. Visual direction

- Detailed 16-bit pixel art, top-down/three-quarter top-down view appropriate to the map.
- Bright wood apartment theme.
- Recognizable room materials, kitchen appliances, furniture and door details.
- Character silhouettes, hair, facial hair, glasses and signature clothes must remain distinct at actual mobile display scale.
- Day/evening/night and music modes alter lighting/ambience without changing the apartment's structure.

## 2. Source-of-truth asset folders

Keep editable source files separate from optimized runtime files:

```text
assets/
  source/
    characters/{barbod,kavian,mahan,parsa,parham}/
    apartment/
    objects/
    ui/
    audio/
  runtime/
    spritesheets/
    tilesets/
    maps/
    audio/
    fonts/
  manifests/
```

Do not place private reference photographs in `runtime/` or publish them through static hosting. Keep reference material private and create derived game art assets for distribution.

## 3. Character sprite requirements

### Replacing an M0 preview tile

`assets/manifests/characters.ts` currently declares a temporary letter tile for each stable character ID. To preview an approved sheet, place a uniformly sliced PNG under `assets/runtime/spritesheets/`. Use a lowercase filename containing letters, digits, underscores or hyphens. Keep the character ID and name, and replace its `art` field with a `spritesheet` entry. For example, a one-frame sheet with a 32 × 48 frame would use the following metadata. Set the actual dimensions, anchors and ranges from the approved sheet.

```ts
art: {
  kind: "spritesheet",
  file: "barbod_idle.png",
  frameWidth: 32,
  frameHeight: 48,
  origin: [0.5, 1],
  animations: [
    { action: "idle", direction: "south", firstFrame: 0, lastFrame: 0, frameMs: 200, loop: true },
  ],
}
```

The loader uses zero-based inclusive frame ranges, normalized origins and stable keys such as `barbod.idle.south`. The preview plays the south-facing idle clip. Use the manifest's four direction values for additional clips. Invalid metadata or a missing declared sheet produces a preview error. Rebuild after changing an entry. The preview starts with audio disabled and loads no tracks.

Minimum first pass per character:
- idle animation;
- four-direction walk (or a documented reduced-direction solution if the top-down camera and map make four directions sufficient);
- interaction/use animation;
- happy/tongue-out reaction;
- shared elbow-swing dance;
- savage reaction.

Then add unique actions: Barbod hands-up jump/fall/water bottle/sweets; Kavian cleaning/dishes/setup/moonwalk/boxing; Mahan couch rest/boxing/high-energy jump/hands-up side swing; Parsa greeting/TV/balcony/joint-event prop action; Parham PS4/phone/belly laugh/hands-up laugh.

Animation metadata must be machine-readable and named by stable IDs. Include frame duration, frame range, origin/anchor and directional variants.

## 4. Environment assets

Create coherent tile sets for floor, walls, trims, doors/windows, kitchen, bathroom, bedroom, living room and balcony. Exact geometry and prop positions depend on the confirmed map. Interactive objects need separate hit areas/anchors and state variants (locked/unlocked, active/inactive, open/closed, dirty/clean where relevant).

## 5. Resolution and scaling

Choose internal pixel resolution and tile size only after map aspect-ratio tests. Use integer scaling when possible to preserve pixel crispness. Disable unwanted texture smoothing for pixel art. Test at actual mobile CSS viewport sizes and high-DPI screens. Avoid making sprites so small that character identity disappears.

## 6. Naming conventions

Use lowercase kebab-case IDs, for example:
- `char-barbod-idle-down`
- `char-kavian-clean-dishes`
- `char-mahan-jump-high-energy`
- `event-joint-sunglasses`
- `object-fridge-open`
- `vibe-hard-techno-lighting`

Do not embed mutable display labels into asset filenames. Keep a manifest mapping stable asset IDs to files, dimensions, frame metadata and license/source.

## 7. Audio

Audio categories:
- music tracks;
- ambient apartment sounds;
- character vocal/reaction sounds;
- UI feedback;
- event cues.

Provide independent master/music/SFX volume controls and mute. Normalize loudness to avoid abrupt jumps. Avoid overlapping multiple music tracks when an event override starts. Restore the prior track after event completion.

## 8. Personal playlist import

**Default for first release:** user selects audio files from their own device; file data stays local to that browser/device and is not uploaded to the server. Store playlist metadata and references locally where browser support permits. Explain that local files may need to be reselected after browser storage is cleared or on another device. Confirm this behavior with the owner before implementation.

If cloud sync is later approved, use private object storage, strict upload size/type limits, malware/content validation, per-user quotas, signed private URLs and deletion controls. Do not make user tracks publicly accessible by default.

## 9. Music rights and attribution

Song/artist names in the design docs are reference preferences, not permission to distribute recordings. Built-in production audio must be original, properly licensed or otherwise cleared for the intended distribution. Do not package copyrighted commercial recordings merely because a title appears in a requirement.

## 10. Asset QA

- Verify consistent camera angle, palette and scale.
- Check transparent edges and atlas padding.
- Ensure animation loops do not visibly jump.
- Check hit boxes and visual anchors.
- Verify all character sprites are distinguishable at phone scale.
- Measure atlas sizes and initial download weight.
- Ensure audio begins only after user gesture where browser policy requires it.
- Include license/source metadata for every bundled third-party asset.
