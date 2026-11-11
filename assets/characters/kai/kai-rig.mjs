// Kai — a bald, black-and-white stickman mascot as a poseable SVG rig.
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
const HEAD_R = 48;
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

// Bald round head; the face is scaled up a touch so it reads at thumbnail size.
export function head(expr = "neutral") {
  return (
    `<circle cx="0" cy="0" r="${HEAD_R}" fill="${P.paper}" stroke="${P.ink}" stroke-width="4.5"/>` +
    `<path d="M-30,-30 Q-22,-38 -12,-41" fill="none" stroke="${P.grey}" stroke-width="3" stroke-linecap="round"/>` +
    `<g transform="translate(0,2) scale(1.12)">${FACES[expr] || FACES.neutral}</g>`
  );
}

// ---------- props / fx (all black & white) ----------

const PROPS = {
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
  g += arm(S, armL);
  if (!pose.overHead) g += arm(S, armR);
  g += `<g transform="translate(${pt(H)}) rotate(${f(lean + (pose.headTilt ?? 0))})">${head(pose.expr)}</g>`;
  if (pose.overHead) g += arm(S, pose.overHead);
  for (const p of pose.props ?? []) g += PROPS[p.type](p.at);
  return `<g transform="translate(0,${-(pose.lift ?? 0)})">${g}</g>`;
}

// Filter that gives every line a subtle hand-drawn wobble.
export const DEFS = `<filter id="kaiInk" x="-10%" y="-10%" width="120%" height="120%">
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
  laptop: {
    label: "Automating", expr: "focused", headTilt: 4, sit: true,
    legL: { a1: -80, a2: 60 }, legR: { a1: 80, a2: -60 },
    armL: { target: [-26, -22], bend: -1 }, armR: { target: [26, -22], bend: 1 },
    props: [{ type: "laptop", at: [0, -6] }],
  },
};
