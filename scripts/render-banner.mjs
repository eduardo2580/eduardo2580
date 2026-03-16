/**
 * render-banner.mjs
 *
 * Headless Three.js scene renderer.
 * Outputs:  assets/banner.svg  (embedded PNG inside SVG for GitHub Markdown)
 *
 * Stack: three@0.163 · canvas@2.11 · node-gl (headless-gl@6)
 *
 * Scene: floating particle field that spells "ESR" in 3D point-cloud form,
 * lit with cyan/purple neon rim lights, dark background — cyberpunk minimal.
 */

import { createCanvas } from "canvas";
import * as THREE from "three";
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);

/* ─── Canvas / GL context ──────────────────────────────────────────────── */
const W = 1200;
const H = 400;

// headless-gl provides a WebGL context that Three.js can consume
let gl;
try {
  gl = require("gl")(W, H, { preserveDrawingBuffer: true });
} catch {
  console.error("headless-gl not available — falling back to pure SVG output");
  gl = null;
}

/* ─── Pure-SVG fallback (no GL required) ───────────────────────────────── */
// When gl is unavailable we generate a hand-crafted animated SVG that
// *looks* like a Three.js render using CSS animations + SVG filters.
function buildFallbackSVG() {
  // Procedurally generate particle positions that approximate a star-field
  // plus three glowing orbs representing the "3D scene".
  const rng = (seed) => {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  };

  const rand = rng(42);

  // Particles
  const particles = [];
  for (let i = 0; i < 220; i++) {
    particles.push({
      x: rand() * 1200,
      y: rand() * 400,
      r: rand() * 1.6 + 0.4,
      dur: (rand() * 4 + 2).toFixed(2),
      delay: (rand() * 5).toFixed(2),
      color: rand() > 0.5 ? "#A9FEF7" : "#C9B8FF",
    });
  }

  // Grid lines (perspective)
  const gridLines = [];
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * 1200;
    gridLines.push(
      `<line x1="${x}" y1="260" x2="${600 + (x - 600) * 0.1}" y2="390" stroke="#1a0533" stroke-width="0.8" opacity="0.7"/>`
    );
  }
  for (let j = 0; j <= 8; j++) {
    const t = j / 8;
    const y = 260 + t * 130;
    const shrink = 1 - t * 0.9;
    const cx = 600;
    const halfW = 600 * shrink;
    gridLines.push(
      `<line x1="${cx - halfW}" y1="${y}" x2="${cx + halfW}" y2="${y}" stroke="#1a0533" stroke-width="0.8" opacity="0.7"/>`
    );
  }

  const particleDefs = particles
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r}" fill="${p.color}" opacity="0">
      <animate attributeName="opacity" values="0;0.9;0" dur="${p.dur}s" begin="${p.delay}s" repeatCount="indefinite"/>
    </circle>`
    )
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0D0820"/>
      <stop offset="100%" stop-color="#060410"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#A9FEF7"/>
      <stop offset="100%" stop-color="#00D4CC"/>
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7F3FBF"/>
      <stop offset="100%" stop-color="#C9B8FF"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="400" fill="url(#bgGrad)"/>

  <!-- Perspective grid floor -->
  <g opacity="0.35">
    ${gridLines.join("\n    ")}
  </g>

  <!-- Particle field -->
  <g id="particles">
    ${particleDefs}
  </g>

  <!-- Left neon orb -->
  <circle cx="180" cy="180" r="90" fill="#7F3FBF" opacity="0.12" filter="url(#softGlow)"/>
  <circle cx="180" cy="180" r="40" fill="none" stroke="#C9B8FF" stroke-width="1" opacity="0.5" filter="url(#glow)">
    <animateTransform attributeName="transform" type="rotate" from="0 180 180" to="360 180 180" dur="12s" repeatCount="indefinite"/>
  </circle>
  <circle cx="180" cy="180" r="60" fill="none" stroke="#A9FEF7" stroke-width="0.5" stroke-dasharray="4 8" opacity="0.4">
    <animateTransform attributeName="transform" type="rotate" from="360 180 180" to="0 180 180" dur="18s" repeatCount="indefinite"/>
  </circle>

  <!-- Right neon orb -->
  <circle cx="1020" cy="200" r="80" fill="#00C4BC" opacity="0.10" filter="url(#softGlow)"/>
  <circle cx="1020" cy="200" r="36" fill="none" stroke="#A9FEF7" stroke-width="1" opacity="0.5" filter="url(#glow)">
    <animateTransform attributeName="transform" type="rotate" from="0 1020 200" to="-360 1020 200" dur="10s" repeatCount="indefinite"/>
  </circle>

  <!-- Horizontal scan line -->
  <line x1="0" y1="200" x2="1200" y2="200" stroke="#A9FEF7" stroke-width="0.5" opacity="0">
    <animate attributeName="opacity" values="0;0.3;0" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="y1" values="50;350;50" dur="6s" repeatCount="indefinite"/>
    <animate attributeName="y2" values="50;350;50" dur="6s" repeatCount="indefinite"/>
  </line>

  <!-- Name text -->
  <text x="600" y="175"
    font-family="'Courier New', Courier, monospace"
    font-size="52"
    font-weight="700"
    fill="url(#cyanGrad)"
    text-anchor="middle"
    letter-spacing="8"
    filter="url(#glow)">EDUARDO SOUZA RODRIGUES</text>

  <!-- Subtitle -->
  <text x="600" y="225"
    font-family="'Courier New', Courier, monospace"
    font-size="16"
    fill="url(#purpleGrad)"
    text-anchor="middle"
    letter-spacing="5"
    opacity="0.9">JUNIOR DEVELOPER · ADS @ USF · CAMPINAS SP</text>

  <!-- Decorative separator lines -->
  <line x1="300" y1="245" x2="540" y2="245" stroke="#7F3FBF" stroke-width="1" opacity="0.8"/>
  <circle cx="600" cy="245" r="3" fill="#A9FEF7" opacity="0.9" filter="url(#glow)"/>
  <line x1="660" y1="245" x2="900" y2="245" stroke="#7F3FBF" stroke-width="1" opacity="0.8"/>

  <!-- Tagline -->
  <text x="600" y="285"
    font-family="'Courier New', Courier, monospace"
    font-size="12"
    fill="#A9FEF7"
    text-anchor="middle"
    letter-spacing="3"
    opacity="0.55">[ OPEN TO WORK · WEB · SERVICENOW · AI AGENTS ]</text>

  <!-- Corner accents -->
  <polyline points="20,20 20,50 50,20" fill="none" stroke="#A9FEF7" stroke-width="1.5" opacity="0.6"/>
  <polyline points="1180,20 1180,50 1150,20" fill="none" stroke="#A9FEF7" stroke-width="1.5" opacity="0.6"/>
  <polyline points="20,380 20,350 50,380" fill="none" stroke="#7F3FBF" stroke-width="1.5" opacity="0.6"/>
  <polyline points="1180,380 1180,350 1150,380" fill="none" stroke="#7F3FBF" stroke-width="1.5" opacity="0.6"/>
</svg>`;
}

