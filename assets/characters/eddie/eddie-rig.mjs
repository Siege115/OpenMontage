// Eddie — a bald, black-and-white stickman mascot as a poseable SVG rig.
//
// Pure vector, no AI model, no API key: every pose is a function of a small
// pose object (joint angles or IK targets + expression + props), so the same
// character can be re-posed, tweened, or dropped into Remotion / HyperFrames.
//
// Angle convention (absolute, degrees): 0 = straight down, 90 = screen-right,
// -90 = screen-left, 180 = straight up. "L"/"R" are SCREEN left/right.

export const PALETTE = {
  ink: "#111114",
  paper: "#ffffff",
  grey: "#c9c9cf",
  shadow: "rgba(0,0,0,0.10)",
};

const P = PALETTE;
const LEN = { torso: 92, upper: 50, fore: 46, thigh: 60, shin: 58 };
const HEAD_R = 54; // egg-shaped head: rx 50, ry 56 (see head())
const LIMB = 7; // stick thickness

const rad = (d) => (d * Math.PI) / 180;
const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s];
const f = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${f(p[0])},${f(p[1])}`;

// Two-bone IK: returns [elbow/knee, wrist/ankle]. bend = +1 / -1 picks the side.
function ik(root, target, l1, l2, bend) {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const d = Math.hypot(dx, dy);
  const dc = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const base = Math.atan2(dy, dx);
  const a = Math.acos((l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc));
  const t = base + bend * a;
  const mid = [root[0] + Math.cos(t) * l1, root[1] + Math.sin(t) * l1];
  const ux = target[0] - mid[0], uy = target[1] - mid[1];
  const ul = Math.hypot(ux, uy) || 1;
  return [mid, [mid[0] + (ux / ul) * l2, mid[1] + (uy / ul) * l2]];
}

function limb(root, spec, l1, l2) {
  if (spec.target) return ik(root, spec.target, l1, l2, spec.bend ?? 1);
  const mid = add(root, dir(spec.a1), l1);
  return [mid, add(mid, dir(spec.a2), l2)];
}

const angleOf = (a, b) => (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;
// Smooth, slightly tapered limb through 2-3 points (a quadratic curve bends at the joint),
// with a soft highlight on the lit (upper-left) side for a touch of volume.
function stick(pts, w0 = LIMB + 1.5, w1 = LIMB - 0.5) {
  const [A, B, Cc] = pts.length === 3 ? pts : [pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], pts[1]];
  const ctrl = [2 * B[0] - (A[0] + Cc[0]) / 2, 2 * B[1] - (A[1] + Cc[1]) / 2];
  const bez = (t) => [(1 - t) ** 2 * A[0] + 2 * (1 - t) * t * ctrl[0] + t * t * Cc[0], (1 - t) ** 2 * A[1] + 2 * (1 - t) * t * ctrl[1] + t * t * Cc[1]];
  const N = 14, L = [], R = [], mid = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p0 = bez(Math.max(0, t - 0.01)), p1 = bez(Math.min(1, t + 0.01)), p = bez(t);
    let nx = -(p1[1] - p0[1]), ny = p1[0] - p0[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const w = (w0 + (w1 - w0) * t) / 2;
    L.push([p[0] + nx * w, p[1] + ny * w]); R.push([p[0] - nx * w, p[1] - ny * w]); mid.push([p[0] - nx * w * 0.35 - 0.6, p[1] - ny * w * 0.35 - 0.6]);
  }
  const poly = "M" + L.map(pt).join(" L") + " L" + R.reverse().map(pt).join(" L") + " Z";
  return `<path d="${poly}" fill="${P.ink}"/><circle cx="${f(A[0])}" cy="${f(A[1])}" r="${f(w0 / 2)}" fill="${P.ink}"/><circle cx="${f(Cc[0])}" cy="${f(Cc[1])}" r="${f(w1 / 2)}" fill="${P.ink}"/>` +
    `<path d="M${mid.slice(1, -1).map(pt).join(" L")}" fill="none" stroke="#5a5a68" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>`;
}
const SKIN_DEFS = `<defs><radialGradient id="skinShade" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".72" stop-color="#f7f7fa"/><stop offset="1" stop-color="#dcdce4"/></radialGradient></defs>`;

// ---------- body parts ----------

function arm(S, spec) {
  const [E, W] = limb(S, spec, LEN.upper, LEN.fore);
  const fa = angleOf(E, W);
  const hand = add(W, dir(fa), 7);
  let s = stick([S, E, W], LIMB + 1.2, LIMB - 0.8);
  // hand: shaded mitten oriented along the forearm, thumb, finger creases
  const thumb = add(add(hand, dir(fa + (spec.thumb ?? 90)), 8), dir(fa), -2);
  s += `<ellipse cx="${f(thumb[0])}" cy="${f(thumb[1])}" rx="5" ry="3.8" transform="rotate(${f(-(fa + (spec.thumb ?? 90)) + 90)},${f(thumb[0])},${f(thumb[1])})" fill="url(#skinShade)" stroke="${P.ink}" stroke-width="3"/>`;
  s += `<ellipse cx="${f(hand[0])}" cy="${f(hand[1])}" rx="9.5" ry="11" transform="rotate(${f(-fa)},${f(hand[0])},${f(hand[1])})" fill="url(#skinShade)" stroke="${P.ink}" stroke-width="3.2"/>`;
  const kn = add(hand, dir(fa), spec.fist ? 3 : 5);
  for (const o of spec.fist ? [-3.5, 0, 3.5] : [-2.5, 2.5]) {
    const a = add(add(kn, dir(fa + 90), o), dir(fa), -2), b = add(add(kn, dir(fa + 90), o), dir(fa), 3);
    s += `<path d="M${pt(a)} L${pt(b)}" stroke="${P.ink}" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>`;
  }
  return s;
}

function shoe(A, side, rot = 0) {
  return (
    `<g transform="translate(${pt(A)}) rotate(${f(rot)}) scale(${side * 0.85},0.85)">` +
    `<path d="M-12,-7 L6,-9 Q22,-7 28,3 Q30,12 21,13 L-13,13 Q-18,13 -17,4 Z" fill="#26262e" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M-8,-5 Q4,-8 14,-4" fill="none" stroke="#5a5a68" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M15,-3 Q26,0 28,7 L17,8 Z" fill="#f2f2f5" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M-17,8 L28,8 Q30,12 21,13 L-13,13 Q-18,13 -17,8 Z" fill="#e6e6ec" stroke="${P.ink}" stroke-width="2"/>` +
    `<path d="M0,-6 L5,-1 M4,-7 L9,-2 M8,-7 L12,-3" stroke="#f2f2f5" stroke-width="1.6" stroke-linecap="round"/>` +
    `</g>`
  );
}

function leg(H, spec, side, thighK = 1) {
  const [K, A] = limb(H, spec, LEN.thigh * thighK, LEN.shin);
  return stick([H, K, A], LIMB + 2, LIMB - 0.5) + shoe(add(A, dir(angleOf(K, A)), 3), spec.shoeSide ?? side, spec.shoeRot ?? 0);
}

// ---------- head + faces ----------

