// Kai — a hand-drawn hoodie-kid mascot as a poseable SVG rig.
//
// Pure vector, no AI model, no API key: every pose is a function of a small
// pose object (joint angles or IK targets + expression + props), so the same
// character can be re-posed, tweened, or dropped into Remotion / HyperFrames.
//
// Angle convention (absolute, degrees): 0 = straight down, 90 = screen-right,
// -90 = screen-left, 180 = straight up. "L"/"R" are SCREEN left/right.

export const PALETTE = {
  ink: "#0d0d10",        // outlines
  hair: "#5b3a24",       // warm brown
  hairDark: "#3a2416",
  hairLight: "#8f6240",
  hoodie: "#2a2a31",
  hoodieFold: "#474752",
  pants: "#303b55",
  pantsFold: "#1f2740",
  shoe: "#121215",
  skin: "#ffffff",
  accent: "#ff7a1a",     // Kai's signature: orange headphones + drawstrings
  shadow: "rgba(0,0,0,0.10)",
};

const P = PALETTE;
const LEN = { torso: 105, upper: 50, fore: 46, thigh: 60, shin: 58 };

const rad = (d) => (d * Math.PI) / 180;
const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s];
const f = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${f(p[0])},${f(p[1])}`;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Two-bone IK: returns elbow/knee position. bend = +1 / -1 picks the side.
function ik(root, target, l1, l2, bend) {
  let dx = target[0] - root[0], dy = target[1] - root[1];
  let d = Math.hypot(dx, dy);
  const dMax = l1 + l2 - 0.01, dMin = Math.abs(l1 - l2) + 0.01;
  const dc = Math.min(Math.max(d, dMin), dMax);
  const base = Math.atan2(dy, dx);
  const a = Math.acos((l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc));
  const t = base + bend * a;
  const mid = [root[0] + Math.cos(t) * l1, root[1] + Math.sin(t) * l1];
  const ux = (target[0] - mid[0]), uy = (target[1] - mid[1]);
  const ul = Math.hypot(ux, uy) || 1;
  const end = [mid[0] + (ux / ul) * l2, mid[1] + (uy / ul) * l2];
  return [mid, end];
}

// Resolve a two-segment limb from either {a1,a2} angles or {target,bend}.
function limb(root, spec, l1, l2) {
  if (spec.target) return ik(root, spec.target, l1, l2, spec.bend ?? 1);
  const mid = add(root, dir(spec.a1), l1);
  return [mid, add(mid, dir(spec.a2), l2)];
}

const angleOf = (a, b) => (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;

// ---------- body parts ----------

function tube(points, fill, width, outline = 4) {
  const d = "M" + points.map(pt).join(" L");
  return (
    `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="${width + outline * 2}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function arm(S, spec) {
  const [E, W] = limb(S, spec, LEN.upper, LEN.fore);
  const fa = angleOf(E, W);
  const hand = add(W, dir(fa), 7);
  let s = tube([S, E, W], P.hoodie, 22);
  // sleeve crease at the elbow + cuff band
  const ca = angleOf(S, E);
  const c1 = add(E, dir(ca + 90), 6), c2 = add(E, dir(ca - 90), 6);
  s += `<path d="M${pt(add(c1, dir(ca), -6))} Q${pt(E)} ${pt(add(c2, dir(ca), -6))}" fill="none" stroke="${P.hoodieFold}" stroke-width="2.5" stroke-linecap="round"/>`;
  const k1 = add(add(W, dir(fa), -4), dir(fa + 90), 11), k2 = add(add(W, dir(fa), -4), dir(fa - 90), 11);
  s += `<path d="M${pt(k1)} L${pt(k2)}" stroke="${P.hoodieFold}" stroke-width="2.5" stroke-linecap="round"/>`;
  // mitten hand with a thumb bump
  const thumb = add(hand, dir(fa + (spec.thumb ?? 90)), 9);
  s += `<circle cx="${f(thumb[0])}" cy="${f(thumb[1])}" r="5" fill="${P.skin}" stroke="${P.ink}" stroke-width="3.5"/>`;
  s += `<circle cx="${f(hand[0])}" cy="${f(hand[1])}" r="10.5" fill="${P.skin}" stroke="${P.ink}" stroke-width="3.5"/>`;
  if (spec.fist) {
    const kn = add(hand, dir(fa), 4);
    s += `<path d="M${pt(add(kn, dir(fa + 90), 6))} L${pt(add(kn, dir(fa - 90), 6))}" stroke="${P.ink}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  return s;
}

function shoe(A, side, rot = 0) {
  return (
    `<g transform="translate(${pt(A)}) rotate(${f(rot)}) scale(${side},1)">` +
    `<path d="M-12,-7 L6,-9 Q22,-7 28,3 Q30,12 21,13 L-13,13 Q-18,13 -17,4 Z" fill="${P.shoe}" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M15,-3 Q26,0 28,7 L17,8 Z" fill="${P.skin}" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M-16,8.5 L28,8.5" stroke="${P.skin}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M-2,-6 L4,0 M2,-7 L8,-1" stroke="${P.skin}" stroke-width="1.8" stroke-linecap="round"/>` +
    `</g>`
  );
}

function leg(H, spec, side) {
  const [K, A] = limb(H, spec, LEN.thigh, LEN.shin);
  let s = tube([H, K, A], P.pants, 27);
  // cargo pocket on the outer thigh
  const ta = angleOf(H, K);
  const mid = add(H, dir(ta), LEN.thigh * 0.5);
  const pc = add(mid, dir(ta + 90 * side), 7);
  s += `<g transform="translate(${pt(pc)}) rotate(${f(-ta)})"><rect x="-6" y="-10" width="12" height="20" rx="2.5" fill="${P.pants}" stroke="${P.ink}" stroke-width="2.5"/><path d="M-6,-4 L6,-4" stroke="${P.ink}" stroke-width="2"/></g>`;
  // knee crease
  const ka = angleOf(K, A);
  s += `<path d="M${pt(add(K, dir(ka + 90), 8))} Q${pt(add(K, dir(ka), 4))} ${pt(add(K, dir(ka - 90), 6))}" fill="none" stroke="${P.pantsFold}" stroke-width="2.5" stroke-linecap="round"/>`;
  s += shoe(add(A, dir(ka), 4), side, spec.shoeRot ?? 0);
  return s;
}

function torso(lean) {
  return (
    `<g transform="rotate(${f(lean)})">` +
    // hood behind the neck
    `<path d="M-30,-104 Q-34,-128 0,-130 Q34,-128 30,-104 Z" fill="${P.hoodie}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>` +
    // body
    `<path d="M-28,-106 Q-43,-104 -43,-88 L-39,0 Q-39,10 -30,10 L30,10 Q39,10 39,0 L43,-88 Q43,-104 28,-106 Q0,-96 -28,-106 Z" fill="${P.hoodie}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>` +
    // ribbed hem
    `<path d="M-38,-2 L38,-2" stroke="${P.hoodieFold}" stroke-width="2.5" stroke-linecap="round"/>` +
    // kangaroo pocket
    `<path d="M-21,-36 L21,-36 L29,-8 L-29,-8 Z" fill="${P.hoodie}" stroke="${P.hoodieFold}" stroke-width="2.5" stroke-linejoin="round"/>` +
    // fold lines
    `<path d="M-30,-70 Q-24,-62 -28,-52 M31,-74 Q25,-64 29,-55" fill="none" stroke="${P.hoodieFold}" stroke-width="2.2" stroke-linecap="round"/>` +
    // drawstrings (accent)
    `<path d="M-8,-101 Q-10,-86 -9,-70 M8,-101 Q10,-88 9,-73" fill="none" stroke="${P.accent}" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="-9" cy="-68" r="2.6" fill="${P.accent}"/><circle cx="9" cy="-71" r="2.6" fill="${P.accent}"/>` +
    // headphones resting around the neck (accent)
    `<path d="M-27,-106 Q0,-86 27,-106" fill="none" stroke="${P.ink}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M-27,-106 Q0,-86 27,-106" fill="none" stroke="${P.accent}" stroke-width="4.5" stroke-linecap="round"/>` +
    `<rect x="-37" y="-114" width="15" height="19" rx="6" fill="${P.accent}" stroke="${P.ink}" stroke-width="3.5"/>` +
    `<rect x="22" y="-114" width="15" height="19" rx="6" fill="${P.accent}" stroke="${P.ink}" stroke-width="3.5"/>` +
    `</g>`
  );
}

