// Reusable set dressing for Eddie scenes: small, detailed props that make a room feel lived-in.
// Everything is a pure function of its arguments (and time t for ambient motion), drawn in the
// same flat-ink style as the scenes (1920x1080, floor at y=870).
export const INK = "#1b1b20";
export const o = (w = 5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const S = Math.sin;
export const r1 = (n) => { const x = S(n * 127.1) * 43758.5453; return x - Math.floor(x); };

// darken (amt<0) or lighten (amt>0) a #rrggbb colour
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16), f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return "#" + [n >> 16, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("");
}

// lower-wall panelling with a chair rail
export function wainscot(tone, y0 = 600, floor = 870, w = 1920) {
  const c = shade(tone, -0.07);
  let s = `<rect x="0" y="${y0}" width="${w}" height="${floor - y0}" fill="${c}"/><rect x="0" y="${y0 - 10}" width="${w}" height="16" fill="${shade(tone, 0.25)}" ${o(3)}/>`;
  for (let x = 30; x < w; x += 200) s += `<rect x="${x}" y="${y0 + 40}" width="160" height="${floor - y0 - 90}" rx="6" fill="none" stroke="${shade(tone, -0.16)}" stroke-width="4"/>`;
  return s;
}

// subtle vertical wallpaper stripes with a tiny motif
export function wallpaper(tone, y1 = 870, w = 1920, motif = true) {
  let s = "";
  for (let x = 0; x < w; x += 96) s += `<rect x="${x}" y="0" width="48" height="${y1}" fill="${shade(tone, -0.035)}"/>`;
  if (motif) for (let x = 72; x < w; x += 96) for (let y = 60; y < y1 - 40; y += 120) s += `<path d="M${x},${y + ((x / 96) % 2) * 60} l6,-10 l6,10 l-6,10 z" fill="${shade(tone, -0.09)}"/>`;
  return s;
}

export function stringLights(x0, x1, y, sag, t, cols = ["#ff7b6b", "#ffe36b", "#7fd0ff", "#9cf09c"]) {
  const mid = (x0 + x1) / 2;
  let s = `<path d="M${x0},${y} Q${mid},${y + sag * 2} ${x1},${y}" fill="none" stroke="${INK}" stroke-width="3"/>`;
  const n = Math.round((x1 - x0) / 70);
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = x0 + (x1 - x0) * u, yy = y + sag * 4 * u * (1 - u) + 10, on = 0.65 + 0.35 * S(t * 3 + i * 1.7);
    s += `<circle cx="${x}" cy="${yy}" r="16" fill="${cols[i % cols.length]}" opacity="${(0.22 * on).toFixed(2)}"/><ellipse cx="${x}" cy="${yy}" rx="7" ry="9" fill="${cols[i % cols.length]}" opacity="${on.toFixed(2)}" ${o(2)}/>`;
  }
  return s;
}

export function pendant(x, len, col = "#8fb3a0", glowCol = "#ffd98a", t = 0) {
  const sw = S(t * 0.8 + x) * 1.2;
  return `<defs><radialGradient id="pg${x}"><stop offset="0" stop-color="${glowCol}"/><stop offset="1" stop-color="${glowCol}" stop-opacity="0"/></radialGradient></defs>
    <g transform="rotate(${sw},${x},0)"><path d="M${x},0 L${x},${len}" ${o(3)}/><path d="M${x - 46},${len + 52} Q${x},${len - 8} ${x + 46},${len + 52} Z" fill="${col}" ${o(4)}/><ellipse cx="${x}" cy="${len + 54}" rx="14" ry="7" fill="#fff6c8"/></g>
    <circle cx="${x}" cy="${len + 80}" r="170" fill="url(#pg${x})" opacity=".45"/>`;
}

