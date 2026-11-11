// Renders Kai's character sheet + per-pose transparent PNG/SVG files.
//   node assets/characters/kai/build.mjs
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { character, head, DEFS, GROUND, POSES, PALETTE } from "./kai-rig.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "renders");
mkdirSync(out, { recursive: true });

const font = readFileSync(join(here, "../../../ink-theater/assets/patrickhand.ttf")).toString("base64");
const STYLE = `<style>@font-face{font-family:InkHand;src:url(data:font/ttf;base64,${font}) format("truetype");}
text{font-family:InkHand,'Comic Sans MS',sans-serif}</style>`;

const groundFor = (pose) => (pose.sit ? 58 : GROUND);

function poseSVG(name, { bg = null } = {}) {
  const pose = POSES[name];
  const W = 420, H = 520, cx = 210, gy = 470;
  const py = gy - groundFor(pose);
  const shadowW = pose.lift ? 52 : 78;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${DEFS}</defs>${STYLE}${bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : ""}
<ellipse cx="${cx}" cy="${gy + 2}" rx="${shadowW}" ry="9" fill="${PALETTE.shadow}"/>
<g filter="url(#kaiInk)" transform="translate(${cx},${py})">${character(pose)}</g></svg>`;
}

const SHEET_POSES = ["wave", "explain", "think", "shocked", "celebrate", "laptop"];
const EXPRS = ["neutral", "happy", "thinking", "shocked", "angry", "focused", "strain", "calm"];

function sheetSVG() {
  const W = 1920, H = 1200;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${DEFS}</defs>${STYLE}<rect width="100%" height="100%" fill="#ffffff"/>
<text x="70" y="112" font-size="96" fill="${PALETTE.ink}">Kai</text>
<text x="232" y="108" font-size="40" fill="#55555f">channel mascot · character sheet v1</text>`;
  // palette swatches
  const sw = [["hoodie", PALETTE.hoodie], ["pants", PALETTE.pants], ["hair", PALETTE.hair], ["accent", PALETTE.accent], ["skin", PALETTE.skin]];
  sw.forEach(([n, c], i) => {
    const x = 1190 + i * 140;
    s += `<rect x="${x}" y="58" width="44" height="44" rx="10" fill="${c}" stroke="${PALETTE.ink}" stroke-width="3"/>
<text x="${x + 54}" y="90" font-size="28" fill="#55555f">${n}</text>`;
  });
  s += `<path d="M70,150 L1850,150" stroke="#e4e4ea" stroke-width="3"/>`;
  // pose row
  const cellW = (W - 140) / SHEET_POSES.length, gy = 690;
  SHEET_POSES.forEach((name, i) => {
    const pose = POSES[name];
    const cx = 70 + cellW * (i + 0.5);
    const sc = 0.92;
    const py = gy - groundFor(pose) * sc;
    s += `<ellipse cx="${cx}" cy="${gy + 2}" rx="${pose.lift ? 48 : 72}" ry="8" fill="${PALETTE.shadow}"/>
<g filter="url(#kaiInk)" transform="translate(${cx},${py}) scale(${sc})">${character(pose)}</g>
<text x="${cx}" y="${gy + 60}" text-anchor="middle" font-size="38" fill="${PALETTE.ink}">${pose.label}</text>`;
  });
  s += `<path d="M70,790 L1850,790" stroke="#e4e4ea" stroke-width="3"/>
<text x="70" y="850" font-size="38" fill="#55555f">expressions</text>`;
  const ew = (W - 140) / EXPRS.length;
  EXPRS.forEach((e, i) => {
    const cx = 70 + ew * (i + 0.5);
    s += `<g filter="url(#kaiInk)" transform="translate(${cx},990) scale(1.25)">${head(e)}</g>
<text x="${cx}" y="1130" text-anchor="middle" font-size="32" fill="${PALETTE.ink}">${e}</text>`;
  });
  return s + `</svg>`;
}

const files = [];
writeFileSync(join(out, "kai-sheet.svg"), sheetSVG());
files.push(["kai-sheet", 1920, 1200]);
for (const name of Object.keys(POSES)) {
  writeFileSync(join(out, `kai-${name}.svg`), poseSVG(name));
  files.push([`kai-${name}`, 420, 520]);
}

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch();
for (const [base, w, h] of files) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const svg = readFileSync(join(out, `${base}.svg`), "utf8");
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, `${base}.png`), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
}
await browser.close();
console.log("wrote", files.length, "renders to", out);
