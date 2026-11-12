// Renders channel branding + episode thumbnails for "Stick With Eddie".
//   node assets/characters/eddie/build-brand.mjs  -> assets/characters/eddie/brand/*.png
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { character, head, resolvePose, POSES } from "./eddie-rig.mjs";
import { SCENES } from "./scenes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "brand");
mkdirSync(out, { recursive: true });
const M = "font-family:MBlack;font-weight:900";
const pose = (name, extra = {}) => ({ ...POSES[name], ...extra });
const eddie = (p, x, y, s) => `<g transform="translate(${x},${y}) scale(${s})">${character(p)}</g>`;
const outline = (txt, x, y, size, fill = "#fff", anchor = "middle", sw = 0.2) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${fill}" stroke="#000" stroke-width="${size * sw}" stroke-linejoin="round" paint-order="stroke" style="${M}">${txt}</text>`;
const tag = (txt, x, y, w, fill = "#ff5a4a", size = 64) => `<g transform="translate(${x},${y}) rotate(-3)">
  <rect x="6" y="8" width="${w}" height="${size * 1.45}" rx="16" fill="rgba(0,0,0,.3)"/><rect width="${w}" height="${size * 1.45}" rx="16" fill="${fill}" stroke="#000" stroke-width="7"/>
  <text x="${w / 2}" y="${size * 1.08}" text-anchor="middle" font-size="${size}" fill="#fff" style="${M}">${txt}</text></g>`;
const world = (svg) => `<g transform="scale(${1280 / 1920})">${svg}</g>`; // 1920x1080 scenes -> 1280x720

const items = {
  // A — split screen: Day 1 thrilled vs Day 30 wrecked (top pick: contrast tells the story at a glance)
  "thumb-A-day1-vs-day30": [1280, 720, () => {
    const L = SCENES.studio({ tone: "#fbe7a1" }, 0).bg, R = SCENES.bedroom({ night: true, dim: true, clock: "3:00" }, 0).bg;
    return `<clipPath id="l"><rect width="640" height="720"/></clipPath><clipPath id="r"><rect x="640" width="640" height="720"/></clipPath>
      <g clip-path="url(#l)">${world(L)}</g><g clip-path="url(#r)">${world(R)}<rect x="640" width="640" height="720" fill="#0b1030" opacity=".25"/></g>
      ${eddie(pose("celebrate"), 320, 430, 1.7)}
      ${eddie(pose("hustle", { expr: "wrecked", lean: 10 }), 960, 450, 1.7)}
      <path d="M640,0 L640,720" stroke="#000" stroke-width="12"/>
      ${tag("DAY 1", 40, 590, 250, "#3fb56b")}${tag("DAY 30", 940, 590, 300)}`;
  }],
  // B — extreme close-up: bloodshot eyes, red 3:00 AM, second hook text
  "thumb-B-closeup": [1280, 720, () => `<rect width="1280" height="720" fill="#1d2440"/>
      <circle cx="420" cy="380" r="420" fill="#2e3a66"/>
      <g transform="translate(430,420) scale(5.6) rotate(-6)">${head("wrecked")}</g>
      <rect x="840" y="80" width="380" height="170" rx="26" fill="#14161d" stroke="#000" stroke-width="8"/>
      <text x="1030" y="200" text-anchor="middle" font-size="110" fill="#ff3b30" style="${M}">3:00</text>
      ${outline("30 DAYS", 1010, 450, 98)}${outline("AWAKE", 1010, 570, 110, "#ffd84d")}`],
  // C — wide awake in bed while the whole street sleeps
  "thumb-C-in-bed": [1280, 720, () => `${world(SCENES.bedroom({ night: true, clock: "∞" }, 0).bg)}
      <g transform="scale(${1280 / 1920})">${eddie(pose("lieAwake", { expr: "shocked" }), 470, 690, 1.85)}
      <path d="M330,640 Q520,600 700,650 L700,800 Q480,820 300,800 Z" fill="#7fa7d9" stroke="#111" stroke-width="5"/></g>
      ${outline("0 HOURS", 900, 330, 120)}${outline("OF SLEEP", 900, 460, 100, "#ffd84d")}`],
  // channel profile picture (crops to a circle)
  "profile-800": [800, 800, () => `<rect width="800" height="800" fill="#ffd84d"/><circle cx="400" cy="400" r="330" fill="#fff4c2"/>
      <g transform="translate(400,420) scale(5.2) rotate(-4)">${head("happy", 2)}</g>`],
  // banner: 2560x1440, everything important inside the 1546x423 centre safe area
  "banner-2560x1440": [2560, 1440, () => {
    let s = `<rect width="2560" height="1440" fill="#fbe7a1"/>`;
    for (let y = 40; y < 1440; y += 80) for (let x = 40 + ((y / 80) % 2) * 40; x < 2560; x += 80) s += `<circle cx="${x}" cy="${y}" r="5" fill="#000" opacity=".07"/>`;
    s += eddie(pose("wave"), 640, 800, 1.0) + eddie(pose("idea"), 1930, 800, 1.0);
    s += outline("STICK WITH EDDIE", 1280, 700, 100, "#fff", "middle", 0.16);
    s += `<g transform="translate(1280,790)"><rect x="-430" y="-48" width="860" height="80" rx="40" fill="#000"/>
      <text x="0" y="12" text-anchor="middle" font-size="46" fill="#ffd84d" style="${M}">WHAT IF? EDDIE FINDS OUT.</text></g>`;
    return s;
  }],
};

const black = readFileSync(join(here, "montserrat-900.woff2")).toString("base64");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const browser = await chromium.launch();
for (const [name, [w, h, fn]] of Object.entries(items)) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<html><head><style>@font-face{font-family:MBlack;font-weight:900;src:url(data:font/woff2;base64,${black}) format("woff2");}
    body{margin:0}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${fn()}</svg></body></html>`);
  await page.evaluate(() => document.fonts.load("900 40px MBlack"));
  await page.screenshot({ path: join(out, `${name}.png`) });
  await page.close();
}
await browser.close();
console.log("brand assets written to", out);
