import type { ActivityId } from "../game/config/activities.ts";
import type { CharacterId } from "../game/config/character-assets.ts";
import type { StationId } from "../game/config/stations.ts";

const digits = new Intl.NumberFormat("fa-IR", { useGrouping: false });
export const num = (value: number) => digits.format(value);
export const names: Record<CharacterId, string> = {
  barbod: "باربد",
  kavian: "کاویان",
  mahan: "ماهان",
  parsa: "پارسا",
  parham: "پرهام",
};
export const stationNames: Record<StationId, string> = {
  "station.food": "خوراکی",
  "station.cleaning": "نظافت",
  "station.entertainment": "سرگرمی",
  "station.music": "موسیقی",
  "station.sleep": "خواب",
  "station.wc": "دستشویی",
  "station.balcony": "بالکن",
};
export const actionNames: Record<ActivityId, string> = {
  moonwalk: "مون‌واک",
  boxing: "بوکس دوستانه",
  snack: "برداشتن خوراکی",
  dishes: "شستن ظرف‌ها",
  clean: "تمیز کردن پیشخوان",
  balcony: "استراحت در بالکن",
  rest: "استراحت روی تخت",
  chat: "گپ با دوست",
  dance: "رقص",
  tv: "تماشای تلویزیون",
  ps4: "بازی با پلی‌استیشن",
  setup_tv: "راه‌اندازی تلویزیون",
  setup_ps4: "راه‌اندازی پلی‌استیشن",
  jelly_prepare: "تهیه ژله",
  jelly_store: "گذاشتن ژله در یخچال",
  jelly_eat: "خوردن ژله",
  cigarette: "سیگار",
  iqos: "آیکوس",
  guest_wc: "استفاده از دستشویی مهمان",
  music_play: "پخش چراغ‌های هال",
  music_quiet: "قطع موسیقی",
};
export const gameCopy = {
  shortSmoke: "سیگار در بالکن",
  select: "یکی از دوست‌ها را انتخاب کن.",
  station: "حالا یک ایستگاه روشن را انتخاب کن.",
  cancel: "لغو انتخاب",
  back: "بازگشت",
  close: "بستن",
  unavailable: "این ایستگاه برای این درخواست در دسترس نیست.",
  busy: "این دوست مشغول است.",
  blocked: "راه بسته است؛ دوباره امتحان کن.",
  noItems: "الان کاری در این ایستگاه در دسترس نیست.",
  idle: "آزاد",
  walking: "در راه",
  working: "مشغول",
  waiting: "در یخچال",
  ready: "ژله آماده است",
  finished: "انجام شد",
  expired: "وقت تمام شد",
  cancelled: "لغو شد",
  retry: "دوباره انتخاب کن",
  second: "ثانیه",
  jelly: "ژله می‌خوام",
  smoke: "می‌خوام برم بالکن سیگار بکشم",
  days: "روز",
  pause: "مکث",
  resume: "ادامهٔ بازی",
  stop: "توقف کار",
  paused: "بازی متوقف است",
  evening: "عصر",
  night: "شب",
  dishes: "ظرف کثیف",
  clutter: "به‌هم‌ریختگی",
  fridge: "یخچال",
  stationFirst: "اول یکی از دوست‌ها را انتخاب کن.",
  help: "راهنمای بازی",
  tutorial:
    "روی دوستی که بالای سرش درخواست دارد بزن. ایستگاه روشن را انتخاب کن و از پنجرهٔ آن کاری را بردار. دوستت به آنجا می‌رود و کارش را انجام می‌دهد.",
  next: "متوجه شدم",
  available: "آماده",
  request: "درخواست",
  welcome: "چطور بازی کنم؟",
};

export const poses: Record<string, string> = {
  idle: "ایستادن",
  walk: "راه رفتن",
  interact: "انجام کار",
  rest: "استراحت",
  dance: "رقص",
  react: "واکنش",
  smoke: "سیگار",
  iqos: "آیکوس",
  carry: "حمل ژله",
  eat: "خوردن",
  happy: "شادی",
  moonwalk: "مون‌واک",
  boxing: "بوکس دوستانه",
  greet: "سلام دوستانه",
  signature: "حرکت ویژه",
  hug: "آغوش",
};
export const directions = {
  south: "جنوب",
  north: "شمال",
  east: "شرق",
  west: "غرب",
};
export const reactions: Record<CharacterId, string> = {
  barbod: "دست‌هایش را بالا برد و سکندری خورد.",
  kavian: "همه را به جلسه صدا زد.",
  mahan: "دست‌هایش را به اعتراض تکان داد.",
  parsa: "سکوت کرد.",
  parham: "با حرص زد زیر خنده.",
};
export const reasons: Record<string, string> = {
  busy: gameCopy.busy,
  "partner busy": "یار بوکس فعلاً آزاد نیست.",
  occupied: "دستشویی اشغال است.",
  "All dishes are clean": "همهٔ ظرف‌ها تمیزند.",
  "The counter is clean": "پیشخوان تمیز است.",
  "PS4 needs unlocking and setup": "پلی‌استیشن باید خریده و راه‌اندازی شود.",
  "TV needs unlocking and setup": "تلویزیون باید خریده و راه‌اندازی شود.",
  "Kavian sets up the unlocked TV":
    "کاویان تلویزیون خریداری‌شده را راه‌اندازی می‌کند.",
  "Kavian sets up the PS4 after the TV":
    "کاویان پس از تلویزیون، پلی‌استیشن خریداری‌شده را وصل می‌کند.",
};
