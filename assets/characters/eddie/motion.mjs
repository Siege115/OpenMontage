// Motion design toolkit for Eddie episodes: easing curves, springs, keyframes, staggers.
// Everything is a pure function of time, so renders stay deterministic and seekable.
//
// Principles this encodes (see MOTION.md):
//  - Easing is emotion: .out for entrances (fast start, gentle settle), .in for exits
//    (gentle start, fast leave), .inOut for moves between two positions.
//  - Asymmetry: exits are faster than entrances.
//  - Overshoot (back / spring) only where something should feel springy or alive.

// ---- cubic-bezier, solved like CSS / After Effects ----------------------------------
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) { const e = sx(t) - x, d = dx(t); if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break; t -= e / d; }
    return sy(Math.min(1, Math.max(0, t)));
  };
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const pow = (p) => ({ in: (x) => x ** p, out: (x) => 1 - (1 - x) ** p, inOut: (x) => (x < 0.5 ? 2 ** (p - 1) * x ** p : 1 - (-2 * x + 2) ** p / 2) });
const back = (s = 1.70158) => ({
  in: (x) => (s + 1) * x ** 3 - s * x * x,
  out: (x) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
  inOut: (x) => { const c = s * 1.525; return x < 0.5 ? ((2 * x) ** 2 * ((c + 1) * 2 * x - c)) / 2 : ((2 * x - 2) ** 2 * ((c + 1) * (x * 2 - 2) + c) + 2) / 2; },
});

export const EASE = {
  linear: (x) => x,
  sine: { in: (x) => 1 - Math.cos((x * Math.PI) / 2), out: (x) => Math.sin((x * Math.PI) / 2), inOut: (x) => -(Math.cos(Math.PI * x) - 1) / 2 },
  power1: pow(2), power2: pow(3), power3: pow(4), power4: pow(5),
  expo: { in: (x) => (x === 0 ? 0 : 2 ** (10 * x - 10)), out: (x) => (x === 1 ? 1 : 1 - 2 ** (-10 * x)), inOut: (x) => (x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2) },
  back: back(), backSoft: back(1.1), backStrong: back(2.6),
  elastic: { out: (x) => (x === 0 ? 0 : x === 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1) },
  // standard motion-design curves
  standard: cubicBezier(0.4, 0, 0.2, 1),      // Material "standard": moves between positions
  decelerate: cubicBezier(0, 0, 0.2, 1),      // entrances
  accelerate: cubicBezier(0.4, 0, 1, 1),      // exits
  snappy: cubicBezier(0.2, 0.9, 0.1, 1),      // punchy UI entrance
  cinematic: cubicBezier(0.65, 0, 0.35, 1),   // slow camera moves
};

// Damped spring (closed form), progress 0..1 over `dur` seconds; low damping = more bounce.
export function spring(t, { stiffness = 170, damping = 14, mass = 1 } = {}) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t)); }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// Progress of a segment [t0, t0+dur] through an easing function (clamped).
export const seg = (t, t0, dur, ease = EASE.linear) => ease(clamp01((t - t0) / dur));

// Entrance -> hold -> exit envelope (0..1): `in` seconds with easeIn curve, `out` seconds before `end` with easeOut curve.
export function life(t, start, end, { inDur = 0.35, outDur = 0.22, inEase = EASE.power3.out, outEase = EASE.power2.in } = {}) {
  if (t < start || t > end) return 0;
  const a = seg(t, start, inDur, inEase);
  const b = 1 - seg(t, end - outDur, outDur, outEase);
  return Math.min(a, b);
}

// Keyframes: [[time, value, easeIntoThisKey?], ...] sorted by time.
export function keys(t, frames) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1, e = EASE.standard] = frames[i], [t0, v0] = frames[i - 1];
    if (t <= t1) return v0 + (v1 - v0) * e((t - t0) / (t1 - t0));
  }
  return frames[frames.length - 1][1];
}

// Stagger: start offset for item i, total spread capped (choreography reads as one gesture).
export const stagger = (i, n, each = 0.05, maxTotal = 0.45) => i * Math.min(each, maxTotal / Math.max(1, n - 1));

export const lerp = (a, b, k) => a + (b - a) * k;
