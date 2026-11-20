import { characters } from "../../../../assets/manifests/characters";
import {
  type CharacterId,
  characterIds,
  clipKey,
} from "../game/config/character-assets";
import { directions, names, poses } from "../i18n/game";
import { fa } from "../i18n/interface";

function element<T extends HTMLElement = HTMLElement>(selector: string) {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing page element ${selector}`);
  return node;
}

export function showAssetError() {
  element("#art-status").textContent =
    fa.PreviewUnavailableCheckTheAssetFilesAndReload;
}

export function showRoster(select: (id: CharacterId, key: string) => void) {
  const roster = element("#roster");
  const buttons = new Map<CharacterId, HTMLButtonElement>();
  const motion = element<HTMLSelectElement>("#preview-motion");
  let current: CharacterId = characterIds[0];
  motion.addEventListener("change", () => select(current, motion.value));
  function choose(id: CharacterId) {
    const asset = characters[id];
    const previous = motion.selectedOptions[0]?.text;
    current = id;
    motion.replaceChildren();
    for (const clip of asset.art.animations) {
      const title =
        (poses[clip.action] ?? poses.interact) +
        " · " +
        directions[clip.direction];
      const opt = new Option(title, clipKey(id, clip));
      motion.add(opt);
      if (
        previous === title ||
        (!previous && clip.action === "idle" && clip.direction === "south")
      )
        opt.selected = true;
    }
    motion.disabled = false;
    select(id, motion.value);
    element("#name").textContent = names[id];
    element("#art-status").textContent =
      asset.art.kind === "placeholder"
        ? fa.TemporaryCharacterSprite
        : fa.ApprovedSpritesheet;
    for (const [key, button] of buttons)
      button.setAttribute("aria-pressed", String(key === id));
  }
  for (const id of characterIds) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = names[id];
    button.addEventListener("click", () => choose(id));
    buttons.set(id, button);
    roster.append(button);
  }
  choose(characterIds[0]);
}

export function showConnection(check: () => Promise<boolean>) {
  const retry = element<HTMLButtonElement>("#retry");
  const status = element("#connection");
  async function refresh() {
    retry.disabled = true;
    status.textContent = fa.Checking;
    status.textContent = (await check()) ? fa.Ready : fa.Unavailable;
    retry.disabled = false;
  }
  retry.addEventListener("click", refresh);
  void refresh();
}