export function frameArt(x, y, w, h, kind = 0, mat = "#fff") {
  const ix = x + 12, iy = y + 12, iw = w - 24, ih = h - 24;
  const arts = [
    `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#9cc3e6"/><path d="M${ix},${iy + ih} L${ix + iw * 0.35},${iy + ih * 0.45} L${ix + iw * 0.6},${iy + ih * 0.75} L${ix + iw * 0.8},${iy + ih * 0.5} L${ix + iw},${iy + ih} Z" fill="#8fc49a" ${o(2)}/><circle cx="${ix + iw * 0.75}" cy="${iy + ih * 0.28}" r="${ih * 0.12}" fill="#f7d774"/>`,
    `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#f7d774"/><circle cx="${ix + iw / 2}" cy="${iy + ih / 2}" r="${Math.min(iw, ih) * 0.3}" fill="#e9767a" ${o(2)}/>`,
    `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#c7a8e0"/><path d="M${ix + 10},${iy + ih - 10} Q${ix + iw / 2},${iy + 10} ${ix + iw - 10},${iy + ih - 10}" fill="none" stroke="#fff" stroke-width="5"/>`,
    `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#f4efe4"/><circle cx="${ix + iw / 2}" cy="${iy + ih * 0.42}" r="${ih * 0.2}" fill="#fff" ${o(2)}/><path d="M${ix + iw * 0.3},${iy + ih} Q${ix + iw / 2},${iy + ih * 0.55} ${ix + iw * 0.7},${iy + ih} Z" fill="#fff" ${o(2)}/>`,
  ];
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${mat}" ${o(4)}/>${arts[kind % arts.length]}<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" ${o(2)}/>`;
}

export function booksRow(x, y, n, seed = 1, hMax = 80) {
  const cols = ["#e9a8a0", "#9cc3e6", "#f7d774", "#8fc49a", "#c7a8e0", "#f0b27a", "#d9776c", "#7fa7d9"];
  let s = "", cx = x;
  for (let i = 0; i < n; i++) {
    const w = 16 + Math.floor(r1(i + seed) * 3) * 6, h = hMax - 26 + Math.floor(r1(i * 3 + seed) * 4) * 8;
    s += `<rect x="${cx}" y="${y - h}" width="${w}" height="${h}" fill="${cols[(i + seed) % cols.length]}" ${o(2.5)}/><path d="M${cx + 3},${y - h + 10} L${cx + w - 3},${y - h + 10}" stroke="${INK}" stroke-width="1.5" opacity=".4"/>`;
    cx += w + 1;
  }
  return s;
}

// little things for shelves: [kind, x] with kind in plant | jar | trophy | globe | frame | clock | candle | mug | vinyl
export function knick(kind, x, y, t = 0) {
  switch (kind) {
    case "plant": return `<path d="M${x - 16},${y - 34} L${x + 16},${y - 34} L${x + 12},${y} L${x - 12},${y} Z" fill="#d98c5f" ${o(3)}/><g transform="rotate(${S(t * 1.2 + x) * 3},${x},${y - 34})"><path d="M${x},${y - 34} Q${x - 30},${y - 60} ${x - 34},${y - 84} Q${x - 8},${y - 70} ${x},${y - 34} Z M${x},${y - 34} Q${x + 26},${y - 66} ${x + 22},${y - 92} Q${x + 40},${y - 60} ${x},${y - 34} Z M${x},${y - 34} Q${x + 2},${y - 70} ${x - 6},${y - 100} Q${x + 14},${y - 70} ${x},${y - 34} Z" fill="#7cc276" ${o(2.5)}/></g>`;
    case "jar": return `<rect x="${x - 16}" y="${y - 44}" width="32" height="44" rx="8" fill="#cfe9f7" opacity=".9" ${o(3)}/><rect x="${x - 18}" y="${y - 52}" width="36" height="10" rx="3" fill="#c99b72" ${o(2.5)}/><circle cx="${x - 5}" cy="${y - 18}" r="6" fill="#f0b27a"/><circle cx="${x + 6}" cy="${y - 10}" r="6" fill="#e9767a"/>`;
    case "trophy": return `<path d="M${x - 20},${y - 60} L${x + 20},${y - 60} Q${x + 18},${y - 28} ${x},${y - 24} Q${x - 18},${y - 28} ${x - 20},${y - 60} Z" fill="#f7c948" ${o(3)}/><path d="M${x - 20},${y - 54} q-14,4 -4,18 M${x + 20},${y - 54} q14,4 4,18" fill="none" ${o(3)}/><rect x="${x - 4}" y="${y - 24}" width="8" height="12" fill="#f7c948" ${o(2)}/><rect x="${x - 16}" y="${y - 12}" width="32" height="12" fill="#8a5a3c" ${o(3)}/>`;
    case "globe": return `<path d="M${x},${y} L${x},${y - 16} M${x - 16},${y} L${x + 16},${y}" ${o(4)}/><circle cx="${x}" cy="${y - 48}" r="30" fill="#7fb8e0" ${o(3)}/><path d="M${x - 18},${y - 64} q14,6 6,22 q-10,8 -4,18 M${x + 6},${y - 74} q18,10 10,26" fill="none" stroke="#6fb36a" stroke-width="8" stroke-linecap="round"/><path d="M${x - 34},${y - 48} A34,34 0 0 1 ${x + 34},${y - 48}" fill="none" ${o(3)}/>`;
    case "frame": return `<rect x="${x - 22}" y="${y - 54}" width="44" height="54" fill="#fff" ${o(3)}/><rect x="${x - 14}" y="${y - 46}" width="28" height="36" fill="#f9c7b8"/><circle cx="${x}" cy="${y - 32}" r="7" fill="#fff" ${o(1.5)}/>`;
    case "clock": return `<rect x="${x - 26}" y="${y - 50}" width="52" height="50" rx="10" fill="#e9767a" ${o(3)}/><circle cx="${x}" cy="${y - 26}" r="16" fill="#fff" ${o(2.5)}/><path d="M${x},${y - 26} L${x},${y - 36} M${x},${y - 26} L${x + 8},${y - 22}" ${o(2)}/>`;
    case "candle": return `<rect x="${x - 10}" y="${y - 34}" width="20" height="34" fill="#f4efe4" ${o(3)}/><path d="M${x},${y - 34} q${-6 + S(t * 9) * 2},-10 0,-22 q${6 + S(t * 7) * 2},12 0,22" fill="#ffb84d" ${o(1.5)}/>`;
    case "mug": return `<rect x="${x - 16}" y="${y - 30}" width="32" height="30" rx="5" fill="#fff" ${o(3)}/><path d="M${x + 16},${y - 24} q12,0 12,10 q0,10 -12,10" fill="none" ${o(3)}/><path d="M${x - 8},${y - 18} l16,0" stroke="#e9767a" stroke-width="4"/>`;
    case "vinyl": return `<rect x="${x - 34}" y="${y - 70}" width="68" height="70" fill="#5b8fd9" ${o(3)}/><circle cx="${x}" cy="${y - 35}" r="22" fill="#1b1b20"/><circle cx="${x}" cy="${y - 35}" r="7" fill="#f7d774"/>`;
    default: return "";
  }
}

// a wall shelf (plank + brackets) carrying books and knick-knacks
export function wallShelf(x, y, w, items = [], t = 0) {
  let s = `<path d="M${x + 20},${y + 12} l0,22 l22,-22 M${x + w - 20},${y + 12} l0,22 l-22,-22" fill="#8a5a3c" ${o(3)}/><rect x="${x}" y="${y}" width="${w}" height="14" rx="3" fill="#c99b72" ${o(3)}/>`;
  for (const it of items) s += Array.isArray(it) && it[0] === "books" ? booksRow(x + it[1], y, it[2], it[3] ?? x, it[4] ?? 70) : knick(it[0], x + it[1], y, t);
  return s;
}

export function rug(cx, cy, rx, ry, c1 = "#e9a8a0", c2 = "#f4efe4") {
  let s = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c1}" ${o(4)}/><ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.78}" ry="${ry * 0.7}" fill="none" stroke="${c2}" stroke-width="6" stroke-dasharray="18 12"/>`;
  for (let i = -6; i <= 6; i++) s += `<path d="M${cx + (i / 6) * rx * 0.96},${cy + ry * Math.sqrt(Math.max(0, 1 - (i / 6.2) ** 2))} l0,10" stroke="${c1}" stroke-width="4"/>`;
  return s;
}

