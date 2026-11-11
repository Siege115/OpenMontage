// Renders an Eddie episode (beats file) to a 1080p MP4:
//   TTS per beat (ElevenLabs or local Piper) -> narration track -> frame-by-frame SVG
//   animation in headless Chromium -> ffmpeg encode with the narration.
//
//   node assets/characters/eddie/render-episode.mjs <beats.mjs> <outDir>
//        [--tts elevenlabs|piper] [--voice <elevenlabs voice id | piper .onnx>] [--fps 24] [--only 0-5]
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
const TTS = opt("--tts", "elevenlabs");
const FPS = Number(opt("--fps", 24));
const only = opt("--only", null);
const W = 1920, H = 1080, GROUND = 870, SCALE = 1.85, PAD = 0.35;

const { BEATS: ALL, TITLE, VOICE } = await import(pathToFileURL(beatsPath).href);
const voice = opt("--voice", TTS === "elevenlabs" ? (VOICE?.id ?? "JBFqnCBsd6RMkjVDRZzb") : join(outDir, "voices/en_US-ryan-high.onnx"));
let BEATS = ALL.map((b, i) => ({ ...b, idx: i }));
if (only) { const [a, z] = only.split("-").map(Number); BEATS = BEATS.slice(a, z + 1); }
mkdirSync(join(outDir, "audio"), { recursive: true });

// ---------- 1. narration ----------
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
async function elevenlabs(text, prev, next, outFile) {
  const s = VOICE?.settings ?? { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 0.95 };
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    // the key is injected by the network proxy (or taken from ELEVENLABS_API_KEY when run locally)
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY || "proxy-injected", "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: VOICE?.model ?? "eleven_multilingual_v2", voice_settings: s, previous_text: prev || undefined, next_text: next || undefined }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
}
const list = [];
for (const b of BEATS) {
  const h = createHash("sha1").update(TTS + voice + JSON.stringify(VOICE ?? {}) + b.text).digest("hex").slice(0, 12);
  const raw = join(outDir, "audio", `${h}.${TTS === "elevenlabs" ? "mp3" : "wav"}`), padded = join(outDir, "audio", `${h}.pad.wav`);
  if (!existsSync(raw)) {
    if (TTS === "elevenlabs") await elevenlabs(b.text, ALL[b.idx - 1]?.text, ALL[b.idx + 1]?.text, raw);
    else execFileSync("python3", ["-m", "piper", "-m", voice, "-f", raw, "--sentence-silence", "0.3", "--length-scale", "1.15"], { input: b.text });
  }
  if (!existsSync(padded)) execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", `apad=pad_dur=${b.pause ?? PAD}`, "-ar", "44100", "-ac", "1", padded]);
  b.speech = dur(raw); b.dur = dur(padded); list.push(`file '${padded}'`);
}
writeFileSync(join(outDir, "audio/list.txt"), list.join("\n"));
const narration = join(outDir, "narration.wav");
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", join(outDir, "audio/list.txt"), "-c", "copy", narration]);
let t0 = 0;
for (const b of BEATS) { b.start = t0; t0 += b.dur; }
const TOTAL = t0;
console.log(`narration ${TOTAL.toFixed(1)}s, ${BEATS.length} beats (${TTS})`);

// ---------- 2. per-frame scene ----------
const POSE_LIB = { ...POSES, stand: { expr: "neutral" } };
const resolved = BEATS.map((b) => resolvePose({ ...POSE_LIB[b.pose], ...(b.expr ? { expr: b.expr } : {}) }));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const ink = PALETTE.ink;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const sceneKey = (b) => JSON.stringify(b.scene ?? null);
const NO_BLINK = new Set(["calm", "strain", "blink"]);

for (const b of BEATS) {
  const words = b.text.split(/\s+/); const chunks = [];
  for (let i = 0; i < words.length; i += 6) chunks.push(words.slice(i, i + 6).join(" "));
  const total = chunks.reduce((n, c) => n + c.length, 0); let acc = 0;
  b.chunks = chunks.map((c) => { const s = acc / total * b.speech; acc += c.length; return { c, s }; });
}

// where Eddie stands in a beat (pelvis x, pelvis y)
function placement(b, lt) {
  const base = POSE_LIB[b.pose];
  let x = b.x ?? (b.card ? 640 : W / 2);
  if (b.walk) x = b.walk[0] + (b.walk[1] - b.walk[0]) * Math.min(1, lt / b.dur);
  const y = b.y ?? (GROUND - (base.sit ? 58 : 130) * SCALE);
  return [x, y];
}

