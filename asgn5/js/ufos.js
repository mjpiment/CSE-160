import * as THREE from 'three';

// UFOs hovering over the moon with spinning dishes and tractor beam spotlights.
export function createUFOs(scene, count) {
  const ufos = [];

  const ufoColors = [0x22ffcc, 0xff44ff, 0x44aaff, 0xff8844];

  for (let i = 0; i < count; i++) {
    const col = ufoColors[i % ufoColors.length];

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x778899, roughness: 0.2, metalness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, transparent: true, opacity: 0.65, roughness: 0.05 });
    const lightMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2, roughness: 0 });

    const g = new THREE.Group();

    // Lower disc hull
    const hull = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.7, 8, 24), metalMat);
    hull.rotation.x = Math.PI / 2;
    g.add(hull);

    // Flat base disc
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.3, 20), metalMat);
    base.position.y = -0.3;
    g.add(base);

    // Glass dome on top
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      glassMat
    );
    dome.position.y = 0.15;
    g.add(dome);

    // Spinning ring with lights
    const spinRing = new THREE.Group();
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.15, 6, 20), metalMat);
    outerRing.rotation.x = Math.PI / 2;
    spinRing.add(outerRing);

    for (let l = 0; l < 8; l++) {
      const a = (l / 8) * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 6), lightMat);
      bulb.position.set(Math.cos(a) * 2.0, 0, Math.sin(a) * 2.0);
      spinRing.add(bulb);
    }
    g.add(spinRing);

    // Tractor beam (cone pointing down, transparent)
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(3, 8, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.3, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.rotation.x = Math.PI;
    beam.position.y = -4.5;
    g.add(beam);

    // Point light for tractor beam glow
    const beamLight = new THREE.PointLight(col, 3.5, 14);
    beamLight.position.y = -1;
    g.add(beamLight);

    const angle = (i / count) * Math.PI * 2;
    const dist  = 12 + i * 5;
    g.position.set(Math.cos(angle) * dist, 14 + i * 2, Math.sin(angle) * dist);
    g.castShadow = false;
    scene.add(g);

    ufos.push({
      group: g,
      spinRing,
      beam,
      beamLight,
      orbitAngle: angle,
      orbitDist:  dist,
      orbitSpeed: 0.06 + i * 0.012,
      baseY:      g.position.y,
      phase:      Math.random() * Math.PI * 2,
    });
  }

  return ufos;
}

export function updateUFOs(ufos, t) {
  ufos.forEach(u => {
    // orbit the scene
    u.orbitAngle += u.orbitSpeed * 0.016;
    u.group.position.x = Math.cos(u.orbitAngle) * u.orbitDist;
    u.group.position.z = Math.sin(u.orbitAngle) * u.orbitDist;
    u.group.position.y = u.baseY + Math.sin(t * 0.5 + u.phase) * 1.5;

    // keep facing orbit direction
    u.group.rotation.y = -u.orbitAngle + Math.PI / 2;

    // spin the light ring
    u.spinRing.rotation.y = t * 2.5;

    // pulse tractor beam and its light
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + u.phase);
    u.beam.material.opacity  = 0.06 + pulse * 0.14;
    u.beamLight.intensity    = 2.0 + pulse * 3.0;
  });
}
