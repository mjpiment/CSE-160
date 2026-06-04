import * as THREE from 'three';

// Moon dust particles kicked up near the surface.
const DUST_COUNT = 300;
const MAX_Y      = 3.0;

export function buildStarDust(scene) {
  const positions = new Float32Array(DUST_COUNT * 3);
  const speeds    = new Float32Array(DUST_COUNT);
  const phases    = new Float32Array(DUST_COUNT);

  for (let i = 0; i < DUST_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.random() * 25;
    positions[i * 3]     = Math.cos(angle) * dist;
    positions[i * 3 + 1] = Math.random() * MAX_Y;
    positions[i * 3 + 2] = Math.sin(angle) * dist;
    speeds[i] = 0.1 + Math.random() * 0.4;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xccccbb,
    size: 0.06,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  return { points, positions, speeds, phases };
}

export function updateStarDust({ points, positions, speeds, phases }, t) {
  const dt = 0.016;
  for (let i = 0; i < DUST_COUNT; i++) {
    positions[i * 3 + 1] += speeds[i] * dt;
    // gentle sideways drift
    positions[i * 3]     += Math.sin(t * 0.3 + phases[i]) * 0.004;
    positions[i * 3 + 2] += Math.cos(t * 0.25 + phases[i]) * 0.004;

    if (positions[i * 3 + 1] > MAX_Y) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * 25;
      positions[i * 3]     = Math.cos(angle) * dist;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * dist;
    }
  }
  points.geometry.attributes.position.needsUpdate = true;
}
