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
const stick = (pts) =>
  `<path d="M${pts.map(pt).join(" L")}" fill="none" stroke="${P.ink}" stroke-width="${LIMB}" stroke-linecap="round" stroke-linejoin="round"/>`;

// ---------- body parts ----------

function arm(S, spec) {
  const [E, W] = limb(S, spec, LEN.upper, LEN.fore);
  const fa = angleOf(E, W);
  const hand = add(W, dir(fa), 6);
  let s = stick([S, E, W]);
  const thumb = add(hand, dir(fa + (spec.thumb ?? 90)), 8);
  s += `<circle cx="${f(thumb[0])}" cy="${f(thumb[1])}" r="4.2" fill="${P.paper}" stroke="${P.ink}" stroke-width="3.2"/>`;
  s += `<circle cx="${f(hand[0])}" cy="${f(hand[1])}" r="9" fill="${P.paper}" stroke="${P.ink}" stroke-width="3.4"/>`;
  if (spec.fist) {
    const kn = add(hand, dir(fa), 3.5);
    s += `<path d="M${pt(add(kn, dir(fa + 90), 5))} L${pt(add(kn, dir(fa - 90), 5))}" stroke="${P.ink}" stroke-width="2" stroke-linecap="round"/>`;
  }
  return s;
}

function shoe(A, side, rot = 0) {
  return (
    `<g transform="translate(${pt(A)}) rotate(${f(rot)}) scale(${side * 0.85},0.85)">` +
    `<path d="M-12,-7 L6,-9 Q22,-7 28,3 Q30,12 21,13 L-13,13 Q-18,13 -17,4 Z" fill="${P.ink}" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M15,-3 Q26,0 28,7 L17,8 Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M-16,8.5 L28,8.5" stroke="${P.paper}" stroke-width="3" stroke-linecap="round"/>` +
    `</g>`
  );
}

function leg(H, spec, side) {
  const [K, A] = limb(H, spec, LEN.thigh, LEN.shin);
  return stick([H, K, A]) + shoe(add(A, dir(angleOf(K, A)), 3), side, spec.shoeRot ?? 0);
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
const ACC = {
  cap: (c = "#e5584f") => `<path d="M-50,-14 Q-50,-62 0,-62 Q50,-62 50,-14 Z" fill="${c}" stroke="${P.ink}" stroke-width="4.5" stroke-linejoin="round"/><path d="M8,-16 L74,-14 Q78,-6 70,-4 L6,-6 Z" fill="${c}" stroke="${P.ink}" stroke-width="4.5" stroke-linejoin="round"/>`,
  bun: (c = "#3a2a20") => `<circle cx="0" cy="-66" r="17" fill="${c}" stroke="${P.ink}" stroke-width="4"/><path d="M-50,-4 Q-52,-58 0,-60 Q52,-58 50,-4 Q36,-38 0,-40 Q-36,-38 -50,-4 Z" fill="${c}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>`,
  glasses: () => `<g fill="rgba(255,255,255,.25)" stroke="${P.ink}" stroke-width="4"><circle cx="-17" cy="10" r="13"/><circle cx="17" cy="10" r="13"/></g><path d="M-4,8 Q0,4 4,8 M-30,8 L-48,2 M30,8 L48,2" fill="none" stroke="${P.ink}" stroke-width="4"/>`,
  beanie: (c = "#5b8fd9") => `<path d="M-52,-8 Q-54,-66 0,-66 Q54,-66 52,-8 Z" fill="${c}" stroke="${P.ink}" stroke-width="4.5"/><rect x="-54" y="-18" width="108" height="16" rx="6" fill="${c}" stroke="${P.ink}" stroke-width="4"/><circle cx="0" cy="-70" r="10" fill="${c}" stroke="${P.ink}" stroke-width="4"/>`,
  pigtails: (c = "#3a2a20") => `<circle cx="-56" cy="-10" r="15" fill="${c}" stroke="${P.ink}" stroke-width="4"/><circle cx="56" cy="-10" r="15" fill="${c}" stroke="${P.ink}" stroke-width="4"/><path d="M-50,-6 Q-52,-60 0,-60 Q52,-60 50,-6 Q30,-36 0,-34 Q-30,-36 -50,-6 Z" fill="${c}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>`,
};

export function head(expr = "neutral", mouth = 0, acc = null) {
  let face = FACES[expr] || FACES.neutral;
  if (mouth > 0) {
    const els = face.match(/<[^>]+\/>/g) || [];
    face = els.filter((e) => !isMouth(e)).join("") + TALK[mouth];
  }
  return (
    `<path d="M0,-58 C34,-58 52,-30 51,2 C50,34 30,54 0,54 C-30,54 -50,34 -51,2 C-52,-30 -34,-58 0,-58 Z" fill="${P.paper}" stroke="${P.ink}" stroke-width="4.5"/>` +
    `<path d="M-32,-34 Q-24,-44 -12,-47" fill="none" stroke="${P.grey}" stroke-width="3" stroke-linecap="round"/>` +
    `<g transform="translate(0,4) scale(1.22)">${face}</g>` +
    (acc ? (Array.isArray(acc) ? acc : [acc]).map((a) => { const [k, c] = a.split(":"); return ACC[k]?.(c) ?? ""; }).join("") : "")
  );
}

// ---------- props / fx (all black & white) ----------

export const PROPS = {
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
    const lines = String(a.t ?? "").split("|"), tail = a.tail ?? -1;
    const w = a.w ?? Math.max(...lines.map((l) => l.length)) * 19 + 70, h = lines.length * 44 + 46;
    let bumps = "";
    const n = Math.max(5, Math.round(w / 55));
    for (let i = 0; i < n; i++) { const ang = (i / n) * Math.PI * 2; bumps += `<circle cx="${f(Math.cos(ang) * w * 0.48)}" cy="${f(Math.sin(ang) * h * 0.5)}" r="${f(Math.min(w, h) * 0.24)}"/>`; }
    return `<g transform="translate(${o[0]},${o[1]})">
      <g fill="${P.paper}" stroke="${P.ink}" stroke-width="9">${bumps}<ellipse rx="${w / 2}" ry="${h / 2}"/></g>
      <g fill="${P.paper}">${bumps}<ellipse rx="${w / 2}" ry="${h / 2}"/></g>
      <circle cx="${tail * w * 0.32}" cy="${h / 2 + 26}" r="11" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>
      <circle cx="${tail * w * 0.4}" cy="${h / 2 + 52}" r="7" fill="${P.paper}" stroke="${P.ink}" stroke-width="4"/>` +
      lines.map((l, i) => `<text x="0" y="${(i - (lines.length - 1) / 2) * 44 + 13}" text-anchor="middle" font-size="38" fill="${P.ink}" font-family="InkHand, 'Comic Sans MS', sans-serif">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`).join("") + `</g>`;
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

  let g = leg([0, 0], legL, -1) + leg([0, 0], legR, 1);
  g += stick([[0, 0], N]);
  if (!pose.frontArms) {
    g += arm(S, armL);
    if (!pose.overHead) g += arm(S, armR);
  }
  g += `<g transform="translate(${pt(H)}) rotate(${f(lean + (pose.headTilt ?? 0))})">${head(pose.expr, pose.mouth ?? 0, pose.acc)}</g>`;
  if (pose.overHead) g += arm(S, pose.overHead);
  if (pose.frontArms) g += arm(S, armL) + arm(S, armR);
  for (const p of pose.props ?? []) g += PROPS[p.type](p.at, p.arg);
  return `<g transform="translate(0,${-(pose.lift ?? 0)})">${g}</g>`;
}

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
