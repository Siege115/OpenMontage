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
import { character, head, resolvePose, lerpPose, gait, applyAct, POSES, PROPS, PALETTE } from "./eddie-rig.mjs";
import { SCENES as BASE_SCENES } from "./scenes.mjs";
import { EXTRA_SCENES } from "./scenes-extra.mjs";
import { EASE, spring, seg, life, keys, stagger, lerp } from "./motion.mjs";
import { SFX_AVAILABLE, mixCues } from "./sfx.mjs";
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
const CAP_Y = VERTICAL ? 1770 : 1010; // caption baseline: the floor strip under the characters' feet
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
      // strict QA: every real word must be heard; quiz answers must ALL be clearly spoken
      const scriptWords = b.text.split(/\s+/), miss = (meta.unmatched ?? []).filter((k) => scriptWords[k] && scriptWords[k].replace(/[^a-z]/gi, "").length > 2);
      const quizMiss = (b.quiz?.on ?? []).filter((tok) => !scriptWords.some((w, k) => w.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(tok) && !(meta.unmatched ?? []).includes(k)));
      const score = meta.matched / Math.max(1, meta.total) - quizMiss.length * 0.5 - Math.max(0, miss.length - 1) * 0.1;
      if (!best || score > best.score) best = { h, clean, words, score };
      if (score >= 0.86 && quizMiss.length === 0 && miss.length <= 1) break; // clean take
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
  b.chunks = chunks.map((c) => ({ text: c.map((x) => x.w).join(" "), words: c, s: c[0].s, e: c[c.length - 1].e }));
}

