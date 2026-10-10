/* HEXORA — 3D scenes (Three.js). Bundled into assets/js/hx3d.js:
     cd tools/hx3d && npm ci && npm run build   (three and esbuild versions are pinned in package.json)
   main.js loads the bundle only when a 3D spot is about to be seen and WebGL works; otherwise the picture fallback stays.
   HX3D.mount(el, { kind: "mark" })                → the Hexora mark (home page hero)
   HX3D.mount(el, { kind: "tile", icon: "<path…>" }) → a glass hex tile carrying a service's line icon (service pages)
   Each scene draws only while it is on screen, pauses when the tab is hidden, and draws one still frame for "reduce motion". */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Shape, Path, ExtrudeGeometry, Mesh, MeshPhysicalMaterial, MeshBasicMaterial,
  PlaneGeometry, CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping, PMREMGenerator, DirectionalLight, AmbientLight, Color, BufferAttribute
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const CYAN = new Color("#16D9FF"), BLUE = new Color("#2563FF"), VIOLET = new Color("#7B3BFF");

function hexPoints(r) {   // pointy-top hexagon
  const pts = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 90); pts.push([r * Math.cos(a), r * Math.sin(a)]); }
  return pts;
}
function hexShape(r, hole) {
  const s = new Shape(); hexPoints(r).forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
  if (hole) { const h = new Path(); hexPoints(hole).reverse().forEach(([x, y], i) => (i ? h.lineTo(x, y) : h.moveTo(x, y))); h.closePath(); s.holes.push(h); }
  return s;
}
// vertical brand gradient baked into the geometry: cyan at the top → blue → violet at the bottom
function paint(geo) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox, pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const t = 1 - (pos.getY(i) - min.y) / (max.y - min.y || 1);
    if (t < .5) c.copy(CYAN).lerp(BLUE, t / .5); else c.copy(BLUE).lerp(VIOLET, (t - .5) / .5);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new BufferAttribute(col, 3));
  return geo;
}
const bevel = (depth, size) => ({ depth, bevelEnabled: true, bevelThickness: size, bevelSize: size, bevelSegments: 5, curveSegments: 6 });
const glossy = extra => new MeshPhysicalMaterial(Object.assign({ vertexColors: true, metalness: .55, roughness: .22, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.1 }, extra));

// the Hexora mark: a gradient hexagon ring and a satin-white H (same proportions as the site icon)
function mark() {
  const g = new Group();
  const ring = paint(new ExtrudeGeometry(hexShape(1, .8), bevel(.2, .04))); ring.center();
  g.add(new Mesh(ring, glossy()));
  const h = new Shape(), P = [[21, 18], [28, 18], [28, 29], [36, 29], [36, 18], [43, 18], [43, 46], [36, 46], [36, 35], [28, 35], [28, 46], [21, 46]];
  P.forEach(([x, y], i) => { const X = (x - 32) / 32 * .98, Y = -(y - 32) / 32 * .98; i ? h.lineTo(X, Y) : h.moveTo(X, Y); }); h.closePath();
  const hg = new ExtrudeGeometry(h, bevel(.16, .03)); hg.center();
  g.add(new Mesh(hg, new MeshPhysicalMaterial({ color: new Color("#eef3ff"), metalness: .25, roughness: .32, clearcoat: 1, clearcoatRoughness: .2, envMapIntensity: .9 })));
  return g;
}
// a dark glass hex tile with a gradient rim and a glowing line icon on its face
function tile(icon) {
  const g = new Group();
  const body = new ExtrudeGeometry(hexShape(1), bevel(.2, .05)); body.center();
  g.add(new Mesh(body, new MeshPhysicalMaterial({ color: new Color("#0b1442"), metalness: .2, roughness: .26, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1, sheen: .3, sheenColor: new Color("#3a5bff") })));
  const rim = paint(new ExtrudeGeometry(hexShape(1.14, 1.06), bevel(.24, .025))); rim.center();
  g.add(new Mesh(rim, glossy({ metalness: .6, roughness: .2 })));
  const cv = document.createElement("canvas"); cv.width = cv.height = 512;
  const tex = new CanvasTexture(cv); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 4;
  const img = new Image();
  img.onload = () => { const x = cv.getContext("2d"); x.clearRect(0, 0, 512, 512); x.shadowColor = "rgba(22,217,255,.85)"; x.shadowBlur = 30; x.drawImage(img, 56, 56, 400, 400); x.shadowBlur = 0; x.drawImage(img, 56, 56, 400, 400); tex.needsUpdate = true; };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="512" height="512" fill="none" stroke="#c8f6ff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + (icon || "") + "</svg>");
  const face = new Mesh(new PlaneGeometry(1.3, 1.3), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  face.position.z = .2; g.add(face);
  return g;
}

export function mount(el, opts) {
  opts = opts || {};
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  let renderer;
  try { renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); } catch (e) { return null; }
  const small = Math.min(innerWidth, innerHeight) < 700;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.5));
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = SRGBColorSpace;
  const cv = renderer.domElement; cv.className = "hx3d-canvas"; cv.setAttribute("aria-hidden", "true");
  el.appendChild(cv);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  scene.add(new AmbientLight(0x8fa6ff, .35));
  const key = new DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 3, 4); scene.add(key);
  const rimL = new DirectionalLight(0x16d9ff, 2.2); rimL.position.set(-3.5, 1.5, -2); scene.add(rimL);
  const rimR = new DirectionalLight(0x7b3bff, 1.6); rimR.position.set(3.5, -2, -2.5); scene.add(rimR);

  const obj = opts.kind === "tile" ? tile(opts.icon) : mark();
  scene.add(obj);
  const cam = new PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, 0, opts.kind === "tile" ? 6 : 5.4);

  function size() { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  size();
  let px = 0, py = 0, tx = 0, ty = 0, on = false, raf = 0, t0 = performance.now(), last = 0, shown = false;
  const draw = t => {
    const s = (t - t0) / 1000;
    px += (tx - px) * .06; py += (ty - py) * .06;
    obj.rotation.y = (reduce ? .3 : .28 + Math.sin(s * .35) * .26) + px * .3;
    obj.rotation.x = -.1 + (reduce ? 0 : Math.sin(s * .5) * .05) + py * .18;
    obj.position.y = reduce ? 0 : Math.sin(s * .8) * .045;
    const k = Math.min(1, s / .9), e = 1 - Math.pow(1 - k, 3);   // entrance: scale .94 → 1 with a strong ease-out
    obj.scale.setScalar(reduce ? 1 : .94 + .06 * e);
    renderer.render(scene, cam);
    if (!shown) { shown = true; el.classList.add("hx3d-on"); }
  };
  const loop = t => { if (!on) return; raf = requestAnimationFrame(loop); if (small && t - last < 32) return; last = t; draw(t); };
  const start = () => { if (on || reduce) return; on = true; raf = requestAnimationFrame(loop); };
  const stop = () => { on = false; cancelAnimationFrame(raf); };
  if (reduce) requestAnimationFrame(draw);
  const io = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting && !document.hidden ? start() : stop())), { rootMargin: "80px" });
  io.observe(el);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else if (el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < innerHeight) start(); });
  if (fine && !reduce) addEventListener("pointermove", e => { tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(() => { size(); if (reduce) draw(performance.now()); }).observe(el);
  cv.addEventListener("webglcontextlost", e => { e.preventDefault(); stop(); el.classList.remove("hx3d-on"); cv.remove(); });
  return { stop };
}
