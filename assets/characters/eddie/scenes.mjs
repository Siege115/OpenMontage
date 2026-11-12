// Furnished, softly colored backgrounds for Eddie episodes (1920x1080, floor at y=870).
// Eddie himself stays black & white; scenes use muted pastel color so he pops.
// Each scene returns { bg, fg }: fg is drawn in front of Eddie (desks, blankets...).

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
    let bg = `<rect width="${W}" height="${FLOOR}" fill="#dfe8f3"/>`;
    for (let x = 60; x < W; x += 120) bg += `<path d="M${x},0 L${x},${FLOOR}" stroke="#d2ddeb" stroke-width="10"/>`;
    bg += windowFrame(1270, 170, 380, 300, night, t);
    bg += frame(330, 160, 200, 150, "#f7d774", `<path d="M360,280 L410,220 L450,260 L480,230 L510,280 Z" fill="#8fc49a" ${o(3)}/><circle cx="480" cy="200" r="16" fill="#f0b27a" ${o(3)}/>`);
    bg += floorBoards();
    bg += `<ellipse cx="960" cy="985" rx="520" ry="70" fill="#c9b6e4" ${o(4)}/><ellipse cx="960" cy="985" rx="440" ry="50" fill="none" stroke="#b49ad8" stroke-width="5"/>`;
    // bed (left)
    bg += `<rect x="90" y="560" width="40" height="320" rx="10" fill="#b98a63" ${o(5)}/>
      <rect x="130" y="700" width="560" height="110" rx="14" fill="#fff" ${o(5)}/>
      <path d="M260,690 Q470,665 690,690 L690,790 Q470,810 260,800 Z" fill="#7fa7d9" ${o(5)}/>
      <path d="M300,720 Q470,705 670,722" fill="none" stroke="#6a92c6" stroke-width="5"/>
      <rect x="150" y="650" width="130" height="60" rx="24" fill="#fff" ${o(5)}/>
      <rect x="690" y="640" width="34" height="240" rx="10" fill="#b98a63" ${o(5)}/>`;
    // nightstand + lamp + digital clock
    bg += `<rect x="760" y="720" width="150" height="150" rx="8" fill="#c99b72" ${o(5)}/><path d="M760,795 L910,795" ${o(4)}/><circle cx="835" cy="760" r="6" fill="${INK}"/><circle cx="835" cy="835" r="6" fill="${INK}"/>
      <path d="M800,720 L870,720 L860,700 L810,700 Z" fill="#9b8aa8" ${o(4)}/><path d="M835,700 L835,640" ${o(5)}/><path d="M790,640 L880,640 L860,580 L810,580 Z" fill="#f7e2a8" ${o(5)}/>`;
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
    return { bg, fg };
  },

  // ---------------------------------------------------------------- living room
  living({ night = false } = {}, t = 0) {
    let bg = `<rect width="${W}" height="${FLOOR}" fill="#f6e3d3"/>`;
    bg += `<path d="M0,560 L${W},560" stroke="#e8cdb6" stroke-width="8"/>`;
    bg += frame(240, 170, 260, 190, "#c7a8e0", `<circle cx="370" cy="265" r="50" fill="#f7d774" ${o(3)}/>`) + frame(1420, 190, 200, 160, "#9cc3e6");
    bg += floorBoards("#c7a382", "#b08c6b");
    // couch
    bg += `<rect x="120" y="640" width="560" height="160" rx="30" fill="#8fb3a0" ${o(5)}/>
      <rect x="90" y="700" width="90" height="150" rx="26" fill="#8fb3a0" ${o(5)}/><rect x="620" y="700" width="90" height="150" rx="26" fill="#8fb3a0" ${o(5)}/>
      <rect x="170" y="730" width="480" height="80" rx="16" fill="#a5c5b3" ${o(5)}/><rect x="200" y="660" width="90" height="70" rx="18" fill="#f7d774" ${o(4)}/>`;
    // floor lamp + bookshelf
    bg += `<path d="M1300,870 L1300,520" ${o(6)}/><path d="M1250,520 L1350,520 L1325,450 L1275,450 Z" fill="#f7e2a8" ${o(5)}/><ellipse cx="1300" cy="872" rx="50" ry="12" fill="${INK}"/>`;
    bg += `<rect x="1460" y="420" width="320" height="450" fill="#c99b72" ${o(5)}/>`;
    for (const y of [520, 640, 760]) bg += `<path d="M1460,${y} L1780,${y}" ${o(4)}/>` + books(1475, y, 9, y);
    bg += books(1475, 860, 9, 3);
    if (night) bg += nightTint(0.34) + glow(1300, 480, 300, "#ffd98a", 0.55);
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
    const house = (x, w, h, col, lit) => {
      let s = `<rect x="${x}" y="${HB - h}" width="${w}" height="${h}" fill="${col}" ${o(5)}/><path d="M${x - 20},${HB - h} L${x + w / 2},${HB - h - 110} L${x + w + 20},${HB - h} Z" fill="#5a4a5e" ${o(5)}/>`;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
        const on = lit && r === 0 && c === 1;
        s += `<rect x="${x + 30 + c * (w - 120)}" y="${HB - h + 40 + r * 110}" width="60" height="70" fill="${day ? "#cfe9f7" : on ? "#ffe39a" : "#2d3554"}" ${o(4)}/>`;
      }
      return s + `<rect x="${x + w / 2 - 30}" y="${HB - 120}" width="60" height="120" fill="#6b5a4a" ${o(4)}/>`;
    };
    bg += house(60, 360, 300, "#8a7fa8", false) + house(520, 300, 260, "#7f9cb0", false) + house(1330, 360, 320, "#a88f7f", true) + house(1740, 260, 250, "#7fa895", false);
    if (!day) bg += glow(1390 + 120, 250, 140, "#ffe39a", 0.35);
    // street lamp
    bg += `<path d="M1080,${FLOOR} L1080,420 Q1080,380 1130,380 L1170,380" fill="none" ${o(8)}/><path d="M1145,380 L1195,380 L1185,410 L1155,410 Z" fill="${day ? "#eee" : "#ffe39a"}" ${o(4)}/>` + (day ? "" : glow(1170, 450, 330, "#ffe39a", 0.4));
    // back lane with cars at believable scale (behind the characters, never in front of them)
    bg += `<rect x="0" y="${HB}" width="${W}" height="${FLOOR - HB}" fill="${day ? "#7d828f" : "#454a58"}"/><path d="M0,${HB} L${W},${HB}" ${o(4)}/>`;
    for (const [i, [spd, col]] of [[260, "#e5584f"], [-190, "#5b8fd9"]].entries()) {
      const x = ((t * spd + i * 1500) % 3400 + 3400) % 3400 - 700, d = spd > 0 ? 1 : -1, k = 2.3;
      bg += `<g transform="translate(${x},${FLOOR - 14 - i * 10}) scale(${d * k},${k})"><path d="M-150,40 L-150,-10 Q-130,-30 -60,-34 L-20,-80 Q20,-92 90,-86 Q120,-80 140,-34 L170,-30 Q190,-20 190,10 L190,40 Z" fill="${col}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M-10,-40 L20,-76 Q50,-82 80,-78 L110,-40 Z" fill="#cfe9f7" stroke="${INK}" stroke-width="1.6"/><path d="M48,-80 L48,-40" stroke="${INK}" stroke-width="1.6"/>
        <rect x="176" y="-14" width="14" height="10" rx="3" fill="${day ? "#fff6c8" : "#ffe39a"}" stroke="${INK}" stroke-width="1.2"/><circle cx="-80" cy="40" r="26" fill="#2b2f3a" stroke="${INK}" stroke-width="2.4"/><circle cx="-80" cy="40" r="10" fill="#9aa0ad"/><circle cx="120" cy="40" r="26" fill="#2b2f3a" stroke="${INK}" stroke-width="2.4"/><circle cx="120" cy="40" r="10" fill="#9aa0ad"/></g>`;
    }
    bg += `<rect x="0" y="${FLOOR}" width="${W}" height="70" fill="#9aa0ad"/><path d="M0,${FLOOR} L${W},${FLOOR} M0,${FLOOR + 70} L${W},${FLOOR + 70}" ${o(5)}/><rect x="0" y="${FLOOR + 70}" width="${W}" height="200" fill="#4b4f5c"/>`;
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
    return { bg, fg: "" };
  },

  // ---------------------------------------------------------------- cafe
  cafe({ busy = true } = {}, t = 0) {
    let bg = `<rect width="${W}" height="${FLOOR}" fill="#f3dcc2"/><rect y="560" width="${W}" height="${FLOOR - 560}" fill="#e6c7a6"/><path d="M0,560 L${W},560" stroke="#c9a582" stroke-width="8"/>`;
    // menu board + window
    bg += `<rect x="1230" y="120" width="520" height="300" rx="12" fill="#2f3a35" ${o(6)}/><g fill="#f4f4ee" font-size="40" font-family="InkHand, sans-serif">
      <text x="1490" y="185" text-anchor="middle" font-size="56">MENU</text><text x="1280" y="250">coffee .......... 3</text><text x="1280" y="305">tea ............... 2</text><text x="1280" y="360">cake .............. 4</text></g>`;
    bg += windowFrame(160, 150, 420, 280, false, t);
    // pendant lamps
    for (const x of [760, 1060]) bg += `<path d="M${x},0 L${x},170" ${o(4)}/><path d="M${x - 50},230 L${x + 50},230 L${x + 30},170 L${x - 30},170 Z" fill="#8fb3a0" ${o(5)}/>` + glow(x, 260, 180, "#ffd98a", 0.45);
    bg += floorBoards("#b98a63", "#a5764f");
    // counter with espresso machine (right)
    bg += `<rect x="1300" y="620" width="560" height="250" fill="#8a5a3c" ${o(6)}/><rect x="1280" y="600" width="600" height="30" rx="6" fill="#c99b72" ${o(5)}/>
      <rect x="1520" y="470" width="190" height="130" rx="14" fill="#b9bcc6" ${o(5)}/><rect x="1555" y="500" width="120" height="40" rx="6" fill="#2b2f3a" ${o(3)}/><path d="M1580,600 L1580,560 M1650,600 L1650,560" ${o(5)}/>
      <rect x="1360" y="555" width="60" height="45" rx="6" fill="#fff" ${o(4)}/>`;
    // table + cups (left)
    bg += `<ellipse cx="420" cy="720" rx="190" ry="34" fill="#c99b72" ${o(5)}/><path d="M420,750 L420,860 M360,870 L480,870" ${o(7)}/>
      <rect x="370" y="676" width="44" height="40" rx="6" fill="#fff" ${o(4)}/><rect x="450" y="680" width="40" height="36" rx="6" fill="#f0b27a" ${o(4)}/>`;
    for (const [i, cx0] of [[0, 392], [1, 470], [2, 1390]].entries()) for (let k = 0; k < 2; k++) {
      const p = (t * 0.5 + k / 2 + i * 0.3) % 1, base = i === 2 ? 550 : 670;
      bg += `<path d="M${cx0 + Math.sin(t * 2 + k + i) * 6},${base - p * 70} q8,-12 0,-24 q-8,-12 0,-24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="${(1 - p) * 0.8}"/>`;
    }
    return { bg, fg: "" };
  },

  // ---------------------------------------------------------------- soft studio (for big-number cards)
  studio({ tone = "#fbefc4" } = {}, t = 0) {
    let bg = `<rect width="${W}" height="1080" fill="${tone}"/>`;
    const dx = (t * 14) % 80, dy = (t * 6) % 80;
    for (let y = -20; y < 1100; y += 80) for (let x = -40 + ((Math.round((y + 20) / 80)) % 2) * 40; x < W + 80; x += 80) bg += `<circle cx="${x + dx}" cy="${y + dy}" r="4" fill="${INK}" opacity="0.07"/>`;
    // drifting doodles
    for (let i = 0; i < 6; i++) { const x = ((i * 337 + t * (18 + i * 3)) % 2100) - 90, y = 120 + ((i * 173) % 700) + Math.sin(t + i) * 20;
      bg += `<g transform="translate(${x},${y}) rotate(${t * 20 + i * 50})" opacity=".12" fill="none" stroke="${INK}" stroke-width="5">${["<circle r='26'/>", "<path d='M-24,0 L24,0 M0,-24 L0,24'/>", "<path d='M-22,18 L0,-22 L22,18 Z'/>"][i % 3]}</g>`; }
    bg += `<ellipse cx="960" cy="${FLOOR + 10}" rx="700" ry="40" fill="${INK}" opacity="0.06"/>`;
    return { bg, fg: "" };
  },
};
