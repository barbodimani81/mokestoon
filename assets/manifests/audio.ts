// Original F7 score and synthesized bell phrases. All note offsets are seconds.
export const apartmentTrack = {
  id: "music.apartment.01",
  title: "Hall Lights",
  url: new URL("../runtime/audio/apartment-01.mp3", import.meta.url).href,
  source: "assets/source/audio/hall-lights.mjs",
} as const;

export const requestChimes = {
  pending: [
    [0, 659.25],
    [0.15, 880],
  ],
  completed: [
    [0, 523.25],
    [0.1, 659.25],
    [0.22, 783.99],
  ],
  expired: [
    [0, 440],
    [0.19, 329.63],
  ],
} as const;
