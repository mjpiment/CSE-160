import * as THREE from 'three';

export function buildMoonFloor(scene) {
  // ── Moon regolith texture (canvas) ────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#aaa9a0';
  ctx.fillRect(0, 0, 512, 512);

  // fine grain noise
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = Math.floor(140 + Math.random() * 60);
    ctx.fillStyle = `rgb(${v},${v},${v - 8})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // subtle dark patches
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 10 + Math.random() * 30;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(80,78,72,0.3)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const regolithTex = new THREE.CanvasTexture(canvas);
  regolithTex.wrapS = regolithTex.wrapT = THREE.RepeatWrapping;
  regolithTex.repeat.set(20, 20);

  // ── Main flat surface ─────────────────────────────────────────────────────
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300, 80, 80),
    new THREE.MeshStandardMaterial({ map: regolithTex, roughness: 0.98, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Craters ───────────────────────────────────────────────────────────────
  const craterData = [
    { x: 18,  z: -20, r: 5,   depth: 0.6 },
    { x: -25, z: 15,  r: 7.5, depth: 0.9 },
    { x: 30,  z: 25,  r: 3.5, depth: 0.4 },
    { x: -10, z: -30, r: 9,   depth: 1.1 },
    { x: 40,  z: -8,  r: 4,   depth: 0.5 },
    { x: -40, z: -20, r: 6,   depth: 0.7 },
    { x: 10,  z: 40,  r: 3,   depth: 0.35 },
    { x: -30, z: 38,  r: 5,   depth: 0.6 },
  ];

  const craterMat = new THREE.MeshStandardMaterial({ map: regolithTex, roughness: 1, metalness: 0 });
  const rimMat    = new THREE.MeshStandardMaterial({ color: 0xbbbaaf, roughness: 0.95 });

  craterData.forEach(({ x, z, r, depth }) => {
    // crater floor (dark disc)
    const floor2 = new THREE.Mesh(
      new THREE.CircleGeometry(r * 0.9, 20),
      new THREE.MeshStandardMaterial({ color: 0x807e78, roughness: 1 })
    );
    floor2.rotation.x = -Math.PI / 2;
    floor2.position.set(x, depth * 0.05, z);
    scene.add(floor2);

    // rim (torus on the surface)
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(r, depth * 0.5, 6, 24),
      rimMat
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(x, depth * 0.25, z);
    scene.add(rim);
  });

  // ── Scattered moon rocks ──────────────────────────────────────────────────
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x999890, roughness: 0.95 });

  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 6 + Math.random() * 55;
    const s     = 0.2 + Math.random() * 1.4;

    const geo = Math.random() > 0.5
      ? new THREE.DodecahedronGeometry(s, 0)
      : new THREE.OctahedronGeometry(s, 0);

    const rock = new THREE.Mesh(geo, rockMat);
    rock.position.set(Math.cos(angle) * dist, s * 0.4, Math.sin(angle) * dist);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }
}