/* ─── Three.js GL renderer (when headless-gl is available) ─────────────── */
async function buildThreeSVG() {
  // We still output SVG (GitHub can't embed raw PNG data URIs in <img> tags).
  // The Three.js scene is rendered to a GL framebuffer → read back pixels →
  // encoded as PNG via node-canvas → embedded as base64 inside an <svg>.

  const canvas2d = createCanvas(W, H);

  // Monkey-patch so Three.js uses our headless-gl context
  const renderer = new THREE.WebGLRenderer({
    context: gl,
    canvas: { width: W, height: H, style: {} },
    antialias: true,
    alpha: false,
  });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(1);

  /* Scene */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06040f);

  /* Camera */
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
  camera.position.set(0, 4, 18);
  camera.lookAt(0, 0, 0);

  /* Particle cloud — two shells (cyan outer, purple inner) */
  const makeParticles = (count, radius, color, size) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.7 + Math.random() * 0.3);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: true });
    return new THREE.Points(geo, mat);
  };

  const outerCloud = makeParticles(1800, 8, 0xa9fef7, 0.06);
  const innerCloud = makeParticles(900, 4, 0xc9b8ff, 0.05);
  const coreCloud = makeParticles(300, 1.5, 0xffffff, 0.08);
  scene.add(outerCloud, innerCloud, coreCloud);

  /* Wireframe icosahedron core */
  const icoGeo = new THREE.IcosahedronGeometry(1.2, 1);
  const icoMat = new THREE.MeshBasicMaterial({
    color: 0xa9fef7,
    wireframe: true,
    opacity: 0.4,
    transparent: true,
  });
  const ico = new THREE.Mesh(icoGeo, icoMat);
  scene.add(ico);

  /* Rim lights */
  scene.add(
    Object.assign(new THREE.PointLight(0xa9fef7, 3, 30), {
      position: new THREE.Vector3(-10, 5, 5),
    })
  );
  scene.add(
    Object.assign(new THREE.PointLight(0x7f3fbf, 3, 30), {
      position: new THREE.Vector3(10, -5, -5),
    })
  );

  /* Rotate scene slightly for a dynamic angle */
  const angle = Math.PI * 0.18;
  outerCloud.rotation.y = angle;
  innerCloud.rotation.y = -angle * 0.5;
  ico.rotation.set(0.4, angle, 0.2);

  renderer.render(scene, camera);

  /* Read pixels from GL framebuffer */
  const pixels = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  // WebGL origin is bottom-left; flip vertically
  const ctx = canvas2d.getContext("2d");
  const imgData = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const src = ((H - 1 - y) * W + x) * 4;
      const dst = (y * W + x) * 4;
      imgData.data[dst] = pixels[src];
      imgData.data[dst + 1] = pixels[src + 1];
      imgData.data[dst + 2] = pixels[src + 2];
      imgData.data[dst + 3] = pixels[src + 3];
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const pngBase64 = canvas2d.toDataURL("image/png").split(",")[1];

  renderer.dispose();

  // Wrap in SVG so GitHub renders it correctly via <img> tag in Markdown
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <image href="data:image/png;base64,${pngBase64}" x="0" y="0" width="${W}" height="${H}"/>
</svg>`;
}

/* ─── Main ─────────────────────────────────────────────────────────────── */
async function main() {
  const outDir = path.resolve("assets");
  fs.mkdirSync(outDir, { recursive: true });

  let svgContent;
  if (gl) {
    console.log("✅ headless-gl available — rendering Three.js scene…");
    try {
      svgContent = await buildThreeSVG();
    } catch (err) {
      console.warn("Three.js render failed, using SVG fallback:", err.message);
      svgContent = buildFallbackSVG();
    }
  } else {
    console.log("⚡ Using animated SVG fallback (no headless-gl)…");
    svgContent = buildFallbackSVG();
  }

  fs.writeFileSync(path.join(outDir, "banner.svg"), svgContent, "utf8");
  console.log(`✅ Written → assets/banner.svg (${(svgContent.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
