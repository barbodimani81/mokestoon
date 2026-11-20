// Original 16-bar F7 arrangement. Run with Node and ffmpeg to rebuild the loop.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rate = 44100;
const beat = 60 / 104;
const bars = 16;
const length = Math.round(bars * 4 * beat * rate);
const left = new Float32Array(length);
const right = new Float32Array(length);
const tau = 2 * Math.PI;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const sine = (cycles) => Math.sin(tau * cycles);

function voice(startBeat, duration, pan, sound) {
  const start = Math.round(startBeat * beat * rate);
  const samples = Math.round(duration * rate);
  const l = Math.sqrt((1 - pan) / 2),
    r = Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < samples; i++) {
    // Wrap release tails into the downbeat so the decoded buffer loops cleanly.
    const at = (start + i) % length;
    const value = sound(i / rate) * Math.min(1, i / 80, (samples - i) / 230);
    left[at] += value * l;
    right[at] += value * r;
  }
}

function keys(at, pitch, level, pan, decay = 0.42) {
  const f = hz(pitch);
  voice(
    at,
    1.65,
    pan,
    (t) =>
      level *
      Math.exp(-t / decay) *
      (sine(f * t + 0.11 * Math.exp(-t * 5) * sine(2 * f * t)) +
        0.12 * sine(2.003 * f * t)),
  );
}

let seed = 7311;
function noise() {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
}
function hat(at, open, pan) {
  let prev = 0;
  voice(at, open ? 0.16 : 0.075, pan, (t) => {
    const n = noise(),
      high = n - prev;
    prev = n;
    return 0.046 * high * Math.exp(-t / (open ? 0.042 : 0.016));
  });
}
const harmony = [
  { bass: 38, keys: [53, 57, 60, 64], lead: [69, 72, 76] },
  { bass: 43, keys: [53, 59, 64, 69], lead: [71, 69, 64] },
  { bass: 36, keys: [52, 55, 59, 62], lead: [67, 71, 74] },
  { bass: 41, keys: [52, 57, 60, 67], lead: [72, 67, 64] },
];
for (let bar = 0; bar < bars; bar++) {
  const base = bar * 4,
    chord = harmony[Math.floor(bar / 2) % 4];
  for (let step = 0; step < 4; step++) {
    const at = base + step;
    voice(
      at,
      0.34,
      0,
      (t) =>
        0.48 * Math.exp(-t * 16) * sine(49 * t + 1.8 * (1 - Math.exp(-t * 36))),
    );
    hat(at + 0.52, step === 3, step % 2 ? 0.28 : -0.18);
    if (step % 2 === 1) {
      voice(
        at + 0.012,
        0.15,
        -0.1,
        (t) => 0.1 * Math.exp(-t * 29) * (noise() + 0.38 * sine(176 * t)),
      );
    }
  }
  for (const [offset, note] of [
    [0, chord.bass],
    [1.52, chord.bass + 12],
    [2.76, chord.bass + 7],
    [3.52, chord.bass],
  ]) {
    const f = hz(note);
    voice(
      base + offset,
      0.44,
      0,
      (t) => 0.28 * Math.exp(-t * 6.5) * (sine(f * t) + 0.22 * sine(2 * f * t)),
    );
  }
  for (const offset of bar % 2 ? [0.52, 2.52] : [0.03, 1.76, 3.02]) {
    chord.keys.forEach((note, i) =>
      keys(base + offset + i * 0.018, note, 0.09, (i - 1.5) * 0.27),
    );
  }
  // The second eight bars answer the opening phrase an octave higher.
  if (bar % 2 === 1 || bar >= 8) {
    const phrase = bar % 2 ? [0.76, 1.52, 2.52] : [2.27, 3.26];
    phrase.forEach((offset, i) => {
      const pitch =
        chord.lead[(i + (bar >= 8 ? 1 : 0)) % 3] + (bar % 4 === 3 ? 12 : 0);
      keys(base + offset, pitch, 0.092, 0.2, 0.3);
      keys(base + offset + 0.75, pitch, 0.03, -0.45, 0.23);
    });
  }
}
const pcm = Buffer.alloc(length * 4);
let peak = 0;
for (let i = 0; i < length; i++)
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
for (let i = 0; i < length; i++) {
  pcm.writeInt16LE(Math.round((left[i] * 24000) / peak), i * 4);
  pcm.writeInt16LE(Math.round((right[i] * 24000) / peak), i * 4 + 2);
}
const output = fileURLToPath(
  new URL("../../runtime/audio/apartment-01.mp3", import.meta.url),
);
const result = spawnSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "s16le",
    "-ar",
    String(rate),
    "-ac",
    "2",
    "-i",
    "pipe:0",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "96k",
    "-metadata",
    "title=Hall Lights",
    "-metadata",
    "artist=F7",
    output,
  ],
  { input: pcm, stdio: ["pipe", "inherit", "inherit"] },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