// ---- word cues: bubbles / quiz options appear on the exact narration word ----
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");
function wordAt(b, token, from = 0) {
  if (token === "$end") return { t: b.speech + 0.1, idx: b.words.length };
  const tk = norm(token);
  for (let k = from; k < b.words.length; k++) if (norm(b.words[k].w).startsWith(tk)) return { t: b.words[k].s, idx: k + 1 };
  return null;
}
for (const b of BEATS) {
  for (const it of b.items ?? []) if (it.on) { const w = wordAt(b, it.on); if (w) it.delay = Math.max(0, w.t - 0.12); }
  if (b.quiz) {
    let from = 0; b.quiz.at = b.quiz.options.map((_, j) => { const w = b.quiz.on?.[j] && wordAt(b, b.quiz.on[j], from); if (w) { from = w.idx; return Math.max(0, w.t - 0.1); } return 0.9 + j * 0.7; });
    b.quiz.countFrom = b.speech + 0.15; b.quiz.revealAt = b.dur - 0.45; // countdown runs in the silent pause, then the answer lights up
  }
  for (const it of b.items ?? []) if (it.type === "duck" && it.quackOn) { const w = wordAt(b, it.quackOn); if (w) it.quackAt = w.t; }
  // acting keys may be cued on a narration word: { on: "word", off: -0.3 } (off shifts the key)
  const cueKeys = (keys) => { for (const k of keys ?? []) if (k.on) { const w = wordAt(b, k.on); k.at = Math.max(0, (w ? w.t : 0) + (k.off ?? 0)); } };
  cueKeys(b.act); for (const pp of b.people ?? []) cueKeys(pp.act);
  if (b.crumbs?.on) { const w = wordAt(b, b.crumbs.on); b.crumbs.at = Math.max(0, (w ? w.t : 0) + (b.crumbs.off ?? 0)); }
  // card table: each word in winOn slides the pot to Eddie
  for (const it of b.items ?? []) if (it.winOn) { let from = 0; it.winAt = it.winOn.map((tok) => { const w = wordAt(b, tok, from); if (w) { from = w.idx; return w.t; } return null; }).filter((x) => x !== null); }
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
// ---- transition chosen by meaning (MOTION.md §6) ----
const IMPACT_POSES = new Set(["shocked", "scared", "panic", "coverEars"]);
const TR = BEATS.map((b, i) => {
  if (i === 0 || sceneKey(BEATS[i - 1]) === sceneKey(b)) return null;
  if (b.transition) return b.transition;
  if (IMPACT_POSES.has(b.pose)) return "cut";
  if (b.scene?.name === "studio" && BEATS[i - 1].scene?.name === "studio") return "slide"; // fact to fact: keep momentum
  if (BEATS[i - 1].scene?.name === b.scene?.name) return "dip"; // same place, later time
  return ["whip", "slide", "whip", "iris"][i % 4];
});
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
if (SFX_AVAILABLE) {
  // SFX Kit cues: `at` is the moment the sound's sync point should meet (GUIDE.md: start = moment - sync.at)
  const cues = [], cue = (id, at, gainDb = 0) => cues.push({ id, at, gainDb }); var quacks = [];
  BEATS.forEach((b, i) => {
    const t0 = b.start, tr = TR[i];
    if (tr === "whip") cue("whoosh-fast-medium", t0 + 0.09);           // move-peak: ~25% into the ease-out whip
    if (tr === "slide") cue("swipe-medium-soft", t0);                    // action-start
    if (tr === "iris") cue("reverse-whoosh-short-soft", t0 + 0.4);       // arrival: the iris is fully open
    if (tr === "dip") cue("whoosh-slow-soft", t0, -4);
    if (tr === "cut") cue("impact-medium-hard", t0 + 0.02);
    else if (IMPACT_POSES.has(b.pose) && BEATS[i - 1]?.pose !== b.pose) cue("impact-light-firm", t0 + 0.05);
    if (b.day && b.day !== "-") { cue("swish-medium", t0 + 0.08); cue("impact-light-soft", t0 + 0.3, -3); }
    if (b.card) { cue("pop-large-in", t0 + 0.12); cue("pop-small-out", t0 + b.dur - 0.12, -5); }
    if (b.blackout) cue("digital-signal-drop", t0 + 1.6);
    for (const it of b.items ?? []) if (it.delay !== undefined) cue(it.type === "say" ? "pop-medium-in" : it.type === "thought" ? "pop-small-bubble" : "pop-small-in", t0 + it.delay + 0.04, -2);
    const act = { celebrate: ["celebration-popper", 0.15], idea: ["shimmer-short-bright", 0.1], highFive: ["click-clap-firm", 0.4], type: ["keyboard-typing-steady-medium", 0.2],
      phone: ["phone-vibrate-hand", 0.5], coffee: ["foley-glass-touch", 0.35], read: ["props-page-turn", 0.4], giveGift: ["props-box-open", 0.45], sneak: ["foley-fabric-slide", 0.2], dance: ["move-bounce", 0.2] }[b.pose];
    if (act && BEATS[i - 1]?.pose !== b.pose) cue(act[0], t0 + act[1], -3);
    if (b.riser) cue("riser-2s-soft", t0 + b.riser);
    if (b.quiz) { b.quiz.at.forEach((a) => cue("pop-medium-in", t0 + a + 0.05, -2)); cue("time-countdown", t0 + b.quiz.countFrom, -4); cue("notification-success-chime", t0 + b.quiz.revealAt, -1); }
    for (const it of b.items ?? []) if (it.type === "duck" && it.quackAt !== undefined) quacks.push(t0 + it.quackAt);
    for (const k of [...(b.act ?? []), ...(b.people ?? []).flatMap((p) => p.act ?? [])]) if (k.sfx) cue(k.sfx, t0 + k.at + (k.dur ?? 0.45) * (k.sfxAt ?? 1), k.sfxDb ?? -4);
    if (b.crumbs?.at !== undefined) { cue("swish-soft", t0 + b.crumbs.at + 0.05, -6); cue("foley-paper-touch", t0 + b.crumbs.at + 0.9, -8); }
    for (const [pi, pp] of (b.people ?? []).entries()) {
      if (pp.pose === "read" || pp.anim === "read") for (let c = 3.3 - ((pi * 0.9) % 4.2); c < b.dur; c += 4.2) if (c > 0.2) cue("props-page-turn", t0 + c + 0.3, -9);
      if (pp.anim === "write") cue("writing-pen-write", t0 + 0.6, -12);
      if (pp.anim === "wipe") cue("foley-fabric-slide", t0 + 0.8, -10);
    }
    for (const it of b.items ?? []) if (it.type === "pokerTable") {
      cue("foley-card-slide", t0 + 0.25, -6); cue("foley-card-touch", t0 + 0.9, -8);
      for (const w of it.winAt ?? []) { cue("money-coins-pour", t0 + w + 0.05, -7); cue("money-coin-stack", t0 + w + 0.45, -8); }
    }                    // arrival at the reveal
  });
  const speech = BEATS.map((b) => [b.start, b.start + b.speech]);
  const placed = mixCues(mix, cues, speech, 10 ** (-2 / 20));
  // a quick, subtle duck quack (synthesised: nasal buzz through a "beak" formant)
  if (quacks.length) {
    const qf = join(sfxDir, "quack.wav");
    if (!existsSync(qf)) sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "aevalsrc='0.6*(2*mod(t*(520-500*t),1)-1)*sin(PI*min(1,t/0.02))*exp(-t*9)':d=0.22", "-af", "bandpass=f=1250:w=900,bandpass=f=1100:w=1200,volume=2.2", "-ar", "44100", "-ac", "1", qf]);
    const q = readPcm(qf);
    for (const at of quacks) { const o = Math.floor(at * 44100); for (let j = 0; j < q.length && o + j < mix.length; j++) mix[o + j] += (q[j] / 32768) * 0.45; }
  }
  // footsteps: one soft scuff per foot contact (same distance maths as the gait)
  const stepF = join(sfxDir, "step.wav");
  if (!existsSync(stepF)) sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anoisesrc=d=0.12:c=brown:a=0.9,afade=t=out:st=0.01:d=0.11", "-f", "lavfi", "-i", "aevalsrc='0.7*sin(2*PI*90*t)*exp(-t*45)':d=0.12", "-filter_complex", "[0][1]amix=inputs=2,lowpass=f=1800,highpass=f=60,volume=2.5", "-ar", "44100", "-ac", "1", stepF]);
  const stepPcm = readPcm(stepF);
  const addAt = (pcm, at, g) => { const o = Math.floor(at * 44100); for (let j = 0; j < pcm.length && o + j < mix.length; j++) if (o + j >= 0) mix[o + j] += (pcm[j] / 32768) * g; };
  let steps = 0;
  for (const b of BEATS) {
    const walkers = [];
    if (b.walk && (b.pose === "walk" || b.pose === "run")) walkers.push({ dist: (lt) => Math.abs(placement(b, lt)[0] - b.walk[0]) / SCALE, cycle: b.pose === "run" ? 120 : 124, g: b.pose === "run" ? 0.32 : 0.22, end: b.walkDur ?? b.dur });
    for (const pp of b.people ?? []) if (pp.walk) { const ps = SCALE * (pp.s ?? 0.92); walkers.push({ dist: (lt) => Math.abs(pp.walk[1] - pp.walk[0]) * Math.min(1, lt / b.dur) / ps, cycle: 124, g: 0.1, end: b.dur }); }
    for (const w of walkers) { let last = 0; for (let lt = 0; lt < w.end; lt += 1 / 240) { const n = Math.floor(w.dist(lt) / (w.cycle / 2)); if (n > last) { addAt(stepPcm, b.start + lt, w.g * (0.85 + 0.3 * ((n * 7) % 3) / 2)); steps++; } last = n; } }
  }
  // ambience beds per location (synthesised room tones), crossfaded at scene cuts, kept well under the voice
  const AMB = {
    subway: "anoisesrc=d=12:c=brown:a=0.8,lowpass=f=260,volume=1.4,tremolo=f=1.1:d=0.35",
    cafe: "anoisesrc=d=12:c=pink:a=0.5,bandpass=f=700:w=900,tremolo=f=3.3:d=0.5,volume=0.8",
    party: "anoisesrc=d=12:c=pink:a=0.6,bandpass=f=900:w=1200,tremolo=f=4.1:d=0.6,volume=1.1",
    concert: "anoisesrc=d=12:c=pink:a=0.8,bandpass=f=1100:w=1600,tremolo=f=2.2:d=0.5,volume=1.4",
    street: "anoisesrc=d=12:c=brown:a=0.6,lowpass=f=500,tremolo=f=0.15:d=0.7,volume=1.0",
    park: "anoisesrc=d=12:c=pink:a=0.25,lowpass=f=700,volume=0.6",
    rooftop: "anoisesrc=d=12:c=brown:a=0.6,lowpass=f=380,tremolo=f=0.2:d=0.6,volume=0.9",
    office: "anoisesrc=d=12:c=pink:a=0.15,lowpass=f=900,volume=0.5",
    library: "anoisesrc=d=12:c=pink:a=0.08,lowpass=f=800,volume=0.4",
  };
  const ambPcm = {};
  for (const b of BEATS) {
    const nm = b.scene?.name, spec = AMB[nm]; if (!spec) continue;
    if (!ambPcm[nm]) { const f = join(sfxDir, `amb-${nm}.wav`); if (!existsSync(f)) sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", spec, "-ar", "44100", "-ac", "1", f]); ambPcm[nm] = readPcm(f); }
    const a = ambPcm[nm], o = Math.floor(b.start * 44100), n = Math.floor(b.dur * 44100), fade = 0.25 * 44100, g = 0.045;
    for (let j = 0; j < n && o + j < mix.length; j++) mix[o + j] += (a[(o + j) % a.length] / 32768) * g * Math.min(1, j / fade, (n - j) / fade);
    // birdsong in the park: short rising chirps
    if (nm === "park") for (let c = 0.4; c < b.dur; c += 1.3 + ((c * 7.3) % 1.1)) {
      const at = b.start + c, f0 = 2600 + ((c * 997) % 900);
      for (let j = 0; j < 0.09 * 44100; j++) { const tt = j / 44100, k = Math.floor(at * 44100) + j; if (k < mix.length) mix[k] += 0.05 * Math.sin(2 * Math.PI * (f0 * tt + 9000 * tt * tt)) * Math.sin(Math.PI * tt / 0.09); }
    }
  }
  console.log(`sfx: ${placed.length} SFX Kit cues, ${steps} footsteps`);
} else {
  for (const [t, k, v] of events) { const o = Math.max(0, Math.floor(t * 44100)), s = sfxPcm[k]; for (let j = 0; j < s.length && o + j < mix.length; j++) mix[o + j] += (s[j] / 32768) * v * 0.7; }
}
const music = new Float32Array(mix.length);
if (!args.includes("--no-music")) {
  // lively lo-fi bed, 90 BPM: kick / snare / swung hats + warm 7th chords + bass (ducked under the voice later)
  const BPM = 90, beat = 60 / BPM, R = 44100;
  const chords = [[220, 261.63, 329.63, 392], [174.61, 220, 261.63, 329.63], [130.81, 164.81, 196, 246.94], [196, 246.94, 293.66, 349.23]]; // Am7 Fmaj7 Cmaj7 G7
  let seed = 1; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  for (let n = 0; n < music.length; n++) {
    const t = n / R, bt = t / beat, bar = Math.floor(bt / 4), pb = bt % 4, c = chords[bar % 4];
    const fadeIO = Math.min(1, t / 2, (TOTAL - t) / 2.5);
    // chords: soft electric-piano-ish (sine + octave), re-struck every 2 beats with decay
    const ct = (bt % 2) * beat; let v = 0;
    for (const fq of c) v += (Math.sin(2 * Math.PI * fq * t) + 0.25 * Math.sin(4 * Math.PI * fq * t)) * Math.exp(-ct * 1.6);
    v *= 0.11 * (0.9 + 0.1 * Math.sin(2 * Math.PI * 5 * t));
    // bass: root on beats 1 and 3
    const bph = (bt % 2) * beat; v += 0.32 * Math.sin(2 * Math.PI * (c[0] / 2) * t) * Math.exp(-bph * 2.2);
    // kick on 1 and 3, snare on 2 and 4, swung 8th hats
    const kt = (bt % 2) * beat; v += 0.55 * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-kt * 30)) * kt) * Math.exp(-kt * 9);
    const st = ((bt + 1) % 2) * beat; v += (0.22 * rnd() + 0.12 * Math.sin(2 * Math.PI * 190 * st)) * Math.exp(-st * 18);
    const e8 = (bt * 2) % 1, sw = Math.floor(bt * 2) % 2 ? 0.08 : 0, ht = (e8 - sw) * beat / 2; if (ht > 0) v += 0.07 * rnd() * Math.exp(-ht * 70);
    music[n] += v * 0.1 * fadeIO;
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
  let x = b.x ?? (b.quiz && !VERTICAL ? 360 : b.card && !VERTICAL ? 640 : W / 2);
  if (b.walk) x = b.walk[0] + (b.walk[1] - b.walk[0]) * (b.pose === "run" ? EASE.power2.out : EASE.sine.inOut)(Math.min(1, lt / (b.walkDur ?? b.dur)));
  const lib = POSE_LIB[b.pose], y = b.y ?? (GROUND - (lib.sitH ?? (lib.sit ? 58 : 130)) * SCALE);
  return [x, y];
}
// shot list per beat: ~2 s shots, cycling framings, wide first after a scene change
for (const [i, b] of BEATS.entries()) {
  const n = Math.max(1, Math.round(b.dur / 2.1));
  const classroom = b.scene?.name === "classroom";
  const thoughts = (b.items ?? []).some((it) => it.type === "thought" || it.type === "say") || !!b.quiz;
  const pool = classroom ? (VERTICAL ? ["board", "medium"] : ["wide", "push"])
    : thoughts && !VERTICAL ? ["wide", "push"]
    : (b.card && !VERTICAL) || b.items?.length ? ["wide", "medium"] : ["wide", "medium", "close"];
  const changed = i > 0 && sceneKey(BEATS[i - 1]) !== sceneKey(b);
  b.shots = [];
  if (b.cam) { b.shots.push({ type: b.cam.type ?? "custom", s: 0, e: b.dur, custom: b.cam }); continue; }
  // walking/running shots: a locked, steady frame (no cuts, no zoom) so the motion reads cleanly
  if (b.walk && !VERTICAL) { b.shots.push({ type: "custom", s: 0, e: b.dur, custom: { from: [W / 2, H / 2], to: [W / 2, H / 2], z0: 1, z1: 1 }, still: true }); continue; }
  for (let k = 0; k < n; k++) {
    let type = k === 0 && changed ? "wide" : pool[(b.idx * 2 + k * (b.idx % 2 ? 1 : 2)) % pool.length];
    if (k > 0 && type === b.shots[k - 1].type) type = pool[(pool.indexOf(type) + 1) % pool.length];
    b.shots.push({ type, s: (b.dur * k) / n, e: (b.dur * (k + 1)) / n });
  }
}

