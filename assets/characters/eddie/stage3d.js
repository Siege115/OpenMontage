// Browser side of the 3D mode. Each frame: build/update the 3D set for the beat's scene, place a real
// perspective camera that frames the same shot the 2D camera asked for (plus a little yaw/pitch), render
// the set, and map the cartoon layer (characters, bubbles) onto the world's Z=0 plane with a homography,
// so the characters stand IN the set and everything parallaxes correctly as the camera moves.
import * as THREE from "/three.module.js";
import { buildSet } from "/sets3d.js";

const q = new URLSearchParams(location.search), OW = +q.get("w"), OH = +q.get("h");
const U = 100, GROUND = 870, W = 1920, H = 1080, FOV = 30; // 100 px of the 2D world = 1 unit
const stage = document.getElementById("stage"); stage.style.width = OW + "px"; stage.style.height = OH + "px";
const mk = (id, alpha) => {
  const r = new THREE.WebGLRenderer({ canvas: document.getElementById(id), antialias: true, alpha, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(OW, OH, false); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.outputColorSpace = THREE.SRGBColorSpace; if (alpha) r.setClearColor(0x000000, 0);
  return r;
};
const rBg = mk("bg", false), rFg = mk("fg", true);
const camera = new THREE.PerspectiveCamera(FOV, OW / OH, 0.5, 600);
const sets = new Map();

// blob shadows under the cartoon characters (soft, slightly stretched away from the key light)
const blobTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(0.55, "rgba(0,0,0,.22)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

// 4-point homography -> CSS matrix3d
const adj = (m) => [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]];
const mul = (a, b) => { const c = Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]; c[3 * i + j] = s; } return c; };
const mulv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const basis = (p) => { const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1], v = mulv(adj(m), [p[3][0], p[3][1], 1]); return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); };
const homography = (src, dst) => { const t = mul(basis(dst), adj(basis(src))).map((x, _, a) => x / a[8]); return `matrix3d(${t[0]},${t[3]},0,${t[6]},${t[1]},${t[4]},0,${t[7]},0,0,1,0,${t[2]},${t[5]},0,${t[8]})`; };

const wEl = document.getElementById("w"), sEl = document.getElementById("s");
window.stage = {
  ready: false,
  frame(f) {
    let set = sets.get(f.key);
    if (!set) {
      set = buildSet(f.scene, THREE);
      set.scene.traverse((o) => { if (o.isLight) o.layers.enableAll(); });
      set.blobs = [...Array(8)].map(() => { const m = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.renderOrder = 5; set.scene.add(m); return m; });
      sets.set(f.key, set);
    }
    set.update(f.t);
    set.blobs.forEach((m, i) => { const ft = f.feet[i]; m.visible = !!ft; if (ft) { m.position.set((ft.x - W / 2) / U + (set.shadowDir?.[0] ?? 0) * 0.5, 0.02, 0.1 + (set.shadowDir?.[1] ?? 0.4) * 0.45); m.scale.set(2.6 * ft.r, 1, 1.5 * ft.r); } });

    // camera: same framing as the 2D shot on the Z=0 plane, seen from a slightly turned, slightly raised position
    const c = f.cam, P = new THREE.Vector3((c.fx - W / 2) / U, (GROUND - c.fy) / U, 0);
    const d = (OH / c.s / U) / (2 * Math.tan((FOV * Math.PI) / 360));
    const yaw = (c.yaw * Math.PI) / 180, pitch = (3.5 * Math.PI) / 180;
    camera.position.set(P.x + Math.sin(yaw) * Math.cos(pitch) * d, P.y + Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d);
    camera.lookAt(P); camera.updateMatrixWorld(); camera.updateProjectionMatrix();

    camera.layers.set(0); rBg.render(set.scene, camera);
    const bgc = set.scene.background, fog = set.scene.fog; set.scene.background = null; // the front pass is transparent except for the near props
    camera.layers.set(1); rFg.render(set.scene, camera); set.scene.background = bgc;
    document.getElementById("bg").style.filter = c.blur > 1.5 ? `blur(${(c.blur * 0.9).toFixed(1)}px)` : "none";

    // cartoon layer -> Z=0 plane
    const pr = (x, y) => { const v = new THREE.Vector3((x - W / 2) / U, (GROUND - y) / U, 0).project(camera); return [((v.x + 1) / 2) * OW + c.jx, ((1 - v.y) / 2) * OH + c.jy]; };
    wEl.innerHTML = f.world; sEl.innerHTML = f.hud;
    wEl.style.width = W * 2 + "px"; wEl.style.height = H * 2 + "px";
    wEl.style.transform = homography([[0, 0], [W * 2, 0], [W * 2, H * 2], [0, H * 2]], [pr(0, 0), pr(W, 0), pr(W, H), pr(0, H)]);
  },
};
await Promise.all([document.fonts.load("40px InkHand"), document.fonts.load("900 40px MBlack"), document.fonts.load("800 40px Bubble")]);
window.stage.ready = true;
