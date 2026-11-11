// Renders an Eddie episode (beats file) to a 1080p MP4:
//   Piper TTS per beat -> narration track -> frame-by-frame SVG animation in
//   headless Chromium -> ffmpeg encode with the narration.
//
//   node assets/characters/eddie/render-episode.mjs <beats.mjs> <outDir> [--voice path.onnx] [--fps 24] [--only 0-5]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { character, resolvePose, lerpPose, POSES, PROPS, PALETTE } from "./eddie-rig.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const beatsPath = resolve(args[0]);
const outDir = resolve(args[1]);
const voice = resolve(opt("--voice", join(outDir, "voices/en_US-ryan-high.onnx")));
const FPS = Number(opt("--fps", 24));
const LENGTH_SCALE = opt("--length-scale", "1.15"); // >1 = slower narration
const only = opt("--only", null);
const W = 1920, H = 1080, GROUND = 870, SCALE = 1.85, PAD = 0.4;

const { BEATS: ALL, TITLE } = await import(pathToFileURL(beatsPath).href);
let BEATS = ALL;
if (only) { const [a, b] = only.split("-").map(Number); BEATS = ALL.slice(a, b + 1); }
mkdirSync(join(outDir, "audio"), { recursive: true });

// ---------- 1. narration ----------
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const list = [];
for (const b of BEATS) {
  const h = createHash("sha1").update(voice + LENGTH_SCALE + b.text).digest("hex").slice(0, 12);
  const raw = join(outDir, "audio", `${h}.wav`), padded = join(outDir, "audio", `${h}.pad.wav`);
  if (!existsSync(raw)) execFileSync("python3", ["-m", "piper", "-m", voice, "-f", raw, "--sentence-silence", "0.3", "--length-scale", LENGTH_SCALE], { input: b.text });
  if (!existsSync(padded)) execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-af", `apad=pad_dur=${PAD}`, "-ar", "44100", "-ac", "1", padded]);
  b.speech = dur(raw); b.dur = dur(padded); list.push(`file '${padded}'`);
}
writeFileSync(join(outDir, "audio/list.txt"), list.join("\n"));
const narration = join(outDir, "narration.wav");
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", join(outDir, "audio/list.txt"), "-c", "copy", narration]);
let t0 = 0;
for (const b of BEATS) { b.start = t0; t0 += b.dur; }
const TOTAL = t0;
console.log(`narration ${TOTAL.toFixed(1)}s, ${BEATS.length} beats`);

// ---------- 2. per-frame scene ----------
const POSE_LIB = { ...POSES, stand: { expr: "neutral" } };
const resolved = BEATS.map((b) => resolvePose({ ...POSE_LIB[b.pose], ...(b.expr ? { expr: b.expr } : {}) }));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const ink = PALETTE.ink;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// caption chunks (~6 words) timed by character share of the spoken part
for (const b of BEATS) {
  const words = b.text.split(/\s+/); const chunks = [];
  for (let i = 0; i < words.length; i += 6) chunks.push(words.slice(i, i + 6).join(" "));
  const total = chunks.reduce((n, c) => n + c.length, 0); let acc = 0;
  b.chunks = chunks.map((c) => { const s = acc / total * b.speech; acc += c.length; return { c, s }; });
}