const FACES = {
  wrecked: `
    <path d="M-25,-7 L-8,-3 M25,-9 L9,-4" stroke="${P.ink}" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="-14" cy="6" r="10" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/><circle cx="14" cy="6" r="11" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>
    <path d="M-21,3 l4,2 M-8,10 l-4,-1 M20,2 l-4,3 M8,11 l4,-2 M-19,10 l3,-1 M21,11 l-4,-1" stroke="#e0433a" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="-13" cy="7" r="2.2" fill="${P.ink}"/><circle cx="15" cy="5" r="2.2" fill="${P.ink}"/>
    <path d="M-25,15 Q-14,23 -4,15 M4,16 Q15,24 26,15" fill="none" stroke="#6f6f7c" stroke-width="3" stroke-linecap="round"/>
    <path d="M-9,29 L-5,25 L-1,29 L3,25 L7,29 L10,26" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  blink: `
    <path d="M-19,6 L-9,6 M9,6 L19,6" stroke="${P.ink}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M-7,25 Q0,29 7,25" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>`,
  neutral: `
    <ellipse cx="-14" cy="6" rx="4.4" ry="6" fill="${P.ink}"/><ellipse cx="14" cy="6" rx="4.4" ry="6" fill="${P.ink}"/>
    <path d="M-8,24 Q0,30 8,24" fill="none" stroke="${P.ink}" stroke-width="3.2" stroke-linecap="round"/>`,
  happy: `
    <ellipse cx="-14" cy="5" rx="4.4" ry="6" fill="${P.ink}"/><ellipse cx="14" cy="5" rx="4.4" ry="6" fill="${P.ink}"/>
    <path d="M-13,19 Q0,21 13,19 Q11,35 0,35 Q-11,35 -13,19 Z" fill="${P.ink}"/>
    <path d="M-6,30 Q0,26 6,30 Q3,34 0,34 Q-3,34 -6,30 Z" fill="${P.grey}"/>
    <path d="M-10,20.5 L10,20.5" stroke="${P.paper}" stroke-width="2.4" stroke-linecap="round"/>`,
  angry: `
    <path d="M-22,-5 L-7,1 M22,-5 L7,1" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="-14" cy="8" rx="4" ry="5" fill="${P.ink}"/><ellipse cx="14" cy="8" rx="4" ry="5" fill="${P.ink}"/>
    <path d="M-9,28 Q0,22 9,28" fill="none" stroke="${P.ink}" stroke-width="3.4" stroke-linecap="round"/>`,
  shocked: `
    <path d="M-22,-10 Q-15,-15 -8,-11 M22,-10 Q15,-15 8,-11" fill="none" stroke="${P.ink}" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="-14" cy="4" r="9" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/><circle cx="14" cy="4" r="9" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>
    <circle cx="-14" cy="5" r="3.6" fill="${P.ink}"/><circle cx="14" cy="5" r="3.6" fill="${P.ink}"/>
    <ellipse cx="0" cy="28" rx="6" ry="8" fill="${P.ink}"/>`,
  scared: `
    <path d="M-22,-8 L-8,-13 M22,-8 L8,-13" stroke="${P.ink}" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="-14" cy="4" r="10" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/><circle cx="14" cy="4" r="10" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>
    <circle cx="-12" cy="6" r="3.4" fill="${P.ink}"/><circle cx="12" cy="6" r="3.4" fill="${P.ink}"/>
    <path d="M-11,28 Q-7,23 -3,27 Q1,31 5,26 Q9,23 11,28" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>
    <path d="M-34,-10 q5,8 0,11 q-5,-3 0,-11z" fill="${P.paper}" stroke="${P.ink}" stroke-width="2"/>`,
  thinking: `
    <path d="M-21,-4 L-8,-4 M8,-9 Q15,-13 21,-8" fill="none" stroke="${P.ink}" stroke-width="3.4" stroke-linecap="round"/>
    <ellipse cx="-11" cy="4" rx="4" ry="5.5" fill="${P.ink}"/><ellipse cx="17" cy="3" rx="4" ry="5.5" fill="${P.ink}"/>
    <path d="M-4,26 L9,24" fill="none" stroke="${P.ink}" stroke-width="3.2" stroke-linecap="round"/>`,
  calm: `
    <path d="M-20,6 Q-14,11 -8,6 M8,6 Q14,11 20,6" fill="none" stroke="${P.ink}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M-7,24 Q0,29 7,24" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>`,
  focused: `
    <path d="M-21,-5 L-8,-3 M8,-3 L21,-5" stroke="${P.ink}" stroke-width="3.2" stroke-linecap="round"/>
    <ellipse cx="-14" cy="9" rx="4" ry="4.6" fill="${P.ink}"/><ellipse cx="14" cy="9" rx="4" ry="4.6" fill="${P.ink}"/>
    <path d="M-5,26 L5,26" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>`,
  strain: `
    <path d="M-21,0 L-9,6 L-21,11 M21,0 L9,6 L21,11" fill="none" stroke="${P.ink}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="-11" y="21" width="22" height="11" rx="3" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/>
    <path d="M-11,26.5 L11,26.5 M-4,21 L-4,32 M4,21 L4,32" stroke="${P.ink}" stroke-width="1.8"/>`,
};

// Bald egg-shaped head (slightly wider at the top). `mouth` (0-2) swaps the expression's
// mouth for a talking shape, for lip flaps synced to the narration.
const isMouth = (el) => /cy="28"|d="M-?\d+(\.\d+)?,(19|2\d|3\d)|<rect x="-11" y="21"/.test(el);
const TALK = [
  null,
  `<ellipse cx="0" cy="26" rx="7" ry="5" fill="${P.ink}"/>`,
  `<path d="M-12,20 Q0,18 12,20 Q11,36 0,37 Q-11,36 -12,20 Z" fill="${P.ink}"/><path d="M-6,32 Q0,28 6,32 Q3,36 0,36 Q-3,36 -6,32 Z" fill="${P.grey}"/>`,
];
// Accessories so background people read as different characters (Eddie stays bald).
// Accessories so background people read as different characters (Eddie stays bald).
// Each has shading, construction lines and small details so it reads as a real object.
const shade = (id, c, k = 0.78) => {
  const n = parseInt(c.slice(1), 16), d = (v) => Math.round(v * k).toString(16).padStart(2, "0");
  const dark = `#${d(n >> 16)}${d((n >> 8) & 255)}${d(n & 255)}`;
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>`;
};
const ACC = {
  cap: (c = "#e5584f") => { const id = "cap" + c.slice(1); return shade(id, c) +
    // crown with panel seams + button, curved brim with underside shadow, small logo patch
    `<path d="M-51,-12 Q-52,-64 0,-65 Q52,-64 51,-12 Z" fill="url(#${id})" stroke="${P.ink}" stroke-width="4.5" stroke-linejoin="round"/>` +
    `<path d="M0,-64 L0,-14 M-27,-60 Q-34,-36 -36,-13 M27,-60 Q34,-36 36,-13" fill="none" stroke="${P.ink}" stroke-width="1.6" opacity=".35"/>` +
    `<ellipse cx="0" cy="-64" rx="6" ry="3.5" fill="${c}" stroke="${P.ink}" stroke-width="2.5"/>` +
    `<path d="M-30,-48 Q-18,-58 -4,-60" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".45"/>` +
    `<rect x="-14" y="-40" width="28" height="18" rx="4" fill="#fff" stroke="${P.ink}" stroke-width="2"/><path d="M-6,-31 L6,-31" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M6,-16 Q44,-22 76,-12 Q80,-5 72,-1 Q40,-8 4,-5 Z" fill="url(#${id})" stroke="${P.ink}" stroke-width="4.5" stroke-linejoin="round"/>` +
    `<path d="M10,-7 Q40,-11 70,-4" fill="none" stroke="${P.ink}" stroke-width="2" opacity=".35"/>` +
    `<path d="M-50,-12 L50,-12" stroke="${P.ink}" stroke-width="3" opacity=".5"/>`; },
  bun: (c = "#3a2a20") => { const id = "hair" + c.slice(1); return shade(id, c, 0.7) +
    `<circle cx="0" cy="-68" r="18" fill="url(#${id})" stroke="${P.ink}" stroke-width="4"/>` +
    `<path d="M-10,-74 Q0,-84 10,-74 M-12,-64 Q0,-58 12,-66" fill="none" stroke="#fff" stroke-width="2" opacity=".25"/>` +
    `<rect x="-11" y="-55" width="22" height="7" rx="3.5" fill="#e9767a" stroke="${P.ink}" stroke-width="2.5"/>` +
    `<path d="M-50,-4 Q-52,-58 0,-60 Q52,-58 50,-4 Q36,-38 0,-40 Q-36,-38 -50,-4 Z" fill="url(#${id})" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M-36,-30 Q-26,-48 -6,-54 M8,-54 Q30,-48 38,-30 M-20,-46 Q-10,-52 2,-53" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".25"/>`; },
  glasses: () => `<g fill="rgba(200,230,255,.22)" stroke="${P.ink}" stroke-width="4.5"><rect x="-31" y="-3" width="27" height="24" rx="10"/><rect x="4" y="-3" width="27" height="24" rx="10"/></g>` +
    `<path d="M-23,2 L-12,13 M12,2 L23,13" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>` +
    `<path d="M-4,6 Q0,2 4,6 M-31,4 L-49,0 M31,4 L49,0" fill="none" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>`,
  beanie: (c = "#5b8fd9") => { const id = "bean" + c.slice(1); let rib = "";
    for (let x = -46; x <= 46; x += 8) rib += `M${x},-18 L${x},-3 `;
    return shade(id, c) +
    `<path d="M-52,-8 Q-54,-68 0,-68 Q54,-68 52,-8 Z" fill="url(#${id})" stroke="${P.ink}" stroke-width="4.5"/>` +
    `<path d="M-34,-54 Q-20,-64 -2,-66" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".35"/>` +
    `<path d="M-40,-30 Q0,-40 40,-30 M-46,-44 Q0,-56 46,-44" fill="none" stroke="${P.ink}" stroke-width="1.6" opacity=".25"/>` +
    `<rect x="-55" y="-20" width="110" height="19" rx="7" fill="${c}" stroke="${P.ink}" stroke-width="4"/>` +
    `<path d="${rib}" stroke="${P.ink}" stroke-width="1.6" opacity=".35"/>` +
    [[-6, -74], [6, -76], [0, -82], [-4, -68], [7, -68]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`).join("") +
    `<circle cx="0" cy="-74" r="12" fill="none" stroke="${P.ink}" stroke-width="3.5" stroke-dasharray="4 2"/>`; },
  pigtails: (c = "#3a2a20") => { const id = "hair" + c.slice(1); return shade(id, c, 0.7) +
    `<path d="M-52,-16 Q-80,-6 -70,22 Q-56,14 -50,-4 Z M52,-16 Q80,-6 70,22 Q56,14 50,-4 Z" fill="url(#${id})" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>` +
    `<rect x="-60" y="-18" width="12" height="10" rx="4" fill="#ffd84d" stroke="${P.ink}" stroke-width="2.5"/><rect x="48" y="-18" width="12" height="10" rx="4" fill="#ffd84d" stroke="${P.ink}" stroke-width="2.5"/>` +
    `<path d="M-50,-6 Q-52,-60 0,-60 Q52,-60 50,-6 Q30,-36 0,-34 Q-30,-36 -50,-6 Z" fill="url(#${id})" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M0,-58 L0,-36 M-30,-44 Q-18,-54 -4,-56" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".25"/>`; },
};

// Parametric talking mouth: open 0..1, shape "neutral" | "wide" | "round".
function talkMouth(open, shape = "neutral") {
  const w = { neutral: 19, wide: 24, round: 12 }[shape] ?? 19, h = 2 + open * 18, y = 23;
  if (open < 0.08) return `<path d="M${-w / 2},${y} Q0,${y + 3} ${w / 2},${y}" fill="none" stroke="${P.ink}" stroke-width="3.2" stroke-linecap="round"/>`;
  let s = `<path d="M${-w / 2},${y} C${-w / 2},${y + h * 1.25} ${w / 2},${y + h * 1.25} ${w / 2},${y} Q0,${y - 2.5} ${-w / 2},${y} Z" fill="#3a1d22" stroke="${P.ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
  if (open > 0.3) s += `<path d="M${-w / 2 + 3},${y + 0.5} Q0,${y - 1} ${w / 2 - 3},${y + 0.5} L${w / 2 - 4},${y + 3.5} Q0,${y + 2} ${-w / 2 + 4},${y + 3.5} Z" fill="#fff"/>`;
  if (open > 0.4) s += `<ellipse cx="0" cy="${y + h * 0.82}" rx="${w * 0.28}" ry="${h * 0.22}" fill="#e3747c"/>`;
  return s;
}
// add a white shine to every dark pupil/eye of a face
const glints = (face) => face.replace(/<(ellipse|circle) cx="(-?[\d.]+)" cy="(-?[\d.]+)" (?:rx="([\d.]+)" ry="[\d.]+"|r="([\d.]+)") fill="\$\{P\.ink\}"\/>|<(ellipse|circle) cx="(-?[\d.]+)" cy="(-?[\d.]+)" (?:rx="([\d.]+)" ry="[\d.]+"|r="([\d.]+)") fill="#111114"\/>/g, (m, t1, x1, y1, rx1, r1, t2, x2, y2, rx2, r2) => {
  const x = +(x1 ?? x2), y = +(y1 ?? y2), r = +(rx1 ?? r1 ?? rx2 ?? r2);
  if (r > 6 || y > 15) return m;
  return m + `<circle cx="${x + r * 0.35}" cy="${y - r * 0.45}" r="${Math.max(1, r * 0.32)}" fill="#fff"/>`;
});

export function head(expr = "neutral", mouth = 0, acc = null) {
  let face = FACES[expr] || FACES.neutral;
  if (mouth && (typeof mouth === "object" || mouth > 0)) {
    const m = typeof mouth === "object" ? mouth : { open: [0, 0.45, 0.85][mouth] ?? 0.5, shape: "neutral" };
    const els = face.match(/<[^>]+\/>/g) || [];
    face = els.filter((e) => !isMouth(e)).join("") + talkMouth(m.open, m.shape);
  }
  face = glints(face);
  return (
    SKIN_DEFS +
    `<path d="M0,-58 C34,-58 52,-30 51,2 C50,34 30,54 0,54 C-30,54 -50,34 -51,2 C-52,-30 -34,-58 0,-58 Z" fill="url(#skinShade)" stroke="${P.ink}" stroke-width="4.5"/>` +
    `<path d="M-32,-34 Q-24,-44 -12,-47" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>` +
    `<path d="M-30,40 Q0,52 30,40" fill="none" stroke="#c9c9d3" stroke-width="3" stroke-linecap="round" opacity=".7"/>` +
    `<g transform="translate(0,4) scale(1.22)">${face}</g>` +
    (acc ? (Array.isArray(acc) ? acc : [acc]).map((a) => { const [k, c] = a.split(":"); return ACC[k]?.(c) ?? ""; }).join("") : "")
  );
}

// ---------- props / fx (all black & white) ----------

const BUBBLE_DEFS = `<defs><linearGradient id="bubbleShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9ebf1"/></linearGradient></defs>`;
const chipStack = (x, y, n, col) => { let g = ""; for (let i = 0; i < n; i++) g += `<ellipse cx="${x}" cy="${y - i * 7}" rx="21" ry="8" fill="${col}" stroke="${P.ink}" stroke-width="2.4"/><path d="M${x - 10},${y - i * 7} L${x - 6},${y - i * 7} M${x + 6},${y - i * 7} L${x + 10},${y - i * 7}" stroke="#fff" stroke-width="2.4"/>`; return g; };
export const PROPS = {
  pokerTable: (o, a = {}) => {
    const w = a.w ?? 680, win = a.wins ?? 0, k = win % 1, n = Math.floor(win);
    // pot: chips in the middle slide toward Eddie (left) with each win
    const potX = -10 - 190 * (k > 0 ? k : 0), potN = n >= (a.rounds ?? 4) ? 0 : 5;
    let g = `<g transform="translate(${o[0]},${o[1]})">
      <path d="M${-w / 2 - 20},0 L${-w / 2 + 10},150 L${w / 2 - 10},150 L${w / 2 + 20},0 Z" fill="#8a5a3c" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M${-w / 2 + 30},150 L${-w / 2 + 40},180 M${w / 2 - 30},150 L${w / 2 - 40},180" stroke="${P.ink}" stroke-width="10" stroke-linecap="round"/>
      <ellipse cx="0" cy="0" rx="${w / 2 + 26}" ry="58" fill="#7d5636" stroke="${P.ink}" stroke-width="5"/>
      <ellipse cx="0" cy="-4" rx="${w / 2}" ry="44" fill="#2f8a5a" stroke="${P.ink}" stroke-width="3"/>
      <ellipse cx="0" cy="-4" rx="${w / 2 - 40}" ry="30" fill="none" stroke="#5fb383" stroke-width="3" stroke-dasharray="10 8"/>`;
    // community cards (face up)
    [-70, -30, 10].forEach((x, i) => { g += `<g transform="translate(${x + 40},-14) rotate(${(i - 1) * 3})"><rect x="-14" y="-10" width="28" height="22" rx="3" fill="#fff" stroke="${P.ink}" stroke-width="2.4"/><text x="0" y="7" text-anchor="middle" font-size="15" fill="${i === 1 ? "#e5584f" : P.ink}" style="font-family:MBlack,sans-serif;font-weight:900">${["A", "K", "7"][i]}</text></g>`; });
    // each player's own stacks + Eddie's winnings growing
    g += chipStack(-w / 2 + 70, 18, 3 + n * 2, "#e5584f") + chipStack(-w / 2 + 110, 22, 2 + n, "#5b8fd9");
    g += chipStack(w / 2 - 80, 18, Math.max(1, 5 - n), "#f7d774");
    const potOp = k > 0.75 ? (1 - k) / 0.25 : 1; // pot fades into Eddie's pile as it lands
    if (potN) g += `<g opacity="${potOp.toFixed(3)}">` + chipStack(potX, 20, potN, "#8fc49a") + chipStack(potX + 34, 24, potN - 2, "#e5584f") + `</g>`;
    return g + `</g>`;
  },
  chair: (o) => `<g transform="translate(${o[0]},${o[1]})">
    <rect x="-112" y="-340" width="150" height="190" rx="26" fill="#5b6475" stroke="${P.ink}" stroke-width="5"/><rect x="-94" y="-320" width="114" height="150" rx="18" fill="#6f7a8d"/>
    <rect x="-110" y="-142" width="230" height="34" rx="14" fill="#6f7a8d" stroke="${P.ink}" stroke-width="5"/>
    <path d="M0,-108 L0,-40 M-80,-14 L80,-14 M0,-40 L-70,-14 M0,-40 L70,-14 M-60,-150 L-60,-170" fill="none" stroke="${P.ink}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="-80" cy="-8" r="9" fill="${P.ink}"/><circle cx="80" cy="-8" r="9" fill="${P.ink}"/><circle cx="0" cy="-8" r="9" fill="${P.ink}"/></g>`,
  // reaction pops drawn next to a head (o = head-top-right corner)
  emote: (o, a = {}) => {
    const k = a.kind, c = P.ink;
    const E = {
      bang: `<path d="M-6,-58 L6,-58 L4,-12 L-4,-12 Z" fill="#ff5a4a" stroke="${c}" stroke-width="4"/><circle cx="0" cy="4" r="6" fill="#ff5a4a" stroke="${c}" stroke-width="4"/><path d="M-30,-40 L-44,-52 M30,-40 L44,-52 M-34,-12 L-50,-12 M34,-12 L50,-12" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`,
      sweat: `<path d="M0,-40 q16,22 0,30 q-16,-8 0,-30z" fill="#7cc3ff" stroke="${c}" stroke-width="3.5"/><path d="M26,-14 q11,15 0,21 q-11,-6 0,-21z" fill="#7cc3ff" stroke="${c}" stroke-width="3"/><path d="M-4,-30 q-3,6 0,10" stroke="#fff" stroke-width="3" fill="none"/>`,
      q: `<text x="0" y="0" text-anchor="middle" font-size="70" fill="#5b8fd9" stroke="${c}" stroke-width="4" paint-order="stroke" style="font-family:MBlack,sans-serif;font-weight:900">?</text>`,
      spark: [[-30, -30, 1], [20, -50, 0.7], [34, -6, 0.55]].map(([x, y, s]) => `<path transform="translate(${x},${y}) scale(${s})" d="M0,-20 Q3,-3 20,0 Q3,3 0,20 Q-3,3 -20,0 Q-3,-3 0,-20 Z" fill="#ffd84d" stroke="${c}" stroke-width="3.5" stroke-linejoin="round"/>`).join(""),
      anger: `<g stroke="#e5383b" stroke-width="7" stroke-linecap="round" fill="none"><path d="M-22,-30 Q-8,-22 -14,-8 M22,-30 Q8,-22 14,-8 M-22,8 Q-8,0 -14,-14 M22,8 Q8,0 14,-14"/></g>`,
      heart: `<path d="M0,-6 C-18,-24 -36,-6 -18,10 L0,26 L18,10 C36,-6 18,-24 0,-6 Z" fill="#ff6b8b" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>`,
    };
    return `<g transform="translate(${o[0]},${o[1]})">${E[k] ?? ""}</g>`;
  },
  waveLines: (o) => `<g fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round">
    <path d="M${o[0] + 18},${o[1] - 16} Q${o[0] + 28},${o[1]} ${o[0] + 18},${o[1] + 16}"/>
    <path d="M${o[0] + 28},${o[1] - 24} Q${o[0] + 42},${o[1]} ${o[0] + 28},${o[1] + 24}"/></g>`,
  question: (o) => `<text x="${o[0]}" y="${o[1]}" font-family="InkHand, 'Comic Sans MS', sans-serif" font-size="54" fill="${P.ink}">?</text>
    <text x="${o[0] + 30}" y="${o[1] - 26}" font-family="InkHand, 'Comic Sans MS', sans-serif" font-size="34" fill="${P.ink}">?</text>`,
  shockLines: (o) => `<g stroke="${P.ink}" stroke-width="3.5" stroke-linecap="round">
    <path d="M${o[0] - 62},${o[1] - 40} L${o[0] - 80},${o[1] - 58}"/><path d="M${o[0] - 70},${o[1] - 8} L${o[0] - 94},${o[1] - 10}"/>
    <path d="M${o[0] + 62},${o[1] - 40} L${o[0] + 80},${o[1] - 58}"/><path d="M${o[0] + 70},${o[1] - 8} L${o[0] + 94},${o[1] - 10}"/>
    <path d="M${o[0]},${o[1] - 78} L${o[0]},${o[1] - 100}"/></g>`,
  sparkles: (o) => [[-120, -60, 1], [118, -90, 0.8], [-96, 70, 0.6], [104, 40, 0.7]].map(([x, y, s]) =>
    `<path transform="translate(${o[0] + x},${o[1] + y}) scale(${s})" d="M0,-16 Q2,-2 16,0 Q2,2 0,16 Q-2,2 -16,0 Q-2,-2 0,-16 Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="2.8" stroke-linejoin="round"/>`).join(""),
  pointLines: (o) => `<g stroke="${P.ink}" stroke-width="3" stroke-linecap="round">
    <path d="M${o[0] + 16},${o[1] - 14} L${o[0] + 30},${o[1] - 24}"/><path d="M${o[0] + 20},${o[1]} L${o[0] + 36},${o[1]}"/>
    <path d="M${o[0] + 16},${o[1] + 14} L${o[0] + 30},${o[1] + 24}"/></g>`,
  laptop: (o) => `<g transform="translate(${o[0]},${o[1]})">
    <path d="M-62,4 L62,4 L70,16 L-70,16 Z" fill="${P.grey}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="-56" y="-74" width="112" height="80" rx="7" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    <circle cx="0" cy="-34" r="11" fill="none" stroke="${P.ink}" stroke-width="3"/></g>`,
  sweat: (o) => `<g fill="${P.paper}" stroke="${P.ink}" stroke-width="2.5">
    <path d="M${o[0] + 52},${o[1] - 40} q7,10 0,14 q-7,-4 0,-14z"/><path d="M${o[0] + 66},${o[1] - 22} q6,8 0,12 q-6,-4 0,-12z"/></g>`,
  bulb: (o) => `<g transform="translate(${o[0]},${o[1]})">
    <path d="M-60,-10 L-80,-20 M60,-10 L80,-20 M0,-74 L0,-96 M-44,-56 L-60,-72 M44,-56 L60,-72" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>
    <path d="M-22,22 Q-40,0 -36,-20 Q-30,-52 0,-54 Q30,-52 36,-20 Q40,0 22,22 Z" fill="#fff6c2" stroke="${P.ink}" stroke-width="4.5" stroke-linejoin="round"/>
    <rect x="-18" y="22" width="36" height="20" rx="4" fill="${P.grey}" stroke="${P.ink}" stroke-width="4"/></g>`,
  heldBook: (o) => `<g transform="translate(${o[0]},${o[1]}) scale(0.62)">
    <path d="M0,-30 Q-30,-40 -60,-30 L-60,30 Q-30,20 0,30 Q30,20 60,30 L60,-30 Q30,-40 0,-30 Z" fill="#9cc3e6" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M0,-30 L0,30" stroke="${P.ink}" stroke-width="4"/></g>`,
  trash: (o, n = 3) => {
    let g = `<g transform="translate(${o[0]},${o[1]})">`;
    for (let i = 0; i < n; i++) {
      const x = ((i * 67) % 260) - 130, y = -Math.floor(i / 4) * 55, r = 34 + (i % 3) * 6;
      g += `<path d="M${x - r},${y} Q${x - r - 6},${y - r * 1.4} ${x},${y - r * 1.6} Q${x + r + 6},${y - r * 1.4} ${x + r},${y} Z" fill="#5d6270" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M${x - 8},${y - r * 1.6} L${x},${y - r * 1.9} L${x + 8},${y - r * 1.6}" fill="none" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>`;
    }
    return g + `</g>`;
  },
  thought: (o, a = {}) => {
    const lines = a.pic ? [" ".repeat(6)] : String(a.t ?? "").split("|"), tail = a.tail ?? -1;
    const w = a.w ?? Math.max(...lines.map((l) => l.length)) * 19 + 80, h = lines.length * 44 + 52;
    let bumps = "";
    const n = Math.max(6, Math.round(w / 50));
    for (let i = 0; i < n; i++) { const ang = (i / n) * Math.PI * 2; bumps += `<circle cx="${f(Math.cos(ang) * w * 0.47)}" cy="${f(Math.sin(ang) * h * 0.47)}" r="${f(Math.min(w, h) * 0.25 + (i % 2) * 4)}"/>`; }
    const body = `${bumps}<ellipse rx="${w / 2}" ry="${h / 2}"/>`;
    return `<g transform="translate(${o[0]},${o[1]})">${BUBBLE_DEFS}
      <g transform="translate(7,9)" fill="rgba(20,20,30,.22)">${body}</g>
      <g fill="url(#bubbleShade)" stroke="${P.ink}" stroke-width="9">${body}</g><g fill="url(#bubbleShade)">${body}</g>
      <circle cx="${tail * w * 0.3 + 4}" cy="${h / 2 + 30}" r="12" fill="rgba(20,20,30,.2)"/><circle cx="${tail * w * 0.3}" cy="${h / 2 + 26}" r="12" fill="url(#bubbleShade)" stroke="${P.ink}" stroke-width="4"/>
      <circle cx="${tail * w * 0.39}" cy="${h / 2 + 54}" r="7" fill="url(#bubbleShade)" stroke="${P.ink}" stroke-width="3.5"/>
      <path d="M${-w * 0.3},${-h * 0.32} Q${-w * 0.1},${-h * 0.46} ${w * 0.12},${-h * 0.4}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>` +
      (a.pic === "bread"
        ? `<g transform="translate(0,4)"><path d="M-34,-6 Q-38,-26 -18,-28 Q0,-36 18,-28 Q38,-26 34,-6 L30,22 Q0,28 -30,22 Z" fill="#e8b974" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/><path d="M-24,-4 Q-26,-18 -12,-20 Q0,-25 12,-20 Q26,-18 24,-4 L21,16 Q0,20 -21,16 Z" fill="#fbe7c2"/><circle cx="-8" cy="2" r="2" fill="#d9a35a"/><circle cx="8" cy="-6" r="2" fill="#d9a35a"/><circle cx="4" cy="10" r="2" fill="#d9a35a"/></g>`
        : lines.map((l, i) => `<text x="0" y="${(i - (lines.length - 1) / 2) * 44 + 13}" text-anchor="middle" font-size="36" fill="#2a2a33" style="font-family:Bubble,InkHand,sans-serif;font-weight:800">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`).join("")) + `</g>`;
  },
  // duck in Eddie's style: shaded body, wing, eye shine, beak that opens on a quack; bobs on the water
  duck: (o, a = {}) => {
    const t = a.t ?? 0, bob = Math.sin(t * 2.2) * 3, nod = a.quack ? -10 : Math.sin(t * 1.3) * 4, open = a.quack ? 1 : 0;
    return `<g transform="translate(${o[0]},${o[1] + bob}) scale(${a.flip ? -1 : 1},1)">
      <defs><radialGradient id="duckShade" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dcdce6"/></radialGradient></defs>
      <path d="M-58,0 Q-70,-20 -48,-30 Q-20,-44 22,-34 Q48,-28 50,-6 Q46,14 10,16 L-40,16 Q-60,14 -58,0 Z" fill="url(#duckShade)" stroke="${P.ink}" stroke-width="4.5" stroke-linejoin="round"/>
      <path d="M-56,-14 L-74,-26 L-62,-6 Z" fill="url(#duckShade)" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M-30,-14 Q-6,-30 18,-14 Q-2,2 -30,-14 Z" fill="#ececf2" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-22,-14 Q-6,-20 10,-14" fill="none" stroke="${P.ink}" stroke-width="1.6" opacity=".4"/>
      <g transform="rotate(${nod},28,-28)">
        <circle cx="34" cy="-46" r="23" fill="url(#duckShade)" stroke="${P.ink}" stroke-width="4.5"/>
        <path d="M14,-32 Q30,-20 48,-30" fill="none" stroke="#e4e4ec" stroke-width="5" stroke-linecap="round"/>
        <path d="M20,-58 Q28,-66 38,-66" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>
        <circle cx="42" cy="-50" r="3.8" fill="${P.ink}"/><circle cx="43.3" cy="-51.6" r="1.4" fill="#fff"/>
        <path d="M54,-46 Q69,${-48 - open * 6} 75,${-42 - open * 4} Q65,-39 54,-40 Z" fill="#f6a63c" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M54,-38 Q67,${-35 + open * 7} 72,${-36 + open * 8} Q63,-32 54,-35 Z" fill="#e58a22" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="31" cy="-38" r="4" fill="#ffb3b3" opacity=".6"/>
      </g>
      <path d="M-80,18 Q-60,10 -40,18 Q-20,26 0,18 Q20,10 40,18 Q60,26 80,18" fill="none" stroke="#5f9fd0" stroke-width="5" stroke-linecap="round"/>
    </g>`;
  },
  say: (o, a = {}) => {
    const lines = String(a.t ?? "").split("|"), tail = a.tail ?? -1;
    const w = Math.max(...lines.map((l) => l.length)) * 20 + 64, h = lines.length * 46 + 38;
    const tailPath = `M${tail * w * 0.12},${h / 2 - 4} Q${tail * w * 0.2},${h / 2 + 26} ${tail * w * 0.34},${h / 2 + 42} Q${tail * w * 0.26},${h / 2 + 12} ${tail * w * 0.3},${h / 2 - 4} Z`;
    return `<g transform="translate(${o[0]},${o[1]})">${BUBBLE_DEFS}
      <g transform="translate(7,9)" fill="rgba(20,20,30,.22)"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h * 0.42}"/><path d="${tailPath}"/></g>
      <path d="${tailPath}" fill="url(#bubbleShade)" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h * 0.42}" fill="url(#bubbleShade)" stroke="${P.ink}" stroke-width="5"/>
      <path d="M${tail * w * 0.13},${h / 2 - 2.5} L${tail * w * 0.29},${h / 2 - 2.5}" stroke="#f2f3f7" stroke-width="7"/>
      <path d="M${-w / 2 + h * 0.4},${-h / 2 + 9} L${w / 2 - h * 0.6},${-h / 2 + 9}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>` +
      lines.map((l, i) => `<text x="0" y="${(i - (lines.length - 1) / 2) * 46 + 14}" text-anchor="middle" font-size="38" fill="#1b1b22" style="font-family:Bubble,InkHand,sans-serif;font-weight:800">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`).join("") + `</g>`;
  },
  // ---- scene props (o = position relative to the pelvis) ----
  zzz: (o) => `<g font-family="InkHand, 'Comic Sans MS', sans-serif" fill="${P.ink}">
    <text x="${o[0]}" y="${o[1]}" font-size="30">z</text><text x="${o[0] + 18}" y="${o[1] - 22}" font-size="40">z</text>
    <text x="${o[0] + 42}" y="${o[1] - 52}" font-size="52">Z</text></g>`,
  clock: (o, t = "3:00") => `<g transform="translate(${o[0]},${o[1]})">
    <rect x="-58" y="-34" width="116" height="62" rx="12" fill="${P.paper}" stroke="${P.ink}" stroke-width="5"/>
    <text x="0" y="14" text-anchor="middle" font-family="InkHand, 'Comic Sans MS', sans-serif" font-size="40" fill="${P.ink}">${t}</text>
    <path d="M-40,28 L-48,40 M40,28 L48,40" stroke="${P.ink}" stroke-width="5" stroke-linecap="round"/></g>`,
  bed: (o) => `<g transform="translate(${o[0]},${o[1]})">
    <rect x="-150" y="-30" width="300" height="40" rx="8" fill="${P.paper}" stroke="${P.ink}" stroke-width="5"/>
    <rect x="-150" y="-92" width="22" height="132" rx="6" fill="${P.paper}" stroke="${P.ink}" stroke-width="5"/>
    <rect x="128" y="-62" width="22" height="102" rx="6" fill="${P.paper}" stroke="${P.ink}" stroke-width="5"/>
    <rect x="-122" y="-56" width="64" height="26" rx="12" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    <path d="M-40,-30 Q40,-44 128,-30" fill="none" stroke="${P.grey}" stroke-width="5" stroke-linecap="round"/></g>`,
  brain: (o, level = 0) => {
    const lv = Math.max(0, Math.min(1, level));
    const top = 40 - 88 * lv;
    return `<g transform="translate(${o[0]},${o[1]})">
    <defs><clipPath id="brainClip"><path d="M-60,10 Q-70,-40 -30,-50 Q-10,-72 18,-58 Q60,-62 62,-20 Q78,10 50,34 Q20,52 -10,40 Q-50,46 -60,10 Z"/></clipPath></defs>
    <path d="M-60,10 Q-70,-40 -30,-50 Q-10,-72 18,-58 Q60,-62 62,-20 Q78,10 50,34 Q20,52 -10,40 Q-50,46 -60,10 Z" fill="${P.paper}"/>
    <rect x="-80" y="${f(top)}" width="160" height="120" fill="#8a8a92" clip-path="url(#brainClip)"/>
    <path d="M-60,10 Q-70,-40 -30,-50 Q-10,-72 18,-58 Q60,-62 62,-20 Q78,10 50,34 Q20,52 -10,40 Q-50,46 -60,10 Z" fill="none" stroke="${P.ink}" stroke-width="5"/>
    <path d="M-34,-30 Q-20,-14 -36,0 M0,-50 Q-8,-24 6,-6 Q16,10 2,26 M30,-36 Q20,-18 36,-4" fill="none" stroke="${P.ink}" stroke-width="3.5" stroke-linecap="round"/></g>`;
  },
  moon: (o) => `<g transform="translate(${o[0]},${o[1]})">
    <path d="M10,-40 A40,40 0 1 0 40,16 A32,32 0 1 1 10,-40 Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
    <path d="M-120,-20 l4,10 l10,4 l-10,4 l-4,10 l-4,-10 l-10,-4 l10,-4z M90,40 l3,7 l7,3 l-7,3 l-3,7 l-3,-7 l-7,-3 l7,-3z" fill="${P.paper}" stroke="${P.ink}" stroke-width="2.5"/></g>`,
  book: (o) => `<g transform="translate(${o[0]},${o[1]})">
    <path d="M0,-30 Q-30,-40 -60,-30 L-60,30 Q-30,20 0,30 Q30,20 60,30 L60,-30 Q30,-40 0,-30 Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M0,-30 L0,30 M-48,-16 L-12,-20 M-48,-4 L-12,-8 M12,-20 L48,-16 M12,-8 L48,-4" stroke="${P.grey}" stroke-width="3" stroke-linecap="round"/></g>`,
  house: (o, lit = false) => `<g transform="translate(${o[0]},${o[1]})">
    <path d="M-70,0 L-70,-110 L0,-170 L70,-110 L70,0 Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="-46" y="-96" width="34" height="34" fill="${lit ? "#f4e7a1" : P.ink}" stroke="${P.ink}" stroke-width="4"/>
    <rect x="12" y="-96" width="34" height="34" fill="${lit ? "#f4e7a1" : P.ink}" stroke="${P.ink}" stroke-width="4"/>
    <rect x="-16" y="-50" width="32" height="50" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/></g>`,
};

// ---------- full character ----------

/**
 * pose = {
 *   lean, headTilt, lift,           // degrees / px
 *   armL, armR: {a1,a2} | {target:[x,y], bend}, plus {fist, thumb}
 *   overHead: arm spec drawn on top of the head (hand-on-chin etc.)
 *   legL, legR: {a1,a2} | {target,bend}, plus {shoeRot}
 *   expr, props: [{type, at:[x,y]}]  // all coords relative to the pelvis
 * }
 * Returns an SVG <g> string with the pelvis at (0,0).
 */
export function character(pose) {
  const lean = pose.lean ?? 0;
  const u = dir(180 - lean);
  const N = add([0, 0], u, LEN.torso);
  const S = add(N, u, -14); // both arms join just below the neck
  const H = add(N, dir(180 - lean - (pose.headTilt ?? 0)), HEAD_R + 2);

  const armL = pose.armL ?? { a1: -14, a2: -6 };
  const armR = pose.armR ?? { a1: 14, a2: 6 };
  const legL = pose.legL ?? { a1: -10, a2: -4 };
  const legR = pose.legR ?? { a1: 10, a2: 4 };

  const tk = pose.thighK ?? 1; // <1 = thighs foreshortened (seated, knees toward the camera)
  let g = leg([0, 0], legL, -1, tk) + leg([0, 0], legR, 1, tk);
  g += stick([[0, 0], add([0, 0], dir(180 - lean * 0.6), LEN.torso * 0.5), N], LIMB + 3, LIMB + 0.5);
  if (!pose.frontArms) {
    g += arm(S, armL);
    if (!pose.overHead) g += arm(S, armR);
  }
  g += `<g transform="translate(${pt(H)}) rotate(${f(lean + (pose.headTilt ?? 0))})">${head(pose.expr, pose.mouth ?? 0, pose.acc)}</g>`;
  if (pose.overHead) g += arm(S, pose.overHead);
  if (pose.frontArms) g += arm(S, armL) + arm(S, armR);
  for (const [side, spec] of [["holdL", armL], ["holdR", pose.overHead ?? armR]]) {
    if (!pose[side]) continue;
    const [E, W] = limb(S, spec, LEN.upper, LEN.fore);
    const hand = add(W, dir(angleOf(E, W)), 6);
    g += `<g transform="translate(${pt(hand)})">${HELD[pose[side]] ?? ""}</g>`;
  }
  for (const p of pose.props ?? []) g += PROPS[p.type](p.at, p.arg);
  return `<g transform="translate(0,${-(pose.lift ?? 0)})">${g}</g>`;
}

// Objects held in a hand (drawn centred on the hand, on top of it).
const HELD = {
  cards: [-22, -6, 10].map((r, i) => `<g transform="rotate(${r})"><rect x="-11" y="-42" width="24" height="34" rx="3" fill="#fff" stroke="${P.ink}" stroke-width="2.6"/><rect x="-7" y="-38" width="16" height="26" rx="2" fill="${i === 1 ? "#e5584f" : "#5b8fd9"}" opacity=".85"/><path d="M1,-31 L4,-25 L1,-19 L-2,-25 Z" fill="#fff"/></g>`).join(""),
  phone: `<rect x="-9" y="-30" width="20" height="36" rx="4" fill="#2b2f3a" stroke="${P.ink}" stroke-width="3"/><rect x="-6" y="-26" width="14" height="24" rx="2" fill="#9cd0ff"/>`,
  coffee: `<path d="M-11,-22 L11,-22 L8,4 L-8,4 Z" fill="#fff" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/><rect x="-13" y="-27" width="26" height="6" rx="2" fill="#c98a5f" stroke="${P.ink}" stroke-width="3"/><rect x="-10" y="-14" width="20" height="8" fill="#c98a5f"/>`,
  bag: `<path d="M-16,4 L16,4 L20,40 L-20,40 Z" fill="#e9a8a0" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/><path d="M-8,4 Q0,-10 8,4" fill="none" stroke="${P.ink}" stroke-width="3"/>`,
  gift: `<rect x="-18" y="-30" width="36" height="32" fill="#9cc3e6" stroke="${P.ink}" stroke-width="3"/><path d="M0,-30 L0,2 M-18,-16 L18,-16" stroke="#e5584f" stroke-width="5"/><path d="M0,-30 Q-12,-44 -4,-32 M0,-30 Q12,-44 4,-32" fill="none" stroke="#e5584f" stroke-width="3"/>`,
  mic: `<rect x="-4" y="-6" width="8" height="26" rx="3" fill="#2b2f3a" stroke="${P.ink}" stroke-width="2"/><circle cx="0" cy="-12" r="9" fill="#9aa0ad" stroke="${P.ink}" stroke-width="3"/>`,
};

// Resolve every limb of a pose into absolute {a1, a2} angles, so two poses can be
// interpolated joint-by-joint (see lerpPose).
export function resolvePose(pose) {
  const lean = pose.lean ?? 0;
  const u = dir(180 - lean);
  const N = add([0, 0], u, LEN.torso);
  const S = add(N, u, -14);
  const toAngles = (root, spec, l1, l2, dflt) => {
    const sp = spec ?? dflt;
    const [m, e] = limb(root, sp, l1, l2);
    return { ...sp, target: undefined, bend: undefined, a1: angleOf(root, m), a2: angleOf(m, e) };
  };
  const out = { ...pose, lean, headTilt: pose.headTilt ?? 0, lift: pose.lift ?? 0 };
  out.armL = toAngles(S, pose.armL, LEN.upper, LEN.fore, { a1: -14, a2: -6 });
  out.armR = toAngles(S, pose.overHead ?? pose.armR, LEN.upper, LEN.fore, { a1: 14, a2: 6 });
  out.overHead = pose.overHead ? out.armR : undefined;
  out.legL = toAngles([0, 0], pose.legL, LEN.thigh, LEN.shin, { a1: -10, a2: -4 });
  out.legR = toAngles([0, 0], pose.legR, LEN.thigh, LEN.shin, { a1: 10, a2: 4 });
  return out;
}

const lerpAngle = (a, b, t) => { let d = ((b - a + 540) % 360) - 180; return a + d * t; };
const lerpLimb = (a, b, t) => ({ ...(t < 0.5 ? a : b), a1: lerpAngle(a.a1, b.a1, t), a2: lerpAngle(a.a2, b.a2, t) });

// Blend two resolved poses (t: 0..1). Expression and props switch at the midpoint.
export function lerpPose(a, b, t) {
  const pick = t < 0.5 ? a : b;
  const m = (x, y) => x + (y - x) * t;
  const out = { ...pick, lean: m(a.lean, b.lean), headTilt: m(a.headTilt, b.headTilt), lift: m(a.lift, b.lift) };
  for (const k of ["armL", "armR", "legL", "legR"]) out[k] = lerpLimb(a[k], b[k], t);
  out.overHead = pick.overHead ? out.armR : undefined;
  return out;
}

// Filter that gives every line a subtle hand-drawn wobble.
export const DEFS = `<filter id="eddieInk" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter>`;

// Ground distance from pelvis to shoe sole for a straight-ish standing leg.
export const GROUND = LEN.thigh + LEN.shin + 12;

export const POSES = {
  wave: {
    label: "Hello!", expr: "happy", headTilt: -6,
    armR: { a1: 115, a2: 155, thumb: -90 },
    props: [{ type: "waveLines", at: [67, -150] }],
  },
  explain: {
    label: "Explaining", expr: "neutral", lean: -3, headTilt: 5,
    armR: { a1: 92, a2: 88, thumb: -90 },
    armL: { target: [-26, -8], bend: -1 },
    props: [{ type: "pointLines", at: [103, -84] }],
  },
  think: {
    label: "Thinking...", expr: "thinking", headTilt: 8,
    overHead: { target: [10, -96], bend: -1, thumb: 200, fist: true },
    armL: { target: [30, -52], bend: -1 },
    props: [{ type: "question", at: [56, -224] }],
  },
  shocked: {
    label: "Wait, WHAT?", expr: "shocked", lean: -5,
    armL: { target: [-78, -150], bend: 1, thumb: 90 },
    armR: { target: [78, -150], bend: -1, thumb: -90 },
    legL: { a1: -14, a2: -8 }, legR: { a1: 14, a2: 8 },
    props: [{ type: "shockLines", at: [0, -146] }],
  },
  scared: {
    label: "Uh oh...", expr: "scared", lean: -8, headTilt: -4,
    armL: { target: [-40, -40], bend: -1, fist: true },
    armR: { target: [44, -48], bend: 1, fist: true },
    legL: { a1: -20, a2: -6 }, legR: { a1: 8, a2: 14 },
  },
  celebrate: {
    label: "It worked!", expr: "happy", lift: 26,
    armL: { target: [-104, -170], bend: 1, fist: true },
    armR: { target: [104, -170], bend: -1, fist: true },
    legL: { a1: -128, a2: -12, shoeRot: -10 }, legR: { a1: 6, a2: 3 },
    props: [{ type: "sparkles", at: [0, -140] }],
  },
  hustle: {
    label: "Grinding", expr: "strain", lean: 18, headTilt: -4,
    armL: { target: [40, -40], bend: -1, fist: true },
    armR: { target: [90, -70], bend: -1, fist: true },
    legL: { a1: -30, a2: -22 }, legR: { a1: 24, a2: 10 },
    props: [{ type: "sweat", at: [30, -160] }],
  },
  type: {
    label: "Typing", expr: "focused", sit: true, anim: "type",
    legL: { a1: -60, a2: 8 }, legR: { a1: 60, a2: -8 },
    armL: { target: [-32, -40], bend: -1 }, armR: { target: [32, -40], bend: 1 },
  },
  shrug: {
    label: "Shrug", expr: "neutral", headTilt: 10,
    armL: { target: [-66, -98], bend: -1 }, armR: { target: [66, -98], bend: 1 },
  },
  facepalm: {
    label: "Facepalm", expr: "strain", headTilt: 8, lean: 4,
    overHead: { target: [14, -128], bend: 1, fist: false, thumb: 200 },
    armL: { a1: -12, a2: -4 },
  },
  idea: {
    label: "Idea!", expr: "happy", headTilt: -4,
    armR: { a1: 162, a2: 178, thumb: -90 }, armL: { target: [-30, -10], bend: -1 },
    props: [{ type: "bulb", at: [0, -268] }],
  },
  crossArms: {
    label: "Hmm.", expr: "focused", headTilt: -3,
    armL: { target: [28, -54], bend: 1 }, armR: { target: [-28, -58], bend: -1 },
    legL: { a1: -12, a2: -6 }, legR: { a1: 12, a2: 6 },
  },
  panic: {
    label: "Panic", expr: "scared", anim: "panic", frontArms: true,
    armL: { target: [-50, -170], bend: -1 }, armR: { target: [50, -170], bend: 1 },
    legL: { a1: -16, a2: -6 }, legR: { a1: 14, a2: 8 },
  },
  read: {
    label: "Reading", expr: "focused", headTilt: 6,
    armL: { target: [-36, -50], bend: 1 }, armR: { target: [36, -50], bend: -1 },
    props: [{ type: "heldBook", at: [0, -54] }],
  },
  lie: {
    label: "Sleeping", expr: "calm", lean: -90, headTilt: 72,
    armL: { a1: 90, a2: 92 }, armR: { a1: 92, a2: 94 },
    legL: { a1: 90, a2: 90, shoeRot: 90 }, legR: { a1: 92, a2: 92, shoeRot: -90 },
    props: [{ type: "zzz", at: [-180, -140] }],
  },
  walk: { label: "Walking", expr: "neutral", anim: "walk" },
  // card game at a table (legs are hidden by the table, so they use the seated leg setup)
  sitCards: {
    label: "Cards", expr: "focused", sit: true, sitH: 72,
    legL: { a1: 84, a2: 4, shoeSide: 1 }, legR: { a1: 93, a2: -3, shoeSide: 1 },
    armL: { target: [-8, -40], bend: -1 }, armR: { target: [26, -48], bend: 1 }, holdR: "cards",
  },
  sitCheer: {
    label: "Win!", expr: "happy", sit: true, sitH: 72,
    legL: { a1: 84, a2: 4, shoeSide: 1 }, legR: { a1: 93, a2: -3, shoeSide: 1 },
    armL: { target: [-74, -176], bend: 1, fist: true }, armR: { target: [74, -176], bend: -1, fist: true },
  },
  sitFacepalm: {
    label: "Oops", expr: "strain", sit: true, sitH: 72, headTilt: 8,
    legL: { a1: 84, a2: 4, shoeSide: 1 }, legR: { a1: 93, a2: -3, shoeSide: 1 },
    overHead: { target: [14, -128], bend: 1, thumb: 200 }, armL: { target: [-10, -36], bend: -1 },
  },
  run: { label: "Running", expr: "scared", anim: "run", lean: 14 },
  dance: { label: "Dancing", expr: "happy", anim: "dance" },
  coverEars: {
    label: "Too loud", expr: "strain", frontArms: true, anim: "panic",
    armL: { target: [-56, -140], bend: -1 }, armR: { target: [56, -140], bend: 1 },
    legL: { a1: -14, a2: -6 }, legR: { a1: 12, a2: 8 },
  },
  listen: {
    label: "Listening", expr: "focused", headTilt: -10,
    overHead: { target: [58, -146], bend: 1, thumb: 200 }, armL: { a1: -12, a2: -4 },
  },
  // natural front-facing seated pose: thighs foreshortened toward camera, knees together, hands on lap
  sitBench: {
    label: "Sitting", expr: "calm", sit: true, sitH: 72,
    legL: { a1: 84, a2: 4, shoeSide: 1 }, legR: { a1: 93, a2: -3, shoeSide: 1 },
    armL: { target: [20, -6], bend: -1 }, armR: { target: [50, -4], bend: 1 },
  },
  phone: {
    label: "Phone", expr: "focused", headTilt: 10,
    armR: { target: [26, -96], bend: 1 }, armL: { target: [10, -70], bend: -1 }, holdR: "phone",
  },
  coffee: {
    label: "Coffee", expr: "happy",
    armR: { target: [44, -64], bend: 1 }, armL: { a1: -12, a2: -4 }, holdR: "coffee",
  },
  highFive: {
    label: "High five", expr: "happy", lean: 6,
    armR: { a1: 118, a2: 132 }, armL: { a1: -18, a2: -8 },
  },
  sneak: {
    label: "Sneaking", expr: "focused", lean: 10, anim: "sneak",
    armL: { target: [-56, -96], bend: -1 }, armR: { target: [64, -100], bend: 1 },
    legL: { a1: -16, a2: -4 }, legR: { a1: 34, a2: -8 },
  },
  giveGift: {
    label: "Gift", expr: "happy", lean: 4,
    armR: { a1: 80, a2: 70 }, armL: { target: [40, -40], bend: 1 }, holdR: "gift",
  },
  lieAwake: {
    label: "Awake in bed", expr: "neutral", lean: -90, headTilt: 72,
    armL: { a1: 90, a2: 92 }, armR: { a1: 92, a2: 94 },
    legL: { a1: 90, a2: 90, shoeRot: 90 }, legR: { a1: 92, a2: 92, shoeRot: -90 },
  },
  laptop: {
    label: "Automating", expr: "focused", headTilt: 4, sit: true,
    legL: { a1: -80, a2: 60 }, legR: { a1: 80, a2: -60 },
    armL: { target: [-26, -22], bend: -1 }, armR: { target: [26, -22], bend: 1 },
    props: [{ type: "laptop", at: [0, -6] }],
  },
};
