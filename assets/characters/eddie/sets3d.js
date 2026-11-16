// 3D sets for Eddie episodes (Three.js). Units: 1 = 100 px of the 2D world; the cartoon layer is the
// plane Z=0, x in [-9.6, 9.6], floor at Y=0 (a character is ~4.9 units tall). +Z is toward the camera.
// Each set: geometry built from primitives + canvas textures, coloured lights, soft shadows and a few
// animated bits (update(t) is a pure function of time, so renders are deterministic).
// Objects marked front() are rendered on top of the cartoon layer (things closer than the characters).

export function buildSet(sc, T) {
  const S = new T.Scene(), ups = [];
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const tex = (w, h, draw, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
  const lam = (color, o = {}) => new T.MeshLambertMaterial({ color, ...o });
  const glow = (color, o = {}) => new T.MeshBasicMaterial({ color, ...o });
  const add = (m, o = {}) => { m.castShadow = o.cast ?? true; m.receiveShadow = o.recv ?? true; (o.parent ?? S).add(m); return m; };
  // box sitting on y (y = its bottom)
  const box = (w, h, d, mat, x, y, z, o) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof mat === "string" || typeof mat === "number" ? lam(mat) : mat); m.position.set(x, y + h / 2, z); return add(m, o); };
  const cyl = (r0, r1, h, mat, x, y, z, o = {}) => { const m = new T.Mesh(new T.CylinderGeometry(r0, r1, h, o.seg ?? 20), typeof mat === "string" ? lam(mat) : mat); m.position.set(x, y + h / 2, z); return add(m, o); };
  const ball = (r, mat, x, y, z, o) => { const m = new T.Mesh(new T.SphereGeometry(r, 20, 14), typeof mat === "string" ? lam(mat) : mat); m.position.set(x, y, z); return add(m, o); };
  const quad = (w, h, mat, x, y, z, o = {}) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.position.set(x, y, z); if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; return add(m, { cast: false, recv: false, ...o }); };
  const front = (o) => { o.traverse((c) => c.layers.set(1)); return o; };
  const group = (x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); S.add(g); return g; };
  const sun = (color, i, pos, target = [0, 0, 0]) => { const l = new T.DirectionalLight(color, i); l.position.set(...pos); l.target.position.set(...target); S.add(l.target); l.castShadow = true; l.shadow.mapSize.set(2048, 2048);
    const c = l.shadow.camera; c.left = -16; c.right = 16; c.top = 14; c.bottom = -6; c.near = 1; c.far = 80; l.shadow.bias = -0.0015; l.shadow.radius = 5; S.add(l); return l; };
  const lamp = (color, i, x, y, z, dist = 18) => { const l = new T.PointLight(color, i, dist, 1.6); l.position.set(x, y, z); S.add(l); return l; };
  const floorTex = (c1, c2, rep) => tex(256, 256, (g) => { g.fillStyle = c1; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? c2 : c1; g.globalAlpha = 0.5; g.fillRect(0, i * 64, 256, 62); g.globalAlpha = 1; g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, i * 64 + 62, 256, 2); g.fillRect(((i * 97) % 200) + 20, i * 64, 2, 62); } }, rep);
  const booksTex = (rows = 5, seed = 1) => tex(512, 512, (g, w, h) => {
    g.fillStyle = "#7d5636"; g.fillRect(0, 0, w, h); const cols = ["#e9a8a0", "#9cc3e6", "#f7d774", "#8fc49a", "#c7a8e0", "#f0b27a", "#d9776c", "#7fa7d9"], rh = h / rows;
    for (let r = 0; r < rows; r++) { g.fillStyle = "#5e3f26"; g.fillRect(0, r * rh, w, rh - 12); let x = 6, i = 0; while (x < w - 16) { const bw = 14 + ((i * 7 + r * 3 + seed) % 4) * 6, bh = rh * (0.6 + ((i * 13 + r + seed) % 5) * 0.07); g.fillStyle = cols[(i + r * 2 + seed) % cols.length]; g.fillRect(x, r * rh + rh - 12 - bh, bw, bh); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x + bw - 2, r * rh + rh - 12 - bh, 2, bh); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(x + 3, r * rh + rh - 12 - bh + 8, bw - 7, 3); x += bw + 2; i++; }
      g.fillStyle = "#c99b72"; g.fillRect(0, r * rh + rh - 12, w, 12); g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(0, r * rh + rh - 2, w, 2); }
  });
  const shelf = (x, z, w, h, seed, ry = 0) => { const g = group(x, 0, z); g.rotation.y = ry; box(w, h, 1.3, "#8a5a3c", 0, 0, 0, { parent: g }); const m = quad(w - 0.3, h - 0.3, lam(0xffffff, { map: booksTex(Math.round(h / 1.5), seed) }), 0, h / 2, 0.66, { parent: g, recv: true }); box(w + 0.3, 0.25, 1.5, "#a5764f", 0, h, 0, { parent: g }); return g; };
  const plant = (x, z, s = 1, pot = "#d98c5f", parent) => { const g = group(x, 0, z); if (parent) parent.add(g); cyl(0.5 * s, 0.38 * s, 0.9 * s, pot, 0, 0, 0, { parent: g }); const leaves = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, l = ball(0.42 * s, "#5fa86a", Math.cos(a) * 0.5 * s, (1.5 + (i % 3) * 0.45) * s, Math.sin(a) * 0.5 * s, { parent: g }); l.scale.set(1, 1.5, 0.6); l.rotation.y = -a; leaves.push(l); } ball(0.5 * s, "#6fbf7a", 0, 2.4 * s, 0, { parent: g }).scale.set(0.9, 1.4, 0.9); ups.push((t) => { g.rotation.z = Math.sin(t * 0.9 + x) * 0.025; }); return g; };
  const pendant = (x, y, z, shade = "#4f8a43", col = "#ffd98a", power = 60) => { box(0.04, 14 - y, 0.04, "#1b1b20", x, y + 0.6, z, { cast: false }); const s = cyl(0.25, 0.75, 0.6, shade, x, y, z); ball(0.22, glow("#fff6c8"), x, y, z, { cast: false }); lamp(col, power, x, y - 0.4, z, 16); quad(3.2, 3.2, glow(col, { map: haloTex, transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending }), x, y - 0.3, z + 0.1); return s; };
  const haloTex = tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const frame = (x, y, z, w, h, art, c = "#ffffff") => { box(w + 0.24, h + 0.24, 0.12, c, x, y - 0.12, z, { cast: false }); quad(w, h, lam(0xffffff, { map: tex(128, 128, art) }), x, y + h / 2, z + 0.07, { recv: true }); };
  const arts = [
    (g) => { g.fillStyle = "#9cc3e6"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#8fc49a"; g.beginPath(); g.moveTo(0, 128); g.lineTo(45, 55); g.lineTo(75, 95); g.lineTo(100, 65); g.lineTo(128, 128); g.fill(); g.fillStyle = "#f7d774"; g.beginPath(); g.arc(95, 32, 14, 0, 7); g.fill(); },
    (g) => { g.fillStyle = "#f7d774"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#e9767a"; g.beginPath(); g.arc(64, 64, 34, 0, 7); g.fill(); },
    (g) => { g.fillStyle = "#c7a8e0"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#fff"; g.lineWidth = 8; g.beginPath(); g.moveTo(14, 110); g.quadraticCurveTo(64, 10, 114, 110); g.stroke(); },
    (g) => { g.fillStyle = "#f4efe4"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#fff"; g.strokeStyle = "#1b1b20"; g.lineWidth = 4; g.beginPath(); g.arc(64, 52, 24, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(34, 128); g.quadraticCurveTo(64, 70, 94, 128); g.fill(); g.stroke(); },
  ];
  const ctx = { S, T, ups, rnd, tex, lam, glow, add, box, cyl, ball, quad, front, group, sun, lamp, floorTex, booksTex, shelf, plant, pendant, haloTex, frame, arts };
  const out = { scene: S, update: (t) => ups.forEach((f) => f(t)), shadowDir: [0, 0.4] };
  (SETS[sc.name] ?? SETS.studio)(ctx, sc, out);
  return out;
}

const SETS = {
  // ------------------------------------------------------------------ library: window light, tall stacks, dust in the air
  library(c, sc, out) {
    const { S, T, ups, tex, lam, glow, box, cyl, ball, quad, front, group, sun, lamp, floorTex, shelf, plant, pendant, frame, arts, haloTex } = c;
    S.background = new T.Color("#e9d9bd");
    S.add(new T.HemisphereLight("#fff3d6", "#8a6a4a", 1.5));
    sun("#ffe9b8", 1.9, [-3, 15, -9], [1, 0, 4]); out.shadowDir = [0.15, 0.9]; // the window is the key light: shadows fall toward us
    quad(60, 26, lam(0xffffff, { map: floorTex("#b98a63", "#a5764f", [10, 5]) }), 0, 0, 2, { rx: -Math.PI / 2, recv: true });
    box(60, 14, 0.4, "#efe1c8", 0, 0, -4.4);                              // back wall
    box(60, 0.5, 0.3, "#c9a77f", 0, 0, -4.1); box(60, 0.3, 0.25, "#c9a77f", 0, 9.6, -4.15);
    for (const sx of [-1, 1]) box(0.4, 14, 30, "#e6d5b6", sx * 16, 0, 6);
    // arched window + frame + the view
    const win = tex(256, 384, (g, w, h) => { g.clearRect(0, 0, w, h); g.beginPath(); g.moveTo(0, h); g.lineTo(0, 150); g.quadraticCurveTo(w / 2, -110, w, 150); g.lineTo(w, h); g.closePath(); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#dff3ff"); gr.addColorStop(1, "#bfe3f7"); g.fillStyle = gr; g.fill(); g.strokeStyle = "#8a5a3c"; g.lineWidth = 16; g.stroke(); g.lineWidth = 10; g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h); g.moveTo(0, 230); g.lineTo(w, 230); g.stroke(); g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.ellipse(80, 120, 40, 14, 0, 0, 7); g.fill(); });
    quad(4.6, 6.6, glow(0xffffff, { map: win, transparent: true }), 0, 5.6, -4.15);
    box(5.2, 0.3, 0.7, "#c99b72", 0, 2.1, -4.0);
    // light shaft + dust
    const shaft = quad(5.2, 13, glow("#fff1c4", { map: tex(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,.75)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); }), transparent: true, opacity: 0.3, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }), 0.6, 4.2, 0.6, { rx: -0.95 });
    quad(7, 5, glow("#fff1c4", { map: haloTex, transparent: true, opacity: 0.35, depthWrite: false, blending: T.AdditiveBlending }), 1, 0.03, 4.5, { rx: -Math.PI / 2 });
    const N = 160, pos = new Float32Array(N * 3), seed = [...Array(N)].map((_, i) => [Math.sin(i * 12.9898) * 43758.5 % 1, Math.sin(i * 78.233) * 12543.1 % 1, Math.sin(i * 39.425) * 9631.7 % 1].map((v) => Math.abs(v)));
    const dust = new T.Points(new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(pos, 3)), new T.PointsMaterial({ color: "#fff6d8", size: 0.09, transparent: true, opacity: 0.8, depthWrite: false }));
    S.add(dust);
    ups.push((t) => { for (let i = 0; i < N; i++) { const s = seed[i]; pos[i * 3] = -3 + s[0] * 8 + Math.sin(t * 0.3 + i) * 0.3; pos[i * 3 + 1] = ((s[1] * 9 - t * 0.12 * (0.5 + s[2])) % 9 + 9) % 9 + 0.3; pos[i * 3 + 2] = -3.5 + s[2] * 8; } dust.geometry.attributes.position.needsUpdate = true; shaft.material.opacity = 0.26 + Math.sin(t * 0.8) * 0.05; });
    // stacks: against the back wall and running toward the camera on both sides
    shelf(-6.6, -3.6, 5.8, 9.4, 1); shelf(6.6, -3.6, 5.8, 9.4, 4);
    shelf(-12.5, -1.2, 5.2, 9.4, 7, Math.PI / 2); shelf(12.5, -1.2, 5.2, 9.4, 9, -Math.PI / 2);
    shelf(-12.5, 5.2, 6.4, 9.4, 3, Math.PI / 2); shelf(12.5, 5.2, 6.4, 9.4, 5, -Math.PI / 2);
    // rolling ladder on the right stack
    const lad = group(5.2, 0, -2.5); lad.rotation.z = 0.07; lad.rotation.x = -0.1;
    for (const x of [-0.45, 0.45]) box(0.1, 8.6, 0.1, "#6b4a30", x, 0, 0, { parent: lad }); for (let i = 1; i < 9; i++) box(0.9, 0.08, 0.1, "#6b4a30", 0, i * 0.95, 0, { parent: lad });
    // sign, portraits, globe, book cart
    quad(2.8, 0.85, lam(0xffffff, { map: tex(512, 160, (g) => { g.fillStyle = "#2f3a35"; g.fillRect(0, 0, 512, 160); g.strokeStyle = "#c99b72"; g.lineWidth = 12; g.strokeRect(6, 6, 500, 148); g.fillStyle = "#f4f4ee"; g.font = "bold 62px sans-serif"; g.textAlign = "center"; g.fillText("QUIET PLEASE", 256, 102); }) }), 0, 1.35, -4.12, { recv: true });
    frame(-2.6, 2.6, -4.15, 1.2, 1.5, arts[3], "#c99b72"); frame(2.6, 2.6, -4.15, 1.2, 1.5, arts[0], "#c99b72");
    cyl(0.07, 0.07, 1.3, "#6b4a30", 2.9, 0, -2.6); cyl(0.5, 0.6, 0.12, "#6b4a30", 2.9, 0, -2.6); const globe = ball(0.62, "#7fb8e0", 2.9, 1.9, -2.6); ball(0.63, lam("#6fb36a", { wireframe: true }), 2.9, 1.9, -2.6, { cast: false }); ups.push((t) => { globe.rotation.y = t * 0.4; });
    const cart = group(-0.9, 0, -2.4); box(1.7, 0.12, 0.8, "#a5764f", 0, 0.35, 0, { parent: cart }); box(1.7, 0.12, 0.8, "#a5764f", 0, 1.15, 0, { parent: cart }); for (const x of [-0.8, 0.8]) box(0.08, 1.5, 0.8, "#6b4a30", x, 0.2, 0, { parent: cart });
    ["#e9a8a0", "#9cc3e6", "#f7d774", "#8fc49a", "#c7a8e0"].forEach((col, i) => box(0.2, 0.62 + (i % 3) * 0.1, 0.55, col, -0.6 + i * 0.26, 1.27, 0, { parent: cart }));
    for (const x of [-0.7, 0.7]) cyl(0.14, 0.14, 0.1, "#1b1b20", x, 0.07, 0.3, { parent: cart }).rotation.x = Math.PI / 2;
    // rug + lamps
    const rug = c.add(new T.Mesh(new T.CircleGeometry(1, 48), lam(0xffffff, { map: tex(256, 256, (g) => { g.fillStyle = "#8a3f4a"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#e8c48a"; g.lineWidth = 6; g.setLineDash([14, 8]); g.beginPath(); g.arc(128, 128, 100, 0, 7); g.stroke(); g.setLineDash([]); g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 60, 0, 7); g.stroke(); }) })), { cast: false }); rug.rotation.x = -Math.PI / 2; rug.scale.set(6.5, 3.4, 1); rug.position.set(0, 0.015, 1.6);
    pendant(-3.4, 8.6, -1.2); pendant(3.4, 8.6, -1.2);
    // reading table with a banker's lamp, in FRONT of where Mia stands
    const tb = group(5.6, 0, 1.25); box(6, 0.28, 1.9, "#8a5a3c", 0, 0.95, 0, { parent: tb }); for (const [x, z] of [[-2.7, -0.7], [2.7, -0.7], [-2.7, 0.7], [2.7, 0.7]]) box(0.22, 0.95, 0.22, "#6b4a30", x, 0, z, { parent: tb });
    cyl(0.06, 0.06, 0.55, "#b08d3c", 1.6, 1.23, 0, { parent: tb }); box(1.1, 0.34, 0.5, lam("#3f8a4f", { emissive: "#1f5a2f", emissiveIntensity: 0.6 }), 1.6, 1.75, 0, { parent: tb });
    [["#e9767a", 0], ["#9cc3e6", 0.16], ["#f7d774", 0.32]].forEach(([col, y], i) => box(1.0 - i * 0.1, 0.16, 0.7, col, -1.7 + i * 0.05, 1.23 + y, 0.1, { parent: tb }).rotation.y = i * 0.15);
    front(tb); lamp("#ffe39a", 26, 7.2, 2.6, 1.6, 9);
    // something close to the lens for depth: a stack of books on a side table, and a fern
    const fgT = group(-7.4, 0, 5.6); cyl(1.3, 1.3, 0.16, "#8a5a3c", 0, 2.0, 0, { parent: fgT }); cyl(0.14, 0.2, 2.0, "#6b4a30", 0, 0, 0, { parent: fgT });
    [["#d9776c", 0], ["#7fa7d9", 0.22], ["#8fc49a", 0.44], ["#f0b27a", 0.66]].forEach(([col, y], i) => box(1.5 - i * 0.12, 0.2, 1.0, col, 0.1 * i - 0.2, 2.16 + y, 0, { parent: fgT }).rotation.y = i * 0.2 - 0.2);
    front(fgT); front(plant(9.3, 5.2, 1.5, "#8fb3a0"));
  },

  // ------------------------------------------------------------------ rooftop at sunset: city glittering below, sun behind
  rooftop(c, sc, out) {
    const { S, T, ups, rnd, tex, lam, glow, box, cyl, ball, quad, front, group, sun, lamp, plant, haloTex } = c;
    S.background = new T.Color("#ffb98c"); S.fog = new T.Fog("#f0a58c", 40, 190);
    quad(520, 240, glow(0xffffff, { map: tex(16, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#4f458f"); gr.addColorStop(0.45, "#b0649a"); gr.addColorStop(0.72, "#ff9a7b"); gr.addColorStop(1, "#ffd59a"); g.fillStyle = gr; g.fillRect(0, 0, 16, 256); }), fog: false }), 0, 60, -200);
    const sunDisc = quad(26, 26, glow("#fff0b0", { map: haloTex, transparent: true, fog: false, depthWrite: false }), 22, 14, -190); quad(90, 90, glow("#ffd9a0", { map: haloTex, transparent: true, opacity: 0.5, fog: false, depthWrite: false, blending: T.AdditiveBlending }), 22, 14, -189);
    ups.push((t) => { sunDisc.position.y = 14 - t * 0.02; });
    for (let i = 0; i < 6; i++) { const cl = quad(40 + rnd() * 30, 5 + rnd() * 3, glow(i % 2 ? "#ffc4a8" : "#e79aa8", { map: haloTex, transparent: true, opacity: 0.8, fog: false, depthWrite: false }), -110 + i * 44, 34 + rnd() * 30, -180 + i); const x0 = cl.position.x; ups.push((t) => { cl.position.x = x0 + t * 0.35; }); }
    S.add(new T.HemisphereLight("#ffb89a", "#4a3f78", 1.5));
    sun("#ffb070", 2.2, [14, 9, -16], [0, 0, 2]); out.shadowDir = [-0.5, 0.9]; // low sun behind: long shadows toward the camera
    // skyline: windows come on as the sun goes down
    const winTex = [0, 1, 2].map((k) => tex(64, 128, (g) => { g.fillStyle = ["#3e2f5c", "#46366a", "#372a52"][k]; g.fillRect(0, 0, 64, 128); for (let y = 6; y < 124; y += 12) for (let x = 6; x < 58; x += 12) { g.fillStyle = (x * 7 + y * 13 + k * 5) % 9 < 4 ? "#ffd77a" : "#2a2145"; g.fillRect(x, y, 6, 7); } }));
    for (let i = 0; i < 90; i++) { const w = 4 + rnd() * 6, h = 14 + rnd() * 34, x = -120 + rnd() * 240, z = -16 - rnd() * 120, m = lam(0xffffff, { map: winTex[i % 3], emissive: "#ffcc66", emissiveMap: winTex[i % 3], emissiveIntensity: 0.55 }); const b = box(w, h, w, m, x, -34, z, { cast: false, recv: false }); b.material.map.repeat?.set(1, 1); }
    // the roof
    quad(64, 30, lam(0xffffff, { map: tex(256, 256, (g) => { g.fillStyle = "#9a8fa5"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "rgba(60,45,80,.35)"; g.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } g.fillStyle = "rgba(0,0,0,.06)"; for (let i = 0; i < 40; i++) g.fillRect((i * 67) % 256, (i * 131) % 256, 10, 4); }, [12, 6]) }), 0, 0, 6, { rx: -Math.PI / 2, recv: true });
    box(64, 1.1, 0.7, "#7d7290", 0, 0, -8.4); box(64, 0.16, 1.0, "#655b78", 0, 1.1, -8.4);
    for (let x = -30; x <= 30; x += 2) cyl(0.06, 0.06, 0.9, "#3a3350", x, 1.2, -8.4, { seg: 6 }); box(64, 0.1, 0.1, "#3a3350", 0, 2.1, -8.4);
    // water tower
    const wt = group(-6.3, 0, -5.2); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = cyl(0.09, 0.12, 3.2, "#4a3f55", x, 0, z, { parent: wt, seg: 8 }); } box(2.6, 0.12, 2.6, "#4a3f55", 0, 1.6, 0, { parent: wt });
    cyl(1.5, 1.5, 2.6, lam(0xffffff, { map: tex(128, 64, (g) => { g.fillStyle = "#9b6b48"; g.fillRect(0, 0, 128, 64); g.fillStyle = "rgba(0,0,0,.25)"; for (let x = 0; x < 128; x += 12) g.fillRect(x, 0, 2, 64); g.fillStyle = "#4a3f55"; g.fillRect(0, 14, 128, 4); g.fillRect(0, 44, 128, 4); }) }), 0, 3.2, 0, { parent: wt }); cyl(0.05, 1.7, 1.2, "#6b4a55", 0, 5.8, 0, { parent: wt });
    // AC unit with a spinning fan
    const ac = group(-2.4, 0, -4.6); box(2.2, 1.3, 1.3, "#b9bcc6", 0, 0, 0, { parent: ac }); const fan = group(-0.4, 0.65, 0.68); ac.add(fan); cyl(0.5, 0.5, 0.04, "#6f7482", 0, 0, 0, { parent: fan }).rotation.x = Math.PI / 2; for (let i = 0; i < 4; i++) { const bl = box(0.9, 0.12, 0.03, "#2b2f3a", 0, -0.06, 0.04, { parent: fan, cast: false }); bl.rotation.z = (i * Math.PI) / 4; } for (let i = 0; i < 4; i++) box(0.5, 0.05, 0.03, "#6f7482", 0.65, 0.3 + i * 0.22, 0.67, { parent: ac, cast: false });
    ups.push((t) => { fan.rotation.z = t * 9; });
    // stair hut with a glowing door lamp
    const hut = group(7.7, 0, -4.4); box(3.0, 3.1, 2.6, "#7d7290", 0, 0, 0, { parent: hut }); box(3.4, 0.2, 3.0, "#655b78", 0, 3.1, 0, { parent: hut }); box(1.2, 2.2, 0.08, "#4d4460", 0, 0, 1.32, { parent: hut }); ball(0.07, glow("#ffd77a"), 0.4, 1.1, 1.38, { parent: hut, cast: false });
    box(0.5, 0.26, 0.2, glow("#ffe9a8"), 0, 2.5, 1.36, { parent: hut, cast: false }); lamp("#ffd98a", 30, 7.7, 2.5, -2.4, 9); quad(3, 3, glow("#ffd98a", { map: haloTex, transparent: true, opacity: 0.6, depthWrite: false, blending: T.AdditiveBlending }), 7.7, 2.5, -2.9);
    // vent pipe, antenna, string lights, planters
    cyl(0.22, 0.22, 1.2, "#b9bcc6", 1.4, 0, -5.4); const el = cyl(0.22, 0.22, 0.7, "#b9bcc6", 1.75, 1.0, -5.4); el.rotation.z = Math.PI / 2;
    cyl(0.05, 0.05, 6, "#3a3350", 4.6, 0, -6.6, { seg: 6 }); const blink = ball(0.14, glow("#ff3b30"), 4.6, 6.1, -6.6, { cast: false }); ups.push((t) => { blink.material.color.set(Math.floor(t * 1.5) % 2 ? "#ff3b30" : "#5a1a1a"); });
    cyl(0.06, 0.06, 4.2, "#3a3350", -10.5, 0, -4.2, { seg: 6 });
    const bulbs = []; for (let i = 0; i <= 26; i++) { const u = i / 26, x = -10.5 + u * 17.2, y = 4.1 - Math.sin(u * Math.PI) * 1.0 - u * 0.8, z = -4.2 + u * 0.4; if (i < 26) { const s = box(0.68, 0.025, 0.025, "#1b1b20", x + 0.33, y, z, { cast: false }); s.rotation.z = (Math.sin((u + 0.02) * Math.PI) - Math.sin(u * Math.PI)) * -1.5; } bulbs.push(ball(0.11, glow("#ffe9a8"), x, y - 0.12, z, { cast: false })); }
    ups.push((t) => bulbs.forEach((b, i) => b.material.color.setScalar(0.75 + 0.25 * Math.sin(t * 3 + i * 1.7))));
    lamp("#ffd0a0", 22, -2, 3.4, -3.6, 14);
    plant(-9.2, -5.6, 0.9, "#5b8fd9"); plant(3.6, -5.8, 0.8, "#c06a5a");
    // near the lens: the corner of a skylight and a planter
    const sk = group(-8.6, 0, 6.2); box(4.2, 0.9, 3, "#7d7290", 0, 0, 0, { parent: sk }); const gl = box(3.8, 0.1, 2.6, lam("#9cd0ff", { emissive: "#ffb070", emissiveIntensity: 0.35 }), 0, 0.9, 0, { parent: sk }); front(sk);
    front(plant(8.9, 5.4, 1.5, "#8a6abf"));
  },

  // ------------------------------------------------------------------ the cozy "explainer" room (tinted by sc.tone)
  studio(c, sc, out) {
    const { S, T, ups, tex, lam, glow, box, cyl, ball, quad, front, group, sun, lamp, floorTex, shelf, plant, pendant, frame, arts } = c;
    const tone = sc.tone ?? "#fbefc4", col = new T.Color(tone), dark = col.clone().multiplyScalar(0.9), darker = col.clone().multiplyScalar(0.78);
    S.background = col.clone();
    S.add(new T.HemisphereLight("#ffffff", "#b59a7a", 1.7));
    sun("#fff1d0", 1.5, [9, 14, 10], [0, 0, -2]); out.shadowDir = [-0.25, -0.35];
    quad(60, 26, lam(0xffffff, { map: floorTex("#d6b993", "#c2a07a", [10, 5]) }), 0, 0, 2, { rx: -Math.PI / 2, recv: true });
    // wallpapered back wall + panelling
    quad(60, 14, lam(0xffffff, { map: tex(128, 128, (g) => { g.fillStyle = "#" + col.getHexString(); g.fillRect(0, 0, 128, 128); g.fillStyle = "#" + dark.getHexString(); g.fillRect(0, 0, 64, 128); g.fillStyle = "#" + darker.getHexString(); for (const [x, y] of [[96, 30], [32, 94]]) { g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 6, y); g.lineTo(x, y + 10); g.lineTo(x - 6, y); g.fill(); } }, [30, 7]) }), 0, 7, -4.3, { recv: true });
    box(60, 2.5, 0.25, "#" + dark.getHexString(), 0, 0, -4.2); box(60, 0.16, 0.36, "#fff8ec", 0, 2.5, -4.2); box(60, 0.3, 0.3, "#fff8ec", 0, 0, -4.05);
    for (let x = -14; x <= 14; x += 2) box(1.6, 1.7, 0.06, "#" + darker.getHexString(), x, 0.45, -4.06, { cast: false });
    for (const sx of [-1, 1]) box(0.4, 14, 30, "#" + dark.getHexString(), sx * 16, 0, 6);
    // bookcase, gallery wall, shelf, corkboard
    shelf(-8, -3.6, 2.9, 6.2, 2);
    frame(-5.6, 5.9, -4.15, 1.7, 1.3, arts[0]); frame(-3.6, 5.9, -4.15, 1.2, 1.6, arts[1]); frame(-5.6, 4.3, -4.15, 1.2, 1.0, arts[3]); frame(-3.9, 4.3, -4.15, 1.75, 1.0, arts[2]);
    box(3.4, 0.14, 0.7, "#c99b72", 0.3, 5.6, -3.9); plant(-0.9, -3.9, 0.32, "#d98c5f").position.y = 5.74;
    ["#c7a8e0", "#f0b27a", "#d9776c", "#7fa7d9", "#e9a8a0", "#9cc3e6"].forEach((k, i) => box(0.2, 0.55 + (i % 3) * 0.1, 0.5, k, -0.2 + i * 0.24, 5.74, -3.9));
    quad(2.7, 1.9, lam(0xffffff, { map: tex(256, 180, (g) => { g.fillStyle = "#c9965f"; g.fillRect(0, 0, 256, 180); g.fillStyle = "#d9aa72"; g.fillRect(10, 10, 236, 160); [["#f7d774", 26, 24], ["#f29ac0", 70, 60], ["#fff", 118, 84], ["#8fc49a", 168, 96], ["#9cc3e6", 150, 30]].forEach(([k, x, y]) => { g.fillStyle = k; g.fillRect(x, y, 62, 54); g.fillStyle = "#e5584f"; g.beginPath(); g.arc(x + 31, y + 6, 6, 0, 7); g.fill(); }); }) }), 3.3, 4.1, -4.1, { recv: true });
    // window with a view
    quad(3.2, 2.6, glow(0xffffff, { map: tex(128, 104, (g) => { g.fillStyle = "#cfe8f7"; g.fillRect(0, 0, 128, 104); g.fillStyle = "#a9d79c"; g.beginPath(); g.moveTo(0, 104); g.lineTo(24, 72); g.lineTo(48, 88); g.lineTo(80, 60); g.lineTo(128, 104); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.ellipse(36, 24, 18, 6, 0, 0, 7); g.fill(); g.strokeStyle = "#1b1b20"; g.lineWidth = 4; g.strokeRect(2, 2, 124, 100); g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 104); g.moveTo(0, 52); g.lineTo(128, 52); g.stroke(); }) }), 6.8, 5.9, -4.12);
    for (const x of [5.0, 8.6]) box(0.5, 3.2, 0.2, "#" + darker.getHexString(), x, 4.3, -4.0); box(4.6, 0.1, 0.12, "#1b1b20", 6.8, 7.5, -3.95);
    // desk corner
    box(4, 0.26, 1.5, "#c99b72", 6.8, 1.64, -3.2); for (const x of [5.0, 8.6]) box(0.14, 1.64, 0.14, "#1b1b20", x, 0, -2.7); box(1.5, 1.1, 1.3, "#b98a63", 7.9, 0.54, -3.2);
    box(1.05, 0.74, 0.06, "#4a4f5c", 5.9, 1.95, -3.4).rotation.x = -0.15; box(0.86, 0.56, 0.02, glow("#9cd0ff"), 5.9, 2.05, -3.36, { cast: false }).rotation.x = -0.15; box(1.3, 0.06, 0.8, "#6b7080", 5.9, 1.9, -3.0);
    cyl(0.16, 0.14, 0.3, "#ffffff", 7.0, 1.9, -3.1);
    pendant(-2.6, 9.2, -1.4, "#" + darker.getHexString(), "#ffd98a", 40); pendant(2.8, 9.4, -1.4, "#" + darker.getHexString(), "#ffd98a", 40);
    const rug = c.add(new T.Mesh(new T.CircleGeometry(1, 48), lam("#" + darker.getHexString())), { cast: false }); rug.rotation.x = -Math.PI / 2; rug.scale.set(5.6, 2.6, 1); rug.position.set(0, 0.015, 1.4);
    plant(9.3, -2.6, 1.0, "#e2b679");
    front(plant(-9.4, 5.0, 1.5, "#8fb3a0"));
  },
};
