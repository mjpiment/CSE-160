import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildMoonFloor }   from './floor.js';
import { buildRockFormations } from './rocks.js';
import { buildStructures, getRocket } from './structures.js';
import { createAliens, updateAliens } from './boids.js';
import { createUFOs, updateUFOs }     from './ufos.js';
import { buildStarDust, updateStarDust } from './dust.js';
import { addKeyControls } from './keycontrols.js';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ─── Scene & Camera ──────────────────────────────────────────────────────────
const scene = new THREE.Scene();
// Very faint dust haze near ground only (space has no air, but artistic licence)
scene.fog = new THREE.Fog(0x050510, 80, 200);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 600);
camera.position.set(0, 12, 40);

// ─── Controls ────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 3, 0);
controls.minDistance   = 2;
controls.maxDistance   = 150;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.85;

const keys = addKeyControls();

// ─── Skybox – star field (canvas-painted on 6 cube faces) ────────────────────
(function buildSkybox() {
  const SIZE = 512;

  function makeStarFace(hasSun) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    // deep space black
    ctx.fillStyle = '#000005';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // stars
    for (let i = 0; i < 600; i++) {
      const x  = Math.random() * SIZE;
      const y  = Math.random() * SIZE;
      const r  = Math.random() * 1.4;
      const b  = Math.floor(180 + Math.random() * 75);
      ctx.fillStyle = `rgb(${b},${b},${Math.min(255, b + 20)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // occasional brighter star with cross flare
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * SIZE;
      const y = Math.random() * SIZE;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y);
      ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8);
      ctx.stroke();
    }

    if (hasSun) {
      // harsh white sun disc
      const sx = SIZE * 0.75, sy = SIZE * 0.3;
      const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 28);
      grd.addColorStop(0, 'rgba(255,255,230,1)');
      grd.addColorStop(0.15, 'rgba(255,255,200,0.9)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sx, sy, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  // +X face has the sun
  const textures = [
    makeStarFace(true),  // +X
    makeStarFace(false), // -X
    makeStarFace(false), // +Y
    makeStarFace(false), // -Y
    makeStarFace(false), // +Z
    makeStarFace(false), // -Z
  ];

  const mats = textures.map(t => new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide }));
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(500, 500, 500), mats));
})();

// ─── Earth in the sky ─────────────────────────────────────────────────────────
(function buildEarth() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // ocean base
  ctx.fillStyle = '#1a6fa8';
  ctx.fillRect(0, 0, 1024, 512);

  // continents (rough blobs)
  const continents = [
    // North America
    { x: 200, y: 160, rx: 80,  ry: 70,  color: '#4a8a3a' },
    // South America
    { x: 260, y: 320, rx: 50,  ry: 80,  color: '#5a9a40' },
    // Europe
    { x: 500, y: 140, rx: 45,  ry: 40,  color: '#6aaa45' },
    // Africa
    { x: 520, y: 270, rx: 60,  ry: 90,  color: '#7ab040' },
    // Asia
    { x: 680, y: 140, rx: 120, ry: 80,  color: '#5a9a3a' },
    // Australia
    { x: 760, y: 330, rx: 55,  ry: 40,  color: '#c8a040' },
    // Antarctica
    { x: 512, y: 480, rx: 200, ry: 40,  color: '#e8eeff' },
    // Greenland
    { x: 310, y: 80,  rx: 35,  ry: 28,  color: '#d8eeff' },
  ];

  continents.forEach(({ x, y, rx, ry, color }) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // cloud wisps
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 40; i++) {
    const cx = Math.random() * 1024;
    const cy = Math.random() * 512;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 + Math.random() * 80);
    grd.addColorStop(0, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(cx - 80, cy - 80, 160, 160);
  }

  // ice caps
  const northPole = ctx.createLinearGradient(0, 0, 0, 80);
  northPole.addColorStop(0, 'rgba(230,240,255,0.9)');
  northPole.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = northPole;
  ctx.fillRect(0, 0, 1024, 80);

  const earthTex = new THREE.CanvasTexture(canvas);
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(18, 48, 32),
    new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.6, metalness: 0 })
  );
  earth.position.set(-90, 80, -200);
  scene.add(earth);

  // Store for slow rotation in animate
  scene.userData.earth = earth;
})();

// ─── Lights ──────────────────────────────────────────────────────────────────
// 1. Ambient – cold, dim (space has no scattered light)
const ambient = new THREE.AmbientLight(0x223355, 0.6);
scene.add(ambient);

// 2. Directional – harsh unfiltered sunlight from one side
const sun = new THREE.DirectionalLight(0xfff5e0, 4.0);
sun.position.set(60, 80, 30);
sun.castShadow = true;
sun.shadow.camera.near = 1;
sun.shadow.camera.far  = 250;
sun.shadow.camera.left = sun.shadow.camera.bottom = -60;
sun.shadow.camera.right = sun.shadow.camera.top   =  60;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
scene.add(sun);

// 3. Hemisphere – faint Earth-shine from above (blue) / regolith bounce (grey)
const hemi = new THREE.HemisphereLight(0x334488, 0x554433, 0.4);
scene.add(hemi);

// 4. PointLight – rocket engine glow (animated in loop)
const engineGlow = new THREE.PointLight(0xff6600, 8, 20);
engineGlow.position.set(0, 1, 0); // at rocket base, adjusted after structures built
scene.add(engineGlow);
scene.userData.engineGlow = engineGlow;

// 5. SpotLight – landing pad search beam
const landingSpot = new THREE.SpotLight(0x88aaff, 6, 50, Math.PI / 10, 0.4, 1.5);
landingSpot.position.set(-14, 20, -14);
landingSpot.target.position.set(-14, 0, -14);
landingSpot.castShadow = true;
scene.add(landingSpot);
scene.add(landingSpot.target);

// ─── Build scene ─────────────────────────────────────────────────────────────
buildMoonFloor(scene);
buildRockFormations(scene);
buildStructures(scene);

const aliens = createAliens(scene, 20);
const ufos   = createUFOs(scene, 4);
const starDust = buildStarDust(scene);

// ─── Position engine glow at rocket base ─────────────────────────────────────
const rocket = getRocket();
if (rocket) {
  engineGlow.position.copy(rocket.position);
  engineGlow.position.y = 0.5;
}

// ─── Animate ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t  = clock.elapsedTime;

  applyKeyMovement(dt);
  controls.update();

  // Earth slow rotation
  if (scene.userData.earth) scene.userData.earth.rotation.y = t * 0.02;

  // Engine glow pulse
  const glow = scene.userData.engineGlow;
  if (glow) glow.intensity = 6 + Math.sin(t * 6) * 2.5;

  updateAliens(aliens, t);
  updateUFOs(ufos, t);
  updateStarDust(starDust, t);

  renderer.render(scene, camera);
}

// ─── WASD ────────────────────────────────────────────────────────────────────
const MOVE_SPEED = 12;
function applyKeyMovement(dt) {
  const dir = new THREE.Vector3();
  if (keys.w)     dir.z -= 1;
  if (keys.s)     dir.z += 1;
  if (keys.a)     dir.x -= 1;
  if (keys.d)     dir.x += 1;
  if (keys.space) dir.y += 1;
  if (keys.shift) dir.y -= 1;
  if (dir.lengthSq() === 0) return;
  dir.normalize().multiplyScalar(MOVE_SPEED * dt);
  dir.applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'));
  camera.position.add(dir);
  controls.target.add(dir);
}

animate();
