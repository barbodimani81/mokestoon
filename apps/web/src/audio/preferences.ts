export interface AudioPreferences {
  master: number;
  music: number;
  alerts: number;
  muted: boolean;
}
export type Channel = Exclude<keyof AudioPreferences, "muted">;
export const defaults: Readonly<AudioPreferences> = {
  master: 0.8,
  music: 0.46,
  alerts: 0.8,
  muted: false,
};
export const preferenceKey = "f7.audio.v1";

export function readPreferences(raw: string | null): AudioPreferences {
  const result = { ...defaults };
  try {
    const saved = JSON.parse(raw ?? "{}");
    for (const channel of ["master", "music", "alerts"] as const) {
      const level = saved?.[channel];
      if (
        typeof level === "number" &&
        Number.isFinite(level) &&
        level >= 0 &&
        level <= 1
      )
        result[channel] = level;
    }
    if (typeof saved?.muted === "boolean") result.muted = saved.muted;
  } catch {
    /* Damaged or obsolete preferences fall back to local defaults. */
  }
  return result;
}

export function loadPreferences() {
  try {
    return readPreferences(localStorage.getItem(preferenceKey));
  } catch {
    return { ...defaults };
  }
}
export function savePreferences(prefs: AudioPreferences) {
  try {
    localStorage.setItem(preferenceKey, JSON.stringify(prefs));
  } catch {
    /* Audio controls still work when storage is unavailable. */
  }
}
