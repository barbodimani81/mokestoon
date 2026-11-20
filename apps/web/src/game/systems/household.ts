import {
  type ActivityId,
  pacing,
  routines,
  householdTuning as tuning,
} from "../config/activities.ts";
import { type CharacterId, characterIds } from "../config/character-assets.ts";

export function gameClock(ticks: number) {
  const within = ticks % pacing.dayTicks;
  return {
    day: 1 + Math.floor(ticks / pacing.dayTicks),
    phase:
      within >= pacing.night
        ? "Night"
        : within >= pacing.evening
          ? "Evening"
          : "Day",
  };
}

export class Household {
  dishes: number = tuning.initialDishes;
  clutter: number = tuning.initialClutter;
  fatigue: Record<CharacterId, number> = {
    barbod: 0,
    kavian: 0,
    mahan: 0,
    parsa: 0,
    parham: 0,
  };
  nextAmbient = characterIds.map(
    (_, i) => pacing.ambientDelay + i * pacing.ambientStagger,
  );
  seed = 0x7f73;
  tvReady = false;
  tvOwned = false;
  ps4Owned = false;
  ps4Ready = false;
  pick<T>(choices: readonly T[]): T {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return choices[Math.floor((this.seed / 4294967296) * choices.length)];
  }
  reason(id: CharacterId, a: ActivityId): string {
    if (a === "moonwalk" && id !== "kavian") return "Kavian only";
    if (a === "boxing" && id !== "kavian" && id !== "mahan")
      return "Boxing partners";
    if (a === "dishes" && !this.dishes) return "All dishes are clean";
    if (a === "clean" && !this.clutter) return "The counter is clean";
    if (a === "ps4" && !this.ps4Ready) return "PS4 needs unlocking and setup";
    if (
      a === "setup_ps4" &&
      (!this.ps4Owned || !this.tvReady || this.ps4Ready || id !== "kavian")
    )
      return "Kavian sets up the PS4 after the TV";
    if (a === "tv" && !this.tvReady) return "TV needs unlocking and setup";
    if (a === "setup_tv" && (!this.tvOwned || this.tvReady || id !== "kavian"))
      return "Kavian sets up the unlocked TV";
    return "";
  }
  ambient(id: CharacterId, ticks: number) {
    if (this.tvOwned && !this.tvReady && id === "kavian") return "setup_tv";
    if (
      gameClock(ticks).phase === "Night" &&
      this.fatigue[id] >= tuning.restThreshold
    )
      return "rest";
    const eligible = routines[id].filter((a) => !this.reason(id, a));
    if (ticks > 0 && this.pick([0, 1, 2, 3, 4, 5, 6, 7]) === 0)
      return this.pick(["cigarette", "iqos"] as const);
    return this.pick(eligible.length ? eligible : ["balcony" as const]);
  }
  tick(ticks: number, resting: (id: CharacterId) => boolean) {
    if (ticks % tuning.fatigueStep) return;
    const increment = gameClock(ticks).phase === "Night" ? 2 : 1;
    for (const id of characterIds)
      if (!resting(id))
        this.fatigue[id] = Math.min(100, this.fatigue[id] + increment);
  }
  complete(id: CharacterId, a: ActivityId) {
    switch (a) {
      case "jelly_eat":
      case "snack":
        this.dishes = Math.min(tuning.maxMess, this.dishes + 1);
        this.clutter = Math.min(tuning.maxMess, this.clutter + 1);
        break;
      case "dishes":
        this.dishes = Math.max(0, this.dishes - 1);
        break;
      case "clean":
        this.clutter = Math.max(0, this.clutter - 1);
        break;
      case "rest":
        this.fatigue[id] = Math.max(0, this.fatigue[id] - tuning.restRecovery);
        break;
      case "balcony":
        this.fatigue[id] = Math.max(0, this.fatigue[id] - 8);
        break;
      case "setup_ps4":
        this.ps4Ready = this.tvReady && this.ps4Owned;
        break;
      case "setup_tv":
        this.tvReady = this.tvOwned;
        break;
    }
  }
}
