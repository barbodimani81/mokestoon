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

All five friends have temporary, individually drawn sprites based on the supplied references and the written outfit specifications. The apartment and character preview load the same transparent PNGs from `assets/runtime/spritesheets/`. The manifest marks each sheet as `placeholder` until production art is approved. The 114 × 144 frames use curved outlines and antialiased facial details. The animation clips include directional idle and walk, interaction, rest, elbow-swing dance and a short character-specific reaction. The apartment picks clips from actual movement, task and request state. Reduced motion shows a still pose. The preview’s **Pose** selector plays the available clips.

The checked-in sheets and frame manifest are sufficient to run the game. To edit the temporary pixel rigs, update `scripts/art/build-residents.py` and run `python3 scripts/art/build-residents.py` in a Python environment with Pillow and CairoSVG (requires Cairo). Only derived runtime artwork is served to clients.

The apartment displays a frame at least 61 CSS pixels tall at phone scale. The placeholder manifest selects linear filtering so curved edges scale smoothly in the apartment and the pose preview. Artist-supplied pixel sheets default to nearest-neighbor filtering. Nameplates, request pictograms and furniture icons avoid nearby bodies. If friends gather too closely, the renderer separates their figures and draws short lines back to their simulated positions. A pending request adds its activity icon beside the friend’s name. The furniture icon, friend, request and corresponding labelled controls support selection.

To preview an approved sheet, place a uniformly sliced PNG under `assets/runtime/spritesheets/`. Use a lowercase filename containing letters, digits, underscores or hyphens. Keep the character ID and name, and replace its `art` field with a `spritesheet` entry. For example, a one-frame sheet with a 32 × 48 frame would use the following metadata. Set the actual dimensions, anchors and ranges from the approved sheet.

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

The loader uses zero-based inclusive frame ranges, normalized origins and stable keys such as `barbod.idle.south`. The preview opens with the south-facing idle clip. Use the manifest's four direction values for additional clips. Invalid metadata or a missing declared sheet produces a preview error. Rebuild after changing an entry. The preview starts with audio disabled and loads no tracks.

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

### Apartment playback

The built-in loop **Hall Lights** is an original F7 composition with electric keys, bass, kick and hats. It plays for 16 bars at 104 BPM. Its stable ID, title, local asset and request chime pitches are in `assets/manifests/audio.ts`. The runtime MP3 is under `assets/runtime/audio/`. To re-render the score, run `node assets/source/audio/hall-lights.mjs` with FFmpeg on the path. Normal local development uses the checked-in recording.

The apartment unlocks its Web Audio mixer on a map or friend-control gesture, or through **Start sound**. Once unlocked, it fetches the loop on demand, decodes it once and routes one looping source through the music gain. Short synthesized chimes have a separate gain and respond to new, completed and expired friend requests. If a request is already pending at activation, it rings once. The visible request text, icons and timer remain available during silent play.

**Sound settings** exposes master, music and alert levels and mute. Preferences are device-local. Hiding the page suspends playback. A missing track can be retried from the panel while gameplay and alerts continue.

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

## Persian text and temporary interaction art

The self-hosted Arabic-script subset of Vazirmatn Variable comes from @fontsource-variable/vazirmatn 5.3.0. The WOFF2 and its SIL Open Font License are in apps/web/public/fonts. English debug IDs stay out of the HUD. The original track is displayed as چراغ‌های هال. Station music commands pause or restart that loop while preserving alert and master settings.

The existing generator scripts/art/build-residents.py writes 114 × 144 frames into eight-column temporary atlases. Manifest frame IDs remain flat row-major indices. Carrying, eating, smoking, colored IQOS, joy, greeting, moonwalk and paired boxing use separate clips. These are replaceable provisional assets. Rebuild with the project's CairoSVG/Pillow environment and inspect all five at portrait and desktop FIT scale.
