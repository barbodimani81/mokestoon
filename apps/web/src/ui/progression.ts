import { ApiFailure } from "../api/client";
import { type Catalog, type Player, progression } from "../api/progression";
import type { Completion } from "../game/systems/session";
import { num } from "../i18n/game";
import { fa, shopCopy as shop } from "../i18n/interface";
import type { ProgressData } from "../persistence/progress";
import { icon } from "./icons";
import { Popup } from "./popup";

export class ProgressPanel {
  private popup = new Popup(shop.back);
  private busy = false;
  private pendingDuringSync = false;
  private catalog?: Catalog;
  private notice = "";
  private verified = false;
  private root: HTMLElement;
  constructor(
    root: HTMLElement,
    private data: ProgressData,
    private save: () => Promise<void>,
    private onPlayer: (p: Player | null) => void,
  ) {
    this.root = root;
    window.addEventListener("online", () => void this.refresh());
  }
  private setPlayer(player: Player) {
    this.data.player = player;
    this.verified = true;
    this.onPlayer(player);
  }
  async refresh() {
    if (this.busy) return;
    await this.run(async () => {
      this.catalog = await progression.catalog();
      const link = document.querySelector<HTMLElement>("#account-link");
      if (link) link.hidden = !this.catalog.email_accounts;
      try {
        this.setPlayer(await progression.player());
      } catch (err) {
        if (!(err instanceof ApiFailure && err.status === 401)) throw err;
        if (!this.catalog.development) throw err;
        const guest = async () => {
          await progression.session();
          this.setPlayer(await progression.player());
        };
        if (navigator.locks)
          await navigator.locks.request("f7-local-session", guest);
        else await guest();
      }
      await this.save();
      await this.flush();
    });
  }
  complete(e: Completion) {
    const owner = this.data.player?.player_id;
    if (!owner) return;
    this.data.pending.push({
      owner,
      event: {
        event_id: e.eventId,
        request_id: e.requestId,
        activity_id: e.activity,
        character_id: e.friend,
        duration_ticks: e.duration,
      },
    });
    this.render();
    if (!this.busy)
      void this.run(async () => {
        await this.save();
        await this.flush();
      });
    else {
      this.pendingDuringSync = true;
      void this.save().catch(() => {
        this.notice = fa.LocalSaveUnavailable;
        this.render();
      });
    }
  }
  private async flush() {
    const owner = this.data.player?.player_id;
    if (!owner) return;
    const outstanding = this.data.pending.filter((e) => e.owner === owner);
    for (let i = 0; i < outstanding.length; i += 32) {
      const batch = outstanding.slice(i, i + 32).map((e) => e.event);
      const r = await progression.sync(owner, batch);
      if (r.player.player_id !== owner) throw new Error("Player changed");
      const gained = r.outcomes.reduce((n, o) => n + (o.amount_faaz ?? 0), 0);
      this.setPlayer(r.player);
      this.notice = gained > 0 ? shop.reward(gained) : shop.confirmed;
      const done = new Set(r.outcomes.map((o) => o.event_id));
      this.data.pending = this.data.pending.filter(
        (p) => p.owner !== owner || !done.has(p.event.event_id),
      );
      if (r.outcomes.some((o) => o.status !== "accepted"))
        this.notice = fa.SomeRewardsWereDeclinedByTheServer;
      await this.save();
    }
    const purchase = this.data.purchase;
    if (purchase?.owner === owner) {
      try {
        this.setPlayer(await progression.purchase(owner, purchase.body));
        this.notice = shop.purchased;
      } catch (err) {
        if (!(err instanceof ApiFailure && err.status === 422)) throw err;
        this.notice = err.message;
      }
      this.data.purchase = null;
      await this.save();
    }
  }
  private async run(fn: () => Promise<void>) {
    this.busy = true;
    this.notice = "";
    this.render();
    try {
      await fn();
      while (this.pendingDuringSync) {
        this.pendingDuringSync = false;
        await this.save();
        await this.flush();
      }
    } catch (err) {
      this.verified = false;
      this.notice =
        err instanceof ApiFailure
          ? err.message
          : fa.ConnectionOrLocalStorageUnavailable;
    } finally {
      this.busy = false;
      this.render();
    }
  }
  private button(label: string, fn: () => Promise<void>, disabled = false) {
    const b = document.createElement("button");
    b.textContent = label;
    b.disabled = this.busy || disabled;
    b.onclick = () => void this.run(fn);
    this.root.append(b);
  }
  private openShop() {
    const player = this.data.player;
    if (!player || !this.catalog) return;
    this.popup.open(shop.store);
    for (const item of this.catalog.unlocks) {
      const name = shop.items[item.id] ?? shop.item;
      const owned = player.unlocks.includes(item.id);
      const why = owned
        ? shop.owned
        : item.prerequisites.some((id) => !player.unlocks.includes(id))
          ? shop.needTV
          : player.faaz < item.cost_faaz
            ? shop.insufficient
            : !this.verified
              ? shop.offline
              : "";
      const pick = document.createElement("button");
      pick.dataset.unlock = item.id;
      pick.append(
        icon(item.id === "object.tv" ? "tv" : "ps4"),
        name +
          " · " +
          num(item.cost_faaz) +
          " " +
          shop.faaz +
          (why ? ` · ${why}` : ""),
      );
      pick.onclick = () => {
        this.popup.open(name);
        const desc = document.createElement("p");
        desc.textContent = shop.descriptions[item.id] ?? name;
        const prereqs = document.createElement("p");
        prereqs.textContent = shop.needs(
          item.prerequisites.map((id) => shop.items[id] ?? shop.item),
        );
        this.popup.body.append(desc, prereqs);
        this.popup.body.append(shop.detail(item.cost_faaz, player.faaz, why));
        const confirm = document.createElement("button");
        confirm.textContent = shop.buy;
        confirm.disabled = !!why || !!this.data.purchase || this.busy;
        confirm.onclick = () => {
          this.popup.close();
          void this.run(async () => {
            this.data.purchase = {
              owner: player.player_id,
              body: {
                idempotency_key: crypto.randomUUID(),
                unlock_id: item.id,
              },
            };
            await this.save();
            await this.flush();
          });
        };
        this.popup.body.append(confirm);
        const list = document.createElement("button");
        list.textContent = shop.list;
        list.onclick = () => this.openShop();
        this.popup.body.append(list);
      };
      this.popup.body.append(pick);
    }
  }
  private render() {
    const { player, pending } = this.data;
    this.root.hidden = false;

    this.root.replaceChildren();
    const text = document.createElement("span");
    text.textContent = this.catalog ? fa.DevelopmentPrices : shop.offline;
    this.root.append(text);
    if (!player) {
      const retry = document.createElement("button");
      retry.textContent = fa.Retry;
      retry.disabled = this.busy;
      retry.onclick = () => void this.refresh();
      this.root.append(retry);
    } else {
      const balances = document.createElement("strong");
      const count = pending.filter((p) => p.owner === player.player_id).length;
      balances.textContent = shop.balance(
        player.faaz,
        player.f7_score,
        count,
        this.verified,
      );
      this.root.append(balances);
      const open = document.createElement("button");
      open.textContent = shop.store;
      open.disabled = this.busy || !this.catalog;
      open.onclick = () => this.openShop();
      this.root.append(open);
      this.button(fa.Sync, async () => {
        this.catalog = await progression.catalog();
        this.setPlayer(await progression.player());
        await this.flush();
        await this.save();
      });
    }
    if (this.notice) {
      const n = document.createElement("span");
      n.setAttribute("role", "status");
      n.textContent = this.notice;
      this.root.append(n);
    }
  }
}
