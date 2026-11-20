import type { ActivityId } from "./activities.ts";
import type { IconId } from "./activity-icons.ts";

// All locations are named objects/anchors in the supplied apartment map.
export const stations = {
  "station.food": {
    object: "kitchen.fridge",
    icon: "snack",
    actions: ["snack", "jelly_prepare", "jelly_store", "jelly_eat"],
  },
  "station.cleaning": {
    object: "kitchen.west_counter",
    icon: "dishes",
    actions: ["dishes", "clean"],
  },
  "station.entertainment": {
    object: "living.tv_stand",
    icon: "tv",
    actions: [
      "chat",
      "dance",
      "moonwalk",
      "boxing",
      "tv",
      "ps4",
      "setup_tv",
      "setup_ps4",
    ],
  },
  "station.music": {
    object: "living.sofa_north",
    icon: "dance",
    actions: ["music_play", "music_quiet"],
  },
  "station.sleep": { object: "bedroom.bed", icon: "rest", actions: ["rest"] },
  "station.wc": { object: "wc.toilet", icon: "wc", actions: ["guest_wc"] },
  "station.balcony": {
    object: "balcony.plant_west",
    icon: "balcony",
    actions: ["balcony", "cigarette", "iqos"],
  },
} as const satisfies Record<
  string,
  { object: string; icon: IconId; actions: readonly ActivityId[] }
>;
export type StationId = keyof typeof stations;
export const stationIds = Object.keys(stations) as StationId[];
