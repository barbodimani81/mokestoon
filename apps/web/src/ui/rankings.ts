import { ApiFailure, json } from "../api/client";
import type { components } from "../api/schema";
import { num } from "../i18n/game";
import { fa } from "../i18n/interface";

export class RankingsPanel {
  private owner: string | null = null;
  private cursor = "";
  private generation = 0;
  private readonly message: HTMLElement;
  private readonly table: HTMLTableElement;
  private readonly rows: HTMLTableSectionElement;
  private readonly more: HTMLButtonElement;
  constructor(private readonly root: HTMLDetailsElement) {
    const message = root.querySelector<HTMLElement>("[data-message]"),
      table = root.querySelector("table"),
      rows = table?.tBodies[0],
      more = root.querySelector("button");
    if (!message || !table || !rows || !more)
      throw new Error("Missing leaderboard controls");
    this.message = message;
    this.table = table;
    this.rows = rows;
    this.more = more;
    more.onclick = () => void this.load();
    root.ontoggle = () => {
      this.clear();
      if (root.open) void this.load();
    };
    window.addEventListener("offline", () => {
      this.clear();
      this.message.textContent = fa.ConnectToTheInternetToSeeRankings;
    });
    window.addEventListener("online", () => {
      if (root.open) void this.load();
    });
  }
  setOwner(id: string | null) {
    if (this.owner === id) return;
    this.owner = id;
    this.clear();
    this.root.open = false;
    this.root.hidden = !id;
  }
  private clear() {
    this.generation++;
    this.cursor = "";
    this.rows.replaceChildren();
    this.table.hidden = true;
    this.more.hidden = true;
    this.more.disabled = false;
    this.message.textContent = "";
  }
  private async load() {
    if (!this.owner || !this.root.open) return;
    const call = ++this.generation;
    this.more.disabled = true;
    this.message.textContent = fa.LoadingStandings;
    try {
      const params = new URLSearchParams({ period: "all_time", limit: "25" });
      if (this.cursor) params.set("cursor", this.cursor);
      const data = await json<components["schemas"]["Standings"]>(
        `leaderboard?${params}`,
        undefined,
        this.owner,
      );
      if (call !== this.generation) return;
      if (!this.cursor) this.rows.replaceChildren();
      for (const entry of data.entries) {
        const row = this.rows.insertRow();
        for (const value of [
          entry.rank,
          entry.display_name ?? fa.UnnamedPlayer,
          entry.f7_score,
        ])
          row.insertCell().textContent =
            typeof value === "number" ? num(value) : value;
      }
      this.table.hidden = this.rows.rows.length === 0;
      this.message.textContent = this.table.hidden ? fa.NoRankedPlayersYet : "";
      this.cursor = data.next_cursor ?? "";
      this.more.textContent = fa.MoreRankings;
      this.more.hidden = !this.cursor;
    } catch (err) {
      if (call !== this.generation) return;
      this.clear();
      this.message.textContent =
        err instanceof ApiFailure
          ? err.message
          : fa.ConnectToTheInternetToSeeRankings;
      const retry = !(
        err instanceof ApiFailure &&
        (err.status === 401 || err.status === 403)
      );
      this.more.textContent = fa.RefreshRankings;
      this.more.hidden = !retry;
    } finally {
      if (call === this.generation) this.more.disabled = false;
    }
  }
}
