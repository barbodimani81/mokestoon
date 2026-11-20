import { activities } from "../game/config/activities";
import { activityIcon } from "../game/config/activity-icons";
import {
  type CharacterId,
  characterIds,
} from "../game/config/character-assets";
import { type StationId, stationIds, stations } from "../game/config/stations";
import { apartment, type Point } from "../game/map/apartment";
import { markerColors } from "../game/rendering/resident-labels";
import type { ApartmentSession, FriendRequest } from "../game/systems/session";
import {
  actionNames,
  gameCopy as c,
  names,
  num,
  reactions,
  reasons,
  stationNames,
} from "../i18n/game";
import { icon } from "./icons";
import { Popup } from "./popup";

function button(text: string, click: () => void) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.onclick = click;
  return b;
}
function say(el: HTMLElement, value: string) {
  if (el.textContent !== value) el.textContent = value;
}
function title(r: FriendRequest) {
  if (r.activity === "jelly_prepare") return c.jelly;
  if (r.activity === "cigarette") return c.smoke;
  return actionNames[r.activity];
}
export class ResidentControls {
  selected: CharacterId | null = null;
  private popup = new Popup(c.back);
  private help = new Popup(c.next);
  private overlay = document.createElement("div");
  private tags = new Map<CharacterId, HTMLButtonElement>();
  private badges = new Map<StationId, HTMLButtonElement>();
  private bubble = button("", () => {
    if (this.world.request) this.select(this.world.request.friend);
  });
  private status = document.createElement("output");
  private requestText = button("", () => {
    if (this.world.request) this.select(this.world.request.friend);
  });
  private summary = document.createElement("span");
  private cancel = button(c.cancel, () => {
    this.selected = null;
    this.message = "";
    this.refresh();
  });
  private popupRequest: string | undefined;
  private message = "";
  paused = false;
  private stop = button(c.stop, () => {
    if (this.selected) this.world.interrupt(this.selected);
    this.refresh();
  });
  private lastFriend: CharacterId | null = null;
  private bubbleText = document.createElement("span");
  private bubbleAction = "";
  constructor(
    private world: ApartmentSession,
    root: HTMLElement,
    stage: HTMLElement,
  ) {
    this.overlay.className = "map-overlay";
    stage.append(this.overlay);
    for (const id of characterIds) {
      const b = button(names[id], () => this.select(id));
      b.dataset.friend = id;
      b.style.backgroundColor = markerColors[id];
      this.tags.set(id, b);
      this.overlay.append(b);
    }
    this.bubble.append(this.bubbleText);
    this.bubble.className = "request-bubble";
    this.overlay.append(this.bubble);
    for (const id of stationIds) {
      const b = button("", () => this.openStation(id));
      b.append(icon(stations[id].icon));
      b.dataset.station = id;
      b.title = stationNames[id];
      b.setAttribute("aria-label", stationNames[id]);
      this.badges.set(id, b);
      this.overlay.append(b);
    }
    this.status.id = "command-status";
    this.requestText.id = "request-detail";
    this.summary.id = "household";
    const help = button(c.help, () => this.showHelp());
    const pause = button(c.pause, () => {
      this.paused = !this.paused;
      pause.textContent = this.paused ? c.resume : c.pause;
      pause.setAttribute("aria-pressed", String(this.paused));
      this.refresh();
    });
    root.append(
      this.status,
      this.cancel,
      this.stop,
      this.requestText,
      this.summary,
      help,
      pause,
    );
    try {
      if (!localStorage.getItem("f7.tutorial.station")) {
        const intro = document.createElement("aside");
        intro.className = "tutorial";
        intro.append(
          c.tutorial,
          button(c.next, () => {
            intro.remove();
            try {
              localStorage.setItem("f7.tutorial.station", "1");
            } catch {}
          }),
        );
        root.append(intro);
      }
    } catch {}
    this.refresh();
  }
  private showHelp() {
    this.help.open(c.welcome);
    this.help.body.textContent = c.tutorial;
  }
  select(id: CharacterId) {
    this.lastFriend = null;
    this.selected = id;
    this.message = "";
    this.refresh();
  }
  openStation(id: StationId) {
    const who = this.selected;
    if (!who) {
      this.message = c.stationFirst;
      this.refresh();
      return;
    }
    const options = this.world.options(who, id);
    if (!options.some((a) => !this.world.reason(who, a))) {
      this.message =
        (options.length && reasons[this.world.reason(who, options[0])]) ||
        c.unavailable;
      this.refresh();
      return;
    }
    this.popupRequest =
      this.world.request?.friend === who
        ? `${this.world.request.id}.${this.world.request.status}`
        : undefined;
    this.popup.open(`${names[who]} · ${stationNames[id]}`);
    for (const a of options) {
      const reason = this.world.reason(who, a),
        b = button("", () => {
          if (!this.world.command(who, id, a)) {
            this.message = c.blocked;
            this.popup.close();
            this.refresh();
            return;
          }
          this.message = "";
          this.lastFriend = who;
          this.selected = null;
          this.popup.close();
          this.refresh();
        });
      b.dataset.action = a;
      b.disabled = !!reason;
      b.append(icon(activityIcon(a)), actionNames[a]);
      if (reason) b.append(` · ${reasons[reason] ?? c.unavailable}`);
      this.popup.body.append(b);
    }
    this.popup.body.querySelector<HTMLButtonElement>("button:enabled")?.focus();
  }
  mapTap(p: Point) {
    const id = stationIds.find((key) =>
      apartment.obstacles.some(
        (r) =>
          r.name === stations[key].object &&
          p.x >= r.x &&
          p.x <= r.x + r.width &&
          p.y >= r.y &&
          p.y <= r.y + r.height,
      ),
    );
    if (id) this.openStation(id);
  }
  // Phaser supplies displayed coordinates after crowd layout. DOM hit targets use
  // those same positions under keyboard, touch and mouse input.
  bounds(canvas: HTMLCanvasElement) {
    this.overlay.style.cssText = `left:${canvas.offsetLeft}px;top:${canvas.offsetTop}px;width:${canvas.clientWidth}px;height:${canvas.clientHeight}px`;
  }
  placeFriend(
    id: CharacterId,
    x: number,
    y: number,
    headX: number,
    headY: number,
  ) {
    this.place(this.tags.get(id), x, y);
    if (this.world.request?.friend === id)
      this.place(this.bubble, headX, headY);
  }
  placeStation(id: StationId, x: number, y: number) {
    this.place(this.badges.get(id), x, y);
  }
  private place(el: HTMLElement | undefined, x: number, y: number) {
    if (el)
      el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;
  }
  refresh() {
    const r = this.world.request,
      w = this.world,
      who = this.selected;
    if (
      this.popup.element.open &&
      this.popupRequest &&
      this.popupRequest !== `${r?.id}.${r?.status}`
    ) {
      this.popup.close();
      this.message = c.retry;
    }
    for (const [id, b] of this.tags)
      b.setAttribute("aria-pressed", String(who === id));
    for (const [id, b] of this.badges) {
      const active = !!who && w.options(who, id).some((a) => !w.reason(who, a));
      b.dataset.available = String(active);
      b.setAttribute("aria-disabled", String(!active));
      b.dataset.cooling = String(
        id === "station.food" && r?.status === "cooling",
      );
      b.dataset.ready = String(id === "station.food" && r?.status === "ready");
    }
    this.stop.hidden = !who || w.tasks.get(who)?.source !== "player";
    this.cancel.hidden = !who;
    this.requestText.hidden = !r;
    this.bubble.hidden = !r;
    if (r) {
      const seconds = num(Math.max(0, Math.ceil((r.deadline - w.ticks) / 10)));
      const state = {
        pending: title(r),
        accepted: c.walking,
        in_progress: c.working,
        cooling: c.waiting,
        ready: c.ready,
        expired: c.expired,
        completed: c.finished,
        cancelled: c.cancelled,
        failed: c.blocked,
      }[r.status];
      this.bubble.dataset.state = r.status;
      const short =
        r.status === "pending"
          ? r.activity === "cigarette"
            ? c.shortSmoke
            : title(r)
          : state;
      if (this.bubbleAction !== r.activity) {
        this.bubble.replaceChildren(
          icon(activityIcon(r.activity)),
          this.bubbleText,
        );
        this.bubbleAction = r.activity;
      }
      this.bubble.dataset.urgent = String(
        r.status === "pending" && r.deadline - w.ticks < 100,
      );
      say(this.bubbleText, short);
      this.bubble.title = `${names[r.friend]} · ${title(r)}`;
      say(
        this.requestText,
        names[r.friend] +
          " · " +
          (r.status === "pending"
            ? `${title(r)} · ${seconds} ${c.second}`
            : state +
              " · " +
              actionNames[w.tasks.get(r.friend)?.activity ?? r.activity]) +
          (w.reactions.has(r.friend) ? ` · ${reactions[r.friend]}` : ""),
      );
    } else say(this.requestText, "");
    const observed = who ?? this.lastFriend;
    const task = observed && w.tasks.get(observed);
    let feedback = who ? `${names[who]} · ${c.station}` : c.select;
    if (observed && w.movement.actor(observed).state === "blocked")
      feedback = c.blocked;
    if (task && observed) {
      const progress =
        task.stage === "performing"
          ? ` · ${num(Math.floor(100 * (1 - task.remaining / activities[task.activity].ticks)))}٪`
          : "";
      feedback = `${names[observed]} · ${task.stage === "approaching" ? c.walking : c.working} · ${actionNames[task.activity]}${progress}`;
    }
    say(this.status, this.paused ? c.paused : this.message || feedback);
    say(
      this.summary,
      c.days +
        " " +
        num(w.clock.day) +
        " · " +
        ({ Day: c.days, Evening: c.evening, Night: c.night }[w.clock.phase] ??
          "") +
        " · " +
        c.dishes +
        " " +
        num(w.house.dishes) +
        " · " +
        c.clutter +
        " " +
        num(w.house.clutter),
    );
  }
}
