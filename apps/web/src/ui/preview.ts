import { characters } from "../../../../assets/manifests/characters";
import {
  type CharacterId,
  characterIds,
} from "../game/config/character-assets";

function element<T extends HTMLElement = HTMLElement>(selector: string) {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing page element ${selector}`);
  return node;
}

export function showAssetError() {
  element("#art-status").textContent =
    "Preview unavailable. Check the asset files and reload.";
}

export function showRoster(select: (id: CharacterId) => void) {
  const roster = element("#roster");
  const buttons = new Map<CharacterId, HTMLButtonElement>();
  function choose(id: CharacterId) {
    const asset = characters[id];
    select(id);
    element("#name").textContent = asset.name;
    element("#art-status").textContent =
      asset.art.kind === "placeholder"
        ? "Temporary letter tile"
        : "Approved spritesheet";
    for (const [key, button] of buttons)
      button.setAttribute("aria-pressed", String(key === id));
  }
  for (const id of characterIds) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = characters[id].name;
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
    status.textContent = "Checking…";
    status.textContent = (await check()) ? "Ready" : "Unavailable";
    retry.disabled = false;
  }
  retry.addEventListener("click", refresh);
  void refresh();
}
