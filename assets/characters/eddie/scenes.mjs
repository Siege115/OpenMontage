// Furnished, softly colored backgrounds for Eddie episodes (1920x1080, floor at y=870).
// Eddie himself stays black & white; scenes use muted pastel color so he pops.
// Each scene returns { bg, fg }: fg is drawn in front of Eddie (desks, blankets...).

import { wainscot, wallpaper, stringLights, pendant, frameArt, wallShelf, knick, booksRow, rug, bigPlant, floorLamp, outlet, corkboard, motes, sleepyCat, window4, shade } from "./decor.mjs";
const INK = "#1b1b20";
const W = 1920, FLOOR = 870;
const o = (w = 5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

const nightTint = (amt = 0.38) => `<rect width="${W}" height="1080" fill="#1d2440" opacity="${amt}"/>`;
const glow = (x, y, r, c = "#ffd98a", a = 0.55) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#glow-${c.slice(1)})" opacity="${a}"/>` +
  `<defs><radialGradient id="glow-${c.slice(1)}"><stop offset="0" stop-color="${c}" stop-opacity="1"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs>`;

function floorBoards(color = "#d8bf9c", line = "#c2a47e") {
  let s = `<rect x="0" y="${FLOOR}" width="${W}" height="${1080 - FLOOR}" fill="${color}"/>`;
  for (let x = -40; x < W; x += 170) s += `<path d="M${x},${FLOOR} L${x - 60},1080" stroke="${line}" stroke-width="3"/>`;
  return s + `<path d="M0,${FLOOR} L${W},${FLOOR}" ${o(5)}/>` + `<rect x="0" y="${FLOOR - 22}" width="${W}" height="22" fill="#f4f1ea" stroke="${INK}" stroke-width="4"/>`;
}

function windowFrame(x, y, w, h, night, t) {
  const sky = night ? "#3b4a78" : "#bfe0f5";
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${sky}" ${o(6)}/>`;
  if (night) {
    s += `<circle cx="${x + w * 0.7}" cy="${y + h * 0.3}" r="${h * 0.12}" fill="#f6f1d8" ${o(3)}/>`;
    for (let i = 0; i < 7; i++) {
      const sx = x + 20 + ((i * 97) % (w - 40)), sy = y + 20 + ((i * 53) % (h * 0.6));
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
      s += `<circle cx="${sx}" cy="${sy}" r="${2 + tw * 2}" fill="#fff" opacity="${0.5 + tw * 0.5}"/>`;
    }
  } else {
    s += `<ellipse cx="${x + w * 0.35}" cy="${y + h * 0.35}" rx="${w * 0.16}" ry="${h * 0.07}" fill="#fff"/>`;
  }
  s += `<path d="M${x + w / 2},${y} L${x + w / 2},${y + h} M${x},${y + h / 2} L${x + w},${y + h / 2}" ${o(5)}/>`;
  // curtains
  s += `<path d="M${x - 40},${y - 20} Q${x - 10},${y + h / 2} ${x - 30},${y + h + 40} L${x + 20},${y + h + 40} Q${x + 30},${y + h / 2} ${x + 25},${y - 20} Z" fill="#e9a8a0" ${o(4)}/>`;
  s += `<path d="M${x + w + 40},${y - 20} Q${x + w + 10},${y + h / 2} ${x + w + 30},${y + h + 40} L${x + w - 20},${y + h + 40} Q${x + w - 30},${y + h / 2} ${x + w - 25},${y - 20} Z" fill="#e9a8a0" ${o(4)}/>`;
  return s + `<path d="M${x - 70},${y - 22} L${x + w + 70},${y - 22}" ${o(7)}/>`;
}

const plant = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})">
  <path d="M0,-60 Q-50,-120 -70,-170 Q-20,-150 0,-60 Z M0,-60 Q40,-140 30,-200 Q70,-140 0,-60 Z M0,-60 Q70,-90 100,-130 Q90,-70 0,-60 Z" fill="#8fc49a" ${o(4)}/>
  <path d="M-40,-60 L40,-60 L30,0 L-30,0 Z" fill="#d98c5f" ${o(4)}/></g>`;
const frame = (x, y, w, h, fill = "#f7d774", art = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" ${o(5)}/>
  <rect x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${h - 24}" fill="${fill}" ${o(3)}/>${art}`;
