// Sound-effects layer backed by SFX Kit (wyzowl/sfx-kit, CC0): 320 levelled sounds, each with a
// sync point. A cue says WHEN the sound's moment should land; the file is started at
// (moment - sync.at), exactly as the kit's GUIDE.md prescribes, and pulled down by its
// `under_voiceover_db` wherever its body overlaps narration.
//   node assets/sfx/fetch-sfx-kit.sh   (one-time download, ~119 MB, git-ignored)
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "../../sfx/sfx-kit");
export const SFX_AVAILABLE = existsSync(join(KIT, "sounds.json"));
const DB = SFX_AVAILABLE ? Object.fromEntries(JSON.parse(readFileSync(join(KIT, "sounds.json"), "utf8")).sounds.map((s) => [s.id, s])) : {};
const cache = {};

function pcm(id, rate = 44100) {
  if (cache[id]) return cache[id];
  const s = DB[id];
  if (!s) throw new Error(`SFX Kit has no sound "${id}"`);
  const b = execFileSync("ffmpeg", ["-v", "error", "-i", join(KIT, s.file), "-f", "s16le", "-ac", "1", "-ar", String(rate), "-"], { maxBuffer: 1 << 28 });
  return (cache[id] = new Int16Array(b.buffer, b.byteOffset, Math.floor(b.length / 2)));
}

export const sfxInfo = (id) => DB[id];

/**
 * Mix cues into `mix` (Float32Array @ 44.1 kHz).
 * cues: [{ id, at, gainDb = 0 }]  — `at` = the moment (s) the sound's sync point should meet.
 * speech: [[start, end], ...] narration intervals, for the kit's under-voiceover ducking.
 */
export function mixCues(mix, cues, speech = [], master = 1) {
  const R = 44100, placed = [];
  for (const c of cues) {
    const s = DB[c.id]; if (!s) continue;
    let start = c.at - s.sync.at;
    const data = pcm(c.id);
    let skip = 0;
    if (start < 0) { skip = Math.round(-start * R); start = 0; } // trim the head instead of moving the sync
    const bodyA = start + s.timing.onset, bodyB = start + s.timing.body_end;
    const overlaps = speech.some(([a, b]) => a < bodyB && b > bodyA);
    const gain = 10 ** (((c.gainDb ?? 0) + (overlaps ? s.under_voiceover_db : 0)) / 20) * master;
    const o = Math.floor(start * R);
    for (let j = skip; j < data.length && o + j - skip < mix.length; j++) mix[o + j - skip] += (data[j] / 32768) * gain;
    placed.push(`${c.id}@${c.at.toFixed(2)}`);
  }
  return placed;
}
