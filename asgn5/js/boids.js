import * as THREE from 'three';

// Alien creatures that roam the moon surface using boid flocking.
const BOUND   = 22;
const SPEED   = 2.5;
const SEP_R   = 2.0;
const ALI_R   = 5.0;
const COH_R   = 7.0;
const W_SEP   = 2.2;
const W_ALI   = 0.9;
const W_COH   = 0.7;
const W_BOUND = 3.0;
const MAX_F   = 5.0;

// Alien colour palette
const ALIEN_COLORS = [0x44ff88, 0x88ff44, 0x00ffcc, 0xaaff22, 0x22ffaa];

export function createAliens(scene, count) {
  const aliens = [];

  for (let i = 0; i < count; i++) {
    const col = ALIEN_COLORS[i % ALIEN_COLORS.length];
    const bodyMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, emissive: col, emissiveIntensity: 0.15 });
    const eyeMat  = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 1.2, roughness: 0 });
    const legMat  = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 });

    const g = new THREE.Group();

    // body (squished sphere)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 7), bodyMat);
    body.scale.y = 0.7;
    body.position.y = 0.6;
    g.add(body);

    // big head (sphere, slightly larger)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), bodyMat);
    head.position.y = 1.2;
    g.add(head);

    // antenna
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 5), legMat);
    antenna.position.set(0.1, 1.75, 0);
    g.add(antenna);
    const antennaBall = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 6), eyeMat);
    antennaBall.position.set(0.1, 2.06, 0);
    g.add(antennaBall);

    // two big eyes
    [-0.18, 0.18].forEach((ex, idx) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 7), eyeMat);
      eye.position.set(ex, 1.28, 0.34);
      g.add(eye);
    });

    // 4 thin legs
    for (let l = 0; l < 4; l++) {
      const a = (l / 4) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 5), legMat);
      leg.position.set(Math.cos(a) * 0.28, 0.28, Math.sin(a) * 0.28);
      leg.rotation.z = Math.cos(a) * 0.3;
      leg.rotation.x = Math.sin(a) * 0.3;
      g.add(leg);
    }

    const angle = Math.random() * Math.PI * 2;
    const dist  = 5 + Math.random() * 16;
    g.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    g.scale.setScalar(0.7 + Math.random() * 0.5);
    g.castShadow = true;
    scene.add(g);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * SPEED,
      0,
      (Math.random() - 0.5) * SPEED
    ).normalize().multiplyScalar(SPEED);

    aliens.push({ mesh: g, vel, hopPhase: Math.random() * Math.PI * 2 });
  }

  return aliens;
}

const _sep = new THREE.Vector3();
const _ali = new THREE.Vector3();
const _coh = new THREE.Vector3();
const _bnd = new THREE.Vector3();
const _steer = new THREE.Vector3();
const _diff  = new THREE.Vector3();

// Oscillates between scatter (low cohesion) and flock (high cohesion) every ~20s.
// sin goes -1→1: remap so cohesion ranges from 0.05 (split) to 1.4 (tight group).
function flockCohesion(t) {
  return 0.725 + 0.675 * Math.sin((t / 20) * Math.PI * 2);
}

// During scatter phase boost separation so they actually spread out.
function flockSeparation(t) {
  const phase = Math.sin((t / 20) * Math.PI * 2); // -1 scatter, +1 flock
  return W_SEP + (phase < 0 ? -phase * 3.0 : 0);
}

export function updateAliens(aliens, t) {
  const dt = 0.016;
  const wCoh = flockCohesion(t);
  const wSep = flockSeparation(t);

  for (let i = 0; i < aliens.length; i++) {
    const ai = aliens[i];
    const pi = ai.mesh.position;

    _sep.set(0, 0, 0);
    _ali.set(0, 0, 0);
    _coh.set(0, 0, 0);
    let sepCount = 0, aliCount = 0, cohCount = 0;

    for (let j = 0; j < aliens.length; j++) {
      if (i === j) continue;
      const aj = aliens[j];
      const pj = aj.mesh.position;
      const dist = pi.distanceTo(pj);

      if (dist < SEP_R && dist > 0) {
        _diff.subVectors(pi, pj).divideScalar(dist);
        _diff.y = 0;
        _sep.add(_diff);
        sepCount++;
      }
      if (dist < ALI_R) { _ali.add(aj.vel); aliCount++; }
      if (dist < COH_R) { _coh.add(pj);     cohCount++; }
    }

    _steer.set(0, 0, 0);

    if (sepCount > 0) {
      _sep.divideScalar(sepCount).normalize().multiplyScalar(SPEED);
      _sep.sub(ai.vel).clampLength(0, MAX_F).multiplyScalar(wSep);
      _steer.add(_sep);
    }
    if (aliCount > 0) {
      _ali.divideScalar(aliCount).normalize().multiplyScalar(SPEED);
      _ali.sub(ai.vel).clampLength(0, MAX_F).multiplyScalar(W_ALI);
      _steer.add(_ali);
    }
    if (cohCount > 0) {
      _coh.divideScalar(cohCount).sub(pi).normalize().multiplyScalar(SPEED);
      _coh.sub(ai.vel).clampLength(0, MAX_F).multiplyScalar(wCoh);
      _steer.add(_coh);
    }

    // keep on surface (y = 0) and bounded
    _bnd.set(0, 0, 0);
    if (pi.x >  BOUND) _bnd.x -= (pi.x - BOUND)  * W_BOUND;
    if (pi.x < -BOUND) _bnd.x -= (pi.x + BOUND)  * W_BOUND;
    if (pi.z >  BOUND) _bnd.z -= (pi.z - BOUND)  * W_BOUND;
    if (pi.z < -BOUND) _bnd.z -= (pi.z + BOUND)  * W_BOUND;
    _steer.add(_bnd);

    ai.vel.add(_steer.multiplyScalar(dt));
    ai.vel.y = 0;
    ai.vel.clampLength(0, SPEED * 1.3);

    pi.addScaledVector(ai.vel, dt);
    pi.y = 0; // stay on ground

    // face movement direction
    if (ai.vel.lengthSq() > 0.01) {
      ai.mesh.lookAt(pi.clone().add(ai.vel));
    }

    // hopping animation (legs + body)
    const hop = Math.max(0, Math.sin(t * 4 + ai.hopPhase));
    ai.mesh.position.y = hop * 0.35;

    // bobble head
    const head = ai.mesh.children[1];
    if (head) head.rotation.y = Math.sin(t * 3 + ai.hopPhase) * 0.3;
  }
}
