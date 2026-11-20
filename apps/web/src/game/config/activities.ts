import type { CharacterId } from "./character-assets.ts";
export interface Activity {
  label: string;
  doing: string;
  anchor: string;
  objects: string[];
  ticks: number;
}
export const activities = {
  moonwalk: {
    label: "Moonwalk",
    doing: "Moonwalking",
    anchor: "living_room_center",
    objects: [],
    ticks: 40,
  },
  boxing: {
    label: "Friendly boxing",
    doing: "Sparring",
    anchor: "living_room_center",
    objects: [],
    ticks: 45,
  },
  jelly_prepare: {
    label: "Prepare jelly",
    doing: "Preparing jelly",
    anchor: "kitchen_counter_front",
    objects: [],
    ticks: 24,
  },
  jelly_store: {
    label: "Put jelly in the fridge",
    doing: "Putting jelly away",
    anchor: "fridge_front",
    objects: [],
    ticks: 8,
  },
  jelly_eat: {
    label: "Eat jelly",
    doing: "Eating jelly",
    anchor: "fridge_front",
    objects: [],
    ticks: 20,
  },
  cigarette: {
    label: "Cigarette",
    doing: "Smoking on the balcony",
    anchor: "balcony_center",
    objects: [],
    ticks: 36,
  },
  iqos: {
    label: "IQOS",
    doing: "Using IQOS on the balcony",
    anchor: "balcony_center",
    objects: [],
    ticks: 36,
  },
  guest_wc: {
    label: "Use the guest WC",
    doing: "Using the guest WC",
    anchor: "guest_wc_inside",
    objects: [],
    ticks: 32,
  },
  music_play: {
    label: "Play Hall Lights",
    doing: "Starting the music",
    anchor: "living_room_center",
    objects: [],
    ticks: 10,
  },
  music_quiet: {
    label: "Pause music",
    doing: "Pausing the music",
    anchor: "living_room_center",
    objects: [],
    ticks: 10,
  },
  snack: {
    label: "Get a snack",
    doing: "Getting a snack",
    anchor: "fridge_front",
    objects: ["kitchen.fridge"],
    ticks: 25,
  },
  dishes: {
    label: "Wash dishes",
    doing: "Washing dishes",
    anchor: "sink_front",
    objects: ["kitchen.west_counter"],
    ticks: 55,
  },
  clean: {
    label: "Clean the counter",
    doing: "Cleaning the counter",
    anchor: "kitchen_counter_front",
    objects: ["kitchen.south_counter", "kitchen.hall_counter"],
    ticks: 45,
  },
  balcony: {
    label: "Take a balcony break",
    doing: "Taking a balcony break",
    anchor: "balcony_center",
    objects: ["balcony.plant_west", "balcony.plant_east"],
    ticks: 55,
  },
  rest: {
    label: "Rest",
    doing: "Resting",
    anchor: "master_bed_side",
    objects: ["bedroom.bed"],
    ticks: 60,
  },
  chat: {
    label: "Chat with a friend",
    doing: "Chatting",
    anchor: "living_room_center",
    objects: ["living.sofa_south", "living.sofa_north"],
    ticks: 50,
  },
  dance: {
    label: "Dance",
    doing: "Dancing",
    anchor: "living_room_center",
    objects: [],
    ticks: 45,
  },
  tv: {
    label: "Watch TV",
    doing: "Watching TV",
    anchor: "tv_front",
    objects: ["living.tv_stand"],
    ticks: 60,
  },
  ps4: {
    label: "Play PS4",
    doing: "Playing PS4",
    anchor: "tv_front",
    objects: ["living.tv_stand"],
    ticks: 70,
  },
  setup_ps4: {
    label: "Set up PS4",
    doing: "Connecting the PS4",
    anchor: "tv_front",
    objects: ["living.tv_stand"],
    ticks: 60,
  },
  setup_tv: {
    label: "Set up TV",
    doing: "Connecting the TV",
    anchor: "tv_front",
    objects: ["living.tv_stand"],
    ticks: 60,
  },
} satisfies Record<string, Activity>;
export type ActivityId = keyof typeof activities;
export const behavior: Record<
  CharacterId,
  { patience: number; reaction: string }
> = {
  barbod: {
    patience: 300,
    reaction: "Barbod throws up his hands and stumbles.",
  },
  kavian: { patience: 450, reaction: "Kavian calls a dramatic house meeting." },
  mahan: { patience: 450, reaction: "Mahan waves both hands in protest." },
  parsa: {
    patience: 600,
    reaction: "Parsa gives everyone the silent treatment.",
  },
  parham: {
    patience: 300,
    reaction: "Parham breaks into an exasperated belly laugh.",
  },
};
export const requestTuning = {
  firstTick: 15,
  jellyCoolingTicks: 55,
  cooldown: 90,
  reactionTicks: 45,
};

// Development pacing in fixed simulation ticks. Duplicate entries are choice weights.
export const routines: Record<CharacterId, ActivityId[]> = {
  barbod: ["dance", "dance", "snack", "chat"],
  kavian: ["dishes", "dishes", "clean", "snack", "chat"],
  mahan: ["rest", "dance", "chat", "snack"],
  parsa: ["balcony", "balcony", "chat", "tv"],
  parham: ["snack", "dance", "ps4", "tv", "chat"],
};
export const pacing = {
  dayTicks: 3600,
  evening: 1900,
  night: 2650,
  ambientDelay: 170,
  ambientStagger: 32,
  guestWait: 100,
};

export const householdTuning = {
  initialDishes: 2,
  initialClutter: 1,
  maxMess: 8,
  fatigueStep: 30,
  restRecovery: 35,
  restThreshold: 35,
};
