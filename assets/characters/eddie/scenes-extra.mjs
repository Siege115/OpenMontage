// More furnished scenes for Eddie episodes, each with constant ambient motion (all a pure
// function of time t, so renders are deterministic). 1920x1080, floor at y=870.
// Each returns { bg, fg }; fg is drawn in front of the characters.
import { wainscot, wallpaper, stringLights, pendant, frameArt, wallShelf, knick, booksRow, rug, bigPlant, floorLamp, outlet, corkboard, motes, window4, confetti, shade } from "./decor.mjs";
const INK = "#1b1b20";
const W = 1920, FLOOR = 870;
const o = (w = 5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const S = Math.sin, C = Math.cos, TAU = Math.PI * 2;
const r1 = (n) => { const x = S(n * 127.1) * 43758.5453; return x - Math.floor(x); }; // stable pseudo-random
const glow = (id, x, y, r, c, a) => `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})" opacity="${a}"/>`;
const books = (x, y, n, seed = 1, hMax = 90) => {
  const cols = ["#e9a8a0", "#9cc3e6", "#f7d774", "#8fc49a", "#c7a8e0", "#f0b27a", "#d9776c", "#7fa7d9"];
  let s = "", cx = x;
  for (let i = 0; i < n; i++) {
    const w = 18 + Math.floor(r1(i + seed) * 3) * 6, h = hMax - 30 + Math.floor(r1(i * 3 + seed) * 4) * 10;
    const lean = r1(i * 7 + seed) > 0.9 ? 8 : 0;
    s += `<rect x="${cx}" y="${y - h}" width="${w}" height="${h}" fill="${cols[(i + seed) % cols.length]}" ${o(3)} transform="rotate(${lean},${cx},${y})"/>`;
    s += `<path d="M${cx + 4},${y - h + 12} L${cx + w - 4},${y - h + 12}" stroke="${INK}" stroke-width="1.5" opacity=".4"/>`;
    cx += w + 2;
  }
  return s;
};
const bird = (x, y, t, s = 1) => { const f = S(t * 14) * 10; return `<path transform="translate(${x},${y}) scale(${s})" d="M-18,${f} Q-9,-8 0,0 Q9,-8 18,${f}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`; };
const cloud = (x, y, k) => `<g transform="translate(${x},${y}) scale(${k})"><ellipse rx="110" ry="36" fill="#fff"/><ellipse cx="-48" cy="-18" rx="52" ry="38" fill="#fff"/><ellipse cx="38" cy="-26" rx="60" ry="44" fill="#fff"/></g>`;
const plant = (x, y, s = 1, t = 0) => `<g transform="translate(${x},${y}) scale(${s})"><g transform="rotate(${S(t * 1.3 + x) * 2.5},0,-60)">
  <path d="M0,-60 Q-50,-120 -70,-170 Q-20,-150 0,-60 Z M0,-60 Q40,-140 30,-200 Q70,-140 0,-60 Z M0,-60 Q70,-90 100,-130 Q90,-70 0,-60 Z" fill="#8fc49a" ${o(4)}/></g>
  <path d="M-40,-60 L40,-60 L30,0 L-30,0 Z" fill="#d98c5f" ${o(4)}/></g>`;

export const EXTRA_SCENES = {
  // ------------------------------------------------------------------ park (day)
  park({ bench = 1320 } = {}, t = 0) {
    let bg = `<defs><linearGradient id="pk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ccdf3"/><stop offset="1" stop-color="#e2f4fc"/></linearGradient></defs><rect width="${W}" height="${FLOOR}" fill="url(#pk)"/>`;
    bg += `<g transform="translate(1660,150)"><g transform="rotate(${t * 8})">${[...Array(10)].map((_, i) => `<path d="M0,-100 L0,-125" transform="rotate(${i * 36})" stroke="#f6c84c" stroke-width="7" stroke-linecap="round"/>`).join("")}</g><circle r="72" fill="#ffe27a" ${o(4)}/></g>`;
    for (const [i, [x, y, k]] of [[200, 130, 1], [800, 80, 0.75], [1250, 210, 0.6], [-300, 180, 0.9]].entries()) bg += cloud(((x + t * (14 + i * 4)) % 2400) - 200, y, k);
    bg += `<path d="M0,600 Q300,470 650,560 Q1000,460 1400,560 Q1700,500 ${W},560 L${W},${FLOOR} L0,${FLOOR} Z" fill="#a9d79c"/>`;
    bg += `<path d="M0,660 Q450,580 900,650 Q1300,600 ${W},650 L${W},${FLOOR} L0,${FLOOR} Z" fill="#94c986"/>`;
    // trees (canopies sway)
    for (const [i, [x, h, k]] of [[160, 420, 1.1], [560, 360, 0.85], [1760, 440, 1.15]].entries()) {
      const a = S(t * 1.1 + i * 2) * 2.2;
      bg += `<rect x="${x - 18}" y="${FLOOR - h}" width="36" height="${h}" fill="#9b6b48" ${o(5)}/>`;
      bg += `<g transform="rotate(${a},${x},${FLOOR - h + 30})"><g transform="translate(${x},${FLOOR - h}) scale(${k})">
        <circle cx="-70" cy="10" r="85" fill="#6fb36a" ${o(5)}/><circle cx="70" cy="0" r="90" fill="#6fb36a" ${o(5)}/><circle cx="0" cy="-70" r="100" fill="#7cc276" ${o(5)}/>
        <circle cx="-30" cy="-90" r="14" fill="#e9767a"/><circle cx="50" cy="-40" r="12" fill="#e9767a"/><circle cx="-80" cy="-10" r="11" fill="#e9767a"/></g></g>`;
    }
    // path + grass
    bg += `<rect y="${FLOOR}" width="${W}" height="${1080 - FLOOR}" fill="#86bf74"/><path d="M0,${FLOOR} L${W},${FLOOR}" ${o(5)}/>`;
    bg += `<path d="M700,1080 Q860,960 900,${FLOOR} L1080,${FLOOR} Q1120,960 1320,1080 Z" fill="#e8d3a6" ${o(4)}/>`;
    // pond with ripples + ducks
    bg += `<ellipse cx="420" cy="${FLOOR + 90}" rx="300" ry="60" fill="#7fb8e0" ${o(5)}/>`;
    for (let k = 0; k < 3; k++) { const p = ((t * 0.5 + k / 3) % 1); bg += `<ellipse cx="420" cy="${FLOOR + 90}" rx="${40 + p * 220}" ry="${8 + p * 44}" fill="none" stroke="#fff" stroke-width="3" opacity="${(1 - p) * 0.6}"/>`; }
    for (const [i, dx] of [[0, 300], [1, 520]].entries()) { const y = FLOOR + 80 + S(t * 2 + i) * 4; bg += `<g transform="translate(${dx + S(t * 0.4 + i) * 30},${y})"><ellipse rx="26" ry="15" fill="#fff" ${o(3)}/><circle cx="20" cy="-16" r="11" fill="#fff" ${o(3)}/><path d="M30,-16 L42,-13 L30,-10 Z" fill="#f6a63c"/></g>`; }
    // flowers
    for (let i = 0; i < 14; i++) { const x = 60 + i * 140 + r1(i) * 40, y = FLOOR + 30 + r1(i + 9) * 120; if (x > 650 && x < 1350) continue; bg += `<g transform="translate(${x},${y}) rotate(${S(t * 2 + i) * 8})"><path d="M0,0 L0,-22" stroke="#4f8a43" stroke-width="3"/><circle cy="-26" r="8" fill="${["#ffd84d", "#e9767a", "#c7a8e0"][i % 3]}" ${o(2)}/></g>`; }
    // bench
    bg += `<g transform="translate(${bench},${FLOOR})"><rect x="-210" y="-300" width="420" height="26" rx="8" fill="#b98a63" ${o(4)}/><rect x="-210" y="-258" width="420" height="26" rx="8" fill="#b98a63" ${o(4)}/>
      <rect x="-225" y="-140" width="450" height="28" rx="8" fill="#c99b72" ${o(4)}/><path d="M-190,-112 L-198,0 M190,-112 L198,0 M-190,-300 L-190,-140 M190,-300 L190,-140" ${o(8)}/></g>`;
    // birds + falling leaves
    for (let i = 0; i < 3; i++) bg += bird(((t * (110 + i * 25) + i * 700) % 2300) - 150, 260 + i * 50 + S(t + i) * 15, t + i, 0.9 - i * 0.15);
    for (let i = 0; i < 6; i++) { const p = (t * 0.12 + i / 6) % 1; bg += `<ellipse cx="${200 + i * 300 + S(t * 1.5 + i) * 40}" cy="${300 + p * 600}" rx="9" ry="5" fill="#e0a03c" transform="rotate(${t * 90 + i * 60},${200 + i * 300},${300 + p * 600})" opacity="${1 - p * 0.5}"/>`; }
    // extra life: kite, lamp post, bin, sign, bushes, picnic blanket, butterflies, fence far back
    for (let x = 0; x < W; x += 46) bg += `<path d="M${x},648 L${x},612 M${x - 4},622 L${x + 50},622 M${x - 4},638 L${x + 50},638" stroke="#c9a77f" stroke-width="5"/>`;
    const kx = 1000 + Math.sin(t * 0.6) * 60, ky = 200 + Math.cos(t * 0.9) * 30;
    bg += `<path d="M${kx},${ky + 40} Q${kx - 120},${ky + 300} ${kx - 260},${FLOOR - 180}" fill="none" stroke="${INK}" stroke-width="2"/><path d="M${kx},${ky - 50} L${kx + 36},${ky} L${kx},${ky + 40} L${kx - 36},${ky} Z" fill="#e5584f" ${o(3)}/><path d="M${kx},${ky - 50} L${kx},${ky + 40} M${kx - 36},${ky} L${kx + 36},${ky}" stroke="#fff" stroke-width="3"/>` + [0, 1, 2].map((k) => `<path d="M${kx - 8 - k * 20},${ky + 52 + k * 26} l10,8 l-10,8 z" fill="${["#f7d774", "#5b8fd9", "#8fc49a"][k]}"/>`).join("");
    bg += `<path d="M760,${FLOOR} L760,520" ${o(7)}/><path d="M735,520 L785,520 L775,470 L745,470 Z" fill="#f4efe4" ${o(4)}/><path d="M745,470 L760,450 L775,470" fill="#4a4f5c" ${o(3)}/>`;
    bg += `<path d="M1560,${FLOOR} L1550,780 L1620,780 L1610,${FLOOR} Z" fill="#6f8f6a" ${o(4)}/><path d="M1546,780 L1624,780" ${o(6)}/><path d="M1580,${FLOOR} L1580,700 M1560,700 L1660,700 L1660,650 L1560,650 Z" fill="#9b6b48" ${o(4)}/><text x="1610" y="684" text-anchor="middle" font-size="24" fill="#fff" style="font-family:MBlack,sans-serif;font-weight:900">POND</text>`;
    for (const [bx, k] of [[640, 1], [1700, 0.9], [60, 0.8]]) bg += `<g transform="translate(${bx},${FLOOR}) scale(${k})"><path d="M-80,0 a40,40 0 0,1 40,-50 a45,45 0 0,1 80,-10 a40,40 0 0,1 40,60 z" fill="#5fa86a" ${o(4)}/><circle cx="-20" cy="-40" r="7" fill="#f29ac0"/><circle cx="30" cy="-48" r="7" fill="#fff"/></g>`;
    bg += `<g transform="translate(1720,${FLOOR + 120}) rotate(-6)"><rect x="-120" y="-40" width="240" height="80" fill="#e5584f" ${o(4)}/>${[-80, -40, 0, 40, 80].map((x) => `<path d="M${x},-40 L${x},40" stroke="#fff" stroke-width="10" opacity=".7"/>`).join("")}<rect x="-30" y="-70" width="70" height="44" rx="6" fill="#c99b72" ${o(3)}/></g>`;
    for (let i = 0; i < 3; i++) { const bx = 300 + i * 600 + Math.sin(t * 0.7 + i) * 80, by = 640 + Math.cos(t * 1.1 + i * 2) * 40, f = Math.abs(Math.sin(t * 12 + i)); bg += `<g transform="translate(${bx},${by})"><ellipse cx="-8" cy="0" rx="${10 * f + 2}" ry="8" fill="${["#f7d774", "#f29ac0", "#9cc3e6"][i]}" ${o(1.5)}/><ellipse cx="8" cy="0" rx="${10 * f + 2}" ry="8" fill="${["#f7d774", "#f29ac0", "#9cc3e6"][i]}" ${o(1.5)}/><path d="M0,-8 L0,8" ${o(2.5)}/></g>`; }
    return { bg, fg: "" };
  },

  // ------------------------------------------------------------------ subway car
  subway({ ad = "READ MORE BOOKS", ad2 = "SLEEP: 8 HOURS" } = {}, t = 0) {
    const sway = S(t * 2.3) * 2.5;
    let bg = `<g transform="translate(0,${sway})"><rect width="${W}" height="${FLOOR}" fill="#e3e8ee"/>`;
    // windows with streaking tunnel lights
    bg += `<rect x="0" y="230" width="${W}" height="230" fill="#46506b"/>`;
    for (let i = 0; i < 9; i++) { const x = ((-t * 2600 + i * 420) % 3780 + 3780) % 3780 - 300; bg += `<rect x="${x}" y="${300 + (i % 3) * 40}" width="260" height="8" rx="4" fill="#ffe39a" opacity=".85"/>`; }
    for (let i = 0; i < 4; i++) { const x = ((-t * 1800 + i * 600) % 2400 + 2400) % 2400 - 200; bg += `<rect x="${x}" y="250" width="14" height="190" fill="#3a3f4b"/>`; }
    for (const x of [0, 480, 960, 1440]) bg += `<rect x="${x + 20}" y="230" width="440" height="230" rx="26" fill="none" stroke="#c4ccd6" stroke-width="22"/><rect x="${x + 20}" y="230" width="440" height="230" rx="26" fill="none" ${o(5)}/>`;
    // ads above windows
    bg += `<rect x="140" y="100" width="560" height="100" rx="10" fill="#f7d774" ${o(5)}/><text x="420" y="168" text-anchor="middle" font-size="44" fill="${INK}" font-family="InkHand, sans-serif">${ad}</text>`;
    bg += `<rect x="1220" y="100" width="560" height="100" rx="10" fill="#9cc3e6" ${o(5)}/><text x="1500" y="168" text-anchor="middle" font-size="44" fill="${INK}" font-family="InkHand, sans-serif">${ad2}</text>`;
    // rail + swinging straps
    bg += `<path d="M0,60 L${W},60" ${o(9)}/>`;
    for (let i = 0; i < 9; i++) { const x = 120 + i * 210, a = S(t * 2.3 + i * 0.4) * 9; bg += `<g transform="rotate(${a},${x},60)"><path d="M${x},60 L${x},120" ${o(4)}/><circle cx="${x}" cy="138" r="18" fill="none" ${o(5)}/></g>`; }
    // seats + poles + floor
    for (let x = 0; x < W; x += 240) bg += `<rect x="${x + 10}" y="560" width="220" height="180" rx="18" fill="#5b8fd9" ${o(5)}/><rect x="${x + 26}" y="576" width="188" height="140" rx="12" fill="#6c9ce0"/>`;
    bg += `<rect x="0" y="738" width="${W}" height="30" rx="10" fill="#4a78bd" ${o(5)}/><rect x="0" y="768" width="${W}" height="${FLOOR - 768}" fill="#b4bcc8"/>`;
    bg += `<rect x="0" y="${FLOOR}" width="${W}" height="${1080 - FLOOR}" fill="#9aa3ae"/><path d="M0,${FLOOR} L${W},${FLOOR}" ${o(5)}/><rect x="0" y="${FLOOR + 24}" width="${W}" height="10" fill="#f7d774"/>`;
    bg += `</g>`;
    const fg = `<g transform="translate(0,${sway})"><path d="M330,0 L330,${FLOOR}" stroke="#c9cdd4" stroke-width="18"/><path d="M330,0 L330,${FLOOR}" fill="none" ${o(4)}/>
      <path d="M1610,0 L1610,${FLOOR}" stroke="#c9cdd4" stroke-width="18"/></g>`;
    // route map strip, ceiling light panels, door, stickers, emergency handle
    bg += `<rect x="740" y="100" width="440" height="100" rx="10" fill="#fff" ${o(4)}/><path d="M770,150 L1150,150" stroke="#e5584f" stroke-width="8"/>` + [...Array(7)].map((_, i) => `<circle cx="${780 + i * 60}" cy="150" r="${i === 3 ? 12 : 8}" fill="${i === 3 ? "#f7d774" : "#fff"}" ${o(3)}/><text x="${780 + i * 60}" y="${i % 2 ? 185 : 128}" text-anchor="middle" font-size="16" fill="${INK}" style="font-family:MBlack,sans-serif;font-weight:900">${["A", "B", "C", "D", "E", "F", "G"][i]}</text>`).join("");
    for (let x = 60; x < W; x += 360) bg += `<rect x="${x}" y="8" width="240" height="22" rx="8" fill="#fffbe6" opacity="${0.85 + 0.15 * Math.sin(t * 40 + x) * (Math.sin(t * 0.7 + x) > 0.97 ? 1 : 0)}" ${o(3)}/>`;
    bg += `<rect x="900" y="470" width="120" height="90" rx="6" fill="#d5dbe3" ${o(3)}/><rect x="918" y="488" width="84" height="54" fill="#e5584f"/><text x="960" y="525" text-anchor="middle" font-size="18" fill="#fff" style="font-family:MBlack,sans-serif;font-weight:900">STOP</text>`;
    // LED ticker: text scrolls left -> right, clipped to the screen
    const msg = "NEXT STOP: D  •  MIND THE GAP  •", mw = msg.length * 15, span = 166 + mw, mx = 1192 - mw + ((t * 110) % span);
    bg += `<defs><clipPath id="led"><rect x="1192" y="490" width="166" height="46" rx="4"/></clipPath></defs><rect x="1180" y="480" width="190" height="66" rx="8" fill="#22202b" ${o(3)}/><rect x="1192" y="490" width="166" height="46" rx="4" fill="#120f18"/>
      <g clip-path="url(#led)"><text x="${mx.toFixed(1)}" y="522" font-size="24" fill="#ff9a3c" style="font-family:MBlack,sans-serif;font-weight:900">${msg}</text></g>`;
    bg += `<circle cx="1560" cy="510" r="22" fill="#f7d774" ${o(3)}/><path d="M1552,510 l8,-10 l8,10" fill="none" ${o(3)}/><rect x="560" y="490" width="70" height="44" rx="6" fill="#8fc49a" ${o(2.5)}/><path d="M572,512 q10,-12 22,0 q10,12 24,0" fill="none" stroke="#fff" stroke-width="4"/>`;
    return { bg, fg };
  },

  // ------------------------------------------------------------------ office
  office({ board = [] } = {}, t = 0) {
    let bg = `<rect width="${W}" height="${FLOOR}" fill="#e7ecef"/>`;
    for (let x = 160; x < W; x += 400) bg += `<rect x="${x}" y="0" width="240" height="26" fill="#fffbe6" ${o(3)}/>` + glow(`ol${x}`, x + 120, 40, 200, "#fff6c8", 0.5);
    // whiteboard (left) with handwritten notes
    bg += `<rect x="120" y="140" width="640" height="380" rx="10" fill="#fff" ${o(6)}/><rect x="320" y="520" width="240" height="14" fill="#9aa3ae" ${o(3)}/>`;
    bg += board.map((l, i) => `<text x="440" y="${230 + i * 90}" text-anchor="middle" font-size="${i ? 54 : 70}" fill="${["#d9443a", "#2f5fb3", "#2f8a4c"][i % 3]}" font-family="InkHand, sans-serif">${l}</text>`).join("");
    // window with skyline
    bg += `<rect x="1080" y="120" width="720" height="380" fill="#bfe0f5" ${o(6)}/>`;
    for (let i = 0; i < 8; i++) { const h = 120 + r1(i) * 200, x = 1090 + i * 88; bg += `<rect x="${x}" y="${500 - h}" width="80" height="${h}" fill="#8fa7c4"/>`; for (let r = 0; r < 4; r++) bg += `<rect x="${x + 14}" y="${520 - h + r * 40}" width="16" height="20" fill="#dceaf6"/><rect x="${x + 48}" y="${520 - h + r * 40}" width="16" height="20" fill="#dceaf6"/>`; }
    bg += `<path d="M1440,120 L1440,500 M1080,310 L1800,310" ${o(6)}/>`;
    // wall clock (ticking second hand)
    const sec = Math.floor(t) * 6;
    bg += `<circle cx="920" cy="200" r="62" fill="#fff" ${o(5)}/><path d="M920,200 L920,160 M920,200 L950,210" ${o(5)}/><path d="M920,200 L${920 + S(sec * Math.PI / 180) * 52},${200 - C(sec * Math.PI / 180) * 52}" stroke="#d9443a" stroke-width="3"/>`;
    bg += `<rect y="${FLOOR}" width="${W}" height="${1080 - FLOOR}" fill="#b7c0c9"/><path d="M0,${FLOOR} L${W},${FLOOR}" ${o(5)}/>`;
    // water cooler with rising bubbles
    bg += `<g transform="translate(980,${FLOOR})"><rect x="-50" y="-260" width="100" height="260" rx="10" fill="#e3e8ee" ${o(5)}/><path d="M-40,-260 L-40,-380 Q0,-410 40,-380 L40,-260 Z" fill="#a9d4f5" opacity=".8" ${o(5)}/>`;
    for (let i = 0; i < 4; i++) { const p = (t * 0.6 + i / 4) % 1; bg += `<circle cx="${S(i * 3) * 18}" cy="${-270 - p * 100}" r="${4 + i % 2 * 2}" fill="#fff" opacity="${1 - p}"/>`; }
    bg += `</g>`;
    // cubicles with monitors (code scrolls)
    const cub = (x) => {
      let s = `<rect x="${x}" y="600" width="420" height="${FLOOR - 600}" fill="#8fa3b8" ${o(5)}/><rect x="${x}" y="590" width="420" height="16" fill="#6f8297" ${o(4)}/>`;
      s += `<rect x="${x + 120}" y="440" width="180" height="120" rx="8" fill="#2b2f3a" ${o(5)}/><path d="M${x + 210},560 L${x + 210},592 M${x + 180},592 L${x + 240},592" ${o(5)}/>`;
      for (let l = 0; l < 6; l++) { const yy = 452 + ((l * 18 - t * 30) % 108 + 108) % 108; s += `<rect x="${x + 134 + (l % 3) * 10}" y="${yy}" width="${60 + r1(l + x) * 80}" height="6" rx="3" fill="${["#8fe39a", "#9cd0ff", "#f7d774"][l % 3]}"/>`; }
      return s;
    };
    bg += cub(1220) + plant(1720, FLOOR, 1.1, t);
    // ceiling grid, poster, filing cabinet + printer, coat rack, sticky notes, desk lamp glow
    for (let x = 0; x < W; x += 160) bg += `<path d="M${x},0 L${x},60" stroke="#d3d9de" stroke-width="3"/>`;
    bg += `<path d="M0,60 L${W},60" stroke="#d3d9de" stroke-width="4"/>`;
    bg += `<rect x="800" y="290" width="170" height="150" fill="#2f5fb3" ${o(4)}/><circle cx="812" cy="300" r="5" fill="#e5584f"/><circle cx="958" cy="300" r="5" fill="#e5584f"/><path d="M825,420 L860,380 L895,400 L945,345" fill="none" stroke="#f7d774" stroke-width="7"/><path d="M932,345 l14,0 l0,14" fill="none" stroke="#f7d774" stroke-width="6"/><text x="885" y="330" text-anchor="middle" font-size="26" fill="#fff" style="font-family:MBlack,sans-serif;font-weight:900">GOALS</text>`;
    for (const [x, y, c, r] of [[660, 160, "#f7d774", -6], [690, 260, "#f29ac0", 4], [150, 430, "#9cc3e6", -3]]) bg += `<rect x="${x}" y="${y}" width="70" height="66" fill="${c}" ${o(2.5)} transform="rotate(${r},${x + 35},${y + 33})"/>`;
    bg += `<rect x="40" y="580" width="180" height="${FLOOR - 580}" fill="#9aa3ae" ${o(5)}/>${[660, 760].map((y) => `<path d="M40,${y} L220,${y}" ${o(4)}/><rect x="100" y="${y - 50}" width="60" height="12" rx="5" fill="${INK}"/>`).join("")}<rect x="60" y="520" width="140" height="60" rx="8" fill="#e3e8ee" ${o(4)}/><rect x="80" y="506" width="100" height="16" fill="#fff" ${o(2.5)}/><circle cx="180" cy="550" r="6" fill="#8fe39a"/>`;
    bg += `<path d="M1900,${FLOOR} L1900,520 M1870,${FLOOR} L1930,${FLOOR}" ${o(6)}/><path d="M1900,560 q-40,10 -50,70 l30,0 q4,-50 20,-70" fill="#c9a77f" ${o(3)}/>`;
    bg += knick("mug", 1255, 592, t) + knick("plant", 1300, 592, t) + outlet(600, 810) + wallShelf(1655, 610, 210, [["books", 14, 5, 4], ["trophy", 140], ["clock", 186]], t);
    return { bg, fg: "" };
  },

  // ------------------------------------------------------------------ library
  library({} = {}, t = 0) {
    let bg = `<rect width="${W}" height="${FLOOR}" fill="#efe1c8"/>`;
    // arched window + light rays
    bg += `<path d="M760,520 L760,240 Q960,40 1160,240 L1160,520 Z" fill="#cfe9f7" ${o(6)}/><path d="M960,110 L960,520 M760,360 L1160,360" ${o(5)}/>`;
    const ray = 0.16 + S(t * 0.8) * 0.04;
    bg += `<path d="M770,250 L1150,250 L1500,${FLOOR} L420,${FLOOR} Z" fill="#fff6c8" opacity="${ray}"/>`;
    // tall shelves both sides
    const shelf = (x, w) => {
      let s = `<rect x="${x}" y="60" width="${w}" height="${FLOOR - 60}" fill="#a5764f" ${o(6)}/>`;
      for (let y = 200; y < FLOOR; y += 150) s += `<rect x="${x + 14}" y="${y}" width="${w - 28}" height="12" fill="#7d5636"/>` + books(x + 18, y, Math.floor((w - 40) / 24), y + x, 120);
      return s;
    };
    bg += shelf(40, 560) + shelf(1320, 560);
    // ladder
    bg += `<g transform="translate(1440,0) rotate(-8,0,${FLOOR})"><path d="M0,120 L0,${FLOOR} M80,120 L80,${FLOOR}" ${o(7)}/>${[...Array(6)].map((_, i) => `<path d="M0,${200 + i * 120} L80,${200 + i * 120}" ${o(5)}/>`).join("")}</g>`;
    // QUIET sign
    bg += `<rect x="830" y="560" width="260" height="80" rx="10" fill="#2f3a35" ${o(5)}/><text x="960" y="614" text-anchor="middle" font-size="40" fill="#f4f4ee" font-family="InkHand, sans-serif">QUIET PLEASE</text>`;
    bg += `<rect y="${FLOOR}" width="${W}" height="${1080 - FLOOR}" fill="#b98a63"/><path d="M0,${FLOOR} L${W},${FLOOR}" ${o(5)}/>`;
    // dust motes
    for (let i = 0; i < 22; i++) { const x = 600 + r1(i) * 800 + S(t * 0.4 + i) * 30, y = 260 + ((r1(i + 5) * 600 - t * 12) % 600 + 600) % 600; bg += `<circle cx="${x}" cy="${y}" r="${1.5 + r1(i + 2) * 2.5}" fill="#fff" opacity="${0.4 + 0.4 * S(t * 2 + i)}"/>`; }
    // hanging lamps, portrait, globe on a stand, book cart, rug
    bg += pendant(700, 40, "#4f8a43", "#ffe39a", t) + pendant(1220, 40, "#4f8a43", "#ffe39a", t);
    bg += frameArt(820, 660, 120, 150, 3, "#c99b72") + frameArt(980, 660, 120, 150, 3, "#c99b72");
    bg += `<g transform="translate(1180,${FLOOR})"><path d="M0,0 L0,-120 M-30,0 L30,0" ${o(6)}/><circle cx="0" cy="-170" r="50" fill="#7fb8e0" ${o(4)}/><path d="M-30,-190 q20,10 10,30 q-14,10 -6,24 M10,-205 q24,14 14,36" fill="none" stroke="#6fb36a" stroke-width="10" stroke-linecap="round"/><path d="M-58,-170 A58,58 0 0 1 58,-170" fill="none" ${o(4)}/></g>`;
    bg += `<g transform="translate(640,${FLOOR})"><rect x="-80" y="-120" width="160" height="90" fill="#a5764f" ${o(4)}/>${booksRow(-74, -120, 6, 21, 60)}<circle cx="-56" cy="-14" r="14" fill="${INK}"/><circle cx="56" cy="-14" r="14" fill="${INK}"/></g>`;
    bg += `<ellipse cx="960" cy="${FLOOR + 110}" rx="560" ry="60" fill="#8a3f4a" ${o(4)}/><ellipse cx="960" cy="${FLOOR + 110}" rx="460" ry="42" fill="none" stroke="#e8c48a" stroke-width="6" stroke-dasharray="20 10"/>`;
    // reading table with banker's lamp (foreground)
    const fg = `<rect x="1240" y="760" width="600" height="34" rx="6" fill="#8a5a3c" ${o(5)}/><path d="M1290,794 L1290,1000 M1790,794 L1790,1000" ${o(8)}/>
      <path d="M1700,760 L1700,700" ${o(5)}/><path d="M1640,700 L1760,700 L1740,660 L1660,660 Z" fill="#4f8a43" ${o(5)}/>${glow("lamp", 1700, 720, 160, "#ffe39a", 0.55)}
      <g transform="translate(1340,760)">${books(0, 0, 4, 3, 60)}</g>`;
    return { bg, fg };
  },

  // ------------------------------------------------------------------ house party (night)
  party({} = {}, t = 0) {
    let bg = `<defs><linearGradient id="pw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5bb5"/><stop offset="1" stop-color="#a873b8"/></linearGradient></defs><rect width="${W}" height="${FLOOR}" fill="url(#pw)"/>`;
    for (let x = 0; x < W; x += 120) bg += `<rect x="${x}" y="0" width="60" height="${FLOOR}" fill="#fff" opacity=".05"/>`;
    // roving disco spots
    for (let i = 0; i < 9; i++) { const x = 960 + S(t * 0.7 + i * 1.3) * 900, y = 380 + C(t * 0.9 + i * 2.1) * 300; bg += `<circle cx="${x}" cy="${y}" r="${30 + (i % 3) * 14}" fill="${["#ff6bb5", "#6bd4ff", "#ffe36b", "#8bff8b"][i % 4]}" opacity=".35"/>`; }
    // string lights
    bg += `<path d="M0,60 Q480,150 960,60 Q1440,150 ${W},60" fill="none" stroke="#111" stroke-width="4"/>`;
    for (let i = 0; i <= 24; i++) { const x = i * 80, seg = x < 960 ? x / 960 : (x - 960) / 960, y = 60 + Math.sin(seg * Math.PI) * 90, on = (Math.floor(t * 3) + i) % 3 !== 0; bg += `<circle cx="${x}" cy="${y + 14}" r="10" fill="${["#ff6b6b", "#ffe36b", "#6bd4ff", "#8bff8b"][i % 4]}" opacity="${on ? 1 : 0.35}" ${o(2)}/>`; }
    // disco ball
    bg += `<path d="M960,0 L960,120" ${o(3)}/><g transform="translate(960,175)"><circle r="55" fill="#c9cdd4" ${o(4)}/>`;
    for (let i = 0; i < 6; i++) { const x = ((i * 22 + t * 40) % 110) - 55; bg += `<path d="M${x},-50 L${x},50" stroke="#fff" stroke-width="3" opacity=".6"/>`; }
    bg += `<path d="M-55,0 L55,0 M-48,-27 L48,-27 M-48,27 L48,27" stroke="#9aa0ad" stroke-width="3"/></g>`;
    // balloons
    for (const [i, x] of [[0, 180], [1, 300], [2, 1700], [3, 1810]].entries()) { const y = 260 + S(t * 1.4 + i) * 12; bg += `<path d="M${x},${y + 60} Q${x + 10},${y + 160} ${x - 6},${y + 260}" fill="none" stroke="#111" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="48" ry="60" fill="${["#ff6b6b", "#ffe36b", "#6bd4ff", "#c7a8e0"][i]}" ${o(4)}/>`; }
    bg += `<rect y="${FLOOR}" width="${W}" height="${1080 - FLOOR}" fill="#5a4580"/><path d="M0,${FLOOR} L${W},${FLOOR}" ${o(5)}/>`;
    // pulsing speaker + snack table
    const pulse = 1 + Math.max(0, S(t * 2 * Math.PI * 2)) * 0.08;
    bg += `<g transform="translate(1640,${FLOOR})"><rect x="-90" y="-330" width="180" height="330" rx="12" fill="#22202b" ${o(5)}/><circle cy="-230" r="${46 * pulse}" fill="#3d3a4a" ${o(5)}/><circle cy="-90" r="${62 * pulse}" fill="#3d3a4a" ${o(5)}/><circle cy="-90" r="18" fill="#111"/></g>`;
    bg += `<rect x="140" y="700" width="420" height="30" rx="6" fill="#c99b72" ${o(4)}/><path d="M170,730 L170,${FLOOR} M530,730 L530,${FLOOR}" ${o(6)}/><ellipse cx="260" cy="690" rx="60" ry="16" fill="#f0b27a" ${o(3)}/><rect x="400" y="640" width="40" height="60" rx="6" fill="#e9767a" ${o(3)}/><rect x="460" y="650" width="34" height="50" rx="6" fill="#8fc49a" ${o(3)}/>`;
    // window with night city, banner, wall frames, couch, plant, cups, falling confetti
    bg += window4(1180, 150, 300, 230, "#2a2f55", "#5a3f8a", [...Array(6)].map((_, i) => `<rect x="${1190 + i * 48}" y="${280 - (i * 41) % 80}" width="40" height="${110 + (i * 41) % 80}" fill="#1c2040"/><rect x="${1200 + i * 48}" y="${300 - (i * 41) % 80}" width="8" height="10" fill="#ffe39a"/>`).join(""));
    bg += `<path d="M380,110 Q620,170 860,110" fill="none" stroke="#111" stroke-width="3"/>` + [..."PARTY!"].map((ch, i) => { const x = 420 + i * 78, y = 128 + Math.sin(((i + 0.5) / 6) * Math.PI) * 24; return `<path d="M${x - 30},${y} L${x + 30},${y} L${x},${y + 70} Z" fill="${["#ff6b6b", "#ffe36b", "#6bd4ff", "#8bff8b", "#ff9de2", "#ffb84d"][i]}" ${o(3)}/><text x="${x}" y="${y + 36}" text-anchor="middle" font-size="30" fill="${INK}" style="font-family:MBlack,sans-serif;font-weight:900">${ch}</text>`; }).join("");
    bg += frameArt(1560, 200, 120, 150, 1) + frameArt(1700, 230, 140, 110, 2);
    bg += `<rect x="1180" y="650" width="380" height="140" rx="28" fill="#c06a8a" ${o(5)}/><rect x="1150" y="700" width="80" height="140" rx="24" fill="#c06a8a" ${o(5)}/><rect x="1510" y="700" width="80" height="140" rx="24" fill="#c06a8a" ${o(5)}/><rect x="1220" y="720" width="300" height="70" rx="14" fill="#d58aa5" ${o(4)}/>`;
    bg += bigPlant(1880, FLOOR, 0.8, t, "#8a6abf") + `<g>${[[240, 868], [700, 880], [1040, 876]].map(([x, y]) => `<path d="M${x - 14},${y - 30} L${x + 14},${y - 30} L${x + 10},${y} L${x - 10},${y} Z" fill="#e5584f" ${o(3)}/>`).join("")}</g>`;
    bg += `<path d="M200,676 l120,0 l-10,10 l-100,0 z" fill="#f4efe4" ${o(3)}/><path d="M215,676 l45,-30 l45,30" fill="#f7c948" ${o(3)}/>`;
    bg += confetti(t, 26);
    return { bg, fg: "" };
  },

  // ------------------------------------------------------------------ rooftop at sunset
  rooftop({} = {}, t = 0) {
    let bg = `<defs><linearGradient id="rs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b5aa6"/><stop offset=".55" stop-color="#ff9a7b"/><stop offset="1" stop-color="#ffd59a"/></linearGradient></defs><rect width="${W}" height="${FLOOR}" fill="url(#rs)"/>`;
    bg += glow("sun", 1300, 600, 380, "#fff1b8", 0.8) + `<circle cx="1300" cy="${610 + t * 2}" r="110" fill="#ffe08a"/>`;
    for (let i = 0; i < 3; i++) bg += bird(((t * (70 + i * 20) + i * 600) % 2300) - 150, 200 + i * 60, t + i, 0.8);
    // skyline with windows switching on
    for (let i = 0; i < 16; i++) {
      const w = 90 + r1(i) * 70, x = i * 125 - 20, h = 220 + r1(i + 3) * 300;
      bg += `<rect x="${x}" y="${720 - h}" width="${w}" height="${h + 20}" fill="#3e2f5c"/>`;
      for (let r = 0; r < Math.floor(h / 50); r++) for (let c = 0; c < 3; c++) { const on = r1(i * 31 + r * 7 + c) < 0.25 + Math.min(0.5, t * 0.02); if (on) bg += `<rect x="${x + 14 + c * (w - 28) / 3}" y="${740 - h + r * 50}" width="16" height="22" fill="#ffd77a" opacity=".9"/>`; }
    }
    // water tower + antenna with blinking light
    bg += `<g transform="translate(340,640)"><path d="M-60,0 L-80,180 M60,0 L80,180 M-70,90 L70,90" ${o(7)}/><path d="M-70,0 L-70,-150 Q0,-200 70,-150 L70,0 Z" fill="#9b6b48" ${o(6)}/><path d="M-70,-50 L70,-50 M-70,-100 L70,-100" stroke="${INK}" stroke-width="3"/></g>`;
    bg += `<path d="M1620,720 L1620,330" ${o(6)}/><circle cx="1620" cy="322" r="11" fill="${Math.floor(t * 1.5) % 2 ? "#ff3b30" : "#5a1a1a"}" ${o(3)}/>`;
    bg += `<rect y="720" width="${W}" height="${FLOOR - 720}" fill="#8a7f95"/><rect y="${FLOOR}" width="${W}" height="${1080 - FLOOR}" fill="#9a8fa5"/><path d="M0,${FLOOR} L${W},${FLOOR}" ${o(5)}/>`;
    const fg = `<path d="M0,800 L${W},800" ${o(7)}/>${[...Array(25)].map((_, i) => `<path d="M${i * 80},800 L${i * 80},${FLOOR}" ${o(5)}/>`).join("")}`;
    // sunset clouds, AC units, vents, a door hut with a lamp, deck chairs, plants and string lights
    for (const [x, y, k] of [[300, 160, 1], [900, 120, 0.8], [1600, 210, 0.7]]) bg += `<g transform="translate(${x + Math.sin(t * 0.2 + x) * 20},${y}) scale(${k})"><ellipse rx="140" ry="26" fill="#ffc4a8" opacity=".85"/><ellipse cx="-40" cy="-16" rx="70" ry="28" fill="#ffd2b8" opacity=".85"/></g>`;
    bg += `<g transform="translate(1720,720)"><rect x="-120" y="-200" width="240" height="200" fill="#7d7290" ${o(5)}/><path d="M-140,-200 L140,-200" ${o(7)}/><rect x="-50" y="-150" width="100" height="150" fill="#5a4f6a" ${o(4)}/><circle cx="35" cy="-70" r="6" fill="#ffd77a"/><rect x="-20" y="-190" width="40" height="22" rx="4" fill="#ffe39a" ${o(3)}/></g>${glow("door", 1720, 540, 140, "#ffe39a", 0.5)}`;
    bg += `<g transform="translate(700,720)"><rect x="-90" y="-110" width="180" height="110" rx="8" fill="#b9bcc6" ${o(5)}/><circle cx="-30" cy="-55" r="38" fill="#9aa0ad" ${o(4)}/><g transform="rotate(${t * 400},-30,-55)"><path d="M-30,-88 L-30,-22 M-63,-55 L3,-55" stroke="${INK}" stroke-width="5"/></g><path d="M30,-90 l40,0 M30,-70 l40,0 M30,-50 l40,0 M30,-30 l40,0" ${o(3)}/></g>`;
    bg += `<path d="M1000,720 L1000,640 L1050,640" fill="none" stroke="#b9bcc6" stroke-width="22"/><path d="M1000,720 L1000,640 L1050,640" fill="none" ${o(3)}/>`;
    bg += stringLights(120, 1580, 640, 24, t, ["#ffe39a", "#ffd0a0", "#fff2c0"]);
    bg += bigPlant(1320, 760, 0.55, t, "#c06a5a") + bigPlant(160, 760, 0.6, t, "#5b8fd9");
    return { bg, fg };
  },

  // ------------------------------------------------------------------ rock concert
  concert({} = {}, t = 0) {
    let bg = `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a7a"/><stop offset=".7" stop-color="#8a3f9e"/><stop offset="1" stop-color="#d4628f"/></linearGradient></defs><rect width="${W}" height="1080" fill="url(#cg)"/>`;
    // sweeping beams
    for (let i = 0; i < 6; i++) {
      const x = 200 + i * 300, a = S(t * 1.6 + i * 1.1) * 28;
      bg += `<g transform="rotate(${a},${x},80)"><path d="M${x - 14},80 L${x + 14},80 L${x + 160},${FLOOR} L${x - 160},${FLOOR} Z" fill="${["#ff6bb5", "#6bd4ff", "#ffe36b"][i % 3]}" opacity=".35"/></g>`;
    }
    bg += `<rect x="0" y="60" width="${W}" height="30" fill="#4a4060" ${o(4)}/>`;
    for (let i = 0; i < 6; i++) bg += `<circle cx="${200 + i * 300}" cy="96" r="20" fill="${["#ff6bb5", "#6bd4ff", "#ffe36b"][i % 3]}" ${o(3)}/>`;
    // stage + speaker stacks + band silhouette
    bg += `<rect x="300" y="560" width="1320" height="60" fill="#5a4680" ${o(5)}/>`;
    const pulse = 1 + Math.max(0, S(t * TAU * 2.2)) * 0.1;
    for (const x of [140, 1780]) bg += `<g transform="translate(${x},620)"><rect x="-110" y="-380" width="220" height="380" fill="#22202b" ${o(5)}/><circle cy="-280" r="${54 * pulse}" fill="#3d3a4a" ${o(4)}/><circle cy="-110" r="${70 * pulse}" fill="#3d3a4a" ${o(4)}/></g>`;
    for (const [i, x] of [[0, 700], [1, 960], [2, 1220]].entries()) { const j = Math.abs(S(t * 7 + i)) * 14; bg += `<g transform="translate(${x},${560 - j})"><circle cy="-170" r="34" fill="#2a1f4a"/><path d="M0,-136 L0,-50 M0,-50 L-30,0 M0,-50 L30,0 M0,-115 L-40,-70 M0,-115 L40,-80" stroke="#2a1f4a" stroke-width="12" stroke-linecap="round"/></g>`; }
    bg += `<rect y="620" width="${W}" height="${1080 - 620}" fill="#4a2f6a"/>`;
    // LED wall with an equaliser, truss lights, mic stands, haze, phone lights in the crowd, confetti
    bg += `<rect x="420" y="160" width="1080" height="290" rx="10" fill="#160f2e" ${o(5)}/>`;
    for (let i = 0; i < 24; i++) { const h = 30 + Math.abs(Math.sin(t * 5 + i * 0.7) * Math.cos(t * 3.1 + i)) * 220; bg += `<rect x="${440 + i * 44}" y="${440 - h}" width="34" height="${h}" rx="4" fill="${["#ff6bb5", "#6bd4ff", "#ffe36b"][Math.floor(i / 8)]}" opacity=".8"/>`; }
    bg += `<path d="M0,40 L${W},40 M0,80 L${W},80" stroke="#6a5f80" stroke-width="5"/>` + [...Array(24)].map((_, i) => `<path d="M${i * 80},40 L${i * 80 + 40},80 L${i * 80 + 80},40" fill="none" stroke="#6a5f80" stroke-width="4"/>`).join("");
    for (const x of [560, 1360]) bg += `<path d="M${x},560 L${x},400 M${x - 30},560 L${x + 30},560 M${x},400 L${x + 30},380" ${o(5)}/><ellipse cx="${x + 36}" cy="376" rx="10" ry="14" fill="#555" ${o(3)}/>`;
    bg += `<rect y="${FLOOR - 160}" width="${W}" height="200" fill="#fff" opacity="${0.06 + 0.03 * Math.sin(t)}"/>`;
    // bouncing crowd heads (foreground)
    let fg = "";
    for (let i = 0; i < 26; i++) { const x = i * 78 - 10, b = Math.abs(S(t * 6 + i * 0.7)) * 22; fg += `<circle cx="${x}" cy="${1000 - b}" r="44" fill="#2a1f4a"/>`; if (i % 4 === 1) fg += `<path d="M${x + 20},${960 - b} L${x + 40},${860 - b}" stroke="#2a1f4a" stroke-width="14" stroke-linecap="round"/>`; }
    for (let i = 0; i < 9; i++) { const x = 60 + i * 210 + Math.sin(t * 2 + i) * 20, y = 880 - Math.abs(Math.sin(t * 6 + i)) * 20; if (i % 2) fg += `<rect x="${x}" y="${y}" width="22" height="36" rx="4" fill="#fff" opacity=".85"/><circle cx="${x + 11}" cy="${y + 18}" r="40" fill="#fff" opacity=".12"/>`; }
    fg += confetti(t, 22, 1920, 1000);
    return { bg, fg };
  },
};
