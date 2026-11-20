import {
  apartmentTrack,
  requestChimes,
} from "../../../../assets/manifests/audio";
import type { RequestNotice } from "../game/systems/session";
import { type Channel, loadPreferences, savePreferences } from "./preferences";

interface Mixer {
  context: AudioContext;
  master: GainNode;
  music: GainNode;
  alerts: GainNode;
}

export class ApartmentAudio {
  readonly prefs = loadPreferences();
  onChange?: () => void;
  private mixer?: Mixer;
  private visible = !document.hidden;
  private disposed = false;
  private readonly abort = new AbortController();
  private buffer?: AudioBuffer;
  private loop?: AudioBufferSourceNode;
  private loading = false;
  private lastNotice?: string;
  musicFailed = false;
  unavailable = false;

  get running() {
    return (
      this.visible &&
      !this.prefs.muted &&
      this.mixer?.context.state === "running"
    );
  }

  get musicPlaying() {
    return (
      !!this.loop &&
      this.running &&
      this.prefs.music > 0 &&
      this.prefs.master > 0
    );
  }

  get musicLoading() {
    return this.loading;
  }

  private createMixer(): Mixer {
    const context = new AudioContext();
    const master = context.createGain(),
      music = context.createGain(),
      alerts = context.createGain();
    music.connect(master);
    alerts.connect(master);
    master.connect(context.destination);
    context.onstatechange = () => {
      this.syncMusic();
      this.onChange?.();
    };
    return { context, master, music, alerts };
  }

  // Called synchronously in the input handler so mobile browsers can unlock audio.
  async activate() {
    if (this.disposed || this.prefs.muted || !this.visible || this.running)
      return;
    try {
      this.mixer ??= this.createMixer();
      this.applyLevels();
      await this.mixer.context.resume();
      if (this.disposed) return;
      this.unavailable = false;
      this.syncMusic();
    } catch {
      if (!this.disposed) this.unavailable = true;
    }
    this.onChange?.();
  }

  setMuted(muted: boolean) {
    this.prefs.muted = muted;
    savePreferences(this.prefs);
    this.applyLevels();
    if (muted) this.suspend();
    this.onChange?.();
  }
  setVolume(channel: Channel, value: number) {
    if (!Number.isFinite(value)) return;
    this.prefs[channel] = Math.max(0, Math.min(1, value));
    savePreferences(this.prefs);
    this.applyLevels();
    this.syncMusic();
    this.onChange?.();
  }
  setVisible(visible: boolean) {
    this.visible = visible;
    this.applyLevels();
    if (!visible) this.suspend();
    else if (this.mixer && !this.prefs.muted) void this.activate();
  }

  private suspend() {
    const context = this.mixer?.context;
    if (context && context.state !== "closed")
      void context
        .suspend()
        .then(() => {
          // A rapid unmute or tab restore can arrive before suspension completes.
          if (!this.disposed && this.visible && !this.prefs.muted)
            void this.activate();
        })
        .catch(() => {});
  }
  private applyLevels() {
    const m = this.mixer;
    if (!m) return;
    const now = m.context.currentTime;
    m.master.gain.value =
      this.prefs.muted || !this.visible ? 0 : this.prefs.master;
    m.music.gain.setTargetAtTime(this.prefs.music, now, 0.012);
    m.alerts.gain.setTargetAtTime(this.prefs.alerts, now, 0.012);
  }
  private trackEnabled = true;
  setTrackEnabled(enabled: boolean) {
    this.trackEnabled = enabled;
    if (!enabled && this.loop) {
      this.loop.stop();
      this.loop.disconnect();
      this.loop = undefined;
    }
    this.syncMusic();
    this.onChange?.();
  }
  private syncMusic() {
    const m = this.mixer;
    if (
      !m ||
      this.disposed ||
      !this.trackEnabled ||
      !this.running ||
      this.prefs.music === 0 ||
      this.prefs.master === 0 ||
      this.loop ||
      this.musicFailed ||
      this.loading
    )
      return;
    if (!this.buffer) {
      void this.loadTrack(m.context);
      return;
    }
    this.loop = m.context.createBufferSource();
    this.loop.buffer = this.buffer;
    this.loop.loop = true;
    this.loop.connect(m.music);
    this.loop.start();
  }
  private async loadTrack(context: AudioContext) {
    this.loading = true;
    this.onChange?.();
    try {
      const response = await fetch(apartmentTrack.url, {
        signal: this.abort.signal,
      });
      if (!response.ok) throw new Error("Music unavailable");
      this.buffer = await context.decodeAudioData(await response.arrayBuffer());
    } catch {
      if (!this.disposed) this.musicFailed = true;
    } finally {
      this.loading = false;
      this.syncMusic();
      this.onChange?.();
    }
  }
  retryMusic() {
    this.musicFailed = false;
    this.syncMusic();
    this.onChange?.();
  }

  notice(id: string, status: RequestNotice) {
    const m = this.mixer,
      key = `${id}/${status}`;
    if (
      !m ||
      !this.running ||
      this.prefs.master === 0 ||
      this.prefs.alerts === 0 ||
      key === this.lastNotice
    )
      return;
    this.lastNotice = key;
    const now = m.context.currentTime;
    for (const [offset, hz] of requestChimes[status]) {
      const start = now + offset;
      const bell = m.context.createOscillator(),
        envelope = m.context.createGain();
      bell.type = "sine";
      bell.frequency.value = hz;
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(0.22, start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.39);
      bell.connect(envelope).connect(m.alerts);
      bell.onended = () => {
        bell.disconnect();
        envelope.disconnect();
      };
      bell.start(start);
      bell.stop(start + 0.4);
    }
  }
  dispose() {
    this.disposed = true;
    this.abort.abort();
    this.onChange = undefined;
    this.loop?.stop();
    this.loop?.disconnect();
    if (this.mixer) {
      this.mixer.context.onstatechange = null;
      void this.mixer.context.close().catch(() => {});
    }
  }
}
