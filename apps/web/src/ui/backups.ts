import { ApiFailure } from "../api/client";
import { type PlayerSave, progression } from "../api/progression";

import { accountCopy, fa } from "../i18n/interface";
import type { ProgressData } from "../persistence/progress";

export class BackupControls {
  private owner: string | null = null;
  private busy = false;
  private pending?: PlayerSave;
  private message = "";
  constructor(
    private readonly root: HTMLElement,
    private readonly data: ProgressData,
    private readonly capture: () => PlayerSave["payload"],
    private readonly restore: (payload: PlayerSave["payload"]) => boolean,
    private readonly saveLocal: () => Promise<void>,
  ) {}
  setOwner(owner: string | null) {
    if (owner === this.owner) return;
    this.owner = owner;
    this.pending = undefined;
    this.message = "";
    this.render();
  }
  private async run(action: (owner: string) => Promise<void>) {
    if (this.busy || !this.owner) return;
    const owner = this.owner;
    this.busy = true;
    this.message = fa.ContactingTheLocalServer;
    this.render();
    try {
      await action(owner);
    } catch (err) {
      if (this.owner === owner)
        this.message =
          err instanceof ApiFailure
            ? err.message
            : fa.BackupUnavailableTryAgain;
    } finally {
      this.busy = false;
      this.render();
    }
  }
  private async write(owner: string) {
    await this.saveLocal();
    const expected =
      this.data.backup?.owner === owner ? this.data.backup.version : 0;
    const remote = await progression.putSave(owner, {
      expected_version: expected,
      schema_version: 1,
      payload: this.capture(),
    });
    if (owner !== this.owner) return;
    this.data.backup = { owner, version: remote.version };
    await this.saveLocal();
    this.message = accountCopy.backedUp(remote.version);
  }
  private async read(owner: string) {
    const remote = await progression.getSave(owner);
    if (owner !== this.owner) return;
    this.pending = remote;
    this.message = accountCopy.restore(remote.version, remote.updated_at);
  }
  private async apply(owner: string) {
    const remote = this.pending;
    if (!remote) return;
    await this.saveLocal();
    if (owner !== this.owner) return;
    if (remote.schema_version !== 1 || !this.restore(remote.payload)) {
      this.pending = undefined;
      this.message = fa.ThisBackupIsIncompatibleWithTheCurrentApartment;
      return;
    }
    this.pending = undefined;
    this.data.backup = { owner, version: remote.version };
    await this.saveLocal();
    this.message = accountCopy.restored(remote.version);
  }
  private render() {
    this.root.hidden = !this.owner;
    this.root.replaceChildren();
    if (!this.owner) return;
    const button = (label: string, onClick: () => void) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.disabled = this.busy;
      b.onclick = onClick;
      this.root.append(b);
    };
    if (this.pending) {
      button(
        fa.ReplaceLocalApartment,
        () => void this.run((owner) => this.apply(owner)),
      );
      button(fa.KeepLocalApartment, () => {
        this.pending = undefined;
        this.message = fa.LocalApartmentKept;
        this.render();
      });
    } else {
      button(
        fa.BackUpApartment,
        () => void this.run((owner) => this.write(owner)),
      );
      button(
        fa.RestoreBackup,
        () => void this.run((owner) => this.read(owner)),
      );
    }
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    status.textContent = this.message;
    this.root.append(status);
  }
}
