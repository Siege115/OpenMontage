// Renders an Eddie episode (beats file) to MP4, in a stickman-explainer Shorts style:
//  - character animated on 2s (15 fps) with pose snaps + squash/stretch; camera on 1s (30 fps)
//  - hard cuts between wide / medium / close shots every ~2 s, slow push inside each shot
//  - depth-of-field blur on the background, vignette lighting
//  - lip flaps driven by the narration's loudness; blinks
//  - bold white word-by-word captions with a thick black outline (Montserrat Black)
//  - procedural SFX (whoosh / pop / ding / thud / boing) + a soft music bed
//
//   node render-episode.mjs <beats.mjs> <outDir> [--aspect 16:9|9:16] [--fps 30]
//        [--narration full.mp3]            one continuous take (e.g. ElevenLabs); beats timed by alignment
//        [--tts piper|elevenlabs] [--voice ...]   per-beat TTS when no --narration is given
//        [--only 0-5] [--stills] [--no-music]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { character, resolvePose, lerpPose, POSES, PROPS, PALETTE } from "./eddie-rig.mjs";
import { SCENES as BASE_SCENES } from "./scenes.mjs";
import { EXTRA_SCENES } from "./scenes-extra.mjs";
const SCENES = { ...BASE_SCENES, ...EXTRA_SCENES };

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const beatsPath = resolve(args[0]);
const outDir = resolve(args[1]);
const ASPECT = opt("--aspect", "16:9");
const VERTICAL = ASPECT === "9:16";
const FPS = Number(opt("--fps", 30)), CFPS = 30; // every frame animates
const only = opt("--only", null);
const NARRATION = opt("--narration", null);
const TTS = opt("--tts", "piper");
const W = 1920, H = 1080, GROUND = 870, SCALE = 1.85, PAD = 0.25;
// steadier, clearer Piper delivery
const PIPER = ["--sentence-silence", "0.25", "--length-scale", "1.12", "--noise-scale", "0.5", "--noise-w", "0.6"];
// voice cleanup: trim silence, low-cut, cut mud, presence lift, gentle compression
const VOICE_CHAIN = [
  "silenceremove=start_periods=1:start_threshold=-52dB:start_silence=0.05", "afade=t=in:d=0.012",
  "areverse", "silenceremove=start_periods=1:start_threshold=-52dB:start_silence=0.12", "afade=t=in:d=0.04", "areverse",
  "highpass=f=75", "equalizer=f=250:t=q:w=1:g=-2.5", "equalizer=f=3200:t=q:w=1.2:g=3", "equalizer=f=9000:t=h:w=1:g=2",
  "acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=2",
].join(",");
const sceneKeyOf = (b) => JSON.stringify(b.scene ?? null);
const OW = VERTICAL ? 1080 : 1920, OH = VERTICAL ? 1920 : 1080, BASE = OH / H;
const sh = (cmd, a, o) => execFileSync(cmd, a, o);
const dur = (f) => Number(sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

const { BEATS: ALL, TITLE, VOICE } = await import(pathToFileURL(beatsPath).href);
let BEATS = ALL.map((b, i) => ({ ...b, idx: i }));
if (only) { const [a, z] = only.split("-").map(Number); BEATS = BEATS.slice(a, z + 1); }
mkdirSync(join(outDir, "audio"), { recursive: true });
const ALIGN = join(here, "align_words.py");
const align = (audio, text, cacheKey) => {
  const out = join(outDir, "audio", `${cacheKey}.words.json`);
  if (!existsSync(out)) {
    const txt = join(outDir, "audio", `${cacheKey}.txt`);
    writeFileSync(txt, text);
    sh("python3", [ALIGN, out, audio, txt], { env: { ...process.env, HF_HUB_DISABLE_XET: "1" }, stdio: ["ignore", "ignore", "inherit"] });
  }
  return JSON.parse(readFileSync(out, "utf8"));
};
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

// ---------- 1. narration + word timings ----------
const narration = join(outDir, "narration.wav");
if (NARRATION) {
  // one continuous take: align the whole script, then cut beats at their first word
  sh("ffmpeg", ["-y", "-v", "error", "-i", resolve(NARRATION), "-ar", "44100", "-ac", "1", narration]);
  const words = align(narration, BEATS.map((b) => b.text).join("\n"), hash("full" + NARRATION + BEATS.map((b) => b.text).join("|")));
  let wi = 0;
  for (const b of BEATS) { const n = b.text.split(/\s+/).length; b.words = words.slice(wi, wi + n); wi += n; }
  const total = dur(narration);
  BEATS.forEach((b, i) => {
    b.start = i === 0 ? 0 : Math.max(0, b.words[0].s - 0.12);
    b.speechEnd = b.words[b.words.length - 1].e;
  });
  BEATS.forEach((b, i) => {
    b.dur = (i + 1 < BEATS.length ? BEATS[i + 1].start : total + 0.6) - b.start;
    b.speech = b.speechEnd - b.start;
    b.words = b.words.map((w) => ({ ...w, s: w.s - b.start, e: w.e - b.start }));
  });
} else {
  const voice = opt("--voice", TTS === "elevenlabs" ? (VOICE?.id ?? "JBFqnCBsd6RMkjVDRZzb") : join(outDir, "voices/en_US-ryan-high.onnx"));
  const list = [];
  // text for the TTS engine only (captions keep the script text): no quote marks or ellipses
  const ttsText = (b) => (b.say ?? b.text).replace(/…/g, ",").replace(/[“”"]/g, "").replace(/(^|\s)'([^']+)'/g, "$1$2").replace(/café/gi, "cafe");
  const VARIANTS = [PIPER, PIPER.map((v, i) => [0, 0, 0, "1.06", 0, "0.4", 0, "0.5"][i] || v), PIPER.map((v, i) => [0, 0, 0, "1.18", 0, "0.62", 0, "0.75"][i] || v)];
  let regenerated = 0;
  for (const b of BEATS) {
    const next = BEATS[BEATS.indexOf(b) + 1];
    const gap = b.pause ?? (next && sceneKeyOf(next) !== sceneKeyOf(b) ? 0.5 : PAD);
    let best = null;
    for (let v = 0; v < (TTS === "elevenlabs" ? 1 : VARIANTS.length); v++) {
      const h = hash(TTS + voice + JSON.stringify(VOICE ?? {}) + VARIANTS[v].join(" ") + ttsText(b) + VOICE_CHAIN);
      const raw = join(outDir, "audio", `${h}.${TTS === "elevenlabs" ? "mp3" : "wav"}`);
      if (!existsSync(raw)) {
        if (TTS === "elevenlabs") {
          const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
            method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY || "proxy-injected", "Content-Type": "application/json" },
            body: JSON.stringify({ text: ttsText(b), model_id: VOICE?.model ?? "eleven_multilingual_v2", voice_settings: VOICE?.settings,
              previous_text: ALL[b.idx - 1]?.text, next_text: ALL[b.idx + 1]?.text }),
          });
          if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
          writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
        } else sh("python3", ["-m", "piper", "-m", voice, "-f", raw, ...VARIANTS[v]], { input: ttsText(b) });
      }
      const clean = join(outDir, "audio", `${h}.clean.wav`);
      if (!existsSync(clean)) sh("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", VOICE_CHAIN, "-ar", "44100", "-ac", "1", clean]);
      const words = align(clean, b.text, h + "c");
      const meta = JSON.parse(readFileSync(join(outDir, "audio", `${h}c.words.json.meta.json`), "utf8"));
      const score = meta.matched / Math.max(1, meta.total);
      if (!best || score > best.score) best = { h, clean, words, score };
      if (score >= 0.86) break; // clean take: transcription matches the script
      regenerated++;
    }
    const paddedG = join(outDir, "audio", `${best.h}.gap${gap}.wav`);
    if (!existsSync(paddedG)) sh("ffmpeg", ["-y", "-v", "error", "-i", best.clean, "-af", `apad=pad_dur=${gap}`, "-ar", "44100", "-ac", "1", paddedG]);
    b.speech = dur(best.clean); b.dur = dur(paddedG); list.push(`file '${paddedG}'`);
    b.words = best.words; b.voiceScore = best.score;
  }
  const low = BEATS.filter((b) => b.voiceScore < 0.86).map((b) => `${b.idx}:${b.voiceScore.toFixed(2)}`);
  console.log(`voice QA: ${regenerated} retakes; below threshold after retakes: ${low.join(" ") || "none"}`);
  writeFileSync(join(outDir, "audio/list.txt"), list.join("\n"));
  const joined = join(outDir, "narration-raw.wav");
  sh("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", join(outDir, "audio/list.txt"), "-c", "copy", joined]);
  sh("ffmpeg", ["-y", "-v", "error", "-i", joined, "-af", "loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", "44100", "-ac", "1", narration]);
  let t0 = 0;
  for (const b of BEATS) { b.start = t0; t0 += b.dur; }
}
const TOTAL = BEATS[BEATS.length - 1].start + BEATS[BEATS.length - 1].dur;
console.log(`narration ${TOTAL.toFixed(1)}s, ${BEATS.length} beats`);
writeFileSync(join(outDir, only ? `timeline-${only}.json` : "timeline.json"), JSON.stringify(BEATS.map(({ idx, start, dur, pose, text, scene }) => ({ idx, start, dur, pose, scene: scene?.name, text })), null, 1));