const clockFace = (x, y, r, t) => {
  const a = t * 6, b = t * 0.5;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${o(5)}/>
  <path d="M${x},${y} L${x + Math.sin(b) * r * 0.5},${y - Math.cos(b) * r * 0.5} M${x},${y} L${x + Math.sin(a) * r * 0.75},${y - Math.cos(a) * r * 0.75}" ${o(4)}/>`;
};
const books = (x, y, n, seed = 1) => {
  const cols = ["#e9a8a0", "#9cc3e6", "#f7d774", "#8fc49a", "#c7a8e0", "#f0b27a"];
  let s = "", cx = x;
  for (let i = 0; i < n; i++) {
    const w = 22 + ((i * 7 + seed) % 3) * 6, h = 70 + ((i * 13 + seed) % 4) * 10;
    s += `<rect x="${cx}" y="${y - h}" width="${w}" height="${h}" fill="${cols[(i + seed) % cols.length]}" ${o(3)}/>`;
    cx += w + 2;
  }
  return s;
};

export const SCENES = {
  // ---------------------------------------------------------------- bedroom
  bedroom({ night = false, clock = "3:00", dim = false } = {}, t = 0) {
    let bg = `<rect width="${W}" height="${FLOOR}" fill="#dfe8f3"/>` + wallpaper("#dfe8f3", FLOOR, W, true);
    bg += window4(1270, 170, 380, 300, night ? "#3b4a78" : "#bfe0f5", "#e9a8a0", night ? `<circle cx="1540" cy="250" r="34" fill="#f6f1d8" ${o(3)}/>` + [...Array(6)].map((_, i) => `<circle cx="${1300 + i * 55}" cy="${200 + (i * 37) % 120}" r="3" fill="#fff"/>`).join("") : `<ellipse cx="1380" cy="230" rx="60" ry="20" fill="#fff"/><path d="M1270,470 L1360,400 L1440,440 L1540,380 L1650,470 Z" fill="#a9d79c"/>`);
    bg += frame(330, 160, 200, 150, "#f7d774", `<path d="M360,280 L410,220 L450,260 L480,230 L510,280 Z" fill="#8fc49a" ${o(3)}/><circle cx="480" cy="200" r="16" fill="#f0b27a" ${o(3)}/>`);
    // posters + star stickers, wall shelf, fairy lights over the bed
    bg += `<g transform="rotate(-3,640,260)"><rect x="580" y="190" width="130" height="180" fill="#5b8fd9" ${o(4)}/><circle cx="645" cy="250" r="34" fill="#f7d774" ${o(3)}/><path d="M600,340 l90,0 M612,320 l66,0" stroke="#fff" stroke-width="7"/></g>`;
    for (const [x, y] of [[760, 180], [820, 240], [740, 300]]) bg += `<path d="M${x},${y - 14} l4,10 l11,1 l-8,7 l3,11 l-10,-6 l-10,6 l3,-11 l-8,-7 l11,-1 z" fill="#f7e27a" ${o(2)}/>`;
    bg += wallShelf(900, 330, 300, [["books", 16, 6, 7], ["trophy", 170], ["plant", 240]], t);
    bg += stringLights(110, 720, 560, 30, t);
    bg += floorBoards();
    bg += `<ellipse cx="960" cy="985" rx="520" ry="70" fill="#c9b6e4" ${o(4)}/><ellipse cx="960" cy="985" rx="440" ry="50" fill="none" stroke="#b49ad8" stroke-width="5"/>`;
    // bed (left) with patterned quilt
    bg += `<rect x="90" y="560" width="40" height="320" rx="10" fill="#b98a63" ${o(5)}/>
      <rect x="130" y="700" width="560" height="110" rx="14" fill="#fff" ${o(5)}/>
      <path d="M260,690 Q470,665 690,690 L690,790 Q470,810 260,800 Z" fill="#7fa7d9" ${o(5)}/>
      ${[300, 380, 460, 540, 620].map((x) => `<path d="M${x},${700 - (x - 260) * 0.02} l20,0 l0,20 l-20,0 z" fill="#f7d774" opacity=".8"/><path d="M${x + 40},${740} l20,0 l0,20 l-20,0 z" fill="#f4efe4" opacity=".8"/>`).join("")}
      <path d="M300,720 Q470,705 670,722" fill="none" stroke="#6a92c6" stroke-width="5"/>
      <rect x="150" y="650" width="130" height="60" rx="24" fill="#fff" ${o(5)}/><rect x="168" y="660" width="40" height="40" rx="12" fill="#f29ac0" opacity=".6"/>
      <rect x="690" y="640" width="34" height="240" rx="10" fill="#b98a63" ${o(5)}/>`;
    // slippers + backpack
    bg += `<ellipse cx="560" cy="890" rx="34" ry="12" fill="#e9a8a0" ${o(3)}/><ellipse cx="620" cy="896" rx="34" ry="12" fill="#e9a8a0" ${o(3)}/>`;
    bg += `<path d="M1120,870 L1110,760 Q1150,720 1190,760 L1180,870 Z" fill="#8fc49a" ${o(4)}/><rect x="1125" y="800" width="50" height="34" rx="6" fill="#6fae7d" ${o(3)}/><path d="M1130,760 Q1150,735 1170,760" fill="none" ${o(3)}/>`;
    // nightstand + lamp + book + glass
    bg += `<rect x="760" y="720" width="150" height="150" rx="8" fill="#c99b72" ${o(5)}/><path d="M760,795 L910,795" ${o(4)}/><circle cx="835" cy="760" r="6" fill="${INK}"/><circle cx="835" cy="835" r="6" fill="${INK}"/>
      <path d="M800,720 L870,720 L860,700 L810,700 Z" fill="#9b8aa8" ${o(4)}/><path d="M835,700 L835,640" ${o(5)}/><path d="M790,640 L880,640 L860,580 L810,580 Z" fill="#f7e2a8" ${o(5)}/>
      <rect x="870" y="704" width="34" height="16" fill="#e9767a" ${o(2.5)}/><rect x="770" y="690" width="22" height="30" rx="3" fill="#cfe9f7" ${o(2.5)}/>`;
    // dresser by the window with a mirror
    bg += `<rect x="1430" y="640" width="250" height="230" rx="8" fill="#c99b72" ${o(5)}/>${[690, 760, 830].map((y) => `<path d="M1430,${y - 20} L1680,${y - 20}" ${o(3)}/><rect x="1530" y="${y - 2}" width="50" height="8" rx="4" fill="${INK}"/>`).join("")}` + knick("plant", 1470, 640, t) + knick("frame", 1640, 640, t);
    bg += outlet(1000, 800);
    if (clock) bg += `<rect x="1720" y="640" width="150" height="80" rx="14" fill="#2b2f3a" ${o(5)}/><text x="1795" y="697" text-anchor="middle" font-size="48" fill="#ff7b6b">${clock}</text><rect x="1700" y="720" width="190" height="150" fill="#c99b72" ${o(5)}/>`;
    if (night) bg += nightTint(dim ? 0.55 : 0.36) + glow(835, 610, 260, "#ffd98a", dim ? 0.35 : 0.6);
    return { bg, fg: "" };
  },

  // ---------------------------------------------------------------- desk / home office (Eddie sits behind the desk)
  desk({ night = false, clock = null } = {}, t = 0) {
    let bg = `<rect width="${W}" height="${FLOOR}" fill="#e3efe1"/>`;
    bg += windowFrame(160, 170, 340, 280, night, t);
    // shelf with books
    bg += `<rect x="1300" y="300" width="460" height="22" fill="#c99b72" ${o(4)}/>` + books(1320, 300, 12, 2) +
      `<rect x="1300" y="470" width="460" height="22" fill="#c99b72" ${o(4)}/>` + books(1340, 470, 8, 5) + plant(1700, 470, 0.7);
    bg += frame(760, 150, 170, 130, "#9cc3e6", `<path d="M790,250 Q845,190 900,250" fill="none" ${o(4)}/>`);
    bg += floorBoards("#cfd6de", "#b9c2cc");
    bg += plant(1650, 870, 1.2);
    if (clock) bg += `<text x="1100" y="230" text-anchor="middle" font-size="64" fill="${INK}">${clock}</text>`;
    // desk in front of Eddie
    let fg = `<rect x="560" y="690" width="800" height="40" rx="8" fill="#c99b72" ${o(5)}/>
      <rect x="590" y="730" width="740" height="150" fill="#b98a63" ${o(5)}/><rect x="640" y="760" width="300" height="50" rx="6" fill="#c99b72" ${o(4)}/><circle cx="790" cy="785" r="6" fill="${INK}"/><rect x="980" y="760" width="300" height="50" rx="6" fill="#c99b72" ${o(4)}/><circle cx="1130" cy="785" r="6" fill="${INK}"/>
      <rect x="1090" y="560" width="200" height="130" rx="10" fill="#4a4f5c" ${o(5)}/><path d="M1180,690 L1180,640 M1150,690 L1210,690" ${o(5)}/>
      <rect x="640" y="650" width="70" height="40" rx="6" fill="#f0b27a" ${o(4)}/><path d="M710,660 Q730,670 710,680" fill="none" ${o(4)}/>
      <path d="M760,688 L960,688" stroke="#8b8f99" stroke-width="10" stroke-linecap="round"/>`;
    if (night) { bg += nightTint(0.3); fg += glow(1190, 625, 220, "#9cd0ff", 0.5); }
    // more life: wallpaper motif, corkboard, string lights, poster, floor plant, wastebasket
    bg = bg.replace(`fill="#e3efe1"/>`, `fill="#e3efe1"/>` + wallpaper("#e3efe1", FLOOR, W, true));
    bg += corkboard(560, 300, 180, 140, t) + stringLights(140, 520, 110, 16, t) + frameArt(980, 140, 120, 150, 1) + wallShelf(980, 340, 220, [["trophy", 30], ["globe", 100], ["clock", 175]], t);
    bg += `<path d="M380,870 L370,780 L450,780 L440,870 Z" fill="#9aa3ae" ${o(4)}/><circle cx="395" cy="770" r="14" fill="#fff" ${o(2.5)}/>` + outlet(1450, 800);
    if (!night) bg += motes(160, 900, 170, 820, t, 12);
    return { bg, fg };
  },

  // ---------------------------------------------------------------- living room
  living({ night = false } = {}, t = 0) {
    let bg = `<rect width="${W}" height="${FLOOR}" fill="#f6e3d3"/>` + wallpaper("#f6e3d3", 560, W, true) + wainscot("#f6e3d3", 560, FLOOR - 22);
    bg += frame(240, 170, 260, 190, "#c7a8e0", `<circle cx="370" cy="265" r="50" fill="#f7d774" ${o(3)}/>`) + frame(1420, 190, 200, 160, "#9cc3e6", `<path d="M1440,330 Q1520,250 1600,330" fill="#8fc49a" ${o(3)}/>`);
    // window with curtains (night city / day sky) and a wall clock
    bg += window4(720, 150, 360, 250, night ? "#33406b" : "#bfe0f5", "#d98c7f", night
      ? [...Array(7)].map((_, i) => `<rect x="${735 + i * 50}" y="${300 - (i * 37) % 90}" width="40" height="${100 + (i * 37) % 90}" fill="#26304f"/><rect x="${745 + i * 50}" y="${320 - (i * 37) % 90}" width="8" height="10" fill="#ffe39a"/>`).join("") + `<circle cx="1020" cy="200" r="22" fill="#f6f1d8"/>`
      : `<ellipse cx="830" cy="220" rx="50" ry="16" fill="#fff"/>`);
    bg += `<circle cx="1210" cy="230" r="46" fill="#fff" ${o(4)}/><path d="M1210,230 L1210,200 M1210,230 L1232,240" ${o(4)}/><path d="M1210,230 L${1210 + Math.sin(t) * 36},${230 - Math.cos(t) * 36}" stroke="#e5584f" stroke-width="2"/>`;
    bg += wallShelf(120, 420, 380, [["plant", 40], ["books", 80, 7, 3], ["candle", 260], ["frame", 330]], t);
    bg += stringLights(560, 1240, 120, 20, t);
    bg += floorBoards("#c7a382", "#b08c6b") + rug(1010, 960, 520, 70, "#b5654f", "#f2d3a6");
    // couch with cushions, throw blanket and a sleeping cat
    bg += `<rect x="120" y="640" width="560" height="160" rx="30" fill="#8fb3a0" ${o(5)}/>
      <rect x="90" y="700" width="90" height="150" rx="26" fill="#8fb3a0" ${o(5)}/><rect x="620" y="700" width="90" height="150" rx="26" fill="#8fb3a0" ${o(5)}/>
      <rect x="170" y="730" width="480" height="80" rx="16" fill="#a5c5b3" ${o(5)}/><rect x="200" y="660" width="90" height="70" rx="18" fill="#f7d774" ${o(4)}/><rect x="300" y="668" width="80" height="64" rx="18" fill="#e9a8a0" ${o(4)}/>
      <path d="M520,650 Q600,640 640,700 L640,800 Q600,790 560,800 Z" fill="#c7a8e0" ${o(4)}/><path d="M540,680 l80,0 M545,720 l85,0 M550,760 l80,0" stroke="#b08fd0" stroke-width="5"/>
      <path d="M150,850 l0,20 M650,850 l0,20" ${o(6)}/>` + sleepyCat(460, 732, t);
    // side table with a lamp + mug
    bg += `<rect x="20" y="760" width="70" height="110" fill="#b98a63" ${o(4)}/>`;
    // floor lamp + bookshelf with plants
    bg += floorLamp(1300, FLOOR, t, false);
    bg += `<rect x="1460" y="420" width="320" height="450" fill="#c99b72" ${o(5)}/>`;
    for (const y of [520, 640, 760]) bg += `<path d="M1460,${y} L1780,${y}" ${o(4)}/>` + books(1475, y, 7, y) + knick(y === 640 ? "globe" : y === 520 ? "plant" : "vinyl", 1730, y, t);
    bg += books(1475, 860, 9, 3) + bigPlant(1860, FLOOR, 0.75, t) + outlet(1120, 800);
    if (night) bg += nightTint(0.3) + glow(1300, 480, 300, "#ffd98a", 0.55) + glow(900, 135, 260, "#ffe39a", 0.3);
    return { bg, fg: "" };
  },

  // ---------------------------------------------------------------- night street
  street({ day = false } = {}, t = 0) {
    const sky = day ? ["#8fc8f0", "#d6eefb"] : ["#27304f", "#55628f"];
    let bg = `<defs><linearGradient id="sky${day ? "d" : "n"}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
      <rect width="${W}" height="${FLOOR}" fill="url(#sky${day ? "d" : "n"})"/>`;
    if (day) {
      bg += `<circle cx="1640" cy="150" r="70" fill="#ffe27a" ${o(4)}/>`;
      for (const [x, y, k] of [[300, 140, 1], [900, 90, 0.8], [1250, 200, 0.6]]) bg += `<g transform="translate(${x + ((t * 12) % 200)},${y}) scale(${k})"><ellipse rx="110" ry="38" fill="#fff"/><ellipse cx="-50" cy="-18" rx="55" ry="40" fill="#fff"/><ellipse cx="40" cy="-26" rx="60" ry="45" fill="#fff"/></g>`;
    } else {
      for (let i = 0; i < 26; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.1); bg += `<circle cx="${(i * 173) % W}" cy="${40 + ((i * 89) % 300)}" r="${1.5 + tw * 2}" fill="#fff" opacity="${0.4 + tw * 0.6}"/>`; }
      bg += `<circle cx="1640" cy="140" r="60" fill="#f6f1d8" ${o(4)}/><circle cx="1620" cy="125" r="10" fill="#e6dfbf"/><circle cx="1660" cy="160" r="7" fill="#e6dfbf"/>`;
    }
    const HB = FLOOR - 70; // houses sit back behind the car lane
    // distant skyline + hills, faded by atmosphere
    bg += `<path d="M0,${HB - 250} Q240,${HB - 330} 520,${HB - 270} Q800,${HB - 360} 1120,${HB - 280} Q1450,${HB - 350} 1700,${HB - 270} Q1820,${HB - 300} ${W},${HB - 260} L${W},${HB} L0,${HB} Z" fill="${day ? "#a9d3b0" : "#2f3c5c"}" opacity=".8"/>`;
    for (const [x, w, h] of [[170, 80, 260], [270, 60, 330], [350, 90, 220], [880, 70, 300], [960, 100, 380], [1080, 60, 260], [1560, 90, 290], [1660, 70, 350]]) {
      bg += `<rect x="${x}" y="${HB - 180 - h}" width="${w}" height="${h}" fill="${day ? "#b9cfe0" : "#39466a"}" opacity=".9"/>`;
      for (let wy = HB - 160 - h; wy < HB - 200; wy += 34) for (let wx = x + 12; wx < x + w - 12; wx += 22) bg += `<rect x="${wx}" y="${wy}" width="9" height="13" fill="${day ? "#d8e6f0" : ((wx * 7 + wy) % 5 < 2 ? "#ffe39a" : "#2d3554")}"/>`;
    }
    // power line poles with sagging wires and a couple of birds
    bg += `<path d="M470,${HB} L470,${HB - 470} M440,${HB - 450} L500,${HB - 450} M1520,${HB} L1520,${HB - 470} M1490,${HB - 450} L1550,${HB - 450}" ${o(6)}/>`;
    for (const dy of [0, 22]) bg += `<path d="M-20,${HB - 400 + dy} Q230,${HB - 330 + dy} 470,${HB - 450 + dy} Q995,${HB - 330 + dy} 1520,${HB - 450 + dy} Q1730,${HB - 360 + dy} ${W + 20},${HB - 420 + dy}" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
    for (const [bx, by] of [[760, HB - 398], [800, HB - 394]]) { const hop = Math.max(0, Math.sin(t * 2.3 + bx)) ** 8 * 8; bg += `<g transform="translate(${bx},${by - hop})"><ellipse cx="0" cy="-9" rx="12" ry="9" fill="#3b3f4c"/><circle cx="9" cy="-17" r="6" fill="#3b3f4c"/><path d="M14,-17 L20,-15 L14,-13 Z" fill="#f2b84b"/></g>`; }
    const tree = (x, k, sway) => `<g transform="translate(${x},${HB}) scale(${k})"><path d="M-10,0 L-8,-150 L8,-150 L10,0 Z" fill="#7a5a43" ${o(4)}/><g transform="rotate(${Math.sin(t * 0.9 + sway) * 1.5},0,-150)">
      <circle cx="-50" cy="-180" r="62" fill="${day ? "#5f9e6e" : "#2f5546"}" ${o(4)}/><circle cx="48" cy="-185" r="58" fill="${day ? "#5f9e6e" : "#2f5546"}" ${o(4)}/><circle cx="0" cy="-245" r="70" fill="${day ? "#6fb27c" : "#376250"}" ${o(4)}/>
      <circle cx="-20" cy="-262" r="22" fill="${day ? "#8cc995" : "#43735d"}"/><circle cx="34" cy="-205" r="16" fill="${day ? "#8cc995" : "#43735d"}"/></g></g>`;
    const house = (x, w, h, col, roof, lit, trim) => {
      const top = HB - h;
      let s = `<rect x="${x + w - 90}" y="${top - 100}" width="40" height="80" fill="#8a6a5a" ${o(4)}/>`; // chimney
      s += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${col}" ${o(5)}/>`;
      for (let yy = top + 30; yy < HB; yy += 30) s += `<path d="M${x + 4},${yy} L${x + w - 4},${yy}" stroke="#000" stroke-opacity=".06" stroke-width="3"/>`; // siding
      s += `<path d="M${x - 24},${top} L${x + w / 2},${top - 115} L${x + w + 24},${top} Z" fill="${roof}" ${o(5)}/><path d="M${x + w / 2 - 20},${top - 45} a20,20 0 1,1 40,0 a20,20 0 1,1 -40,0" fill="${day ? "#cfe9f7" : "#ffe39a"}" ${o(3)}/>`;
      for (let r = 0; r < 2; r++) for (const c of [0, 1]) {
        const on = lit && (r + c) % 2 === 0, wx = x + 30 + c * (w - 120), wy = top + 40 + r * 110;
        s += `<rect x="${wx - 14}" y="${wy}" width="12" height="70" fill="${trim}" ${o(3)}/><rect x="${wx + 62}" y="${wy}" width="12" height="70" fill="${trim}" ${o(3)}/>`; // shutters
        s += `<rect x="${wx}" y="${wy}" width="60" height="70" fill="${day ? "#cfe9f7" : on ? "#ffe39a" : "#2d3554"}" ${o(4)}/><path d="M${wx + 30},${wy} L${wx + 30},${wy + 70} M${wx},${wy + 35} L${wx + 60},${wy + 35}" stroke="${INK}" stroke-width="3"/>`;
        if (r === 1) s += `<rect x="${wx - 6}" y="${wy + 70}" width="72" height="16" fill="#9a6b4f" ${o(3)}/>` + [8, 26, 44, 60].map((fx, j) => `<circle cx="${wx + fx}" cy="${wy + 68}" r="7" fill="${["#e5584f", "#f7d774", "#f29ac0", "#e5584f"][j]}" ${o(2)}/>`).join(""); // flower box
      }
      s += `<rect x="${x + w / 2 - 34}" y="${HB - 128}" width="68" height="128" fill="${trim}" ${o(4)}/><rect x="${x + w / 2 - 26}" y="${HB - 120}" width="52" height="120" fill="#6b5a4a" ${o(3)}/><circle cx="${x + w / 2 + 14}" cy="${HB - 58}" r="4" fill="#f2c85b"/>`;
      return s;
    };
    bg += tree(455, 1.0, 1) + tree(1250, 1.15, 2.5);
    bg += house(60, 360, 300, "#8a7fa8", "#5a4a5e", false, "#f1e6d2") + house(560, 300, 260, "#7f9cb0", "#7a4f4f", !day, "#f4efe4");
    // corner shop with a striped awning
    bg += `<rect x="900" y="${HB - 280}" width="340" height="280" fill="#e2b679" ${o(5)}/><rect x="890" y="${HB - 300}" width="360" height="34" fill="#c98d4f" ${o(5)}/><text x="1070" y="${HB - 276}" text-anchor="middle" font-size="26" fill="#fff" style="font-family:MBlack,sans-serif;font-weight:900">CORNER SHOP</text>`;
    bg += `<rect x="930" y="${HB - 200}" width="160" height="150" fill="${day ? "#cfe9f7" : "#ffe39a"}" ${o(4)}/><rect x="1120" y="${HB - 200}" width="90" height="200" fill="#6b5a4a" ${o(4)}/>`;
    for (let k = 0; k < 7; k++) bg += `<path d="M${900 + k * 49},${HB - 262} L${949 + k * 49},${HB - 262} L${949 + k * 49},${HB - 225} Q${924 + k * 49},${HB - 205} ${900 + k * 49},${HB - 225} Z" fill="${k % 2 ? "#fff" : "#e5584f"}" stroke="${INK}" stroke-width="3"/>`;
    bg += [[960, "#e5584f"], [1000, "#f7d774"], [1040, "#8fc49a"]].map(([fx, c]) => `<circle cx="${fx}" cy="${HB - 80}" r="14" fill="${c}" ${o(3)}/>`).join("");
    bg += house(1330, 360, 320, "#a88f7f", "#4f5a7a", true, "#f6efe0") + house(1740, 260, 250, "#7fa895", "#5a4a5e", false, "#f1e6d2");
    // hedges + picket fences along the lane
    for (const [hx, hw] of [[30, 230], [1340, 140], [1600, 110]]) bg += `<path d="M${hx},${HB} ${Array.from({ length: Math.ceil(hw / 40) }, (_, j) => `a20,20 0 0,1 40,0`).join(" ")} Z" fill="${day ? "#5f9e6e" : "#2f5546"}" ${o(4)}/>`;
    for (let fx = 600; fx < 860; fx += 22) bg += `<path d="M${fx},${HB} L${fx},${HB - 46} L${fx + 7},${HB - 56} L${fx + 14},${HB - 46} L${fx + 14},${HB} Z" fill="#f4efe4" stroke="${INK}" stroke-width="2.5"/>`;
    bg += `<path d="M596,${HB - 32} L866,${HB - 32}" stroke="${INK}" stroke-width="3"/>`;
    // mailbox + hydrant tucked by the houses
    bg += `<path d="M300,${HB} L300,${HB - 60}" ${o(5)}/><path d="M280,${HB - 60} L280,${HB - 88} Q300,${HB - 104} 320,${HB - 88} L320,${HB - 60} Z" fill="#5b8fd9" ${o(4)}/><path d="M320,${HB - 92} L320,${HB - 112} L334,${HB - 108} L320,${HB - 104}" fill="#e5584f" ${o(2)}/>`;
    bg += `<path d="M1275,${HB} L1275,${HB - 44} Q1287,${HB - 60} 1299,${HB - 44} L1299,${HB} Z M1268,${HB - 30} L1306,${HB - 30}" fill="#e5584f" ${o(4)}/>`;
    if (!day) bg += glow(1390 + 120, 250, 140, "#ffe39a", 0.35);
    // street lamp
    bg += `<g transform="translate(-570,0)"><path d="M1080,${HB} L1080,420 Q1080,380 1130,380 L1170,380" fill="none" ${o(8)}/><path d="M1145,380 L1195,380 L1185,410 L1155,410 Z" fill="${day ? "#eee" : "#ffe39a"}" ${o(4)}/></g>` + (day ? "" : glow(600, 450, 330, "#ffe39a", 0.4));
    // back lane with cars at believable scale (behind the characters, never in front of them)
    bg += `<rect x="0" y="${HB}" width="${W}" height="${FLOOR - HB}" fill="${day ? "#7d828f" : "#454a58"}"/><path d="M0,${HB} L${W},${HB}" ${o(4)}/>`;
    for (const [i, [spd, col]] of [[260, "#e5584f"], [-190, "#5b8fd9"]].entries()) {
      const x = ((t * spd + i * 1500) % 3400 + 3400) % 3400 - 700, d = spd > 0 ? 1 : -1, k = 2.3;
      bg += `<g transform="translate(${x},${FLOOR - 14 - i * 10}) scale(${d * k},${k})"><path d="M-150,40 L-150,-10 Q-130,-30 -60,-34 L-20,-80 Q20,-92 90,-86 Q120,-80 140,-34 L170,-30 Q190,-20 190,10 L190,40 Z" fill="${col}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M-10,-40 L20,-76 Q50,-82 80,-78 L110,-40 Z" fill="#cfe9f7" stroke="${INK}" stroke-width="1.6"/><path d="M48,-80 L48,-40" stroke="${INK}" stroke-width="1.6"/>
        <rect x="176" y="-14" width="14" height="10" rx="3" fill="${day ? "#fff6c8" : "#ffe39a"}" stroke="${INK}" stroke-width="1.2"/><circle cx="-80" cy="40" r="26" fill="#2b2f3a" stroke="${INK}" stroke-width="2.4"/><circle cx="-80" cy="40" r="10" fill="#9aa0ad"/><circle cx="120" cy="40" r="26" fill="#2b2f3a" stroke="${INK}" stroke-width="2.4"/><circle cx="120" cy="40" r="10" fill="#9aa0ad"/></g>`;
    }
    bg += `<rect x="0" y="${FLOOR}" width="${W}" height="70" fill="#9aa0ad"/><path d="M0,${FLOOR} L${W},${FLOOR} M0,${FLOOR + 70} L${W},${FLOOR + 70}" ${o(5)}/><rect x="0" y="${FLOOR + 70}" width="${W}" height="200" fill="#4b4f5c"/>`;
    for (let x = 0; x < W; x += 120) bg += `<path d="M${x},${FLOOR} L${x - 18},${FLOOR + 70}" stroke="#80869a" stroke-width="3"/>`;
    bg += `<rect x="0" y="${FLOOR + 62}" width="${W}" height="12" fill="#c9cdd6" stroke="${INK}" stroke-width="3"/>`;
    for (let x = 90; x < W; x += 420) bg += `<path d="M${x},${FLOOR + 100} q30,-12 60,0 q-30,16 -60,0" fill="#3f434f"/>`; // road patches
    for (let x = 40; x < W; x += 260) bg += `<rect x="${x}" y="${FLOOR + 140}" width="140" height="14" rx="6" fill="#e8e3c8"/>`;
    return { bg, fg: "" };
  },

  // ---------------------------------------------------------------- classroom chalkboard
  classroom({ board = "" } = {}, t = 0) {
    let bg = `<rect width="${W}" height="${FLOOR}" fill="#f3ecd9"/>`;
    bg += `<rect x="930" y="150" width="880" height="520" rx="10" fill="#c99b72" ${o(5)}/><rect x="955" y="175" width="830" height="470" fill="#3f6b55" ${o(4)}/>`;
    bg += `<rect x="980" y="670" width="780" height="18" fill="#c99b72" ${o(4)}/><rect x="1050" y="656" width="40" height="14" fill="#fff"/><rect x="1110" y="658" width="30" height="12" fill="#f7d774"/>`;
    bg += `<g fill="none" stroke="#f4f4ee" stroke-width="5" stroke-linecap="round" opacity="0.9">${board}</g>`;
    bg += clockFace(470, 230, 70, t) + frame(160, 360, 220, 160, "#9cc3e6", `<text x="270" y="460" text-anchor="middle" font-size="56" fill="${INK}">A+</text>`);
    bg += floorBoards("#d7c7a6", "#c3b28e");
    bg += plant(140, 870, 1);
    // alphabet strip, posters, globe, bookshelf, string of flags
    for (let i = 0; i < 12; i++) bg += `<rect x="${60 + i * 72}" y="40" width="62" height="62" rx="6" fill="${["#f7d774", "#9cc3e6", "#e9a8a0", "#8fc49a"][i % 4]}" ${o(3)}/><text x="${91 + i * 72}" y="86" text-anchor="middle" font-size="40" fill="${INK}" style="font-family:MBlack,sans-serif;font-weight:900">${"ABCDEFGHIJKL"[i]}</text>`;
    bg += `<path d="M930,120 Q1370,170 1810,120" fill="none" stroke="${INK}" stroke-width="3"/>` + [...Array(12)].map((_, i) => { const x = 950 + i * 75, y = 122 + Math.sin((i / 11) * Math.PI) * 24; return `<path d="M${x},${y} l30,0 l-15,${30 + Math.sin(t * 2 + i) * 2} z" fill="${["#e5584f", "#f7d774", "#5b8fd9", "#8fc49a"][i % 4]}" ${o(2)}/>`; }).join("");
    bg += frameArt(560, 360, 150, 190, 0) + `<rect x="430" y="620" width="300" height="250" fill="#c99b72" ${o(5)}/><path d="M430,700 L730,700 M430,780 L730,780" ${o(4)}/>` + booksRow(445, 700, 10, 2, 70) + booksRow(445, 780, 6, 8, 70) + knick("globe", 680, 780, t) + knick("plant", 690, 620, t) + knick("jar", 470, 620, t);
    return { bg, fg: "" };
  },

  // ---------------------------------------------------------------- night road with a car
  road({} = {}, t = 0) {
    let bg = `<rect width="${W}" height="${FLOOR - 120}" fill="#2a3150"/>`;
    for (let i = 0; i < 18; i++) bg += `<circle cx="${(i * 211) % W}" cy="${40 + ((i * 71) % 260)}" r="2.5" fill="#fff" opacity="0.7"/>`;
    bg += `<path d="M0,${FLOOR - 120} Q300,${FLOOR - 260} 700,${FLOOR - 150} Q1100,${FLOOR - 300} 1500,${FLOOR - 170} Q1750,${FLOOR - 230} ${W},${FLOOR - 150} L${W},${FLOOR - 120} Z" fill="#3a4466"/>`;
    bg += `<path d="M0,${FLOOR - 120} L${W},${FLOOR - 120} L${W},1080 L0,1080 Z" fill="#43464f"/>`;
    const off = (t * 900) % 300;
    for (let x = -300 + off; x < W; x += 300) bg += `<rect x="${x}" y="${FLOOR + 40}" width="160" height="16" rx="6" fill="#f2e28a"/>`;
    // sign
    bg += `<path d="M1700,${FLOOR - 120} L1700,${FLOOR - 380}" ${o(6)}/><rect x="1610" y="${FLOOR - 480}" width="180" height="110" rx="12" fill="#e8c34a" ${o(5)}/><text x="1700" y="${FLOOR - 410}" text-anchor="middle" font-size="40" fill="${INK}">DRIVE</text><text x="1700" y="${FLOOR - 378}" text-anchor="middle" font-size="30" fill="${INK}">AWAKE</text>`;
    // car (left)
    bg += `<g transform="translate(40,${FLOOR - 40}) scale(1.55)"><path d="M0,0 L0,-90 Q20,-110 90,-115 L150,-185 Q190,-205 300,-200 Q360,-195 400,-120 L480,-110 Q510,-100 510,-60 L510,0 Z" fill="#d9776c" ${o(6)}/>
      <path d="M165,-120 L200,-175 Q230,-185 290,-182 L330,-120 Z" fill="#9cc3e6" ${o(4)}/><circle cx="110" cy="0" r="48" fill="#2b2f3a" ${o(6)}/><circle cx="110" cy="0" r="18" fill="#9aa0ad"/><circle cx="410" cy="0" r="48" fill="#2b2f3a" ${o(6)}/><circle cx="410" cy="0" r="18" fill="#9aa0ad"/>
      <rect x="490" y="-95" width="26" height="22" rx="6" fill="#ffe39a" ${o(3)}/></g>` + glow(700, FLOOR - 120, 260, "#ffe39a", 0.45);
    // distant town lights, power poles, trees, road reflectors and a fence along the verge
    for (let i = 0; i < 22; i++) bg += `<circle cx="${40 + i * 90 + (i * 37) % 40}" cy="${FLOOR - 150 - (i * 53) % 50}" r="${2.5 + (i % 3)}" fill="#ffe39a" opacity="${0.5 + 0.4 * Math.sin(t * 2 + i)}"/>`;
    for (const x of [300, 1000, 1500]) bg += `<path d="M${x},${FLOOR - 120} L${x},${FLOOR - 420} M${x - 40},${FLOOR - 400} L${x + 40},${FLOOR - 400}" stroke="#1b1f33" stroke-width="10"/>`;
    bg += `<path d="M-20,${FLOOR - 390} Q150,${FLOOR - 330} 300,${FLOOR - 400} Q650,${FLOOR - 320} 1000,${FLOOR - 400} Q1250,${FLOOR - 340} 1500,${FLOOR - 400} Q1700,${FLOOR - 350} ${W},${FLOOR - 390}" fill="none" stroke="#1b1f33" stroke-width="3"/>`;
    for (const [x, k] of [[150, 1], [1250, 0.8], [1850, 1.1]]) bg += `<g transform="translate(${x},${FLOOR - 120}) scale(${k})"><path d="M0,0 L0,-80" stroke="#1b1f33" stroke-width="16"/><path d="M-70,-60 L0,-260 L70,-60 Z" fill="#26304a"/><path d="M-55,-130 L0,-300 L55,-130 Z" fill="#2c3854"/></g>`;
    for (let x = 0; x < W; x += 60) bg += `<path d="M${x},${FLOOR - 120} L${x},${FLOOR - 160}" stroke="#5a5e6e" stroke-width="5"/>`;
    bg += `<path d="M0,${FLOOR - 145} L${W},${FLOOR - 145}" stroke="#5a5e6e" stroke-width="4"/>`;
    for (let x = ((-t * 900) % 400 + 400) % 400 - 400; x < W; x += 400) bg += `<rect x="${x}" y="${FLOOR - 100}" width="22" height="10" rx="4" fill="#ff8a5b"/>`;
    return { bg, fg: "" };
  },

  // ---------------------------------------------------------------- cafe
  cafe({ busy = true } = {}, t = 0) {
    let bg = `<rect width="${W}" height="${FLOOR}" fill="#f3dcc2"/><rect y="560" width="${W}" height="${FLOOR - 560}" fill="#e6c7a6"/><path d="M0,560 L${W},560" stroke="#c9a582" stroke-width="8"/>`;
    // exposed brick patch + wall art
    for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) bg += `<rect x="${640 + c * 70 + (r % 2) * 35}" y="${80 + r * 34}" width="64" height="28" rx="3" fill="#d9967a" opacity="${0.55 + ((r * 3 + c) % 4) * 0.08}" stroke="#b8735a" stroke-width="2"/>`;
    bg += frameArt(700, 340, 140, 110, 0) + frameArt(880, 320, 120, 140, 2);
    // menu board + window (with OPEN sign)
    bg += `<rect x="1230" y="120" width="520" height="300" rx="12" fill="#2f3a35" ${o(6)}/><g fill="#f4f4ee" font-size="40" font-family="InkHand, sans-serif">
      <text x="1490" y="185" text-anchor="middle" font-size="56">MENU</text><text x="1280" y="250">coffee .......... 3</text><text x="1280" y="305">tea ............... 2</text><text x="1280" y="360">cake .............. 4</text></g>
      <path d="M1690,380 q10,-30 30,-10 q-6,24 -30,10" fill="#f7d774" opacity=".8"/>`;
    bg += windowFrame(160, 150, 420, 280, false, t);
    bg += `<rect x="420" y="330" width="120" height="50" rx="10" fill="#2b2f3a" ${o(3)}/><text x="480" y="367" text-anchor="middle" font-size="30" fill="${Math.floor(t * 1.2) % 4 ? "#ff6b8b" : "#7a3b4b"}" style="font-family:MBlack,sans-serif;font-weight:900">OPEN</text>`;
    // pendant lamps + hanging plant
    for (const x of [760, 1060]) bg += `<path d="M${x},0 L${x},170" ${o(4)}/><path d="M${x - 50},230 L${x + 50},230 L${x + 30},170 L${x - 30},170 Z" fill="#8fb3a0" ${o(5)}/>` + glow(x, 260, 180, "#ffd98a", 0.45);
    bg += `<path d="M1150,0 L1150,90" ${o(3)}/><path d="M1120,90 L1180,90 L1170,130 L1130,130 Z" fill="#d98c5f" ${o(3)}/>` + [...Array(5)].map((_, i) => `<path d="M${1130 + i * 10},128 q${(i - 2) * 8},${60 + i * 10} ${(i - 2) * 4},${110 + (i % 2) * 30}" fill="none" stroke="#5fa86a" stroke-width="6" stroke-linecap="round"/>`).join("");
    bg += floorBoards("#b98a63", "#a5764f");
    // back shelf with cups and coffee bags behind the counter
    bg += wallShelf(1300, 470, 520, [["mug", 30], ["mug", 80], ["mug", 130], ["jar", 200], ["jar", 250], ["plant", 330], ["books", 380, 4, 2, 60]], t);
    // counter with espresso machine, pastry case and register (right)
    bg += `<rect x="1300" y="620" width="560" height="250" fill="#8a5a3c" ${o(6)}/>${[1340, 1480, 1620, 1760].map((x) => `<rect x="${x}" y="650" width="100" height="190" rx="6" fill="none" stroke="#6f4630" stroke-width="5"/>`).join("")}<rect x="1280" y="600" width="600" height="30" rx="6" fill="#c99b72" ${o(5)}/>
      <rect x="1520" y="470" width="190" height="130" rx="14" fill="#b9bcc6" ${o(5)}/><rect x="1555" y="500" width="120" height="40" rx="6" fill="#2b2f3a" ${o(3)}/><path d="M1580,600 L1580,560 M1650,600 L1650,560" ${o(5)}/>
      <rect x="1360" y="555" width="60" height="45" rx="6" fill="#fff" ${o(4)}/>
      <path d="M1730,600 L1730,520 Q1730,500 1750,500 L1850,500 Q1870,500 1870,520 L1870,600 Z" fill="#dff1fa" opacity=".85" ${o(4)}/><circle cx="1770" cy="580" r="16" fill="#f0b27a" ${o(2.5)}/><circle cx="1810" cy="582" r="14" fill="#e9767a" ${o(2.5)}/><path d="M1830,592 l30,0 l-6,-18 l-18,0 z" fill="#f7d774" ${o(2.5)}/>`;
    // table + chairs + cups (left)
    bg += `<path d="M230,870 L240,700 M230,760 L320,760 L330,870" fill="none" ${o(6)}/><path d="M610,870 L600,700 M610,760 L520,760 L510,870" fill="none" ${o(6)}/>`;
    bg += `<ellipse cx="420" cy="720" rx="190" ry="34" fill="#c99b72" ${o(5)}/><path d="M420,750 L420,860 M360,870 L480,870" ${o(7)}/>
      <rect x="370" y="676" width="44" height="40" rx="6" fill="#fff" ${o(4)}/><rect x="450" y="680" width="40" height="36" rx="6" fill="#f0b27a" ${o(4)}/><path d="M300,712 l40,-6 l6,10 z" fill="#f7d774" ${o(2.5)}/>`;
    bg += bigPlant(1000, FLOOR, 0.8, t, "#8fb3a0") + `<rect x="1150" y="770" width="60" height="100" rx="6" fill="#4a4f5c" ${o(4)}/><path d="M1160,790 l40,0" stroke="#e5584f" stroke-width="5"/>`;
    for (const [i, cx0] of [[0, 392], [1, 470], [2, 1390]].entries()) for (let k = 0; k < 2; k++) {
      const p = (t * 0.5 + k / 2 + i * 0.3) % 1, base = i === 2 ? 550 : 670;
      bg += `<path d="M${cx0 + Math.sin(t * 2 + k + i) * 6},${base - p * 70} q8,-12 0,-24 q-8,-12 0,-24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="${(1 - p) * 0.8}"/>`;
    }
    return { bg, fg: "" };
  },

  // ---------------------------------------------------------------- soft studio (for big-number cards)
  studio({ tone = "#fbefc4" } = {}, t = 0) {
    // a cozy "explainer" set: tinted walls, panelling, bookcase, gallery wall, desk corner, warm pendants
    let bg = `<rect width="${W}" height="${FLOOR}" fill="${tone}"/>` + wallpaper(tone, 620, W, true) + wainscot(tone, 620, FLOOR - 22);
    bg += floorBoards("#d6b993", "#c2a07a");
    bg += rug(960, 975, 560, 66, shade(tone, -0.25), shade(tone, 0.4));
    // window with a soft daytime view (right)
    bg += window4(1480, 150, 320, 260, "#cfe8f7", shade(tone, -0.3), `<ellipse cx="1570" cy="210" rx="44" ry="16" fill="#fff"/><path d="M1480,410 L1540,330 L1600,370 L1680,300 L1800,410 Z" fill="#a9d79c"/>`);
    // tall bookcase (left)
    bg += `<rect x="30" y="250" width="280" height="${FLOOR - 250}" fill="#a5764f" ${o(5)}/><rect x="46" y="266" width="248" height="${FLOOR - 282}" fill="#8a5a3c"/>`;
    for (const [k, y] of [380, 500, 620, 740, 850].entries()) bg += `<rect x="46" y="${y}" width="248" height="12" fill="#c99b72" ${o(2.5)}/>`;
    bg += booksRow(56, 380, 7, 3, 96) + knick("globe", 250, 380, t) + knick("trophy", 90, 500, t) + booksRow(130, 500, 6, 9, 90) + booksRow(56, 620, 4, 5, 90) + knick("plant", 200, 620, t) + knick("jar", 262, 620, t) +
      booksRow(56, 740, 9, 13, 92) + knick("vinyl", 100, 850, t) + knick("candle", 180, 850, t) + knick("clock", 250, 850, t);
    // gallery wall + wall shelf
    bg += frameArt(400, 150, 170, 130, 0) + frameArt(600, 120, 120, 160, 1) + frameArt(400, 310, 120, 100, 3) + frameArt(545, 310, 175, 100, 2);
    bg += wallShelf(820, 300, 330, [["plant", 40], ["books", 90, 6, 4], ["frame", 260], ["mug", 305]], t);
    bg += corkboard(1150, 470, 300, 190, t) + outlet(760, 800) + outlet(1260, 800);
    bg += pendant(700, 60, shade(tone, -0.35), "#ffd98a", t) + pendant(1240, 40, shade(tone, -0.35), "#ffd98a", t);
    // desk corner (right) with a laptop, mug and lamp; big plant
    bg += `<rect x="1480" y="690" width="400" height="26" rx="6" fill="#c99b72" ${o(4)}/><path d="M1510,716 L1510,${FLOOR} M1850,716 L1850,${FLOOR}" ${o(7)}/><rect x="1690" y="716" width="150" height="110" fill="#b98a63" ${o(4)}/><circle cx="1765" cy="770" r="5" fill="${INK}"/>`;
    bg += `<path d="M1530,690 L1610,690 L1620,620 L1540,620 Z" fill="#4a4f5c" ${o(4)}/><path d="M1515,690 L1640,690" ${o(5)}/><rect x="1552" y="632" width="56" height="44" fill="#9cd0ff" opacity=".7"/>` + knick("mug", 1680, 690, t) +
      `<path d="M1800,690 L1800,610 L1760,570" fill="none" ${o(5)}/><path d="M1735,580 L1790,555 L1798,585 Z" fill="#e9767a" ${o(4)}/>`;
    bg += bigPlant(1880, FLOOR, 0.9, t);
    bg += motes(380, 1500, 150, 820, t, 16);
    return { bg, fg: "" };
  },
};