export function bigPlant(x, y, s = 1, t = 0, pot = "#e2b679") {
  const a = S(t * 0.9 + x) * 2;
  return `<g transform="translate(${x},${y}) scale(${s})"><g transform="rotate(${a},0,-80)">
    ${[[-70, -240, -20], [60, -260, 25], [-10, -300, 0], [-90, -170, -40], [90, -180, 40]].map(([lx, ly, r]) => `<g transform="rotate(${r},0,-80)"><path d="M0,-80 Q${lx * 0.4},${(ly - 80) / 2} ${lx},${ly}" fill="none" stroke="#4f8a43" stroke-width="5"/><path d="M${lx},${ly} q-38,22 -10,60 q34,4 40,-30 q2,-26 -30,-30 z" fill="#5fa86a" ${o(3)}/><path d="M${lx - 4},${ly + 8} l-12,40" stroke="#3f7a4a" stroke-width="2.5"/></g>`).join("")}</g>
    <path d="M-60,-90 L60,-90 L46,0 L-46,0 Z" fill="${pot}" ${o(4)}/><path d="M-62,-90 L62,-90" ${o(6)}/><path d="M-54,-60 L54,-60" stroke="${shade(pot, -0.2)}" stroke-width="5"/></g>`;
}

export function floorLamp(x, y, t = 0, on = true, col = "#f7e2a8") {
  return `<path d="M${x},${y} L${x},${y - 330}" ${o(6)}/><ellipse cx="${x}" cy="${y + 2}" rx="46" ry="11" fill="${INK}"/><path d="M${x - 56},${y - 330} L${x + 56},${y - 330} L${x + 34},${y - 410} L${x - 34},${y - 410} Z" fill="${col}" ${o(5)}/>` +
    (on ? `<defs><radialGradient id="fl${x}"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs><circle cx="${x}" cy="${y - 330}" r="220" fill="url(#fl${x})" opacity="${0.4 + 0.03 * S(t * 3)}"/>` : "");
}