// caption chunks: 1-3 words, break after punctuation
for (const b of BEATS) {
  const chunks = []; let cur = [];
  for (const w of b.words) {
    cur.push(w);
    const txt = cur.map((x) => x.w).join(" ");
    if (cur.length >= 3 || txt.length > 16 || /[.,?!…:;]$/.test(w.w)) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  b.chunks = chunks.map((c) => ({ text: c.map((x) => x.w).join(" "), s: c[0].s, e: c[c.length - 1].e }));
}

// loudness envelope at character frame rate -> lip flaps
const pcm = sh("ffmpeg", ["-v", "error", "-i", narration, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], { maxBuffer: 1 << 30 });
const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
const win = 160, env = []; // 10 ms windows
for (let i = 0; i < samples.length; i += win) {
  let s = 0; for (let j = i; j < Math.min(samples.length, i + win); j++) s += samples[j] * samples[j];
  env.push(Math.sqrt(s / win));
}
const p95 = [...env].sort((a, b) => a - b)[Math.floor(env.length * 0.95)] || 1;
// attack/release smoothing so the jaw moves like a jaw, not a switch
const smooth = new Float32Array(env.length); { let v = 0; for (let i = 0; i < env.length; i++) { const x = Math.min(1.2, env[i] / p95); v += (x - v) * (x > v ? 0.6 : 0.22); smooth[i] = v; } }
const loud = (t) => { const x = t * 100, i = Math.floor(x), fr = x - i; return Math.min(1, (smooth[i] ?? 0) * (1 - fr) + (smooth[i + 1] ?? 0) * fr); };
// mouth state at beat-local time: openness from loudness, closed between words, shape from the word's vowels
function mouthAt(b, lt, tAbs) {
  const w = b.words.find((x) => lt >= x.s - 0.03 && lt <= x.e + 0.04);
  let open = Math.pow(Math.max(0, (loud(tAbs) - 0.07) / 0.75), 0.85);
  if (!w) open *= 0.15;
  else if (/^[mbp]/i.test(w.w) && lt - w.s < 0.06) open *= 0.1; // lips together on m/b/p
  const word = (w?.w ?? "").toLowerCase();
  const shape = /oo|ou|ow|o[^a-z]|^o|w|u/.test(word) ? "round" : /ee|ea|i|y$/.test(word) ? "wide" : "neutral";
  return { open: Math.min(1, open), shape };
}

// ---------- 2. audio mix: SFX + music bed ----------
const sfxDir = join(outDir, "sfx"); mkdirSync(sfxDir, { recursive: true });
const SFX = {
  whoosh: ["anoisesrc=d=0.45:c=pink:a=0.9", "bandpass=f=1400:w=1200,afade=t=in:d=0.18,afade=t=out:st=0.18:d=0.27,volume=0.55"],
  pop: ["aevalsrc='0.7*sin(2*PI*(500+1800*exp(-t*45))*t)*exp(-t*28)':d=0.18", "volume=0.8"],
  ding: ["aevalsrc='0.35*sin(2*PI*1320*t)*exp(-t*3.5)+0.18*sin(2*PI*2640*t)*exp(-t*5)':d=1.1", "volume=0.9"],
  thud: ["aevalsrc='0.95*sin(2*PI*(48+90*exp(-t*18))*t)*exp(-t*7)':d=0.6", "volume=1.0"],
  boing: ["aevalsrc='0.45*sin(2*PI*(260+120*sin(2*PI*9*t))*t)*exp(-t*3)':d=0.7", "volume=0.7"],
};
const readPcm = (f) => { const b = sh("ffmpeg", ["-v", "error", "-i", f, "-f", "s16le", "-ac", "1", "-ar", "44100", "-"], { maxBuffer: 1 << 30 }); return new Int16Array(b.buffer, b.byteOffset, Math.floor(b.length / 2)); };
const sfxPcm = {};
for (const [k, [src, fx]] of Object.entries(SFX)) {
  const f = join(sfxDir, `${k}.wav`);
  if (!existsSync(f)) sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", src, "-af", fx, "-ar", "44100", "-ac", "1", f]);
  sfxPcm[k] = readPcm(f);
}
const POSE_LIB = { ...POSES, stand: { expr: "neutral" } };
const sceneKey = (b) => JSON.stringify(b.scene ?? null);
const events = [];
BEATS.forEach((b, i) => {
  const pb = BEATS[i - 1];
  if (i > 0 && sceneKey(pb) !== sceneKey(b)) events.push([b.start - 0.12, "whoosh", 0.8]);
  if (b.day && b.day !== "-") events.push([b.start + 0.05, "ding", 0.7]);
  if (b.card) events.push([b.start + 0.05, "pop", 0.9]);
  if (["shocked", "scared", "panic"].includes(b.pose)) events.push([b.start + 0.02, "thud", 0.9]);
  if (["celebrate", "idea"].includes(b.pose)) events.push([b.start + 0.05, "boing", 0.6]);
  if (b.blackout) events.push([b.start + 1.6, "thud", 0.7]);
  for (const it of b.items ?? []) if (it.delay !== undefined) events.push([b.start + it.delay, "pop", 0.45]);
});
const mix = new Float32Array(Math.ceil((TOTAL + 1) * 44100)); // sfx
for (const [t, k, v] of events) { const o = Math.max(0, Math.floor(t * 44100)), s = sfxPcm[k]; for (let j = 0; j < s.length && o + j < mix.length; j++) mix[o + j] += (s[j] / 32768) * v * 0.7; }
const music = new Float32Array(mix.length);
if (!args.includes("--no-music")) {
  // soft pad: Cmaj7 / Am7 / Fmaj7 / G6, 4 s each, gentle swell
  const chords = [[261.63, 329.63, 392, 493.88], [220, 261.63, 329.63, 392], [174.61, 220, 261.63, 329.63], [196, 246.94, 293.66, 329.63]];
  for (let n = 0; n < mix.length; n++) {
    const t = n / 44100, c = chords[Math.floor(t / 4) % 4], lt = t % 4;
    const envA = Math.min(1, lt / 0.8) * Math.min(1, (4 - lt) / 0.8);
    let v = 0; for (const fq of c) v += Math.sin(2 * Math.PI * fq * t) + 0.3 * Math.sin(2 * Math.PI * fq * 2 * t);
    v += 0.8 * Math.sin(2 * Math.PI * (c[0] / 2) * t);
    music[n] += v * 0.012 * envA * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.2 * t)) * Math.min(1, t / 2, (TOTAL - t) / 2);
  }
}
function writeWav(arr, path) {
  const b = Buffer.alloc(44 + arr.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + arr.length * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(44100, 24); b.writeUInt32LE(88200, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(arr.length * 2, 40);
  for (let n = 0; n < arr.length; n++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(arr[n] * 32767))), 44 + n * 2);
  writeFileSync(path, b);
}
const sfxTrack = join(outDir, "sfx.wav"), musicTrack = join(outDir, "music.wav");
writeWav(mix, sfxTrack); writeWav(music, musicTrack);
const mixed = join(outDir, "mix.wav");
// music ducks under the voice; final mix normalised to YouTube loudness (-14 LUFS)
sh("ffmpeg", ["-y", "-v", "error", "-i", narration, "-i", musicTrack, "-i", sfxTrack, "-filter_complex",
  "[0]asplit=2[v][key];[1][key]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=350[duck];" +
  "[v][duck][2]amix=inputs=3:duration=longest:normalize=0,loudnorm=I=-14:TP=-1.2:LRA=9",
  "-ar", "44100", mixed]);
