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
import { SCENES } from "./scenes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const beatsPath = resolve(args[0]);
const outDir = resolve(args[1]);
const ASPECT = opt("--aspect", "16:9");
const VERTICAL = ASPECT === "9:16";
const FPS = Number(opt("--fps", 30)), CFPS = 15;
const only = opt("--only", null);
const NARRATION = opt("--narration", null);
const TTS = opt("--tts", "piper");
const W = 1920, H = 1080, GROUND = 870, SCALE = 1.85, PAD = 0.25;
// steadier, clearer Piper delivery
const PIPER = ["--sentence-silence", "0.25", "--length-scale", "1.12", "--noise-scale", "0.5", "--noise-w", "0.6"];
// voice cleanup: trim silence, low-cut, cut mud, presence lift, gentle compression
const VOICE_CHAIN = [
  "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02",
  "areverse", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06", "areverse",
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
  for (const b of BEATS) {
    const h = hash(TTS + voice + JSON.stringify(VOICE ?? {}) + PIPER.join(" ") + b.text);
    const raw = join(outDir, "audio", `${h}.${TTS === "elevenlabs" ? "mp3" : "wav"}`), padded = join(outDir, "audio", `${h}.pad.wav`);
    if (!existsSync(raw)) {
      if (TTS === "elevenlabs") {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
          method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY || "proxy-injected", "Content-Type": "application/json" },
          body: JSON.stringify({ text: b.text, model_id: VOICE?.model ?? "eleven_multilingual_v2", voice_settings: VOICE?.settings,
            previous_text: ALL[b.idx - 1]?.text, next_text: ALL[b.idx + 1]?.text }),
        });
        if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
        writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
      } else sh("python3", ["-m", "piper", "-m", voice, "-f", raw, ...PIPER], { input: b.text });
    }
    // trim leading/trailing silence + voice cleanup, then an even gap before the next line
    const clean = join(outDir, "audio", `${h}.clean.wav`);
    if (!existsSync(clean)) sh("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", VOICE_CHAIN, "-ar", "44100", "-ac", "1", clean]);
    const next = BEATS[BEATS.indexOf(b) + 1];
    const gap = b.pause ?? (next && sceneKeyOf(next) !== sceneKeyOf(b) ? 0.5 : PAD);
    const paddedG = join(outDir, "audio", `${h}.gap${gap}.wav`);
    if (!existsSync(paddedG)) sh("ffmpeg", ["-y", "-v", "error", "-i", clean, "-af", `apad=pad_dur=${gap}`, "-ar", "44100", "-ac", "1", paddedG]);
    b.speech = dur(clean); b.dur = dur(paddedG); list.push(`file '${paddedG}'`);
    b.words = align(clean, b.text, h + "c");
  }
  writeFileSync(join(outDir, "audio/list.txt"), list.join("\n"));
  const joined = join(outDir, "narration-raw.wav");
  sh("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", join(outDir, "audio/list.txt"), "-c", "copy", joined]);
  sh("ffmpeg", ["-y", "-v", "error", "-i", joined, "-af", "loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", "44100", "-ac", "1", narration]);
  let t0 = 0;
  for (const b of BEATS) { b.start = t0; t0 += b.dur; }
}
const TOTAL = BEATS[BEATS.length - 1].start + BEATS[BEATS.length - 1].dur;
console.log(`narration ${TOTAL.toFixed(1)}s, ${BEATS.length} beats`);

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
const win = Math.floor(16000 / CFPS), env = [];
for (let i = 0; i < samples.length; i += win) {
  let s = 0; for (let j = i; j < Math.min(samples.length, i + win); j++) s += samples[j] * samples[j];
  env.push(Math.sqrt(s / win));
}
const p95 = [...env].sort((a, b) => a - b)[Math.floor(env.length * 0.95)] || 1;
const loud = (t) => Math.min(1, (env[Math.floor(t * CFPS)] ?? 0) / p95);

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
const NO_BLINK = new Set(["calm", "strain", "blink"]);
const TALKERS = new Set(["explain", "wave", "shrug", "crossArms", "think", "stand", "idea", "celebrate", "hustle"]);

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
  const pool = classroom ? (VERTICAL ? ["board", "medium"] : ["wide", "push"])
    : (b.card && !VERTICAL) || b.items?.length ? ["wide", "medium"] : ["wide", "medium", "close"];
  const changed = i > 0 && sceneKey(BEATS[i - 1]) !== sceneKey(b);
  b.shots = [];
  for (let k = 0; k < n; k++) {
    let type = k === 0 && changed ? "wide" : pool[(b.idx * 2 + k * (b.idx % 2 ? 1 : 2)) % pool.length];
    if (k > 0 && type === b.shots[k - 1].type) type = pool[(pool.indexOf(type) + 1) % pool.length];
    b.shots.push({ type, s: (b.dur * k) / n, e: (b.dur * (k + 1)) / n });
  }
}