// ---------- head + faces ----------

// Loose curly hair: a cloud of overlapping curls. Each curl is drawn twice,
// outlined first and then filled on top, so only the cloud's outer silhouette
// keeps an ink line. Light "C" strokes on top give the curl texture.
function curls(seed = 7) {
  const r = rng(seed);
  const c = [];
  // outer ring over the crown, down to the ears
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const t = rad(192 - (204 * i) / n);
    const R = 38 + r() * 3;
    c.push([Math.cos(t) * R, -Math.sin(t) * R * 1.05 - 6, 11 + r() * 3]);
  }
  // inner fill so the crown reads as one mass
  for (let i = 0; i < 5; i++) {
    const t = rad(150 - (120 * i) / 4);
    c.push([Math.cos(t) * 20, -Math.sin(t) * 20 - 22, 14 + r() * 2]);
  }
  // loose fringe curls, kept above the brows
  const fringe = [[-26, -24, 9.5], [-10, -27, 10], [7, -25, 9.5], [23, -26, 9.5]];
  for (const [x, y, rr] of fringe) c.push([x + (r() - 0.5) * 3, y + r() * 2, rr]);

  const circ = (k, extra) => `<circle cx="${f(k[0])}" cy="${f(k[1])}" r="${f(k[2] + extra)}"/>`;
  let s = `<g fill="${P.hair}" stroke="${P.ink}" stroke-width="7">${c.map((k) => circ(k, 0)).join("")}</g>`;
  s += `<g fill="${P.hair}">${c.map((k) => circ(k, 0)).join("")}</g>`;
  // curl swirls
  s += `<g fill="none" stroke="#50505c" stroke-width="2" stroke-linecap="round">`;
  for (const [x, y, rr] of c.filter((_, i) => i % 2 === 0)) {
    const q = rr * 0.45, a0 = r() * 360;
    const p1 = [x + Math.cos(rad(a0)) * q, y + Math.sin(rad(a0)) * q];
    const p2 = [x + Math.cos(rad(a0 + 200)) * q, y + Math.sin(rad(a0 + 200)) * q];
    s += `<path d="M${pt(p1)} A${f(q)},${f(q)} 0 1 1 ${pt(p2)}"/>`;
  }
  return s + `</g>`;
}