if (args.includes("--audio-only")) { console.log("audio written", mixed); process.exit(0); }

// ---------- 3. per-frame scene ----------
const resolved = BEATS.map((b) => resolvePose({ ...POSE_LIB[b.pose], ...(b.expr ? { expr: b.expr } : {}) }));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const ink = PALETTE.ink;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const PEOPLE_CACHE = {};
const NO_BLINK = new Set(["calm", "strain", "blink"]);
const TALKERS = new Set(["explain", "wave", "shrug", "crossArms", "think", "stand", "idea", "celebrate", "hustle", "coffee", "highFive", "giveGift", "listen", "sitBench"]);

function placement(b, lt) {
  let x = b.x ?? (b.card && !VERTICAL ? 640 : W / 2);
  if (b.walk) x = b.walk[0] + (b.walk[1] - b.walk[0]) * Math.min(1, lt / b.dur);
  const y = b.y ?? (GROUND - (POSE_LIB[b.pose].sit ? 58 : 130) * SCALE);
  return [x, y];
}
// shot list per beat: ~2 s shots, cycling framings, wide first after a scene change
for (const [i, b] of BEATS.entries()) {
  const n = Math.max(1, Math.round(b.dur / 2.1));
  const classroom = b.scene?.name === "classroom";
  const thoughts = (b.items ?? []).some((it) => it.type === "thought" || it.type === "say");
  const pool = classroom ? (VERTICAL ? ["board", "medium"] : ["wide", "push"])
    : thoughts && !VERTICAL ? ["wide", "push"]
    : (b.card && !VERTICAL) || b.items?.length ? ["wide", "medium"] : ["wide", "medium", "close"];
  const changed = i > 0 && sceneKey(BEATS[i - 1]) !== sceneKey(b);
  b.shots = [];
  if (b.cam) { b.shots.push({ type: b.cam.type ?? "custom", s: 0, e: b.dur, custom: b.cam }); continue; }
  for (let k = 0; k < n; k++) {
    let type = k === 0 && changed ? "wide" : pool[(b.idx * 2 + k * (b.idx % 2 ? 1 : 2)) % pool.length];
    if (k > 0 && type === b.shots[k - 1].type) type = pool[(pool.indexOf(type) + 1) % pool.length];
    b.shots.push({ type, s: (b.dur * k) / n, e: (b.dur * (k + 1)) / n });
  }
}