function frameSVG(t) {
  let i = BEATS.findIndex((b) => t < b.start + b.dur); if (i < 0) i = BEATS.length - 1;
  const b = BEATS[i], lt = t - b.start, p = lt / b.dur;
  const pb = BEATS[Math.max(0, i - 1)];
  const sceneChanged = i > 0 && sceneKey(pb) !== sceneKey(b);
  // pose: tween from the previous beat (snap when the scene changes)
  const k = i === 0 || sceneChanged ? 1 : ease(Math.min(1, lt / 0.45));
  const pose = lerpPose(resolved[Math.max(0, i - 1)], resolved[i], k);
  const anim = POSE_LIB[b.pose].anim;
  // idle life
  if (b.pose !== "lie") {
    pose.lift += Math.sin(t * 2 * Math.PI * 0.55) * 3;
    pose.lean += Math.sin(t * 1.3) * 1.2;
    pose.headTilt += Math.sin(t * 0.9 + 1) * 2;
  }
  const ph = t * 2 * Math.PI;
  if (b.pose === "wave" && k > 0.9) pose.armR = { ...pose.armR, a2: pose.armR.a2 + Math.sin(ph * 1.8) * 22, a1: pose.armR.a1 + Math.sin(ph * 1.8) * 6 };
  if (b.pose === "explain" && k > 0.9) pose.armR = { ...pose.armR, a2: pose.armR.a2 + Math.sin(ph * 0.8) * 7 };
  if (b.pose === "shrug" && k > 0.9) pose.lift += Math.max(0, Math.sin(ph * 0.9)) * 6;
  if (b.pose === "hustle") pose.lean += Math.sin(t * 40) * 0.8;
  if (b.pose === "celebrate" && k > 0.9) pose.lift += Math.abs(Math.sin(t * Math.PI * 2.2)) * 18;
  if (anim === "panic") { pose.lean += Math.sin(t * 31) * 2; pose.headTilt += Math.sin(t * 23) * 4; }
  if (anim === "type") {
    pose.armL = { ...pose.armL, a2: pose.armL.a2 + Math.sin(ph * 4.2) * 9 };
    pose.armR = { ...pose.armR, a2: pose.armR.a2 + Math.sin(ph * 4.2 + 2) * 9 };
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
  // blink every ~3.4s
  if (!NO_BLINK.has(pose.expr) && ((t + i * 0.7) % 3.4) < 0.12) pose.expr = "blink";
  const shake = (b.pose === "shocked" || b.pose === "scared") ? Math.sin(lt * 70) * 10 * Math.exp(-lt * 5) : 0;
  const pop = 1 + 0.05 * Math.sin(Math.min(lt, 0.5) / 0.5 * Math.PI) * (i === 0 || sceneChanged ? 0 : 1);

  // placement (tween x when the scene stays the same)
  const [x1, y1] = placement(b, lt);
  const [x0, y0] = sceneChanged ? [x1, y1] : placement(pb, pb.dur);
  const kk = b.walk ? 1 : k;
  const cx = x0 + (x1 - x0) * kk + shake, py = y0 + (y1 - y0) * kk;

  // world: scene + items + Eddie + foreground, under a slow camera move
  const sc = b.scene ? SCENES[b.scene.name](b.scene, t) : SCENES.studio({}, t);
  let world = sc.bg;
  for (const it of b.items ?? []) world += `<g filter="url(#ink)" transform="translate(${it.x},${it.y}) scale(${it.scale ?? 1.4})">${PROPS[it.type]([0, 0], it.arg)}</g>`;
  if (b.pose !== "lie") world += `<ellipse cx="${cx}" cy="${GROUND + 4}" rx="${110 - pose.lift}" ry="12" fill="rgba(0,0,0,0.12)"/>`;
  world += `<g filter="url(#ink)" transform="translate(${cx},${py}) scale(${SCALE * pop})">${character(pose)}</g>`;
  world += sc.fg;
  if (b.blanket) world += `<path d="M330,640 Q520,600 700,650 L700,800 Q480,820 300,800 Z" fill="#7fa7d9" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/><path d="M340,680 Q520,650 690,690" fill="none" stroke="#6a92c6" stroke-width="5"/>`;
  const zoom = i % 2 ? 1.045 - 0.045 * p : 1 + 0.045 * p;
  const fx = cx, fy = py - 120;
  let s = `<g transform="translate(${fx},${fy}) scale(${zoom.toFixed(4)}) translate(${-fx},${-fy})">${world}</g>`;

  // day stamp
  let day = null, dayStart = 0;
  for (let j = i; j >= 0; j--) if (BEATS[j].day) { day = BEATS[j].day; dayStart = BEATS[j].start; break; }
  if (day && day !== "-") {
    const a = Math.min(1, (t - dayStart) / 0.35), x = -260 + 320 * ease(a);
    s += `<g transform="translate(${x},60) rotate(-4)"><rect x="4" y="6" width="230" height="86" rx="14" fill="rgba(0,0,0,0.18)"/><rect x="0" y="0" width="230" height="86" rx="14" fill="#ff6b5b" stroke="${ink}" stroke-width="5"/>
      <text x="115" y="62" text-anchor="middle" font-size="58" fill="#fff">${day}</text></g>`;
  }
  // on-screen card: paper note, top right
  if (b.card) {
    const a = Math.min(1, lt / 0.3), scl = 0.6 + 0.4 * ease(a) + 0.04 * Math.sin(Math.min(1, lt / 0.5) * Math.PI);
    const lines = []; let line = "";
    for (const w of b.card.split(" ")) { if ((line + " " + w).trim().length > 14 && line) { lines.push(line); line = w; } else line = (line + " " + w).trim(); }
    lines.push(line);
    const bw = Math.max(...lines.map((l) => l.length)) * 46 + 90, bh = lines.length * 100 + 50;
    s += `<g transform="translate(1390,${120 + bh / 2}) rotate(2) scale(${scl})" opacity="${a}">
      <rect x="${-bw / 2 + 8}" y="${-bh / 2 + 10}" width="${bw}" height="${bh}" rx="18" fill="rgba(0,0,0,0.18)"/>
      <rect x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="18" fill="#fffdf4" stroke="${ink}" stroke-width="6"/>
      <rect x="-50" y="${-bh / 2 - 18}" width="100" height="34" rx="4" fill="#f7d774" opacity="0.9" transform="rotate(-3)"/>` +
      lines.map((l, j) => `<text x="0" y="${-bh / 2 + 95 + j * 100}" text-anchor="middle" font-size="92" fill="${ink}">${esc(l)}</text>`).join("") + `</g>`;
  }
  // caption
  const ch = [...b.chunks].reverse().find((c) => lt >= c.s);
  if (ch && lt < b.speech + 0.15) {
    const wpx = Math.min(1700, ch.c.length * 26 + 80);
    s += `<rect x="${(W - wpx) / 2 + 6}" y="941" width="${wpx}" height="92" rx="20" fill="rgba(0,0,0,0.2)"/>
      <rect x="${(W - wpx) / 2}" y="935" width="${wpx}" height="92" rx="20" fill="#fff" stroke="${ink}" stroke-width="5"/>
      <text x="${W / 2}" y="998" text-anchor="middle" font-size="52" fill="${ink}">${esc(ch.c)}</text>`;
  }
  if (b.blackout && lt > 1.6 && lt < 2.5) s += `<rect width="${W}" height="${H}" fill="#000"/>`;
  if (sceneChanged && lt < 0.3) s += `<rect width="${W}" height="${H}" fill="#fff" opacity="${(1 - lt / 0.3).toFixed(3)}"/>`;
  const fade = Math.min(1, t / 0.6, (TOTAL - t) / 0.8);
  if (fade < 1) s += `<rect width="${W}" height="${H}" fill="#000" opacity="${(1 - Math.max(0, fade)).toFixed(3)}"/>`;
  const seed = 1 + (Math.floor(t * 8) % 4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>
    <filter id="ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter></defs>${s}</svg>`;
}

// ---------- 3. render + encode ----------
const font = readFileSync(join(here, "../../../ink-theater/assets/patrickhand.ttf")).toString("base64");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<html><head><style>@font-face{font-family:InkHand;src:url(data:font/ttf;base64,${font}) format("truetype");}
  body{margin:0;overflow:hidden} text{font-family:InkHand,sans-serif}</style></head><body><div id="s"></div></body></html>`);
await page.evaluate(() => document.fonts.load("40px InkHand"));

if (args.includes("--stills")) { // one frame per beat, for checking layouts without a full render
  mkdirSync(join(outDir, "stills"), { recursive: true });
  for (const b of BEATS) {
    await page.evaluate((svg) => { document.getElementById("s").innerHTML = svg; }, frameSVG(b.start + Math.min(1.4, b.dur * 0.6)));
    await page.screenshot({ path: join(outDir, "stills", `beat-${String(b.idx).padStart(2, "0")}.jpg`), type: "jpeg", quality: 80 });
  }
  await browser.close();
  console.log("stills written");
  process.exit(0);
}
const out = join(outDir, only ? `preview-${only}.mp4` : "episode.mp4");
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-i", narration,
  "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "160k", "-shortest", out], { stdio: ["pipe", "inherit", "inherit"] });
const frames = Math.ceil(TOTAL * FPS);
const t1 = Date.now();
for (let f = 0; f < frames; f++) {
  await page.evaluate((svg) => { document.getElementById("s").innerHTML = svg; }, frameSVG(f / FPS));
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % (FPS * 30) === 0) console.log(`frame ${f}/${frames} (${((Date.now() - t1) / 1000).toFixed(0)}s)`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
writeFileSync(join(outDir, "timeline.json"), JSON.stringify(BEATS.map(({ start, dur, pose, text, scene }) => ({ start, dur, pose, scene: scene?.name, text })), null, 1));
console.log("wrote", out, `${TOTAL.toFixed(1)}s`, TITLE);
