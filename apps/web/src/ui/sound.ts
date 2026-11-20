import type { ApartmentAudio } from "../audio/apartment-audio";
import type { Channel } from "../audio/preferences";
import { fa } from "../i18n/interface";

export function showSoundControls(
  panel: HTMLDetailsElement,
  audio: ApartmentAudio,
  start: () => void,
  signal: AbortSignal,
) {
  const toggle = panel.querySelector<HTMLButtonElement>("[data-sound-toggle]");
  const retry = panel.querySelector<HTMLButtonElement>("[data-retry-music]");
  const track = panel.querySelector<HTMLElement>("[data-track]");
  const status = panel.querySelector<HTMLElement>("[data-sound-status]");
  if (!toggle || !retry || !track || !status)
    throw new Error("Missing audio controls");
  track.textContent = fa.HallLights;
  const options = { signal };
  for (const channel of ["master", "music", "alerts"] satisfies Channel[]) {
    const slider = panel.querySelector<HTMLInputElement>(
      `input[name="${channel}"]`,
    );
    if (!slider) throw new Error(`Missing ${channel} slider`);
    slider.value = String(Math.round(audio.prefs[channel] * 100));
    slider.addEventListener(
      "input",
      () => audio.setVolume(channel, slider.valueAsNumber / 100),
      options,
    );
  }
  toggle.addEventListener(
    "click",
    () => {
      if (audio.running) audio.setMuted(true);
      else {
        if (audio.prefs.muted) audio.setMuted(false);
        start();
      }
    },
    options,
  );
  retry.addEventListener(
    "click",
    () => {
      start();
      audio.retryMusic();
    },
    options,
  );
  panel.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        panel.open = false;
        panel.querySelector("summary")?.focus();
      }
    },
    options,
  );
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (panel.open && e.target instanceof Node && !panel.contains(e.target))
        panel.open = false;
    },
    options,
  );
  function render() {
    if (!toggle || !retry || !status) return;
    toggle.textContent = audio.prefs.muted
      ? fa.Unmute
      : audio.running
        ? fa.Mute
        : fa.StartSound;
    retry.hidden =
      !audio.musicFailed || !audio.running || audio.prefs.music === 0;
    let message: string = fa.SoundStartsWhenYouPlay;
    if (audio.prefs.muted) message = fa.Muted;
    else if (audio.unavailable)
      message = fa.AudioUnavailableTryStartingSoundAgain;
    else if (audio.running) {
      if (audio.prefs.master === 0) message = fa.MasterVolumeIsOff;
      else if (audio.prefs.music === 0) message = fa.MusicVolumeIsOff;
      else if (audio.musicFailed) message = fa.MusicCouldNotLoad;
      else if (audio.musicLoading) message = fa.LoadingMusic;
      else if (audio.musicPlaying) message = fa.NowPlaying;
    }
    if (status.textContent !== message) status.textContent = message;
  }
  audio.onChange = render;
  render();
  panel.hidden = false;
}