function camera(type, prog, cx, py, pose, inOut, custom) {
  if (custom) {
    // crafted move: pan/zoom from -> to over the beat (world coords), eased
    const e = ease(Math.min(1, prog)), f = custom.from ?? [cx, py - 90], g = custom.to ?? f;
    const z = (custom.z0 ?? custom.z ?? 1.3) + ((custom.z1 ?? custom.z ?? 1.3) - (custom.z0 ?? custom.z ?? 1.3)) * e;
    const s = BASE * z, vw = OW / s, vh = OH / s;
    let fx = f[0] + (g[0] - f[0]) * e, fy = f[1] + (g[1] - f[1]) * e;
    fx = Math.min(W - vw / 2, Math.max(vw / 2, fx)); fy = Math.min(H - vh / 2, Math.max(vh / 2, fy));
    return { s, fx, fy, blur: z > 1.6 ? 3 : z > 1.2 ? 2 : 1.1 };
  }
  const lying = pose === "lie" || pose === "lieAwake";
  const headX = lying ? cx - 150 * SCALE : cx, headY = lying ? py - 20 : py - 150 * SCALE;
  let z = 1, fx = VERTICAL ? (lying ? cx - 110 * SCALE : cx) : W / 2, fy = H / 2;
  if (type === "board") { z = 1; fx = 1370; fy = H / 2; }
  if (type === "push") { z = 1.08; fx = W / 2; fy = H / 2; }
  if (type === "medium") { z = 1.4; fx = lying ? cx - 60 : cx; fy = lying ? py - 40 : py - 90; }
  if (type === "close") { z = 2.0; fx = headX; fy = headY + 30; }
  z *= inOut ? 1 + 0.04 * prog : 1.04 - 0.04 * prog;
  const s = BASE * z, vw = OW / s, vh = OH / s;
  fx = Math.min(W - vw / 2, Math.max(vw / 2, fx)); fy = Math.min(H - vh / 2, Math.max(vh / 2, fy));
  return { s, fx, fy, blur: type === "close" ? 3.2 : type === "medium" ? 2 : 1.1 };
}