function frameSVG(t) {
  let i = BEATS.findIndex((b) => t < b.start + b.dur); if (i < 0) i = BEATS.length - 1;
  const b = BEATS[i], lt = t - b.start;
  // pose: tween from previous beat over 0.45s
  const prev = resolved[Math.max(0, i - 1)], cur = resolved[i];
  const k = i === 0 ? 1 : ease(Math.min(1, lt / 0.45));
  const pose = lerpPose(prev, cur, k);
  // idle life: breathing bob + sway
  pose.lift += Math.sin(t * 2 * Math.PI * 0.55) * 3;
  pose.lean += Math.sin(t * 1.3) * 1.2;
  pose.headTilt += Math.sin(t * 0.9 + 1) * 2;
  if (b.pose === "wave" && k > 0.9) { pose.armR = { ...pose.armR, a2: pose.armR.a2 + Math.sin(t * 2 * Math.PI * 1.8) * 22, a1: pose.armR.a1 + Math.sin(t * 2 * Math.PI * 1.8) * 6 }; }
  if (b.pose === "hustle") pose.lean += Math.sin(t * 40) * 0.8;
  if (b.pose === "celebrate" && k > 0.9) pose.lift += Math.abs(Math.sin(t * Math.PI * 2.2)) * 18;
  // shake on shocked/scared entrances
  const shake = (b.pose === "shocked" || b.pose === "scared") ? Math.sin(lt * 70) * 10 * Math.exp(-lt * 5) : 0;
  const pop = 1 + 0.05 * Math.sin(Math.min(lt, 0.5) / 0.5 * Math.PI) * (i === 0 ? 0 : 1);

  const sit = POSE_LIB[b.pose].sit && k > 0.5;
  const py = GROUND - (sit ? 58 : 130) * SCALE;
  const tx = (bb) => (bb.card ? 640 : W / 2);
  const cx = tx(BEATS[Math.max(0, i - 1)]) + (tx(b) - tx(BEATS[Math.max(0, i - 1)])) * k + shake;
  const night = b.night;
  let s = `<rect width="${W}" height="${H}" fill="${night ? "#d4d8e2" : "#ffffff"}"/>`;
  s += `<path d="M0,${GROUND + 4} L${W},${GROUND + 4}" stroke="${night ? "#aab0bf" : "#e3e3e8"}" stroke-width="4"/>`;
  // scene props
  for (const p of b.scene ?? []) {
    const sc = p.scale ?? 1.4;
    s += `<g filter="url(#ink)" transform="translate(${p.x},${p.y}) scale(${sc})">${PROPS[p.type]([0, 0], p.arg)}</g>`;
  }
  // character
  s += `<ellipse cx="${cx}" cy="${GROUND + 4}" rx="${110 - pose.lift}" ry="12" fill="rgba(0,0,0,0.10)"/>`;
  s += `<g filter="url(#ink)" transform="translate(${cx},${py}) scale(${SCALE * pop})">${character(pose)}</g>`;
  // day stamp (persists until next stamp)
  let day = null, dayStart = 0;
  for (let j = i; j >= 0; j--) if (BEATS[j].day) { day = BEATS[j].day; dayStart = BEATS[j].start; break; }
  if (day) {
    const a = Math.min(1, (t - dayStart) / 0.35), x = -260 + 330 * ease(a);
    s += `<g transform="translate(${x},70) rotate(-4)"><rect x="0" y="0" width="230" height="86" rx="14" fill="${ink}"/>
      <text x="115" y="62" text-anchor="middle" font-size="58" fill="#fff">${day}</text></g>`;
  }
  // big on-screen card
  if (b.card) {
    const a = Math.min(1, lt / 0.3), sc = 0.6 + 0.4 * ease(a) + 0.04 * Math.sin(Math.min(1, lt / 0.5) * Math.PI);
    const lines = []; let line = "";
    for (const w of b.card.split(" ")) { if ((line + " " + w).trim().length > 12 && line) { lines.push(line); line = w; } else line = (line + " " + w).trim(); }
    lines.push(line);
    const y0 = b.scene?.length ? 130 : Math.max(130, 420 - (lines.length - 1) * 55);
    s += `<g transform="translate(1330,${y0}) scale(${sc})" opacity="${a}">` + lines.map((l, j) =>
      `<text x="0" y="${j * 110}" text-anchor="middle" font-size="104" fill="${ink}">${esc(l)}</text>`).join("") +
      `<path d="M-260,${lines.length * 110 - 70} Q0,${lines.length * 110 - 84} 260,${lines.length * 110 - 70}" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/></g>`;
  }
  // caption
  const ch = [...b.chunks].reverse().find((c) => lt >= c.s);
  if (ch && lt < b.speech + 0.15) {
    const wpx = Math.min(1700, ch.c.length * 26 + 80);
    s += `<rect x="${(W - wpx) / 2}" y="935" width="${wpx}" height="92" rx="20" fill="#fff" stroke="${ink}" stroke-width="5"/>
      <text x="${W / 2}" y="998" text-anchor="middle" font-size="52" fill="${ink}">${esc(ch.c)}</text>`;
  }
  // microsleep blackout gag
  if (b.blackout && lt > 1.6 && lt < 2.5) s += `<rect width="${W}" height="${H}" fill="#000"/>`;
  // fade in / out
  const fade = Math.min(1, t / 0.6, (TOTAL - t) / 0.8);
  if (fade < 1) s += `<rect width="${W}" height="${H}" fill="#000" opacity="${(1 - Math.max(0, fade)).toFixed(3)}"/>`;
  const seed = 1 + (Math.floor(t * 8) % 4); // 8fps line boil
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

const out = join(outDir, only ? `preview-${only}.mp4` : "episode.mp4");
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-i", narration,
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
writeFileSync(join(outDir, "timeline.json"), JSON.stringify(BEATS.map(({ start, dur, pose, text }) => ({ start, dur, pose, text })), null, 1));
console.log("wrote", out, `${TOTAL.toFixed(1)}s`, TITLE);