function camera(type, prog, cx, py, pose, inOut, custom) {
  if (custom) {
    // crafted move: pan/zoom from -> to over the beat (world coords), eased
    const e = EASE.cinematic(Math.min(1, prog)), f = custom.from ?? [cx, py - 90], g = custom.to ?? f;
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
  // vary the ambient move per shot (never the same zoom everywhere): push / pull / drift / hold
  const mode = (Math.round(cx) + (inOut ? 1 : 0) + type.length) % 4;
  if (mode === 0) z *= 1 + 0.06 * EASE.power2.out(prog);
  if (mode === 1) z *= 1.06 - 0.06 * EASE.sine.inOut(prog);
  if (mode === 2) fx += (EASE.sine.inOut(prog) - 0.5) * 60 / z;
  if (mode === 3) z *= 1 + 0.01 * prog;
  const s = BASE * z, vw = OW / s, vh = OH / s;
  fx = Math.min(W - vw / 2, Math.max(vw / 2, fx)); fy = Math.min(H - vh / 2, Math.max(vh / 2, fy));
  return { s, fx, fy, blur: type === "close" ? 3.2 : type === "medium" ? 2 : 1.1 };
}

const DAYS = []; BEATS.forEach((b, i) => { if (b.day && b.day !== "-") DAYS.push({ label: b.day.replace("DAY ", "D"), start: b.start }); else if (b.day === "-" && DAYS.length && !DAYS.endMark) { DAYS.endMark = true; DAYS[DAYS.length - 1].end = b.start; } });
if (DAYS.length) DAYS[DAYS.length - 1].end ??= TOTAL;
const sceneIdx = new Map(); { let n = 0; BEATS.forEach((b, i) => { if (i > 0 && sceneKey(BEATS[i - 1]) !== sceneKey(b)) sceneIdx.set(i, n++); }); }
// Screen-space boxes of everyone's head + arms (and thought bubbles) at beat-local time lt.
function obstacles(b, lt) {
  const shot = b.shots.find((x) => lt < x.e) ?? b.shots[b.shots.length - 1];
  const [cx, py] = placement(b, lt);
  const cam = camera(shot.type, (lt - shot.s) / (shot.e - shot.s), cx, py, b.pose, (b.idx + b.shots.indexOf(shot)) % 2 === 0, shot.custom);
  const toS = (x, y) => [OW / 2 + (x - cam.fx) * cam.s, OH / 2 + (y - cam.fy) * cam.s];
  const box = (x0, y0, x1, y1) => { const [a, c] = toS(x0, y0), [d, e] = toS(x1, y1); return [a, c, d, e]; };
  const out = [];
  if (b.pose !== "lie" && b.pose !== "lieAwake") out.push(box(cx - 95 * SCALE, py - 215 * SCALE, cx + 95 * SCALE, py + 35 * SCALE));
  else out.push(box(cx - 260 * SCALE, py - 80 * SCALE, cx + 120 * SCALE, py + 40 * SCALE));
  for (const pp of b.people ?? []) {
    const ps = SCALE * (pp.s ?? 0.92), lib = POSE_LIB[pp.pose ?? "stand"], ppy = (pp.y ?? GROUND) - (lib.sitH ?? (lib.sit ? 58 : 130)) * ps;
    const px = pp.walk ? pp.walk[0] + (pp.walk[1] - pp.walk[0]) * Math.min(1, lt / b.dur) : pp.x;
    out.push(box(px - 95 * ps, ppy - 215 * ps, px + 95 * ps, ppy + 35 * ps));
  }
  for (const it of b.items ?? []) if ((it.type === "thought" || it.type === "say") && (it.delay ?? 0) <= lt) { const k = it.scale ?? 1.4; out.push(box(it.x - 170 * k, it.y - 80 * k, it.x + 170 * k, it.y + 80 * k)); }
  return out;
}
const SPOTS = new Map();
function captionSpot(b, ch) {
  const key = b.idx + ":" + ch.s;
  if (SPOTS.has(key)) return SPOTS.get(key);
  const half = OW * 0.46, cands = [
    { cx: OW / 2, y: CAP_Y, maxW: VERTICAL ? 960 : 1650 },
    { cx: OW * 0.26, y: CAP_Y, maxW: half }, { cx: OW * 0.74, y: CAP_Y, maxW: half },
  ];
  if (!b.card && !b.quiz) cands.push({ cx: OW / 2, y: VERTICAL ? 300 : 175, maxW: VERTICAL ? 960 : 1500, top: true });
  const times = [ch.s, (ch.s + ch.e) / 2, ch.e].map((x) => Math.min(b.dur - 0.01, Math.max(0, x)));
  const obs = times.flatMap((x) => obstacles(b, x));
  let best = null;
  for (const [ci, c] of cands.entries()) {
    const h = VERTICAL ? 110 : 92, rect = [c.cx - c.maxW / 2, c.y - h * 0.85, c.cx + c.maxW / 2, c.y + h * 0.3];
    let cover = 0;
    for (const o of obs) { const w = Math.min(rect[2], o[2]) - Math.max(rect[0], o[0]), hh = Math.min(rect[3], o[3]) - Math.max(rect[1], o[1]); if (w > 0 && hh > 0) cover += w * hh; }
    const score = cover + ci * 400; // prefer the bottom-centre strip when it's clear
    if (!best || score < best.score) best = { ...c, score };
  }
  SPOTS.set(key, best);
  return best;
}
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
  // acting (MOTION.md §3): anticipation (small counter-move), then a back.out overshoot settle;
  // overlapping action: body leads, arms trail ~50/80 ms, head ~60 ms
  const snap = i === 0 || sceneChanged || lyingSwap;
  const sf = b.settle ? b.settle / 0.5 : 1; // slower, readable transitions (e.g. sitting down)
  const act = (d) => snap ? 1 : keys(ltc - d, [[0, 0], [0.08 * sf, -0.07, EASE.sine.out], [0.5 * sf, 1, b.settle ? EASE.cinematic : EASE.back.out]]);
  const kBody = act(0), kArmL = act(0.05), kArmR = act(0.08), kHead = act(0.06);
  const k = kBody;
  const prevR = resolved[Math.max(0, i - 1)], curR = resolved[i];
  const pose = lerpPose(prevR, curR, kBody);
  const pa = lerpPose(prevR, curR, kArmL), pr = lerpPose(prevR, curR, kArmR), ph0 = lerpPose(prevR, curR, kHead);
  pose.armL = pa.armL; if (!pose.overHead) pose.armR = pr.armR; pose.headTilt = ph0.headTilt;
  const anim = POSE_LIB[b.pose].anim;
  const ph = tc * 2 * Math.PI;
  const speaking = ltc < b.speech, lv = speaking ? loud(tc) : 0;
  if (b.pose !== "lie" && b.pose !== "lieAwake") {
    // standing still means still: only the head moves with the voice, plus talking gestures
    pose.headTilt += lv * Math.sin(tc * 9) * 3;
    const g = speaking && TALKERS.has(b.pose) ? 1 : 0;
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
  if (anim === "run" || anim === "walk") {
    // distance-driven gait; blends back to standing as we arrive
    const run = anim === "run", wd = b.walkDur ?? b.dur;
    let dist, dirn = 1, m = 1;
    if (b.walk) {
      const [xa] = placement(b, 0), [xb] = placement(b, lt);
      dist = Math.abs(xb - xa) / SCALE; dirn = b.walk[1] >= b.walk[0] ? 1 : -1;
      m = Math.min(1, Math.max(0, (wd - lt) / 0.3), lt / 0.15 + 0.2);
    } else dist = ltc * (run ? 260 : 130);
    gait(pose, dist, dirn, m, run);
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

  applyAct(pose, b.act, lt);
  const blinking = !NO_BLINK.has(pose.expr) && ((tc + i * 0.7) % 3.4) < 0.13;
  if (blinking) pose.expr = "blink";
  // lip flaps while the narrator speaks
  if (TALKERS.has(b.pose) && !blinking && speaking) pose.mouth = mouthAt(b, lt, tc);

  // squash & stretch on a pose snap (character frames 0..3)
  // squash on the anticipation, stretch on the release, settle (volume preserved)
  const sy = poseChanged ? keys(ltc / (b.settle ? b.settle / 0.5 : 1), [[0, 1], [0.08, 0.93, EASE.sine.out], [0.2, 1.05, EASE.power2.out], [0.42, 1, EASE.sine.inOut]]) : 1, sx = 1 / Math.sqrt(sy);

  const [x1, y1] = placement(b, lt);
  const [x0, y0] = sceneChanged ? [x1, y1] : placement(pb, pb.dur);
  const kk = b.walk ? 1 : k;
  const cx = x0 + (x1 - x0) * kk, py = y0 + (y1 - y0) * kk;

  // world layers
  const sc = b.scene ? SCENES[b.scene.name](b.scene, tc) : SCENES.studio({}, tc);
  // ---- bubble layout (world space, before the camera): each visible bubble is placed where it covers no face and
  // no other bubble, as close to its authored spot as possible, with room for its tail to reach the speaker's head
  const BL = new Map();
  {
    const heads = [{ k: "eddie", x: cx, y: py - (pose.lift ?? 0) * SCALE - 204 * SCALE, r: 62 * SCALE }];
    for (const [pi, pp] of (b.people ?? []).entries()) {
      const ps = SCALE * (pp.s ?? 0.92), lib = POSE_LIB[pp.pose ?? "stand"], ppy = (pp.y ?? GROUND) - (lib.sitH ?? (lib.sit ? 58 : 130)) * ps;
      heads.push({ k: pi, x: pp.walk ? pp.walk[0] + (pp.walk[1] - pp.walk[0]) * Math.min(1, lt / b.dur) : pp.x, y: ppy - 204 * ps, r: 62 * ps });
    }
    const placed = [], TOP = 128;
    for (const it of b.items ?? []) {
      if (!(it.type === "thought" || it.type === "say") || it.who === "none") continue;
      if (it.delay !== undefined && lt < it.delay) continue;
      if (it.life && lt > it.delay + it.life + 0.2) continue;
      const aim = Array.isArray(it.who) ? { x: it.who[0], y: it.who[1] } : it.who !== undefined ? heads.find((h) => h.k === it.who) : heads.slice().sort((p1, p2) => Math.abs(p1.x - it.x) - Math.abs(p2.x - it.x))[0];
      if (!aim) continue;
      const parts = it.arg?.pic ? ["      "] : String(it.arg?.t ?? "").split("|"), longest = Math.max(...parts.map((l) => l.length)), S0 = it.scale ?? 1.4;
      const bw = (it.type === "say" ? longest * 20 + 64 : longest * 19 + 80) * S0, bh = (it.type === "say" ? parts.length * 46 + 38 : parts.length * 44 + 52) * S0;
      const gap = it.type === "say" ? 62 : 80, side = Math.sign(it.x - aim.x) || (aim.x < W / 2 ? 1 : -1);
      const cands = [
        [it.x, Math.min(it.y, aim.y - gap - bh / 2)],                                   // authored spot, lifted clear of the head
        [aim.x + side * bw * 0.25, aim.y - gap - bh / 2],                              // straight above
        [aim.x + side * (bw / 2 + 50), aim.y - gap * 0.6 - bh / 2],                     // up and to the side
        [aim.x - side * (bw / 2 + 50), aim.y - gap * 0.6 - bh / 2],
        [aim.x + side * (bw / 2 + 120), aim.y + 30],                                    // beside the head
        [aim.x - side * (bw / 2 + 120), aim.y + 30],
        [aim.x + side * bw * 0.2, aim.y - gap - bh / 2, 66],                             // higher up (the camera eases out to fit)
      ];
      let best = null;
      for (const [k, [x0, y0, top0]] of cands.entries()) {
        const x = Math.min(W - bw / 2 - 10, Math.max(bw / 2 + 10, x0)), y = Math.max((top0 ?? TOP) + bh / 2, y0);
        let cost = k * 40 + Math.hypot(x - it.x, y - it.y) * 0.15 + (top0 ? 150 : 0);
        for (const h of heads) if (h !== aim && Math.abs(h.x - x) < bw / 2 + 20 && h.y > y && Math.abs(h.x - x) < Math.abs(aim.x - x)) cost += 1500; // reads as someone else's
        for (const h of heads) { // never over a face
          const dx = Math.max(Math.abs(h.x - x) - bw / 2, 0), dy = Math.max(Math.abs(h.y + h.r - y) - bh / 2, 0);
          if (Math.hypot(dx, dy) < h.r + 6) cost += 5000;
        }
        for (const r of placed) { const ox = Math.min(x + bw / 2, r.x + r.w / 2) - Math.max(x - bw / 2, r.x - r.w / 2), oy = Math.min(y + bh / 2, r.y + r.h / 2) - Math.max(y - bh / 2, r.y - r.h / 2); if (ox > 0 && oy > 0) cost += 3000 + ox * oy * 0.05; }
        if (aim.y - (y + bh / 2) < 20 && Math.abs(aim.x - x) < bw / 2) cost += 800; // tail would be buried
        if (!best || cost < best.cost) best = { x, y, cost };
      }
      placed.push({ x: best.x, y: best.y, w: bw, h: bh });
      BL.set(it, { x: best.x, y: best.y, w: bw, h: bh, aim });
    }
  }
  const shot = b.shots.find((s) => lt < s.e) ?? b.shots[b.shots.length - 1];
  const cam = camera(shot.type, (lt - shot.s) / (shot.e - shot.s), cx, py, b.pose, (b.idx + b.shots.indexOf(shot)) % 2 === 0, shot.custom);
  // keep every visible bubble fully in frame (under the HUD): pan, and if that's not enough, ease the zoom out
  if (BL.size) {
    for (let pass = 0; pass < 2; pass++) {
      let vw = OW / cam.s, vh = OH / cam.s, top = cam.fy - vh / 2, left = cam.fx - vw / 2;
      const m = 125 / cam.s, mx = 20 / cam.s;
      const bx0 = Math.min(...[...BL.values()].map((r) => r.x - r.w / 2)), bx1 = Math.max(...[...BL.values()].map((r) => r.x + r.w / 2)), by0 = Math.min(...[...BL.values()].map((r) => r.y - r.h / 2));
      const needW = bx1 - bx0 + 2 * mx, needTop = by0 - m;
      const faceBottom = Math.max(...[...BL.values()].map((r) => r.aim.y + 125 * SCALE)) + 30;
      if (needW > vw || faceBottom - needTop > vh) { cam.s = Math.max(BASE, Math.min(cam.s, OW / needW, OH / (faceBottom - needTop))); vw = OW / cam.s; vh = OH / cam.s; }
      if (needTop < cam.fy - vh / 2) cam.fy = needTop + vh / 2;
      if (bx0 - mx < cam.fx - vw / 2) cam.fx = bx0 - mx + vw / 2;
      if (bx1 + mx > cam.fx + vw / 2) cam.fx = bx1 + mx - vw / 2;
      cam.fx = Math.min(W - vw / 2, Math.max(vw / 2, cam.fx)); cam.fy = Math.min(H - vh / 2, Math.max(vh / 2, cam.fy));
    }
  }
  // handheld drift: the camera is never perfectly still
  if (!shot.still) { cam.fx += Math.sin(t * 0.43) * 1.5; cam.fy += Math.cos(t * 0.37) * 1; } // barely-there drift
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
    const q = { ...base }; // background people stand still unless they have an action
    const pph = (tc + pi * 0.37) * 2 * Math.PI, pa = pp.anim ?? POSE_LIB[pp.pose ?? "stand"].anim;

    if (pa === "walk" || pp.walk) {
      const pps = SCALE * (pp.s ?? 0.92), d = pp.walk ? Math.abs(pp.walk[1] - pp.walk[0]) * Math.min(1, lt / b.dur) / pps : (ltc + pi) * 120;
      const goDir = pp.walk ? Math.sign(pp.walk[1] - pp.walk[0]) || 1 : 1;
      gait(q, d, goDir * (pp.flip ? -1 : 1));
    }
    if (pa === "dance") {
      const w = Math.sin(pph * 2.2 + pi), w2 = Math.sin(pph * 1.1 + pi);
      q.lean += w2 * 10; q.lift += Math.abs(w) * 14;
      q.armL = { ...q.armL, a1: -150 + 50 * w, a2: -170 + 40 * w }; q.armR = { ...q.armR, a1: 150 - 50 * w, a2: 170 - 40 * w };
    }
    const on = (from, to) => (pp.animFrom ?? 0) <= lt && lt < (pp.animTo ?? 1e9);
    const cyc = (period, off = 0) => (((ltc + pi * 0.9 + off) % period) + period) % period; // seconds into a repeating action
    const pulse = (c, a, d) => Math.sin(Math.PI * Math.min(1, Math.max(0, (c - a) / d))); // 0 -> 1 -> 0 over [a, a+d]
    if (pa === "dance2" && on()) { // two-step with fists at the chest
      const w = Math.sin(pph * 1.9 + pi); q.lean += w * 6; q.lift += Math.abs(Math.sin(pph * 3.8)) * 8;
      q.armL = { target: [-30 + w * 8, -70], bend: -1, fist: true }; q.armR = { target: [30 + w * 8, -70], bend: 1, fist: true };
      q.legL = { a1: -12 + w * 8, a2: -6 }; q.legR = { a1: 12 + w * 8, a2: 6 };
    }
    if (pa === "dance3" && on()) { // sway and clap overhead
      const w = Math.sin(pph * 1.1 + pi), c = Math.abs(Math.sin(pph * 2.2)); q.lean += w * 7;
      q.armL = { target: [-14 - c * 22, -176], bend: -1 }; q.armR = { target: [14 + c * 22, -176], bend: 1 };
    }
    if (pa === "dance4" && on()) { // disco point: up-right, down-left
      const up = Math.sin(pph * 1.0 + pi) > 0; q.lean += up ? 6 : -6; q.lift += Math.abs(Math.sin(pph * 2)) * 6;
      q.armR = up ? { target: [62, -170], bend: 1 } : { target: [30, -20], bend: 1 }; q.armL = { target: [-30, -60], bend: -1, fist: true };
    }
    if (pa === "talk" && on()) { // small hand gestures + nods (not arm-waving)
      const c = Math.sin(pph * 0.7);
      q.armR = { target: [40 + c * 8, -52 + Math.max(0, Math.sin(pph * 1.3)) * -14], bend: 1 }; q.headTilt += Math.sin(pph * 1.6) * 4; q.mouth = Math.sin(pph * 3) > 0.2 ? 1 : 0;
    }
    if (pa === "wave" && on()) q.armR = { ...q.armR, a1: 150, a2: 175 + Math.sin(pph * 1.8) * 22 };
    if (pa === "strap" && on()) { // holding a subway strap, swaying with the car
      q.armR = { target: [22, -172], bend: 1 }; q.lean += Math.sin(tc * 2.3) * 3; q.headTilt += Math.sin(tc * 2.3 + 0.6) * 2;
    }
    if (pa === "bob" && on()) { q.headTilt += Math.sin(tc * 2 * Math.PI * 1.6) * 6; q.lift += Math.abs(Math.sin(tc * 2 * Math.PI * 1.6)) * 2; q.armR = { target: [22, -172], bend: 1 }; }
    if (pa === "watch" && on()) { // checks the time, impatient foot tap
      const c = cyc(3.2); q.armL = { target: [-6, -66], bend: -1 }; q.headTilt += 10 * pulse(c, 0.2, 1.6); q.legR = { ...q.legR, a1: (q.legR.a1 ?? 10) + 5 * Math.max(0, Math.sin(tc * 14)) * (c > 1.8 ? 1 : 0) };
    }
    if (pa === "scroll" && on()) { // phone in one hand at chest height, eyes down, a small flick now and then
      const c = cyc(2.4), fl = pulse(c, 1.6, 0.25);
      q.armR = { target: [30, -50 - fl * 4], bend: 1 }; q.holdR = "phone"; q.holdRRot = -6 + fl * 4; q.armL = { a1: -12, a2: -6 }; q.headTilt += 12;
    }
    if ((pa === "sip" || pa === "icecream") && on()) { // raise to the mouth, taste, savour, lower — every ~5 s
      const ice = pa === "icecream", c = cyc(5.2, 0.8), eio = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
      const up = c < 1.0 ? 0 : c < 1.6 ? eio((c - 1.0) / 0.6) : c < 2.6 ? 1 : c < 3.2 ? 1 - eio((c - 2.6) / 0.6) : 0;
      const at = c >= 1.6 && c < 2.6, lick = ice && at ? Math.max(0, Math.sin((c - 1.6) * Math.PI * 3)) : 0;
      q.holdR = ice ? "icecream" : (pp.hold ?? "coffee");
      // the cup/cone stops at the side of the mouth (not over the face); drinks tilt, cones get licked
      q.armR = { target: [30 - (ice ? 0 : 6) * up, -48 - (ice ? 54 : 58) * up + lick * 6], bend: 1 };
      q.holdRRot = ice ? -10 * up : -38 * up * (at ? 1 : 0.6);
      q.headTilt += ice ? (8 * up + lick * 4) : (-7 * up);
      if (at) q.mouth = ice ? 0.4 + lick * 0.4 : 0.15;
      if (c >= 2.7 && c < 3.9) q.expr = "happy"; // tasting it
      if (c >= 2.7 && c < 3.9 && pp.yum !== false) q.yum = (c - 2.7) / 1.2;
    }
    if (pa === "wipe" && on()) { // wiping the counter in slow circles
      const w = tc * 2.4; q.holdR = "cloth"; q.armR = { target: [44 + Math.cos(w) * 22, -34 + Math.sin(w) * 6], bend: 1 }; q.lean += 6 + Math.cos(w) * 2; q.headTilt += 8;
    }
    if (pa === "write" && on()) { // clipboard held at the waist, small steady pen strokes, glances up every few seconds
      const c = cyc(3.8), look = pulse(c, 2.8, 0.9), wr = 1 - look;
      q.holdL = "clipboard"; q.armL = { target: [-8, -30], bend: -1 }; q.holdR = "pen"; q.holdRRot = -20;
      q.armR = { target: [10 + Math.sin(tc * 6) * 2.2 * wr + ((tc * 0.8) % 1) * 6 * wr, -40 + Math.sin(tc * 11) * 1.2 * wr - look * 6], bend: 1 };
      q.headTilt += 12 * wr;
    }
    if (pa === "newspaper" && on()) { q.holdR = "newspaper"; q.armR = { target: [20, -72], bend: 1 }; q.armL = { target: [-22, -70], bend: -1 }; q.headTilt += 6 + Math.sin(tc * 0.8) * 2; }
    if ((pa === "read" || pp.pose === "read") && on()) { // turns a page every ~4 s
      const c = cyc(4.2), f = pulse(c, 3.3, 0.6); q.armR = { target: [36 - 52 * f, -50 - 22 * f], bend: -1 };
    }
    if (pa === "pray" && on()) { q.armL = { target: [-6, -96], bend: -1 }; q.armR = { target: [6, -96], bend: 1 }; q.headTilt += Math.sin(tc * 1.4) * 5; q.lift += Math.abs(Math.sin(tc * 3)) * 2; }
    if (pp.dog) q.armR = { target: [44, -22], bend: 1 };
    applyAct(q, pp.act, lt);
    if (!NO_BLINK.has(q.expr) && ((tc + pi * 1.3) % 3.1) < 0.13) q.expr = "blink";
    const ps = SCALE * (pp.s ?? 0.92), ppy = (pp.y ?? GROUND) - (POSE_LIB[pp.pose ?? "stand"].sitH ?? (POSE_LIB[pp.pose ?? "stand"].sit ? 58 : 130)) * ps;
    const px = pp.walk ? pp.walk[0] + (pp.walk[1] - pp.walk[0]) * Math.min(1, lt / b.dur) : pp.x;
    world += `<ellipse cx="${px}" cy="${(pp.y ?? GROUND) + 6}" rx="${105 * (pp.s ?? 0.92)}" ry="14" fill="url(#softShadow)"/>`;
    world += `<g filter="${lightF}"><g transform="translate(${px},${ppy}) scale(${(pp.flip ? -1 : 1) * ps},${ps})">${character(q)}</g></g>`;
    if (q.yum !== undefined) { // a little "mmm!" floats up while they savour it
      const u = q.yum, a2 = Math.min(1, u / 0.15, (1 - u) / 0.25);
      world += `<g opacity="${a2.toFixed(3)}" transform="translate(${(px + (pp.flip ? -1 : 1) * 70 * ps).toFixed(1)},${(ppy - 230 * ps - u * 40).toFixed(1)}) rotate(-8) scale(${(0.8 + 0.2 * EASE.back.out(Math.min(1, u * 3))).toFixed(3)})"><text text-anchor="middle" font-size="44" fill="#fff" stroke="#1b1b20" stroke-width="9" paint-order="stroke" style="font-family:Bubble,InkHand,sans-serif;font-weight:800">${pp.yumText ?? "mmm!"}</text></g>`;
    }
    if (pp.dog) { // a dog trotting ahead on a leash from the walker's hand
      const fs = pp.flip ? -1 : 1, hx = px + fs * ps * 44, hy = ppy + ps * (-22 - (q.lift ?? 0)), dx = px + fs * ps * 120, dy = pp.y ?? GROUND;
      world += `<path d="M${hx.toFixed(1)},${hy.toFixed(1)} Q${((hx + dx) / 2).toFixed(1)},${(Math.max(hy, dy - 60) + 40).toFixed(1)} ${(dx + fs * 26).toFixed(1)},${(dy - 80).toFixed(1)}" fill="none" stroke="#e5584f" stroke-width="4"/>`;
      world += `<g transform="translate(${dx.toFixed(1)},${dy}) scale(${ps * 0.75})">${PROPS.dog([0, 0], { t: tc, walk: !!pp.walk, dir: fs })}</g>`;
    }
  }
  const layerOf = (it) => it.type === "thought" || it.type === "say" ? "bubble" : it.fg ? "fg" : "back";
  const drawItems = (layer) => { let out = ""; for (const it of b.items ?? []) {
    if (layerOf(it) !== layer) continue;
    if (it.delay && lt < it.delay) continue;
    if (it.life && lt > it.delay + it.life + 0.2) continue;
    let pop = 1, op = 1;
    if (it.delay !== undefined) {
      pop = 0.2 + 0.8 * spring(lt - it.delay, { stiffness: 260, damping: 13 });           // springy entrance
      const out = seg(lt, it.life ? it.delay + it.life : b.dur - 0.2, 0.18, EASE.power2.in); // quick, accelerating exit (or after `life` s)
      pop *= 1 - 0.35 * out; op = 1 - out;
    }
    const fl = it.type === "thought" || it.type === "say" ? Math.sin(t * 1.8 + it.x * 0.01) * 5 : 0;
    const sc0 = (it.scale ?? 1.4) * pop, L = BL.get(it);
    const aim = L?.aim ?? null, ix = L?.x ?? it.x, iy = L?.y ?? it.y;
    let arg = it.type === "duck" ? { ...it.arg, t, quack: it.quackAt !== undefined && lt >= it.quackAt && lt < it.quackAt + 0.22 } : it.arg;
    if (it.winAt) arg = { ...arg, wins: (arg?.wins ?? 0) + it.winAt.reduce((acc, w) => acc + EASE.power3.out(Math.min(1, Math.max(0, (lt - w) / 0.55))), 0) };
    if (aim) arg = { ...arg, to: [(aim.x - ix) / sc0, (aim.y - 14 - (iy + fl)) / sc0] };
    out += `<g opacity="${op.toFixed(3)}" transform="translate(${ix.toFixed(1)},${(iy + fl).toFixed(1)}) scale(${sc0})">${PROPS[it.type]([0, 0], arg)}</g>`;
  } return out; };
  world += drawItems("back");
  if (b.pose !== "lie" && b.pose !== "lieAwake") world += `<ellipse cx="${cx}" cy="${GROUND + 6}" rx="${120 - pose.lift}" ry="16" fill="url(#softShadow)"/>`;
  const footY = POSE_LIB[b.pose].sit ? py : GROUND;
  world += `<g filter="${lightF}"><g transform="translate(${cx},${footY}) scale(${sx},${sy}) translate(${-cx},${-footY})"><g transform="translate(${cx},${py}) scale(${SCALE})">${character(pose)}</g></g></g>`;
  // reaction pops: picked from Eddie's expression / pose, spring in near his head
  const emoteKind = b.emote ?? ({ shocked: "bang", scared: "sweat", strain: "sweat", wrecked: "sweat", thinking: "q", angry: "anger" }[curR.expr]
    ?? ({ think: "q", panic: "sweat", coverEars: "sweat", celebrate: "spark", idea: "spark", highFive: "spark", dance: "heart" }[b.pose]));
  if (emoteKind && b.pose !== "lie" && b.pose !== "lieAwake" && lt < 2.6) {
    const sp = spring(lt - 0.12, { stiffness: 300, damping: 12 }), fade = 1 - seg(lt, 2.2, 0.35, EASE.power2.in);
    const hx = cx + (b.pose === "think" ? 115 : 92) * (SCALE / 1.85), hy = py - (pose.lift ?? 0) * SCALE - 300 * (SCALE / 1.85) + Math.sin(t * 3) * 6;
    world += `<g opacity="${fade.toFixed(3)}" transform="translate(${hx.toFixed(1)},${hy.toFixed(1)}) scale(${(1.5 * sp).toFixed(3)})">${PROPS.emote([0, 0], { kind: emoteKind })}</g>`;
  }
  // motion graphics on the action: speed lines behind a runner, sound waves closing in on covered ears
  if (POSE_LIB[b.pose].anim === "run" && b.walk && lt < (b.walkDur ?? b.dur) - 0.2) {
    const d = Math.sign(b.walk[1] - b.walk[0]) || 1;
    for (let j = 0; j < 7; j++) { const yy = py - (40 + j * 34) * SCALE * 0.6, ph2 = ((tc * 3.2 + j * 0.37) % 1), len = 120 + (j % 3) * 60;
      const x0 = cx - d * (90 + ph2 * 260); world += `<path d="M${x0.toFixed(1)},${yy.toFixed(1)} l${(-d * len).toFixed(1)},0" stroke="#fff" stroke-width="${7 - (j % 3) * 2}" stroke-linecap="round" opacity="${(0.75 * (1 - ph2)).toFixed(2)}"/>`; }
  }
  if (b.pose === "coverEars") {
    const hx = cx, hy = py - 150 * SCALE;
    for (let j = 0; j < 4; j++) { const ph2 = 1 - ((tc * 0.9 + j / 4) % 1), r = 120 + ph2 * 420;
      world += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#ffd84d" stroke-width="${(3 + (1 - ph2) * 6).toFixed(1)}" stroke-dasharray="26 18" opacity="${(0.5 * (1 - ph2) + 0.05).toFixed(2)}"/>`; }
  }
  // contact bursts (high-fives, fist bumps, handoffs): a quick radial pop at the touch point
  for (const k of [...(b.act ?? []), ...(b.people ?? []).flatMap((p) => p.act ?? [])]) if (k.burst) {
    const u = (lt - (k.at + (k.dur ?? 0.45))) / 0.35;
    if (u >= 0 && u < 1) { const e = EASE.expo.out(u), r0 = 20 + e * 70, r1 = 40 + e * 110, op = 1 - EASE.power2.in(u);
      world += `<g opacity="${op.toFixed(3)}" transform="translate(${k.burst[0]},${k.burst[1]})">` + [...Array(10)].map((_, j) => { const a = j * 36 * Math.PI / 180; return `<path d="M${(Math.cos(a) * r0).toFixed(1)},${(Math.sin(a) * r0).toFixed(1)} L${(Math.cos(a) * r1).toFixed(1)},${(Math.sin(a) * r1).toFixed(1)}" stroke="${j % 2 ? "#ffd84d" : "#fff"}" stroke-width="${(9 * (1 - u) + 2).toFixed(1)}" stroke-linecap="round"/>`; }).join("") + `<circle r="${(r0 * 0.6).toFixed(1)}" fill="none" stroke="#fff" stroke-width="${(6 * (1 - u)).toFixed(1)}"/></g>`; }
  }
  if (b.crumbs && b.crumbs.at !== undefined && lt >= b.crumbs.at && lt < b.crumbs.at + 1.6) world += PROPS.crumbs([0, 0], { ...b.crumbs, p: Math.min(1, (lt - b.crumbs.at) / 0.9) });
  world += drawItems("fg"); // tables etc. in front of the characters
  world += sc.fg;
  world += drawItems("bubble"); // speech/thought bubbles always on top
  if (b.blanket) world += `<path d="M330,640 Q520,600 700,650 L700,800 Q480,820 300,800 Z" fill="#7fa7d9" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/><path d="M340,680 Q520,650 690,690" fill="none" stroke="#6a92c6" stroke-width="5"/>`;
  // screen shake on impacts (first ~6 frames)
  const shakeOn = ["shocked", "scared", "panic"].includes(b.pose) && lt < 0.22;
  const jx = shakeOn ? Math.sin(t * 157) * 14 : 0, jy = shakeOn ? Math.cos(t * 131) * 10 : 0;
  // scene transitions: flash / whip-pan / iris / slide, rotating through the episode
  let tx = 0, wrapOpen = "", wrapClose = "", trFilter = "";
  if (sceneChanged && lt < 0.4) {
    const style = TR[i] ?? "whip", e = EASE.expo.out(Math.min(1, lt / 0.35));
    if (style === "dip") wrapClose = `<rect width="${OW}" height="${OH}" fill="#000" opacity="${(1 - EASE.sine.out(Math.min(1, lt / 0.3))).toFixed(3)}"/>`;
    if (style === "whip") { tx = (1 - e) * OW * 0.9 * (i % 2 ? 1 : -1); trFilter = `<filter id="whip" x="-20%" y="0" width="140%" height="100%"><feGaussianBlur stdDeviation="${(1 - e) * 60} 0"/></filter>`; wrapOpen = `<g filter="url(#whip)">`; wrapClose = "</g>"; }
    if (style === "slide") tx = (1 - e) * OW * (i % 2 ? -1 : 1);
    if (style === "iris") { trFilter = `<clipPath id="iris"><circle cx="${OW / 2}" cy="${OH / 2}" r="${e * Math.hypot(OW, OH) * 0.6}"/></clipPath>`; wrapOpen = `<rect width="${OW}" height="${OH}" fill="#000"/><g clip-path="url(#iris)">`; wrapClose = "</g>"; }
    if (style === "flash") wrapClose = `<rect width="${OW}" height="${OH}" fill="#fff" opacity="${(1 - Math.min(1, lt / 0.12)).toFixed(3)}"/>`;
  }
  let s = `${wrapOpen}<g transform="translate(${OW / 2 + jx + tx},${OH / 2 + jy}) scale(${cam.s.toFixed(4)}) translate(${-cam.fx},${-cam.fy})">${world}</g>${wrapClose}`;
  s += `<rect width="${OW}" height="${OH}" fill="url(#vig)"/>`;

  // HUD -------------------------------------------------------------
  const M = "font-family:'MBlack',sans-serif;font-weight:900";
  // day stamp: expo.out fly-in with a springy rotation, gentle breathe, ease-in exit before the next day
  let day = null, dayStart = 0, dayEnd = TOTAL;
  for (let j = i; j >= 0; j--) if (BEATS[j].day) { day = BEATS[j].day; dayStart = BEATS[j].start; break; }
  for (let j = i + 1; j < BEATS.length; j++) if (BEATS[j].day) { dayEnd = BEATS[j].start; break; }
  if (day && day !== "-") {
    const ta = t - dayStart, x = lerp(-320, VERTICAL ? 40 : 40, seg(ta, 0, 0.5, EASE.expo.out));
    const rot = lerp(-16, -3, seg(ta, 0.05, 0.6, EASE.back.out)) + Math.sin(t * 1.3) * 0.6;
    const exitY = -170 * seg(t, dayEnd - 0.25, 0.22, EASE.power2.in), y = (VERTICAL ? 140 : 50) + exitY;
    s += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(2)})"><rect x="5" y="8" width="250" height="88" rx="16" fill="rgba(0,0,0,0.25)"/><rect width="250" height="88" rx="16" fill="#ff5a4a" stroke="#000" stroke-width="6"/>
      <text x="125" y="62" text-anchor="middle" font-size="52" fill="#fff" style="${M}">${day}</text></g>`;
  }
  // fact card: spring scale-in + rotation settle, lines stagger up, fast ease-in exit (asymmetry)
  if (b.card) {
    const sc0 = 0.3 + 0.7 * spring(lt - 0.08, { stiffness: 220, damping: 15 }), rot = lerp(-10, -2, seg(lt, 0.08, 0.55, EASE.back.out));
    const ex = seg(lt, b.dur - 0.24, 0.22, EASE.power2.in), scl = sc0 * (1 - 0.15 * ex), op = Math.min(1, seg(lt, 0.08, 0.12)) * (1 - ex);
    const lines = []; let line = "";
    for (const w of b.card.split(" ")) { if ((line + " " + w).trim().length > 13 && line) { lines.push(line); line = w; } else line = (line + " " + w).trim(); }
    lines.push(line);
    const bw = Math.max(...lines.map((l) => l.length)) * 50 + 90, bh = lines.length * 96 + 56;
    const cxCard = VERTICAL ? OW / 2 : 1390, cyCard = (VERTICAL ? 1480 : 110) + bh / 2 - 20 * ex;
    s += `<g transform="translate(${cxCard},${cyCard.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${scl.toFixed(3)})" opacity="${op.toFixed(3)}">
      <rect x="${-bw / 2 + 8}" y="${-bh / 2 + 10}" width="${bw}" height="${bh}" rx="20" fill="rgba(0,0,0,0.25)"/>
      <rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="20" fill="#ffd84d" stroke="#000" stroke-width="7"/>` +
      lines.map((l, j) => { const q = seg(lt, 0.18 + stagger(j, lines.length, 0.07), 0.3, EASE.power3.out);
        return `<text x="0" y="${(-bh / 2 + 88 + j * 96 + (1 - q) * 26).toFixed(1)}" opacity="${q.toFixed(3)}" text-anchor="middle" font-size="76" fill="#000" style="${M}">${esc(l)}</text>`; }).join("") + `</g>`;
  }
  // kinetic captions: words rise in on their own cue (power3.out), the spoken word lights up.
  // Each chunk is placed where it covers nobody: bottom strip, bottom-left/right, or the top.
  const ch = b.chunks.find((c, j) => lt >= c.s - 0.08 && lt < (b.chunks[j + 1]?.s ?? c.e + 0.35) - 0.08);
  if (ch) {
    const spot = captionSpot(b, ch);
    const maxW = spot.maxW, base = VERTICAL ? 92 : 76;
    const raw = ch.words.reduce((n, w) => n + (WIDTH[w.w] ?? w.w.length * 70), 0) + SPACE * (ch.words.length - 1);
    const fs = Math.min(base, (maxW / raw) * 100), k = fs / 100, cy = spot.y;
    const bandA = Math.min(1, (lt - ch.s + 0.08) / 0.2, 1);
    if (spot.top) s += `<rect x="0" y="0" width="${OW}" height="${cy + 60}" fill="url(#capBandTop)" opacity="${bandA.toFixed(3)}"/>`;
    else s += `<rect x="0" y="${cy - 110}" width="${OW}" height="${OH - cy + 110}" fill="url(#capBand)" opacity="${bandA.toFixed(3)}"/>`;
    let x = spot.cx - (raw * k) / 2;
    for (const w of ch.words) {
      const ww = (WIDTH[w.w] ?? w.w.length * 70) * k, q = seg(lt, w.s - 0.07, 0.2, EASE.power3.out);
      const active = lt >= w.s - 0.02 && lt <= w.e + 0.06, sc = (0.86 + 0.14 * EASE.back.out(q)) * (active ? 1.06 : 1);
      if (q > 0) s += `<g transform="translate(${(x + ww / 2).toFixed(1)},${(cy + (1 - q) * 30).toFixed(1)}) scale(${sc.toFixed(3)})" opacity="${q.toFixed(3)}"><text x="0" y="0" text-anchor="middle" font-size="${fs.toFixed(1)}" fill="${/\d|thousand|hundred|percent|half|quarter/i.test(w.w) ? "#7CFF8B" : active ? "#ffd84d" : "#fff"}" stroke="#000" stroke-width="${(fs * 0.2).toFixed(1)}" stroke-linejoin="round" paint-order="stroke" style="${M}">${esc(w.w)}</text></g>`;
      x += ww + SPACE * k;
    }
  }
  // journey progress bar (Day 1 -> Day 30): a reason to keep watching
  if (DAYS.length && t >= DAYS[0].start - 0.2) {
    const endT = DAYS[DAYS.length - 1].end, a = seg(t, DAYS[0].start - 0.2, 0.45, EASE.power3.out) * (1 - seg(t, endT, 0.4, EASE.power2.in));
    if (a > 0) {
      const bw = VERTICAL ? 700 : 760, bx = OW / 2 - bw / 2, by = VERTICAL ? 70 : 34;
      let cur = 0; DAYS.forEach((d, j) => { if (t >= d.start) cur = j; });
      const nextD = DAYS[cur + 1], f = nextD ? seg(t, nextD.start - 0.6, 0.6, EASE.standard) : 0;
      const px = bx + bw * ((cur + f) / (DAYS.length - 1));
      s += `<g opacity="${a.toFixed(3)}"><rect x="${bx - 4}" y="${by - 4}" width="${bw + 8}" height="22" rx="11" fill="rgba(0,0,0,.35)"/><rect x="${bx}" y="${by}" width="${bw}" height="14" rx="7" fill="#fff"/><rect x="${bx}" y="${by}" width="${Math.max(0, px - bx).toFixed(1)}" height="14" rx="7" fill="#ff5a4a"/>` +
        DAYS.map((d, j) => { const x = bx + bw * (j / (DAYS.length - 1)), done = j <= cur; return `<circle cx="${x}" cy="${by + 7}" r="11" fill="${done ? "#ff5a4a" : "#fff"}" stroke="#000" stroke-width="4"/><text x="${x}" y="${by + 46}" text-anchor="middle" font-size="22" fill="#fff" stroke="#000" stroke-width="5" paint-order="stroke" style="${M}">${d.label}</text>`; }).join("") +
        `<g transform="translate(${px.toFixed(1)},${by + 7}) scale(0.42)">${head("happy")}</g></g>`;
    }
  }
  // quiz: three options pop in one by one, a clock ticks, the answer lights up green at the end
  if (b.quiz) {
    const qz = b.quiz, cyq = VERTICAL ? 1560 : 420, w = VERTICAL ? 300 : 340, gap = 30, qcx = VERTICAL ? OW / 2 : OW / 2 + 230, x0 = qcx - (3 * w + 2 * gap) / 2;
    const reveal = lt >= qz.revealAt, qa = seg(lt, 0.1, 0.35, EASE.back.out);
    if (lt >= qz.countFrom && !reveal) { // 3-2-1 countdown ring while the viewer guesses
      const span = qz.revealAt - qz.countFrom, el = lt - qz.countFrom, n = Math.max(1, 3 - Math.floor((el / span) * 3)), fr = ((el / span) * 3) % 1;
      const r = 54, circ = 2 * Math.PI * r, pulse = 1 + 0.12 * (1 - EASE.power2.out(Math.min(1, fr * 3)));
      s += `<g transform="translate(${VERTICAL ? OW / 2 : OW / 2 + 230},${(VERTICAL ? 1780 : 600)}) scale(${pulse.toFixed(3)})"><circle r="${r + 10}" fill="#1b1b22" stroke="#000" stroke-width="5"/><circle r="${r}" fill="none" stroke="#ffd84d" stroke-width="10" stroke-dasharray="${circ}" stroke-dashoffset="${(circ * fr).toFixed(1)}" transform="rotate(-90)"/>
        <text y="24" text-anchor="middle" font-size="70" fill="#fff" style="${M}">${n}</text></g>`;
    }
    s += `<g transform="translate(${qcx},${cyq - 120}) scale(${qa.toFixed(3)})"><rect x="-330" y="-48" width="660" height="88" rx="44" fill="#1b1b22" stroke="#000" stroke-width="5"/><text x="0" y="16" text-anchor="middle" font-size="46" fill="#fff" style="${M}">${esc(qz.q)}</text></g>`;
    qz.options.forEach((o, j) => {
      const t0q = qz.at[j], sp = spring(lt - t0q, { stiffness: 280, damping: 14 }), right = reveal && j === qz.answer, wrong = reveal && j !== qz.answer;
      if (sp <= 0) return;
      s += `<g transform="translate(${x0 + j * (w + gap) + w / 2},${cyq}) scale(${(sp * (right ? 1.1 : 1)).toFixed(3)})" opacity="${wrong ? 0.45 : 1}"><rect x="${-w / 2 + 6}" y="-44" width="${w}" height="96" rx="24" fill="rgba(0,0,0,.25)"/><rect x="${-w / 2}" y="-50" width="${w}" height="96" rx="24" fill="${right ? "#7CFF8B" : "#fff"}" stroke="#000" stroke-width="6"/>
        <circle cx="${-w / 2 + 44}" cy="-2" r="26" fill="${["#ff5a4a", "#5b8fd9", "#ffd84d"][j]}" stroke="#000" stroke-width="4"/><text x="${-w / 2 + 44}" y="12" text-anchor="middle" font-size="36" fill="#fff" stroke="#000" stroke-width="5" paint-order="stroke" style="${M}">${"ABC"[j]}</text>
        <text x="${22}" y="14" text-anchor="middle" font-size="44" fill="#000" style="${M}">${esc(o)}</text></g>`;
    });
  }
  if (b.blackout && lt > 1.6 && lt < 2.5) s += `<rect width="${OW}" height="${OH}" fill="#000"/>`;

  if (TR[i + 1] === "dip" && lt > b.dur - 0.28) s += `<rect width="${OW}" height="${OH}" fill="#000" opacity="${EASE.power2.in(Math.min(1, (lt - (b.dur - 0.28)) / 0.28)).toFixed(3)}"/>`;
  const fade = Math.min(1, t / 0.4, (TOTAL - t) / 0.8);
  if (fade < 1) s += `<rect width="${OW}" height="${OH}" fill="#000" opacity="${(1 - Math.max(0, fade)).toFixed(3)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OW}" height="${OH}" viewBox="0 0 ${OW} ${OH}"><defs>
    <filter id="dof" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${cam.blur}"/></filter>${trFilter}
    <radialGradient id="softShadow"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".6" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <filter id="lit-night"><feColorMatrix type="matrix" values="0.78 0 0 0 0.02  0 0.82 0 0 0.03  0 0 0.95 0 0.08  0 0 0 1 0"/></filter>
    <filter id="lit-sunset"><feColorMatrix type="matrix" values="1 0 0 0 0.04  0 0.9 0 0 0.02  0 0 0.8 0 0  0 0 0 1 0"/></filter>
    <filter id="lit-party"><feColorMatrix type="matrix" values="0.95 0 0 0 0.015  0 0.9 0 0 0  0 0 0.98 0 0.03  0 0 0 1 0"/></filter>
    <linearGradient id="capBandTop" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.55" stop-color="#000" stop-opacity="0.3"/><stop offset="1" stop-color="#000" stop-opacity="0.42"/></linearGradient><linearGradient id="capBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.55" stop-color="#000" stop-opacity="0.32"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient>
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

// measure every caption word in the real font (so kinetic word layout is exact)
const WIDTH = {}; let SPACE = 28;
{
  const words = [...new Set(BEATS.flatMap((b) => b.words.map((w) => w.w)))];
  const res = await page.evaluate((ws) => { const c = document.createElement("canvas").getContext("2d"); c.font = "900 100px MBlack"; return { w: ws.map((x) => c.measureText(x).width), sp: c.measureText(" ").width }; }, words);
  words.forEach((w, i) => (WIDTH[w] = res.w[i])); SPACE = res.sp + 6;
}
const tag = VERTICAL ? "9x16" : "16x9";
if (args.includes("--stills")) {
  mkdirSync(join(outDir, `stills-${tag}`), { recursive: true });
  for (const b of BEATS) {
    await page.evaluate((svg) => { document.getElementById("s").innerHTML = svg; }, frameSVG(args.includes("--stills-late") ? b.start + b.dur - 0.4 : b.start + Math.min(1.0, b.dur * 0.5)));
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