const FACES = {
  neutral: `
    <ellipse cx="-14" cy="6" rx="4.4" ry="6" fill="${P.ink}"/><ellipse cx="14" cy="6" rx="4.4" ry="6" fill="${P.ink}"/>
    <path d="M-8,24 Q0,30 8,24" fill="none" stroke="${P.ink}" stroke-width="3.2" stroke-linecap="round"/>`,
  happy: `
    <ellipse cx="-14" cy="5" rx="4.4" ry="6" fill="${P.ink}"/><ellipse cx="14" cy="5" rx="4.4" ry="6" fill="${P.ink}"/>
    <path d="M-13,19 Q0,21 13,19 Q11,35 0,35 Q-11,35 -13,19 Z" fill="${P.ink}"/>
    <path d="M-6,30 Q0,26 6,30 Q3,34 0,34 Q-3,34 -6,30 Z" fill="#ff6b6b"/>
    <path d="M-10,20.5 L10,20.5" stroke="${P.skin}" stroke-width="2.4" stroke-linecap="round"/>`,
  angry: `
    <path d="M-22,-5 L-7,1 M22,-5 L7,1" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="-14" cy="8" rx="4" ry="5" fill="${P.ink}"/><ellipse cx="14" cy="8" rx="4" ry="5" fill="${P.ink}"/>
    <path d="M-9,28 Q0,22 9,28" fill="none" stroke="${P.ink}" stroke-width="3.4" stroke-linecap="round"/>`,
  shocked: `
    <path d="M-22,-8 Q-15,-13 -8,-9 M22,-8 Q15,-13 8,-9" fill="none" stroke="${P.ink}" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="-14" cy="5" r="8" fill="${P.skin}" stroke="${P.ink}" stroke-width="3"/><circle cx="14" cy="5" r="8" fill="${P.skin}" stroke="${P.ink}" stroke-width="3"/>
    <circle cx="-14" cy="6" r="3.4" fill="${P.ink}"/><circle cx="14" cy="6" r="3.4" fill="${P.ink}"/>
    <ellipse cx="0" cy="28" rx="6" ry="8" fill="${P.ink}"/>`,
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
    <rect x="-11" y="21" width="22" height="11" rx="3" fill="${P.skin}" stroke="${P.ink}" stroke-width="3"/>
    <path d="M-11,26.5 L11,26.5 M-4,21 L-4,32 M4,21 L4,32" stroke="${P.ink}" stroke-width="1.8"/>`,
};

// One tapered, curved lock of hair: root -> tip, bowed sideways by `bend`.
function lock(root, tip, width, bend, fill = P.hair, hi = true) {
  const dx = tip[0] - root[0], dy = tip[1] - root[1];
  const len = Math.hypot(dx, dy) || 1;
  const n = [-dy / len, dx / len];
  const mid = [(root[0] + tip[0]) / 2 + n[0] * bend * len * 0.35, (root[1] + tip[1]) / 2 + n[1] * bend * len * 0.35];
  const a = add(root, n, width / 2), b = add(root, n, -width / 2);
  const ca = add(mid, n, width * 0.42), cb = add(mid, n, -width * 0.42);
  let s = `<path d="M${pt(a)} Q${pt(ca)} ${pt(tip)} Q${pt(cb)} ${pt(b)} Z" fill="${fill}" stroke="${P.ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
  if (hi) {
    const h1 = [root[0] + dx * 0.15, root[1] + dy * 0.15], h2 = [root[0] + dx * 0.6 + n[0] * bend * len * 0.18, root[1] + dy * 0.6 + n[1] * bend * len * 0.18];
    s += `<path d="M${pt(h1)} Q${pt(mid)} ${pt(h2)}" fill="none" stroke="${P.hairLight}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
  }
  return s;
}

// Fluffy, tousled wavy hair: a back mass that covers the ears, a cap over the
// crown, then layered pointed locks (crown, outward side flicks, a fringe that
// falls over the forehead down to the brows).
const WAVES = {
  back() {
    let s = `<path d="M-44,-34 Q-60,4 -52,34 Q-30,42 0,40 Q30,42 52,34 Q60,4 44,-34 Z" fill="${P.hairDark}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    for (const [r, t, b] of [[[-46, 14], [-64, 36], -0.5], [[-40, 26], [-48, 50], -0.4], [[-30, 30], [-30, 48], 0.3]])
      s += lock(r, t, 14, b, P.hairDark, false) + lock([-r[0], r[1]], [-t[0], t[1]], 14, -b, P.hairDark, false);
    return s;
  },
  front(seed = 7) {
    const r = rng(seed);
    let s = `<path d="M-47,0 Q-58,-72 0,-74 Q58,-72 47,0 L38,-14 Q0,-30 -38,-14 Z" fill="${P.hair}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    // side locks hanging over the ears, flicking outward
    const side = [[[-38, -24], [-62, -6], -0.4], [[-40, -6], [-62, 16], -0.45], [[-40, 10], [-56, 36], -0.4], [[-34, 18], [-40, 40], 0.35]];
    for (const [ro, ti, b] of side) {
      const j = (r() - 0.5) * 4;
      s += lock(ro, [ti[0] * 0.92, ti[1] + j], 20, b * 1.5) + lock([-ro[0], ro[1]], [-ti[0] * 0.92, ti[1] - j], 20, -b * 1.5);
    }
    // edge flicks: short curled wisps poking out of the silhouette
    for (let i = 0; i < 9; i++) {
      const t = rad(172 - (164 * i) / 8);
      const root = [Math.cos(t) * 42, -Math.sin(t) * 50 - 18];
      const out = [Math.cos(t), -Math.sin(t)];
      const side = Math.cos(t) >= 0 ? 1 : -1;
      const tip = [root[0] + out[0] * 18 + side * 6, root[1] + out[1] * 18 + 10];
      s += lock(root, tip, 18, side * (0.9 + r() * 0.3));
    }
    // layered locks flowing down from the crown (no single swirl point)
    for (const [x0, y0, x1, y1, b] of [[-26, -64, -42, -38, -0.7], [-8, -70, -22, -42, -0.6], [10, -70, 2, -42, 0.6], [26, -64, 30, -38, 0.7], [-36, -50, -50, -22, -0.7], [38, -50, 50, -22, 0.7]])
      s += lock([x0, y0], [x1 + (r() - 0.5) * 4, y1], 24, b);
    // fringe over the forehead, tips sweeping to alternate sides
    const fringe = [[-30, -10, -40, 0.5], [-18, -12, -26, -0.4], [-6, -13, -10, 0.5], [6, -12, 4, -0.5], [18, -13, 20, 0.4], [30, -10, 38, -0.5]];
    for (const [x, y, tx, b] of fringe) s += lock([x * 0.75, -44], [tx + (r() - 0.5) * 4, y + 2 + r() * 3], 22, b * 1.4);
    return s;
  },
};

export function head(expr = "neutral", seed = 7) {
  return (
    WAVES.back() +
    `<ellipse cx="0" cy="0" rx="40" ry="44" fill="${P.skin}" stroke="${P.ink}" stroke-width="4"/>` +
    (FACES[expr] || FACES.neutral) +
    WAVES.front(seed)
  );
}

// ---------- props / fx ----------

const PROPS = {
  waveLines: (o) => `<g fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round">
    <path d="M${o[0] + 22},${o[1] - 18} Q${o[0] + 32},${o[1]} ${o[0] + 22},${o[1] + 18}"/>
    <path d="M${o[0] + 32},${o[1] - 26} Q${o[0] + 46},${o[1]} ${o[0] + 32},${o[1] + 26}"/>
    <path d="M${o[0] - 22},${o[1] - 18} Q${o[0] - 32},${o[1]} ${o[0] - 22},${o[1] + 18}"/></g>`,
  question: (o) => `<text x="${o[0]}" y="${o[1]}" font-family="InkHand, 'Comic Sans MS', sans-serif" font-size="54" fill="${P.ink}">?</text>
    <text x="${o[0] + 30}" y="${o[1] - 26}" font-family="InkHand, 'Comic Sans MS', sans-serif" font-size="34" fill="${P.ink}">?</text>`,
  shockLines: (o) => `<g stroke="${P.ink}" stroke-width="3.5" stroke-linecap="round">
    <path d="M${o[0] - 62},${o[1] - 40} L${o[0] - 80},${o[1] - 58}"/><path d="M${o[0] - 70},${o[1] - 8} L${o[0] - 94},${o[1] - 10}"/>
    <path d="M${o[0] + 62},${o[1] - 40} L${o[0] + 80},${o[1] - 58}"/><path d="M${o[0] + 70},${o[1] - 8} L${o[0] + 94},${o[1] - 10}"/>
    <path d="M${o[0]},${o[1] - 78} L${o[0]},${o[1] - 100}"/></g>`,
  sparkles: (o) => [[-120, -60, 1], [118, -90, 0.8], [-96, 70, 0.6], [104, 40, 0.7]].map(([x, y, s]) =>
    `<path transform="translate(${o[0] + x},${o[1] + y}) scale(${s})" d="M0,-16 Q2,-2 16,0 Q2,2 0,16 Q-2,2 -16,0 Q-2,-2 0,-16 Z" fill="${P.accent}" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>`).join(""),
  pointLines: (o) => `<g stroke="${P.ink}" stroke-width="3" stroke-linecap="round">
    <path d="M${o[0] + 20},${o[1] - 14} L${o[0] + 34},${o[1] - 24}"/><path d="M${o[0] + 24},${o[1]} L${o[0] + 40},${o[1]}"/>
    <path d="M${o[0] + 20},${o[1] + 14} L${o[0] + 34},${o[1] + 24}"/></g>`,
  laptop: (o) => `<g transform="translate(${o[0]},${o[1]})">
    <path d="M-62,4 L62,4 L70,16 L-70,16 Z" fill="#b9bcc6" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="-56" y="-74" width="112" height="80" rx="7" fill="#d6d8de" stroke="${P.ink}" stroke-width="4"/>
    <path d="M3,-50 L-11,-30 L-1,-30 L-5,-14 L11,-36 L1,-36 Z" fill="${P.accent}" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M-46,-64 L-30,-64" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/></g>`,
  sweat: (o) => `<g fill="#7cc3ff" stroke="${P.ink}" stroke-width="2.5">
    <path d="M${o[0] + 52},${o[1] - 40} q7,10 0,14 q-7,-4 0,-14z"/><path d="M${o[0] + 66},${o[1] - 22} q6,8 0,12 q-6,-4 0,-12z"/></g>`,
};

// ---------- full character ----------

/**
 * pose = {
 *   lean, headTilt, lift,           // degrees / px
 *   armL, armR: {a1,a2} | {target:[x,y], bend}, plus {front, fist, thumb}
 *   legL, legR: {a1,a2} | {target,bend}, plus {shoeRot}
 *   expr, props: [{type, at:[x,y]}]  // all coords relative to the pelvis
 * }
 * Returns an SVG <g> string with the pelvis at (0,0).
 */
export function character(pose) {
  const lean = pose.lean ?? 0;
  const u = dir(180 - lean), r = dir(90 - lean);
  const N = add([0, 0], u, LEN.torso);
  const SL = add(add(N, r, -36), u, -12);
  const SR = add(add(N, r, 36), u, -12);
  const HL = [-17, -2], HR = [17, -2];
  const H = add(N, dir(180 - lean - (pose.headTilt ?? 0)), 50);

  const armL = pose.armL ?? { a1: -6, a2: -2 };
  const armR = pose.armR ?? { a1: 6, a2: 2 };
  const legL = pose.legL ?? { a1: -5, a2: -2 };
  const legR = pose.legR ?? { a1: 5, a2: 2 };

  let g = "";
  g += leg(HL, legL, -1) + leg(HR, legR, 1);
  if (!armL.front) g += arm(SL, armL);
  if (!armR.front && !pose.overHead) g += arm(SR, armR);
  g += torso(lean);
  if (pose.under) g += pose.under;
  if (armL.front) g += arm(SL, armL);
  if (armR.front && !pose.overHead) g += arm(SR, armR);
  const headSVG = `<g transform="translate(${pt(H)}) rotate(${f(lean + (pose.headTilt ?? 0))})">${head(pose.expr, pose.hairSeed)}</g>`;
  if (pose.overHead) { g += headSVG; g += arm(SR, pose.overHead); } else g += headSVG;
  for (const p of pose.props ?? []) g += PROPS[p.type](p.at);
  return `<g transform="translate(0,${-(pose.lift ?? 0)})">${g}</g>`;
}

// Filter that gives every line a subtle hand-drawn wobble.
export const DEFS = `<filter id="kaiInk" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>`;

// Ground distance from pelvis to shoe sole for a straight standing leg.
export const GROUND = LEN.thigh + LEN.shin + 17;

export const POSES = {
  wave: {
    label: "Hello!", expr: "happy", headTilt: -6,
    armR: { a1: 150, a2: 178, front: true, thumb: -90 },
    armL: { a1: -10, a2: -4 },
    props: [{ type: "waveLines", at: [63, -190] }],
  },
  explain: {
    label: "Explaining", expr: "neutral", lean: -3, headTilt: 5,
    armR: { a1: 92, a2: 88, front: true, thumb: -90 },
    armL: { target: [-22, -6], bend: -1 },
    legL: { a1: -9, a2: -4 }, legR: { a1: 8, a2: 4 },
    props: [{ type: "pointLines", at: [133, -88] }],
  },
  think: {
    label: "Thinking...", expr: "thinking", headTilt: 8,
    overHead: { target: [8, -106], bend: -1, thumb: 200, fist: true },
    armL: { target: [44, -64], bend: -1, front: true },
    props: [{ type: "question", at: [56, -232] }],
  },
  shocked: {
    label: "Wait, WHAT?", expr: "shocked", lean: -5,
    armL: { target: [-74, -160], bend: 1, front: true, thumb: 90 },
    armR: { target: [74, -160], bend: -1, front: true, thumb: -90 },
    legL: { a1: -12, a2: -6 }, legR: { a1: 12, a2: 6 },
    props: [{ type: "shockLines", at: [0, -158] }],
  },
  celebrate: {
    label: "It worked!", expr: "happy", lift: 26,
    armL: { target: [-78, -196], bend: 1, fist: true, front: true },
    armR: { target: [78, -196], bend: -1, fist: true, front: true },
    legL: { a1: -128, a2: -12, shoeRot: -10 }, legR: { a1: 6, a2: 3 },
    props: [{ type: "sparkles", at: [0, -150] }],
  },
  hustle: {
    label: "Grinding", expr: "strain", lean: 18, headTilt: -4,
    armL: { target: [-46, -66], bend: -1 },
    armR: { target: [74, -86], bend: -1, front: true, fist: true },
    legL: { a1: -30, a2: -22 }, legR: { a1: 24, a2: 10 },
    props: [{ type: "sweat", at: [30, -170] }],
  },
  laptop: {
    label: "Automating", expr: "focused", headTilt: 4, sit: true,
    legL: { a1: -80, a2: 60, shoeRot: 0 }, legR: { a1: 80, a2: -60, shoeRot: 0 },
    armL: { target: [-26, -22], bend: -1 }, armR: { target: [26, -22], bend: 1 },
    props: [{ type: "laptop", at: [0, -6] }],
  },
};
