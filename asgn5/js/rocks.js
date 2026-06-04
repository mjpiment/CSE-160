import * as THREE from 'three';

// Moon rock spires and crystal formations replace coral.
export function buildRockFormations(scene) {
  const darkRock = new THREE.MeshStandardMaterial({ color: 0x7a7870, roughness: 0.95 });
  const lightRock= new THREE.MeshStandardMaterial({ color: 0xc8c6bc, roughness: 0.9  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x88bbff, emissive: 0x224488, emissiveIntensity: 0.4,
    transparent: true, opacity: 0.75, roughness: 0.1,
  });

  // Spire clusters
  const clusters = [
    { x: -22, z: -18 },
    { x:  28, z: -22 },
    { x: -32, z:  20 },
    { x:  35, z:  18 },
    { x:   8, z: -38 },
    { x: -18, z:  35 },
  ];

  clusters.forEach(({ x, z }) => {
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const spread = 3;
      const sx = x + (Math.random() - 0.5) * spread;
      const sz = z + (Math.random() - 0.5) * spread;
      const h  = 1.5 + Math.random() * 6;
      const r  = 0.2 + Math.random() * 0.6;

      // main spire (tapered cylinder)
      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.15, r, h, 6),
        Math.random() > 0.4 ? darkRock : lightRock
      );
      spire.position.set(sx, h / 2, sz);
      spire.rotation.z = (Math.random() - 0.5) * 0.3;
      spire.castShadow = true;
      scene.add(spire);

      // crystal shard on top of some spires
      if (Math.random() > 0.55) {
        const crystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(r * 0.5, 0),
          crystalMat
        );
        crystal.position.set(sx + (Math.random() - 0.5) * 0.6, h + r * 0.4, sz);
        scene.add(crystal);
      }
    }
  });

  // Standalone large boulders (icosahedra)
  const bigRock = new THREE.MeshStandardMaterial({ color: 0x888078, roughness: 0.97 });
  const boulderData = [
    [15, 0, -14, 2.4], [-18, 0, -12, 3.1], [22, 0, 12, 1.8],
    [-28, 0, 8, 2.7], [8, 0, 22, 1.5],
  ];
  boulderData.forEach(([x, , z, s]) => {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), bigRock);
    b.position.set(x, s * 0.55, z);
    b.rotation.set(Math.random(), Math.random(), Math.random());
    b.castShadow = true;
    b.receiveShadow = true;
    scene.add(b);
  });

  // Alien crystal grove (cone cluster glowing blue)
  const groveCenter = { x: 12, z: 20 };
  for (let i = 0; i < 10; i++) {
    const gx = groveCenter.x + (Math.random() - 0.5) * 8;
    const gz = groveCenter.z + (Math.random() - 0.5) * 8;
    const gh = 0.5 + Math.random() * 2.5;
    const crystal = new THREE.Mesh(
      new THREE.ConeGeometry(0.15 + Math.random() * 0.3, gh, 5),
      crystalMat
    );
    crystal.position.set(gx, gh / 2, gz);
    scene.add(crystal);
  }
}