export function outlet(x, y) { return `<rect x="${x - 14}" y="${y - 20}" width="28" height="40" rx="5" fill="#f8f6f0" ${o(2.5)}/><path d="M${x - 5},${y - 8} l0,8 M${x + 5},${y - 8} l0,8" ${o(2.5)}/>`; }

export function corkboard(x, y, w, h, t = 0) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#c9965f" ${o(5)}/><rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="#d9aa72"/>`;
  const notes = [["#f7d774", -4], ["#9cc3e6", 3], ["#f29ac0", -2], ["#8fc49a", 5], ["#fff", -6]];
  notes.forEach(([c, r], i) => {
    const nx = x + 24 + ((i * 97) % (w - 100)), ny = y + 22 + ((i * 53) % (h - 100));
    s += `<g transform="rotate(${r + S(t * 1.1 + i) * 1.2},${nx + 35},${ny})"><rect x="${nx}" y="${ny}" width="70" height="62" fill="${c}" ${o(2.5)}/><path d="M${nx + 10},${ny + 24} l46,0 M${nx + 10},${ny + 38} l34,0" stroke="${INK}" stroke-width="2.5" opacity=".5"/><circle cx="${nx + 35}" cy="${ny + 6}" r="6" fill="#e5584f" ${o(1.5)}/></g>`;
  });
  return s + `<path d="M${x + 60},${y + 50} Q${x + w / 2},${y + h / 2 + 40} ${x + w - 60},${y + 70}" fill="none" stroke="#e5584f" stroke-width="2.5"/>`;
}