function camera(type, prog, cx, py, pose, inOut) {
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

function frameSVG(t) {
  let i = BEATS.findIndex((b) => t < b.start + b.dur); if (i < 0) i = BEATS.length - 1;
  const b = BEATS[i], lt = t - b.start;
  const tc = Math.floor(t * CFPS) / CFPS, ltc = Math.max(0, tc - b.start); // character time, on 2s
  const pb = BEATS[Math.max(0, i - 1)];
  const sceneChanged = i > 0 && sceneKey(pb) !== sceneKey(b);
  const poseChanged = i > 0 && !sceneChanged && pb.pose !== b.pose;
  // pose snap: one in-between frame, then the key pose
  const lyingSwap = [pb.pose, b.pose].some((x) => x === "lie" || x === "lieAwake") && pb.pose !== b.pose;
  const k = i === 0 || sceneChanged || lyingSwap ? 1 : ltc < 1 / CFPS ? 0.5 : 1;
  const pose = lerpPose(resolved[Math.max(0, i - 1)], resolved[i], k);
  const anim = POSE_LIB[b.pose].anim;
  const ph = tc * 2 * Math.PI;
  if (b.pose !== "lie" && b.pose !== "lieAwake") {
    pose.lift += Math.sin(ph * 0.55) * 3;
    pose.lean += Math.sin(tc * 1.3) * 1.2;
    pose.headTilt += Math.sin(tc * 0.9 + 1) * 2;
  }
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
  if (TALKERS.has(b.pose) && !blinking && ltc < b.speech) { const l = loud(tc); pose.mouth = l > 0.55 ? 2 : l > 0.2 ? 1 : 0; }

  // squash & stretch on a pose snap (character frames 0..3)
  const fr = Math.floor(ltc * CFPS);
  const SQ = [[1.08, 0.88], [0.95, 1.07], [1.02, 0.98]];
  const [sx, sy] = poseChanged && fr < 3 ? SQ[fr] : [1, 1];

  const [x1, y1] = placement(b, lt);
  const [x0, y0] = sceneChanged ? [x1, y1] : placement(pb, pb.dur);
  const kk = b.walk ? 1 : k;
  const cx = x0 + (x1 - x0) * kk, py = y0 + (y1 - y0) * kk;

  // world layers
  const sc = b.scene ? SCENES[b.scene.name](b.scene, tc) : SCENES.studio({}, tc);
  const shot = b.shots.find((s) => lt < s.e) ?? b.shots[b.shots.length - 1];
  const cam = camera(shot.type, (lt - shot.s) / (shot.e - shot.s), cx, py, b.pose, (b.idx + b.shots.indexOf(shot)) % 2 === 0);
  let world = `<g filter="url(#dof)">${sc.bg}</g>`;
  for (const it of b.items ?? []) world += `<g transform="translate(${it.x},${it.y}) scale(${it.scale ?? 1.4})">${PROPS[it.type]([0, 0], it.arg)}</g>`;
  if (b.pose !== "lie" && b.pose !== "lieAwake") world += `<ellipse cx="${cx}" cy="${GROUND + 4}" rx="${110 - pose.lift}" ry="12" fill="rgba(0,0,0,0.14)"/>`;
  const footY = POSE_LIB[b.pose].sit ? py : GROUND;
  world += `<g transform="translate(${cx},${footY}) scale(${sx},${sy}) translate(${-cx},${-footY})"><g transform="translate(${cx},${py}) scale(${SCALE})">${character(pose)}</g></g>`;
  world += sc.fg;
  if (b.blanket) world += `<path d="M330,640 Q520,600 700,650 L700,800 Q480,820 300,800 Z" fill="#7fa7d9" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/><path d="M340,680 Q520,650 690,690" fill="none" stroke="#6a92c6" stroke-width="5"/>`;
  // screen shake on impacts (first ~6 frames)
  const shakeOn = ["shocked", "scared", "panic"].includes(b.pose) && lt < 0.22;
  const jx = shakeOn ? Math.sin(t * 157) * 14 : 0, jy = shakeOn ? Math.cos(t * 131) * 10 : 0;
  let s = `<g transform="translate(${OW / 2 + jx},${OH / 2 + jy}) scale(${cam.s.toFixed(4)}) translate(${-cam.fx},${-cam.fy})">${world}</g>`;
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
  if (sceneChanged && lt < 0.1) s += `<rect width="${OW}" height="${OH}" fill="#fff" opacity="${(1 - lt / 0.1).toFixed(3)}"/>`;
  const fade = Math.min(1, t / 0.4, (TOTAL - t) / 0.8);
  if (fade < 1) s += `<rect width="${OW}" height="${OH}" fill="#000" opacity="${(1 - Math.max(0, fade)).toFixed(3)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OW}" height="${OH}" viewBox="0 0 ${OW} ${OH}"><defs>
    <filter id="dof" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${cam.blur}"/></filter>
    <radialGradient id="vig" cx="50%" cy="48%" r="75%"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/></radialGradient>
    </defs>${s}</svg>`;
}

// ---------- 4. render + encode ----------
const hand = readFileSync(join(here, "../../../ink-theater/assets/patrickhand.ttf")).toString("base64");
const black = readFileSync(join(here, "montserrat-900.woff2")).toString("base64");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: OW, height: OH } });
await page.setContent(`<html><head><style>
  @font-face{font-family:InkHand;src:url(data:font/ttf;base64,${hand}) format("truetype");}
  @font-face{font-family:MBlack;font-weight:900;src:url(data:font/woff2;base64,${black}) format("woff2");}
  body{margin:0;overflow:hidden} text{font-family:InkHand,sans-serif}</style></head><body><div id="s"></div></body></html>`);
await page.evaluate(() => Promise.all([document.fonts.load("40px InkHand"), document.fonts.load("900 40px MBlack")]));

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
writeFileSync(join(outDir, "timeline.json"), JSON.stringify(BEATS.map(({ start, dur, pose, text, scene, shots }) => ({ start, dur, pose, scene: scene?.name, shots: shots.map((x) => x.type), text })), null, 1));
console.log("wrote", out, `${TOTAL.toFixed(1)}s`, TITLE);