const sceneIdx = new Map(); { let n = 0; BEATS.forEach((b, i) => { if (i > 0 && sceneKey(BEATS[i - 1]) !== sceneKey(b)) sceneIdx.set(i, n++); }); }
function frameSVG(t) {
  let i = BEATS.findIndex((b) => t < b.start + b.dur); if (i < 0) i = BEATS.length - 1;
  const b = BEATS[i], lt = t - b.start;
  const tc = t, ltc = Math.max(0, lt); // continuous: every frame moves
  const pb = BEATS[Math.max(0, i - 1)];
  const sceneChanged = i > 0 && sceneKey(pb) !== sceneKey(b);
  const poseChanged = i > 0 && !sceneChanged && pb.pose !== b.pose;
  // pose snap: one in-between frame, then the key pose
  const lyingSwap = [pb.pose, b.pose].some((x) => x === "lie" || x === "lieAwake") && pb.pose !== b.pose;
  // eased pose change with a little overshoot (follow-through), ~0.4 s
  const q0 = Math.min(1, ltc / 0.42), c1 = 1.5, c3 = c1 + 1;
  const k = i === 0 || sceneChanged || lyingSwap ? 1 : 1 + c3 * Math.pow(q0 - 1, 3) + c1 * Math.pow(q0 - 1, 2);
  const pose = lerpPose(resolved[Math.max(0, i - 1)], resolved[i], k);
  const anim = POSE_LIB[b.pose].anim;
  const ph = tc * 2 * Math.PI;
  const speaking = ltc < b.speech, lv = speaking ? loud(tc) : 0;
  if (b.pose !== "lie" && b.pose !== "lieAwake") {
    pose.lift += Math.sin(ph * 0.55) * 3.5;
    pose.lean += Math.sin(tc * 1.3) * 1.6 + Math.sin(tc * 0.37) * 1.2;
    pose.headTilt += Math.sin(tc * 0.9 + 1) * 2.5 + lv * Math.sin(tc * 9) * 3.5; // head bobs with the voice
    // breathing arms + small talking gestures
    const g = speaking && TALKERS.has(b.pose) ? 1 : 0.35;
    pose.armL = { ...pose.armL, a1: pose.armL.a1 + Math.sin(tc * 1.7) * 3 * g, a2: pose.armL.a2 + Math.sin(tc * 2.3 + 1) * 6 * g };
    if (!pose.overHead) pose.armR = { ...pose.armR, a1: pose.armR.a1 + Math.sin(tc * 1.9 + 2) * 3 * g, a2: pose.armR.a2 + Math.sin(tc * 2.1 + 3) * 6 * g };
  } else pose.lift += Math.sin(ph * 0.25) * 2; // sleeping breath
  if (b.pose === "wave") pose.armR = { ...pose.armR, a2: pose.armR.a2 + Math.sin(ph * 1.8) * 22, a1: pose.armR.a1 + Math.sin(ph * 1.8) * 6 };
  if (b.pose === "explain") pose.armR = { ...pose.armR, a2: pose.armR.a2 + Math.sin(ph * 0.8) * 7 };
  if (b.pose === "shrug") pose.lift += Math.max(0, Math.sin(ph * 0.9)) * 6;
  if (b.pose === "hustle") pose.lean += Math.sin(tc * 40) * 1.2;
  if (b.pose === "celebrate") pose.lift += Math.abs(Math.sin(tc * Math.PI * 2.2)) * 18;
  if (anim === "panic") { pose.lean += Math.sin(tc * 31) * 2.5; pose.headTilt += Math.sin(tc * 23) * 5; }
  if (anim === "type") {
    pose.armL = { ...pose.armL, a2: pose.armL.a2 + Math.sin(ph * 4.2) * 10 };
    pose.armR = { ...pose.armR, a2: pose.armR.a2 + Math.sin(ph * 4.2 + 2) * 10 };
  }
  if (b.look) pose.headTilt += Math.sin(ph * 0.45) * 16;
  if (anim === "run") {
    const w = Math.sin(ph * 2.6);
    pose.legL = { ...pose.legL, a1: -6 + 40 * w, a2: -6 + 40 * w - Math.max(0, -w) * 55 };
    pose.legR = { ...pose.legR, a1: 6 - 40 * w, a2: 6 - 40 * w - Math.max(0, w) * 55 };
    pose.armL = { ...pose.armL, a1: -20 - 45 * w, a2: 60 - 30 * w };
    pose.armR = { ...pose.armR, a1: 20 + 45 * w, a2: -60 + 30 * w };
    pose.lift += Math.abs(Math.cos(ph * 2.6)) * 16;
  }
  if (anim === "dance") {
    const w = Math.sin(ph * 2.2), w2 = Math.sin(ph * 1.1);
    pose.lean += w2 * 10; pose.lift += Math.abs(w) * 14; pose.headTilt += w2 * 8;
    pose.armL = { ...pose.armL, a1: -150 + 50 * w, a2: -170 + 40 * w };
    pose.armR = { ...pose.armR, a1: 70 - 40 * w, a2: 30 - 50 * w };
    pose.legL = { ...pose.legL, a1: -12 + 10 * w2, a2: -4 + 14 * Math.max(0, w) };
    pose.legR = { ...pose.legR, a1: 12 + 10 * w2, a2: 4 - 14 * Math.max(0, -w) };
  }
  if (anim === "sneak") {
    const w = Math.sin(ph * 0.9);
    pose.lift += Math.abs(w) * 10; pose.lean += w * 3;
    pose.legR = { ...pose.legR, a1: pose.legR.a1 + w * 10 };
  }
  if (POSE_LIB[b.pose].sit && anim !== "type") {
    pose.legL = { ...pose.legL, a2: pose.legL.a2 + Math.sin(ph * 0.8) * 8 };
    pose.legR = { ...pose.legR, a2: pose.legR.a2 - Math.sin(ph * 0.8 + 1) * 8 };
  }
  if (anim === "walk") {
    const w = Math.sin(ph * 1.7);
    pose.legL = { ...pose.legL, a1: -4 + 26 * w, a2: -4 + 26 * w - Math.max(0, -w) * 30 };
    pose.legR = { ...pose.legR, a1: 4 - 26 * w, a2: 4 - 26 * w - Math.max(0, w) * 30 };
    pose.armL = { ...pose.armL, a1: -12 - 22 * w, a2: -6 - 30 * w };
    pose.armR = { ...pose.armR, a1: 12 + 22 * w, a2: 6 + 30 * w };
    pose.lift += Math.abs(Math.cos(ph * 1.7)) * 6;
  }
  const blinking = !NO_BLINK.has(pose.expr) && ((tc + i * 0.7) % 3.4) < 0.13;
  if (blinking) pose.expr = "blink";
  // lip flaps while the narrator speaks
  if (TALKERS.has(b.pose) && !blinking && speaking) pose.mouth = mouthAt(b, lt, tc);

  // squash & stretch on a pose snap (character frames 0..3)
  const qs = Math.min(1, ltc / 0.36);
  const sy = poseChanged && qs < 1 ? 1 - 0.11 * Math.sin(qs * 2 * Math.PI) * (1 - qs) : 1, sx = 1 / Math.sqrt(sy);

  const [x1, y1] = placement(b, lt);
  const [x0, y0] = sceneChanged ? [x1, y1] : placement(pb, pb.dur);
  const kk = b.walk ? 1 : k;
  const cx = x0 + (x1 - x0) * kk, py = y0 + (y1 - y0) * kk;

  // world layers
  const sc = b.scene ? SCENES[b.scene.name](b.scene, tc) : SCENES.studio({}, tc);
  const shot = b.shots.find((s) => lt < s.e) ?? b.shots[b.shots.length - 1];
  const cam = camera(shot.type, (lt - shot.s) / (shot.e - shot.s), cx, py, b.pose, (b.idx + b.shots.indexOf(shot)) % 2 === 0, shot.custom);
  // handheld drift: the camera is never perfectly still
  cam.fx += Math.sin(t * 0.61) * 7 + Math.sin(t * 1.73) * 2.5; cam.fy += Math.cos(t * 0.47) * 5 + Math.sin(t * 1.31) * 2;
  // vertical: pan to whoever's thought just popped up (the bubbles are the story)
  const tItems = (b.items ?? []).filter((it) => (it.type === "thought" || it.type === "say") && it.delay !== undefined);
  if (VERTICAL && tItems.length) {
    const shown = tItems.filter((it) => lt >= it.delay);
    const tgt = (k) => (k < 0 ? cx : tItems[k].x);
    const cur = shown.length - 1, since = cur >= 0 ? lt - tItems[cur].delay : lt;
    const from = tgt(cur - 1), to = tgt(cur), e = ease(Math.min(1, since / 0.35));
    const vw = OW / (BASE * 1.05);
    cam.s = BASE * 1.05; cam.fy = H / 2 - 40;
    cam.fx = Math.min(W - vw / 2, Math.max(vw / 2, from + (to - from) * e));
  }
  // characters pick up the scene's light: cool at night, warm at sunset, purple at the party
  const sn = b.scene?.name, sopt = b.scene ?? {};
  const light = (sn === "street" && !sopt.day) || (sn === "bedroom" && sopt.night) || (sn === "living" && sopt.night) || (sn === "desk" && sopt.night) || sn === "road" ? "night"
    : sn === "rooftop" ? "sunset" : sn === "party" || sn === "concert" ? "party" : null;
  const lightF = light ? `url(#lit-${light})` : "none";
  let world = `<g filter="url(#dof)">${sc.bg}</g>`;
  // background people (other stick figures), then props / thought bubbles that pop in on cue
  for (const [pi, pp] of (b.people ?? []).entries()) {
    const key = JSON.stringify(pp);
    const base = (PEOPLE_CACHE[key] ??= resolvePose({ ...POSE_LIB[pp.pose ?? "stand"], ...(pp.expr ? { expr: pp.expr } : {}), acc: pp.acc }));
    const q = { ...base, lift: base.lift + Math.sin((tc + pi) * 2 * Math.PI * 0.5) * 3, headTilt: base.headTilt + Math.sin(tc * 0.8 + pi * 2) * 4,
      lean: base.lean + Math.sin(tc * 1.1 + pi) * 1.5 };
    const pph = (tc + pi * 0.37) * 2 * Math.PI, pa = pp.anim ?? POSE_LIB[pp.pose ?? "stand"].anim;
    q.armL = { ...q.armL, a2: q.armL.a2 + Math.sin(tc * 2 + pi) * 6 }; q.armR = { ...q.armR, a2: q.armR.a2 + Math.sin(tc * 2.2 + pi * 2) * 6 };
    if (pa === "walk" || pp.walk) {
      const w = Math.sin(pph * 1.7);
      q.legL = { ...q.legL, a1: -4 + 26 * w, a2: -4 + 26 * w - Math.max(0, -w) * 30 }; q.legR = { ...q.legR, a1: 4 - 26 * w, a2: 4 - 26 * w - Math.max(0, w) * 30 };
      q.armL = { ...q.armL, a1: -12 - 22 * w, a2: -6 - 30 * w }; q.armR = { ...q.armR, a1: 12 + 22 * w, a2: 6 + 30 * w };
      q.lift += Math.abs(Math.cos(pph * 1.7)) * 6;
    }
    if (pa === "dance") {
      const w = Math.sin(pph * 2.2 + pi), w2 = Math.sin(pph * 1.1 + pi);
      q.lean += w2 * 10; q.lift += Math.abs(w) * 14;
      q.armL = { ...q.armL, a1: -150 + 50 * w, a2: -170 + 40 * w }; q.armR = { ...q.armR, a1: 150 - 50 * w, a2: 170 - 40 * w };
    }
    if (pa === "talk") { q.armR = { ...q.armR, a1: 60 + Math.sin(pph * 1.3) * 25, a2: 30 + Math.sin(pph * 1.9) * 30 }; q.mouth = Math.sin(pph * 3) > 0.2 ? 1 : 0; }
    if (pp.anim === "wave") q.armR = { ...q.armR, a1: 150, a2: 175 + Math.sin(pph * 1.8) * 22 };
    if (!NO_BLINK.has(q.expr) && ((tc + pi * 1.3) % 3.1) < 0.13) q.expr = "blink";
    const ps = SCALE * (pp.s ?? 0.92), ppy = (pp.y ?? GROUND) - (POSE_LIB[pp.pose ?? "stand"].sit ? 58 : 130) * ps;
    const px = pp.walk ? pp.walk[0] + (pp.walk[1] - pp.walk[0]) * Math.min(1, lt / b.dur) : pp.x;
    world += `<ellipse cx="${px}" cy="${(pp.y ?? GROUND) + 6}" rx="${105 * (pp.s ?? 0.92)}" ry="14" fill="url(#softShadow)"/>`;
    world += `<g filter="${lightF}"><g transform="translate(${px},${ppy}) scale(${(pp.flip ? -1 : 1) * ps},${ps})">${character(q)}</g></g>`;
  }
  const isBubble = (it) => it.type === "thought" || it.type === "say";
  const drawItems = (bubbles) => { let out = ""; for (const it of b.items ?? []) {
    if (isBubble(it) !== bubbles) continue;
    if (it.delay && lt < it.delay) continue;
    const pop = it.delay !== undefined ? 1 + 0.25 * Math.max(0, 1 - (lt - it.delay) / 0.15) - 0.25 * Math.max(0, 1 - (lt - it.delay) / 0.06) : 1;
    const fl = it.type === "thought" || it.type === "say" ? Math.sin(t * 1.8 + it.x * 0.01) * 5 : 0;
    out += `<g transform="translate(${it.x},${it.y + fl}) scale(${(it.scale ?? 1.4) * pop})">${PROPS[it.type]([0, 0], it.arg)}</g>`;
  } return out; };
  world += drawItems(false);
  if (b.pose !== "lie" && b.pose !== "lieAwake") world += `<ellipse cx="${cx}" cy="${GROUND + 6}" rx="${120 - pose.lift}" ry="16" fill="url(#softShadow)"/>`;
  const footY = POSE_LIB[b.pose].sit ? py : GROUND;
  world += `<g filter="${lightF}"><g transform="translate(${cx},${footY}) scale(${sx},${sy}) translate(${-cx},${-footY})"><g transform="translate(${cx},${py}) scale(${SCALE})">${character(pose)}</g></g></g>`;
  world += sc.fg;
  world += drawItems(true); // speech/thought bubbles always on top
  if (b.blanket) world += `<path d="M330,640 Q520,600 700,650 L700,800 Q480,820 300,800 Z" fill="#7fa7d9" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/><path d="M340,680 Q520,650 690,690" fill="none" stroke="#6a92c6" stroke-width="5"/>`;
  // screen shake on impacts (first ~6 frames)
  const shakeOn = ["shocked", "scared", "panic"].includes(b.pose) && lt < 0.22;
  const jx = shakeOn ? Math.sin(t * 157) * 14 : 0, jy = shakeOn ? Math.cos(t * 131) * 10 : 0;
  // scene transitions: flash / whip-pan / iris / slide, rotating through the episode
  let tx = 0, wrapOpen = "", wrapClose = "", trFilter = "";
  if (sceneChanged && lt < 0.4) {
    const style = b.transition ?? ["whip", "iris", "slide", "flash"][(sceneIdx.get(i) ?? 0) % 4], e = ease(Math.min(1, lt / 0.35));
    if (style === "whip") { tx = (1 - e) * OW * 0.9 * (i % 2 ? 1 : -1); trFilter = `<filter id="whip" x="-20%" y="0" width="140%" height="100%"><feGaussianBlur stdDeviation="${(1 - e) * 60} 0"/></filter>`; wrapOpen = `<g filter="url(#whip)">`; wrapClose = "</g>"; }
    if (style === "slide") tx = (1 - e) * OW * (i % 2 ? -1 : 1);
    if (style === "iris") { trFilter = `<clipPath id="iris"><circle cx="${OW / 2}" cy="${OH / 2}" r="${e * Math.hypot(OW, OH) * 0.6}"/></clipPath>`; wrapOpen = `<rect width="${OW}" height="${OH}" fill="#000"/><g clip-path="url(#iris)">`; wrapClose = "</g>"; }
    if (style === "flash") wrapClose = `<rect width="${OW}" height="${OH}" fill="#fff" opacity="${(1 - Math.min(1, lt / 0.12)).toFixed(3)}"/>`;
  }
  let s = `${wrapOpen}<g transform="translate(${OW / 2 + jx + tx},${OH / 2 + jy}) scale(${cam.s.toFixed(4)}) translate(${-cam.fx},${-cam.fy})">${world}</g>${wrapClose}`;
  s += `<rect width="${OW}" height="${OH}" fill="url(#vig)"/>`;

  // HUD -------------------------------------------------------------
  const M = "font-family:'MBlack',sans-serif;font-weight:900";
  let day = null, dayStart = 0;
  for (let j = i; j >= 0; j--) if (BEATS[j].day) { day = BEATS[j].day; dayStart = BEATS[j].start; break; }
  if (day && day !== "-") {
    const a = Math.min(1, (t - dayStart) / 0.25), x = -300 + 340 * ease(a), y = VERTICAL ? 140 : 50;
    s += `<g transform="translate(${x},${y}) rotate(-3)"><rect x="5" y="7" width="250" height="88" rx="16" fill="rgba(0,0,0,0.25)"/><rect width="250" height="88" rx="16" fill="#ff5a4a" stroke="#000" stroke-width="6"/>
      <text x="125" y="62" text-anchor="middle" font-size="52" fill="#fff" style="${M}">${day}</text></g>`;
  }
  if (b.card) {
    const a = Math.min(1, lt / 0.2), scl = 0.5 + 0.5 * ease(a) + 0.06 * Math.sin(Math.min(1, lt / 0.35) * Math.PI);
    const lines = []; let line = "";
    for (const w of b.card.split(" ")) { if ((line + " " + w).trim().length > 13 && line) { lines.push(line); line = w; } else line = (line + " " + w).trim(); }
    lines.push(line);
    const bw = Math.max(...lines.map((l) => l.length)) * 50 + 90, bh = lines.length * 96 + 56;
    const cxCard = VERTICAL ? OW / 2 : 1390, cyCard = (VERTICAL ? 1480 : 110) + bh / 2;
    s += `<g transform="translate(${cxCard},${cyCard}) rotate(-2) scale(${scl})" opacity="${a}">
      <rect x="${-bw / 2 + 8}" y="${-bh / 2 + 10}" width="${bw}" height="${bh}" rx="20" fill="rgba(0,0,0,0.25)"/>
      <rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="20" fill="#ffd84d" stroke="#000" stroke-width="7"/>` +
      lines.map((l, j) => `<text x="0" y="${-bh / 2 + 88 + j * 96}" text-anchor="middle" font-size="76" fill="#000" style="${M}">${esc(l)}</text>`).join("") + `</g>`;
  }
  const ch = b.chunks.find((c, j) => lt >= c.s - 0.05 && lt < (b.chunks[j + 1]?.s ?? c.e + 0.35) - 0.05);
  if (ch) {
    const pop = 1 + 0.16 * Math.max(0, 1 - (lt - ch.s + 0.05) / 0.12);
    const fs = Math.min(VERTICAL ? 100 : 88, ((VERTICAL ? 980 : 1700) / Math.max(1, ch.text.length)) / 0.62), cy = VERTICAL ? 1300 : 920;
    s += `<g transform="translate(${OW / 2},${cy}) scale(${pop.toFixed(3)})"><text x="0" y="0" text-anchor="middle" font-size="${fs}" fill="#fff" stroke="#000" stroke-width="${fs * 0.2}" stroke-linejoin="round" paint-order="stroke" style="${M}">${esc(ch.text)}</text></g>`;
  }
  if (b.blackout && lt > 1.6 && lt < 2.5) s += `<rect width="${OW}" height="${OH}" fill="#000"/>`;

  const fade = Math.min(1, t / 0.4, (TOTAL - t) / 0.8);
  if (fade < 1) s += `<rect width="${OW}" height="${OH}" fill="#000" opacity="${(1 - Math.max(0, fade)).toFixed(3)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OW}" height="${OH}" viewBox="0 0 ${OW} ${OH}"><defs>
    <filter id="dof" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${cam.blur}"/></filter>${trFilter}
    <radialGradient id="softShadow"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".6" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <filter id="lit-night"><feColorMatrix type="matrix" values="0.78 0 0 0 0.02  0 0.82 0 0 0.03  0 0 0.95 0 0.08  0 0 0 1 0"/></filter>
    <filter id="lit-sunset"><feColorMatrix type="matrix" values="1 0 0 0 0.04  0 0.9 0 0 0.02  0 0 0.8 0 0  0 0 0 1 0"/></filter>
    <filter id="lit-party"><feColorMatrix type="matrix" values="0.88 0 0 0 0.06  0 0.8 0 0 0.01  0 0 0.95 0 0.1  0 0 0 1 0"/></filter>
    <radialGradient id="vig" cx="50%" cy="48%" r="75%"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/></radialGradient>
    </defs>${s}</svg>`;
}

