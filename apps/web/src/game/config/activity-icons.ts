import type { ActivityId } from "./activities.ts";

// All icons share the same 24-unit stroke grid in the DOM and on the map.
export const iconPaths = {
  wc: "M3 10h17q0 8-8 8h-2q-5-1-5-6 M5 10V3h5v7 M11 18l-1 3h8",
  smoke: "M2 13h17v4H2z M15 13v4 M18 10q3-2 0-4 M21 8q2-3 0-5",
  snack: "M4 3v6q0 3 3 3t3-3V3 M7 3v18 M20 21V3q-5 3-5 11h5",
  dishes: "M19 10a8 8 0 1 1-6-6 M16 11a5 5 0 1 1-6-3 M18 2v5 M15.5 4.5h5",
  clean:
    "M8 4l1.5 4.5L14 10l-4.5 1.5L8 16l-1.5-4.5L2 10l4.5-1.5z M17 12l1.3 3.7L22 17l-3.7 1.3L17 22l-1.3-3.7L12 17l3.7-1.3z",
  balcony: "M4 20Q6 12 16 7 M6 16C1 8 9 4 21 3c0 11-5 17-15 13z",
  rest: "M19 16A9 9 0 0 1 9 4a9 9 0 1 0 10 12z M17 4v4 M15 6h4",
  chat: "M3 4h15v10H9l-5 4v-4H3z M18 9h3v11l-4-3h-5",
  dance:
    "M9 18V6l11-3v12 M9 17c-6-1-7 5-2 4q2 0 2-4z M20 14c-6-1-7 5-2 4q2 0 2-4z M10 9l9-2",
  tv: "M3 5h18v13H3z M8 21h8 M12 18v3",
  ps4: "M8 7h8q3 0 4 3l2 7q0 4-4 2l-4-4h-4l-4 4q-4 2-4-2l2-7q1-3 4-3z M7 9v5 M4.5 11.5h5 M16 11h.5 M18 13h.5",
  setup:
    "M8 8l6 6 M14 4a5 5 0 0 0-6 6l-5 6a3 3 0 0 0 4 4l6-6a5 5 0 0 0 7-6l-4 3-3-3z",
  go: "M4 12h15 M13 5l7 7-7 7",
} as const;

export type IconId = keyof typeof iconPaths;
export function activityIcon(activity: ActivityId): IconId {
  switch (activity) {
    case "setup_ps4":
    case "setup_tv":
      return "setup";
    case "jelly_prepare":
    case "jelly_store":
    case "jelly_eat":
      return "snack";
    case "cigarette":
    case "iqos":
      return "smoke";
    case "guest_wc":
      return "wc";
    case "boxing":
      return "chat";
    case "moonwalk":
    case "music_play":
    case "music_quiet":
      return "dance";
    default:
      return activity;
  }
}
