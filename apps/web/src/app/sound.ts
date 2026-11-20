import { ApartmentAudio } from "../audio/apartment-audio";
import type { ApartmentSession } from "../game/systems/session";
import { showSoundControls } from "../ui/sound";

export function mountApartmentSound(
  panel: HTMLDetailsElement,
  world: ApartmentSession,
  inputs: HTMLElement[],
) {
  const audio = new ApartmentAudio();
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  function start() {
    void audio.activate().then(() => {
      // The first request may have arrived before a gesture unlocked audio.
      const r = world.request;
      if (r?.status === "pending") audio.notice(r.id, "pending");
    });
  }
  showSoundControls(panel, audio, start, listeners.signal);
  world.onRequestNotice = (id, status) => audio.notice(id, status);
  world.onMusicChoice = (play) => audio.setTrackEnabled(play);
  for (const input of inputs) {
    input.addEventListener("click", start, options);
    input.addEventListener("keydown", start, options);
  }
  document.addEventListener(
    "visibilitychange",
    () => audio.setVisible(!document.hidden),
    options,
  );
  window.addEventListener("pagehide", () => audio.setVisible(false), options);
  window.addEventListener(
    "pageshow",
    () => audio.setVisible(!document.hidden),
    options,
  );
  return () => {
    listeners.abort();
    world.onRequestNotice = undefined;
    world.onMusicChoice = undefined;
    audio.dispose();
    panel.hidden = true;
  };
}
