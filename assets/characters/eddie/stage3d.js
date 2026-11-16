// Browser side of the 3D mode. Each frame: build/update the 3D set for the beat's scene, rasterise the
// cartoon layer (characters, bubbles) into a texture on a plane standing at Z=0 INSIDE the set, place a
// real perspective camera that frames the same shot the 2D camera asked for (plus a little yaw/pitch),
// and render everything in one pass - so props nearer than the characters occlude them by true depth
// and the whole world parallaxes as the camera moves. Captions/HUD stay as a flat overlay on top.
import * as THREE from "/three.module.js";
import { buildSet } from "/sets3d.js";

const q = new URLSearchParams(location.search), OW = +q.get("w"), OH = +q.get("h");
const U = 100, GROUND = 870, W = 1920, H = 1080, FOV = 30, RES = 2; // 100 px of the 2D world = 1 unit
const stage = document.getElementById("stage"); stage.style.width = OW + "px"; stage.style.height = OH + "px";
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("bg"), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(OW, OH, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(FOV, OW / OH, 0.5, 600);
camera.layers.enable(1); // (sets mark near props with layer 1; everything renders together now)
const sets = new Map();

// the cartoon layer: SVG -> <img> -> canvas -> texture on the Z=0 plane
const cv = document.createElement("canvas"); cv.width = W * RES; cv.height = H * RES;
const g2 = cv.getContext("2d");
const toonTex = new THREE.CanvasTexture(cv); toonTex.colorSpace = THREE.SRGBColorSpace; toonTex.anisotropy = 8; toonTex.generateMipmaps = false; toonTex.minFilter = THREE.LinearFilter;
const toon = new THREE.Mesh(new THREE.PlaneGeometry(W / U, H / U), new THREE.MeshBasicMaterial({ map: toonTex, transparent: true, depthWrite: false, premultipliedAlpha: false }));
toon.position.set(0, (GROUND - H / 2) / U, 0); toon.renderOrder = 10;
// fonts must be embedded in the SVG itself (an SVG drawn as an image can't see the page's fonts)
const b64 = async (url) => { const b = new Uint8Array(await (await fetch(url)).arrayBuffer()); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const FONT_CSS = `<style>@font-face{font-family:Bubble;font-weight:800;src:url(data:font/woff2;base64,${await b64("/nunito-800.woff2")}) format("woff2");}
  @font-face{font-family:InkHand;src:url(data:font/ttf;base64,${await b64("/hand.ttf")}) format("truetype");}
  @font-face{font-family:MBlack;font-weight:900;src:url(data:font/woff2;base64,${await b64("/montserrat-900.woff2")}) format("woff2");} text{font-family:InkHand,sans-serif}</style>`;

// blob shadows under the cartoon characters (soft, stretched away from the key light)
const blobTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(0.55, "rgba(0,0,0,.22)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

const sEl = document.getElementById("s");
window.stage = {
  ready: false,
  async frame(f) {
    let set = sets.get(f.key);
    if (!set) {
      set = buildSet(f.scene, THREE);
      set.blobs = [...Array(8)].map(() => { const m = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); m.renderOrder = 5; set.scene.add(m); return m; });
      sets.set(f.key, set);
    }
    set.update(f.t);
    set.blobs.forEach((m, i) => { const ft = f.feet[i]; m.visible = !!ft; if (ft) { m.position.set((ft.x - W / 2) / U + (set.shadowDir?.[0] ?? 0) * 0.5, 0.02, 0.1 + (set.shadowDir?.[1] ?? 0.4) * 0.45); m.scale.set(2.6 * ft.r, 1, 1.5 * ft.r); } });

    // cartoon layer -> texture
    const url = URL.createObjectURL(new Blob([f.world.replace("<defs>", "<defs>" + FONT_CSS)], { type: "image/svg+xml" }));
    const img = new Image(); img.src = url; await img.decode();
    g2.clearRect(0, 0, cv.width, cv.height); g2.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
    toonTex.needsUpdate = true; if (toon.parent !== set.scene) set.scene.add(toon);

    // camera: same framing as the 2D shot on the Z=0 plane, seen from a slightly turned, slightly raised position
    const c = f.cam, P = new THREE.Vector3((c.fx - W / 2) / U - c.jx / (c.s * U), (GROUND - c.fy) / U + c.jy / (c.s * U), 0);
    const d = (OH / c.s / U) / (2 * Math.tan((FOV * Math.PI) / 360));
    const yaw = (c.yaw * Math.PI) / 180, pitch = (3.5 * Math.PI) / 180;
    camera.position.set(P.x + Math.sin(yaw) * Math.cos(pitch) * d, P.y + Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d);
    camera.lookAt(P); camera.updateMatrixWorld();
    renderer.render(set.scene, camera);
    sEl.innerHTML = f.hud;
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // let it paint before the screenshot
  },
};
await Promise.all([document.fonts.load("40px InkHand"), document.fonts.load("900 40px MBlack"), document.fonts.load("800 40px Bubble")]);
window.stage.ready = true;