// dust motes drifting in light
export function motes(x0, x1, y0, y1, t, n = 18, col = "#fff") {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + r1(i + 3) * (x1 - x0) + S(t * 0.5 + i) * 20, y = y0 + (((r1(i + 7) * (y1 - y0) - t * 10) % (y1 - y0)) + (y1 - y0)) % (y1 - y0);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5 + r1(i) * 2.5).toFixed(1)}" fill="${col}" opacity="${(0.35 + 0.35 * S(t * 2 + i)).toFixed(2)}"/>`;
  }
  return s;
}

// a cat curled up asleep (breathing)
export function sleepyCat(x, y, t = 0, col = "#f0b27a") {
  const br = 1 + S(t * 2) * 0.03;
  return `<g transform="translate(${x},${y}) scale(${br},${1 / br})"><path d="M-70,0 Q-80,-50 -20,-56 Q40,-60 60,-24 Q70,0 50,0 Z" fill="${col}" ${o(3.5)}/><path d="M50,0 Q90,-4 70,-26" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/><path d="M50,0 Q90,-4 70,-26" fill="none" ${o(3)} stroke-dasharray="0"/>
    <circle cx="-48" cy="-30" r="24" fill="${col}" ${o(3.5)}/><path d="M-66,-46 l-4,-18 l14,10 M-36,-50 l6,-16 l6,16" fill="${col}" ${o(3)}/><path d="M-58,-30 q4,4 8,0 M-44,-30 q4,4 8,0" fill="none" ${o(2)}/><path d="M-10,-50 q10,-6 20,0 M10,-46 q10,-6 20,0" stroke="${shade(col, -0.2)}" stroke-width="4" fill="none"/></g>`;
}

export function window4(x, y, w, h, sky = "#bfe0f5", curtain = "#e9a8a0", extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${sky}" ${o(6)}/>${extra}<path d="M${x + w / 2},${y} L${x + w / 2},${y + h} M${x},${y + h / 2} L${x + w},${y + h / 2}" ${o(5)}/><rect x="${x - 14}" y="${y + h}" width="${w + 28}" height="14" fill="#f4efe4" ${o(3)}/>
    <path d="M${x - 30},${y - 16} Q${x - 4},${y + h / 2} ${x - 22},${y + h + 30} L${x + 18},${y + h + 30} Q${x + 24},${y + h / 2} ${x + 20},${y - 16} Z" fill="${curtain}" ${o(3.5)}/><path d="M${x + w + 30},${y - 16} Q${x + w + 4},${y + h / 2} ${x + w + 22},${y + h + 30} L${x + w - 18},${y + h + 30} Q${x + w - 24},${y + h / 2} ${x + w - 20},${y - 16} Z" fill="${curtain}" ${o(3.5)}/><path d="M${x - 50},${y - 18} L${x + w + 50},${y - 18}" ${o(6)}/>`;
}

export function confetti(t, n = 30, w = 1920, h = 870) {
  let s = "";
  const cols = ["#ff6b6b", "#ffe36b", "#6bd4ff", "#8bff8b", "#ff9de2"];
  for (let i = 0; i < n; i++) {
    const p = ((t * (0.08 + r1(i) * 0.06) + r1(i + 11)) % 1), x = r1(i + 5) * w + S(t * 1.5 + i) * 30, y = p * h;
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="10" height="16" fill="${cols[i % cols.length]}" transform="rotate(${(t * 200 + i * 40) % 360},${x.toFixed(1)},${y.toFixed(1)})" opacity=".85"/>`;
  }
  return s;
}
