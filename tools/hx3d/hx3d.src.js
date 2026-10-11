/* HEXORA — 3D scenes (Three.js). Bundled into assets/js/hx3d.js:
     cd tools/hx3d && npm ci && npm run build   (three and esbuild versions are pinned in package.json)
   main.js loads the bundle only when a 3D spot is about to be seen and WebGL works; otherwise the picture fallback stays.
   HX3D.mount(el, { kind: "mark" })                → the Hexora mark (home page hero)
   HX3D.mount(el, { kind: "tile", icon: "<path…>" }) → a glass hex tile carrying a service's line icon (service pages)
   Each scene draws only while it is on screen, pauses when the tab is hidden, and draws one still frame for "reduce motion". */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Shape, Path, ExtrudeGeometry, Mesh, MeshPhysicalMaterial, MeshBasicMaterial,
  PlaneGeometry, ShapeGeometry, CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping, NoToneMapping, PMREMGenerator, DirectionalLight, AmbientLight, Color, BufferAttribute
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const RED_HI = new Color("#FF5A4A"), RED = new Color("#E5252A"), RED_DEEP = new Color("#A3121E");

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
// the brand gradient, sampled from the logo file: light red (top left) -> red -> deep red (bottom right)
const STOPS = [[0, "#FF5A4A"], [.5, "#EC3A33"], [1, "#D01C22"]].map(([t, c]) => [t, new Color(c)]);
function gradAt(t, c) { t = Math.min(1, Math.max(0, t)); let k = 1; while (k < STOPS.length - 1 && t > STOPS[k][0]) k++; const [t0, c0] = STOPS[k - 1], [t1, c1] = STOPS[k]; return c.copy(c0).lerp(c1, (t - t0) / (t1 - t0)); }
// colours each vertex of a geometry from a function of its position (x, y in -1..1)
function paintBy(geo, fn) {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new Color();
  for (let i = 0; i < pos.count; i++) { fn(pos.getX(i), pos.getY(i), c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute("color", new BufferAttribute(col, 3));
  return geo;
}
// rim of the service tile: the same gradient from top to bottom
function paint(geo) {
  geo.computeBoundingBox(); const { min, max } = geo.boundingBox;
  return paintBy(geo, (x, y, c) => gradAt(1 - (y - min.y) / (max.y - min.y || 1), c));
}
const bevel = (depth, size) => ({ depth, bevelEnabled: true, bevelThickness: size, bevelSize: size, bevelSegments: 5, curveSegments: 6 });
const glossy = extra => new MeshPhysicalMaterial(Object.assign({ vertexColors: true, metalness: .55, roughness: .22, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: 1.1 }, extra));

// the Hexora mark, rebuilt from the logo file: red front faces (left bar, right bar, crossbar), the white inner walls and the dark-red undersides.
// Corner points are measured on the 1200 px mark picture (centre 600,587; y grows downwards).
const LOGO = {
  left: [[265, 393], [480, 272], [480, 400], [368, 458], [368, 625], [480, 575], [480, 853], [368, 743], [265, 782]],
  right: [[717, 272], [934, 393], [827, 452], [827, 745], [717, 830]],
  bar: [[480, 572], [717, 458], [717, 590], [480, 700]],
  wallL: [[368, 458], [480, 400], [480, 575], [368, 625]], wallR: [[827, 452], [934, 393], [934, 782], [827, 745]],
  footL: [[265, 782], [368, 743], [480, 853], [480, 903]], footR: [[717, 830], [827, 745], [934, 782], [717, 903]]
};
function logoShape(pts) {
  const sh = new Shape();
  pts.forEach(([x, y], i) => { const X = (x - 600) / 320, Y = -(y - 587) / 320; i ? sh.lineTo(X, Y) : sh.moveTo(X, Y); });
  sh.closePath(); return sh;
}
function mark() {
  const g = new Group(), D = .3;
  const front = glossy({ metalness: 0, roughness: .5, clearcoat: .45, clearcoatRoughness: .2, envMapIntensity: .25 });
  // red faces, with a thin bevel: the gradient runs light (top left) to deep (bottom right) over the whole logo
  for (const k of ["left", "right", "bar"]) {
    const geo = new ExtrudeGeometry(logoShape(LOGO[k]), bevel(D, .016)); geo.translate(0, 0, -D / 2);
    g.add(new Mesh(paintBy(geo, (x, y, c) => gradAt((x * .55 - y * .6 + 1) / 2, c)), front));
  }
  // the inner walls and undersides sit just behind the front plane, so they show through the notches like in the logo
  const flat = (k, fn) => { const geo = new ShapeGeometry(logoShape(LOGO[k])); geo.translate(0, 0, -D / 2 + .02); return new Mesh(paintBy(geo, fn), new MeshBasicMaterial({ vertexColors: true })); };
  const wall = (x, y, c) => c.set("#ffffff").lerp(new Color("#bdbdbd"), Math.min(1, Math.max(0, (.45 - y) / 1.0)));
  g.add(flat("wallL", wall)); g.add(flat("wallR", wall));
  g.add(flat("footL", (x, y, c) => c.set("#6a0713").lerp(new Color("#4a050d"), (x + 1) / 2)));
  g.add(flat("footR", (x, y, c) => c.set("#7a0c16").lerp(new Color("#5a0810"), (x + 1) / 2)));
  return g;
}
// a dark glass hex tile with a gradient rim and a glowing line icon on its face
function tile(icon) {
  const g = new Group();
  const body = new ExtrudeGeometry(hexShape(1), bevel(.2, .05)); body.center();
  g.add(new Mesh(body, new MeshPhysicalMaterial({ color: new Color("#17171a"), metalness: .2, roughness: .26, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1, sheen: .3, sheenColor: new Color("#ff5a4a") })));
  const rim = paint(new ExtrudeGeometry(hexShape(1.14, 1.06), bevel(.24, .025))); rim.center();
  g.add(new Mesh(rim, glossy({ metalness: .6, roughness: .2 })));
  const cv = document.createElement("canvas"); cv.width = cv.height = 512;
  const tex = new CanvasTexture(cv); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 4;
  const img = new Image();
  img.onload = () => { const x = cv.getContext("2d"); x.clearRect(0, 0, 512, 512); x.shadowColor = "rgba(255,90,74,.85)"; x.shadowBlur = 30; x.drawImage(img, 56, 56, 400, 400); x.shadowBlur = 0; x.drawImage(img, 56, 56, 400, 400); tex.needsUpdate = true; };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="512" height="512" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + (icon || "") + "</svg>");
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
  renderer.toneMapping = opts.kind === "tile" ? ACESFilmicToneMapping : NoToneMapping;   // the logo keeps its exact brand colours renderer.toneMappingExposure = opts.kind === "tile" ? 1.05 : .95; renderer.outputColorSpace = SRGBColorSpace;
  const cv = renderer.domElement; cv.className = "hx3d-canvas"; cv.setAttribute("aria-hidden", "true");
  el.appendChild(cv);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
  scene.add(new AmbientLight(0xffffff, opts.kind === "tile" ? .35 : .75));
  const key = new DirectionalLight(0xffffff, opts.kind === "tile" ? 1.6 : .9); key.position.set(2.5, 3, 4); scene.add(key);
  const rimL = new DirectionalLight(0xff5a4a, 2.2); rimL.position.set(-3.5, 1.5, -2); scene.add(rimL);
  const rimR = new DirectionalLight(0xb3121e, 1.6); rimR.position.set(3.5, -2, -2.5); scene.add(rimR);

  const obj = opts.kind === "tile" ? tile(opts.icon) : mark();
  scene.add(obj);
  const cam = new PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, 0, opts.kind === "tile" ? 6 : 5.4);

  function size() { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  size();
  let px = 0, py = 0, tx = 0, ty = 0, sy = 0, on = false, raf = 0, t0 = performance.now(), last = 0, shown = false;
  const draw = t => {
    const s = (t - t0) / 1000;
    px += (tx - px) * .06; py += (ty - py) * .06;
    obj.rotation.y = (reduce ? .3 : .28 + Math.sin(s * .35) * .26) + px * .3 + sy * .9;   // sy: the logo turns a little as the page scrolls past it
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
  if (!reduce) addEventListener("scroll", () => { const r = el.getBoundingClientRect(); sy = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight)); }, { passive: true });
  if (fine && !reduce) addEventListener("pointermove", e => { tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(() => { size(); if (reduce) draw(performance.now()); }).observe(el);
  cv.addEventListener("webglcontextlost", e => { e.preventDefault(); stop(); el.classList.remove("hx3d-on"); cv.remove(); });
  return { stop };
}