// ---------- 4. render + encode ----------
const hand = readFileSync(join(here, "../../../ink-theater/assets/patrickhand.ttf")).toString("base64");
const black = readFileSync(join(here, "montserrat-900.woff2")).toString("base64");
const bubbleFont = readFileSync(join(here, "nunito-800.woff2")).toString("base64");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: OW, height: OH } });
await page.setContent(`<html><head><style>
  @font-face{font-family:InkHand;src:url(data:font/ttf;base64,${hand}) format("truetype");}
  @font-face{font-family:MBlack;font-weight:900;src:url(data:font/woff2;base64,${black}) format("woff2");}
  @font-face{font-family:Bubble;font-weight:800;src:url(data:font/woff2;base64,${bubbleFont}) format("woff2");}
  body{margin:0;overflow:hidden} text{font-family:InkHand,sans-serif}</style></head><body><div id="s"></div></body></html>`);
await page.evaluate(() => Promise.all([document.fonts.load("40px InkHand"), document.fonts.load("900 40px MBlack"), document.fonts.load("800 40px Bubble")]));

const tag = VERTICAL ? "9x16" : "16x9";
if (args.includes("--stills")) {
  mkdirSync(join(outDir, `stills-${tag}`), { recursive: true });
  for (const b of BEATS) {
    await page.evaluate((svg) => { document.getElementById("s").innerHTML = svg; }, frameSVG(b.start + Math.min(1.0, b.dur * 0.5)));
    await page.screenshot({ path: join(outDir, `stills-${tag}`, `beat-${String(b.idx).padStart(2, "0")}.jpg`), type: "jpeg", quality: 80 });
  }
  await browser.close();
  console.log("stills written");
  process.exit(0);
}
const out = join(outDir, only ? `preview-${tag}-${only}.mp4` : `episode-${tag}.mp4`);
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-i", mixed,
  "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k", "-shortest", out], { stdio: ["pipe", "inherit", "inherit"] });
const frames = Math.ceil(TOTAL * FPS);
const t1 = Date.now();
for (let f = 0; f < frames; f++) {
  await page.evaluate((svg) => { document.getElementById("s").innerHTML = svg; }, frameSVG(f / FPS));
  const buf = await page.screenshot({ type: "jpeg", quality: 90 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % (FPS * 30) === 0) console.log(`frame ${f}/${frames} (${((Date.now() - t1) / 1000).toFixed(0)}s)`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();

console.log("wrote", out, `${TOTAL.toFixed(1)}s`, TITLE);
