import Phaser from "phaser";
import { characters } from "../../../../assets/manifests/characters";
import { apartmentOwner } from "../api/accounts";
import { onAccountChange } from "../api/client";
import { apartment } from "../game/map/apartment";
import { ApartmentScene } from "../game/scenes/apartment";
import { ApartmentSession } from "../game/systems/session";
import { fa } from "../i18n/interface";
import { backup, loadBackup } from "../persistence/backup";
import { type Checkpoint, restore, snapshot } from "../persistence/checkpoint";
import { LocalSave } from "../persistence/local";
import {
  emptyProgress,
  type ProgressData,
  validProgress,
} from "../persistence/progress";
import { BackupControls } from "../ui/backups";
import { ProgressPanel } from "../ui/progression";
import { ResidentControls } from "../ui/residents";
import { mountApartmentSound } from "./sound";
import "../ui/style.css";
import "../ui/apartment.css";

const toggle = document.querySelector<HTMLButtonElement>("#geometry");
const status = document.querySelector<HTMLElement>("#map-status");
const legend = document.querySelector<HTMLElement>("#map-legend");
const stage = document.querySelector<HTMLElement>("#apartment");
const residents = document.querySelector<HTMLElement>("#residents");
if (!toggle || !status || !legend || !stage || !residents)
  throw new Error("Missing apartment controls");

function showError() {
  if (status) status.textContent = fa.TheMapCouldNotLoadReloadToTryAgain;
}

try {
  let panel: ProgressPanel | undefined;
  const world = new ApartmentSession((e) => panel?.complete(e));
  type Saved = { checkpoint: Checkpoint; progress: ProgressData };
  let storage: LocalSave<Saved> | undefined,
    data = emptyProgress();
  const backups = document.querySelector<HTMLElement>("#backups");
  let backupControls: BackupControls | undefined;
  const notice = document.querySelector("#save-notice");
  const shop = document.querySelector<HTMLElement>("#progression");
  if (!notice || !shop || !backups) throw new Error("Missing save controls");
  function applyPlayer(player: ProgressData["player"]) {
    backupControls?.setOwner(player?.player_id ?? null);
    world.house.tvOwned = !!player?.unlocks.includes("object.tv");
    world.house.ps4Owned = !!player?.unlocks.includes("activity.ps4");
    if (!world.house.tvOwned) world.house.tvReady = false;
    if (!world.house.ps4Owned) world.house.ps4Ready = false;
  }
  try {
    onAccountChange(() => location.reload());
    const owner = await apartmentOwner();
    storage = await LocalSave.open<Saved>(owner);
    if (owner) await storage.adoptGuest(owner);
    const saved = await storage.read();
    if (saved !== undefined) {
      if (!validProgress(saved.progress))
        throw new Error("Unsupported local save");
      data = saved.progress;
      applyPlayer(data.player);
      if (!restore(world, saved.checkpoint))
        throw new Error("Unsupported local save");
    }
  } catch {
    storage = undefined;
    data = emptyProgress();
    applyPlayer(null);
    notice.textContent = fa.LocalSaveUnavailableThisSessionWillRunInMemory;
  }
  async function save() {
    if (!storage) throw new Error(fa.LocalSaveUnavailable);
    try {
      await storage.save({ checkpoint: snapshot(world), progress: data });
    } catch (e) {
      storage = undefined;
      if (notice)
        notice.textContent =
          e instanceof Error &&
          e.message === fa.AnotherTabSavedNewerProgressReloadToContinueSaving
            ? e.message
            : fa.LocalSaveUnavailable;
      throw e;
    }
  }
  if (storage) {
    backupControls = new BackupControls(
      backups,
      data,
      () => backup(world),
      (payload) => loadBackup(world, payload),
      save,
    );
    backupControls.setOwner(data.player?.player_id ?? null);
    panel = new ProgressPanel(shop, data, save, applyPlayer);
    void panel.refresh();
    const checkpoint = () => {
      if (storage) void save().catch(() => {});
    };
    world.onActivitySettled = checkpoint;
    window.setInterval(() => {
      if (!document.hidden) checkpoint();
    }, 1000);
    window.addEventListener("pagehide", checkpoint);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) checkpoint();
    });
  }
  let disposeSound: (() => void) | undefined;
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: stage,
    backgroundColor: "#ffffff",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      expandParent: false,
      width: apartment.width,
      height: apartment.height,
    },
    audio: { noAudio: true },
    callbacks: {
      postBoot(game) {
        const observer = new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) game.scale.setParentSize(width, height);
        });
        observer.observe(stage);
        game.events.once(Phaser.Core.Events.DESTROY, () => {
          observer.disconnect();
          disposeSound?.();
        });
      },
    },
    banner: false,
    scene: new ApartmentScene(
      world,
      (setVisible) => {
        status.hidden = true;
        const note = document.querySelector<HTMLElement>("#marker-note");
        if (note)
          note.hidden = !Object.values(characters).some(
            (c) => c.art.kind === "placeholder",
          );
        toggle.disabled = false;
        toggle.addEventListener("click", () => {
          const show = toggle.getAttribute("aria-pressed") !== "true";
          toggle.setAttribute("aria-pressed", String(show));
          legend.hidden = !show;
          setVisible(show);
        });
        const sound =
          document.querySelector<HTMLDetailsElement>("#sound-settings");
        if (sound)
          disposeSound = mountApartmentSound(sound, world, [stage, residents]);
        return new ResidentControls(world, residents, stage);
      },
      showError,
    ),
  });
  if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
} catch {
  showError();
}
