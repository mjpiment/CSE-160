import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let _rocket = null;
export function getRocket() { return _rocket; }

export function buildStructures(scene) {
  loadRocket(scene);
  buildMoonBuggy(scene);
  buildLandingPad(scene);
  buildFlag(scene);
  buildHabitat(scene);
  buildSatelliteDish(scene);
  buildAstronautSuit(scene);
}

// ── Rocket Ship (GLB model) ───────────────────────────────────────────────────
function loadRocket(scene) {
  const loader = new GLTFLoader();
  loader.load(
    'models/Rocketship.glb',
    (gltf) => {
      const model = gltf.scene;

      // Normalize to a fixed height regardless of native model units
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const targetHeight = 14;
      const scale = targetHeight / size.y;
      model.scale.setScalar(scale);

      // Sit on the moon floor
      const box2 = new THREE.Box3().setFromObject(model);
      model.position.set(-2, -box2.min.y, -10);

      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(model);
      _rocket = model;
    },
    undefined,
    (err) => console.error('Rocketship.glb failed to load:', err)
  );
}

// ── Moon Buggy / Lunar Rover ──────────────────────────────────────────────────
function buildMoonBuggy(scene) {
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x888870, roughness: 0.6, metalness: 0.5 });
  const wheelMat  = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
  const rimMat    = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.4, metalness: 0.8 });
  const glassMat  = new THREE.MeshStandardMaterial({ color: 0xaaccff, transparent: true, opacity: 0.5, roughness: 0.05 });

  const g = new THREE.Group();

  // Chassis frame (box)
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.35, 2.0), bodyMat);
  chassis.position.y = 0.7;
  chassis.castShadow = true;
  g.add(chassis);

  // Seat / cockpit box
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.6), bodyMat);
  cockpit.position.set(0.4, 1.22, 0);
  cockpit.castShadow = true;
  g.add(cockpit);

  // Windshield
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 1.4), glassMat);
  shield.position.set(1.12, 1.52, 0);
  shield.rotation.x = 0.3;
  g.add(shield);

  // 4 wheels (torus tires + cylinder hub)
  const wheelPositions = [
    [ 1.6, 0.42,  1.1],
    [ 1.6, 0.42, -1.1],
    [-1.6, 0.42,  1.1],
    [-1.6, 0.42, -1.1],
  ];
  wheelPositions.forEach(([wx, wy, wz]) => {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 8, 16), wheelMat);
    tire.rotation.y = Math.PI / 2;
    tire.position.set(wx, wy, wz);
    g.add(tire);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.24, 8), rimMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(wx, wy, wz);
    g.add(hub);
  });

  // Antenna mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), rimMat);
  mast.position.set(-0.8, 1.9, 0);
  g.add(mast);

  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), rimMat);
  dish.position.set(-0.8, 2.84, 0);
  dish.rotation.x = Math.PI / 3;
  g.add(dish);

  // Camera arm
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5), bodyMat);
  arm.position.set(1.1, 1.55, 0);
  arm.rotation.z = Math.PI / 4;
  g.add(arm);
  const camBox = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.22), bodyMat);
  camBox.position.set(1.6, 1.9, 0);
  g.add(camBox);

  g.position.set(8, 0, 4);
  g.rotation.y = -0.6;
  scene.add(g);
}

// ── Landing Pad ───────────────────────────────────────────────────────────────
function buildLandingPad(scene) {
  const padMat    = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.6, metalness: 0.5 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.5 });
  const strutMat  = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.4, metalness: 0.8 });

  // Main disc
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.25, 20), padMat);
  pad.position.set(-14, 0.12, -14);
  pad.receiveShadow = true;
  scene.add(pad);

  // Yellow H markings (boxes)
  const hParts = [
    new THREE.BoxGeometry(0.4, 0.05, 5),   // left vertical
    new THREE.BoxGeometry(0.4, 0.05, 5),   // right vertical
    new THREE.BoxGeometry(3.0, 0.05, 0.4), // crossbar
  ];
  const offsets = [[-1.5, 0, 0], [1.5, 0, 0], [0, 0, 0]];
  hParts.forEach((geo, i) => {
    const m = new THREE.Mesh(geo, stripeMat);
    m.position.set(-14 + offsets[i][0], 0.26, -14 + offsets[i][2]);
    scene.add(m);
  });

  // Strut lights around rim
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 6), strutMat);
    strut.position.set(-14 + Math.cos(a) * 7.5, 0.75, -14 + Math.sin(a) * 7.5);
    scene.add(strut);

    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.5 })
    );
    light.position.set(-14 + Math.cos(a) * 7.5, 1.6, -14 + Math.sin(a) * 7.5);
    scene.add(light);
  }
}

// ── Flag ──────────────────────────────────────────────────────────────────────
function buildFlag(scene) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.9 });
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 8), poleMat);
  pole.position.set(4, 2, -6);
  scene.add(pole);

  // Flag canvas texture
  const fc = document.createElement('canvas');
  fc.width = 256; fc.height = 160;
  const fCtx = fc.getContext('2d');

  // Stars and stripes (simplified US flag look)
  // Red and white stripes
  for (let r = 0; r < 13; r++) {
    fCtx.fillStyle = r % 2 === 0 ? '#cc1111' : '#ffffff';
    fCtx.fillRect(0, r * (160 / 13), 256, 160 / 13);
  }
  // Blue canton
  fCtx.fillStyle = '#001188';
  fCtx.fillRect(0, 0, 100, 70);
  // Stars (simple dots)
  fCtx.fillStyle = '#ffffff';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      fCtx.beginPath();
      fCtx.arc(10 + col * 14, 8 + row * 12, 3, 0, Math.PI * 2);
      fCtx.fill();
    }
  }

  const flagTex = new THREE.CanvasTexture(fc);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.25), new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.8, side: THREE.DoubleSide }));
  flag.position.set(5.05, 3.5, -6);
  flag.rotation.y = 0.1;
  scene.add(flag);

  // horizontal arm on pole
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6), poleMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(5.05, 4.05, -6);
  scene.add(arm);
}

// ── Habitat Module (dome) ─────────────────────────────────────────────────────
function buildHabitat(scene) {
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.5, metalness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.55, roughness: 0.05, emissive: 0x112233 });
  const tubeMat  = new THREE.MeshStandardMaterial({ color: 0x888878, roughness: 0.4, metalness: 0.7 });

  // Dome
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(4, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    shellMat
  );
  dome.position.set(-20, 0.05, 8);
  dome.castShadow = true;
  dome.receiveShadow = true;
  scene.add(dome);

  // Dome ring base
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.5, 16), shellMat);
  ring.position.set(-20, 0.25, 8);
  scene.add(ring);

  // Windows around dome
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), glassMat);
    win.position.set(
      -20 + Math.cos(a) * 3.5,
      2.2,
      8 + Math.sin(a) * 3.5
    );
    win.lookAt(-20, 2.2, 8);
    scene.add(win);
  }

  // Connecting tunnel (cylinder on its side)
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 8, 12), shellMat);
  tunnel.rotation.z = Math.PI / 2;
  tunnel.position.set(-12.5, 1, 8);
  tunnel.castShadow = true;
  scene.add(tunnel);

  // Solar panels (flat boxes)
  [-1, 1].forEach(side => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.08, 2),
      new THREE.MeshStandardMaterial({ color: 0x223388, emissive: 0x112244, roughness: 0.2, metalness: 0.6 })
    );
    panel.position.set(-20 + side * 6.5, 4, 8);
    scene.add(panel);

    const panelArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 6), tubeMat);
    panelArm.rotation.z = Math.PI / 2;
    panelArm.position.set(-20 + side * 3.5, 4, 8);
    scene.add(panelArm);
  });
}

// ── Satellite Dish ────────────────────────────────────────────────────────────
function buildSatelliteDish(scene) {
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.9 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.5, 8), metalMat);
  base.position.set(16, 0.75, -18);
  scene.add(base);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 8), metalMat);
  mast.position.set(16, 2.7, -18);
  mast.rotation.z = 0.4;
  scene.add(mast);

  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.3, metalness: 0.6, side: THREE.DoubleSide })
  );
  dish.rotation.x = Math.PI * 0.6;
  dish.rotation.z = -0.4;
  dish.position.set(16.4, 4.4, -18.4);
  dish.castShadow = true;
  scene.add(dish);
}

// ── Astronaut Suit (standing figure) ─────────────────────────────────────────
function buildAstronautSuit(scene) {
  const suitMat   = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.8 });
  const visorMat  = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.05, transparent: true, opacity: 0.6, emissive: 0x112233 });

  const g = new THREE.Group();

  // torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.8, 6, 10), suitMat);
  torso.position.y = 1.5;
  g.add(torso);

  // helmet
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), helmetMat);
  helmet.position.y = 2.55;
  g.add(helmet);

  // visor
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 12, 8, -Math.PI * 0.45, Math.PI * 0.9, Math.PI * 0.22, Math.PI * 0.55),
    visorMat
  );
  visor.position.set(0.08, 2.55, 0);
  visor.rotation.y = Math.PI;
  g.add(visor);

  // arms
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.7, 4, 8), suitMat);
    arm.position.set(side * 0.68, 1.5, 0);
    arm.rotation.z = side * 0.4;
    g.add(arm);
  });

  // legs
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.75, 4, 8), suitMat);
    leg.position.set(side * 0.26, 0.55, 0);
    g.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.55), suitMat);
    boot.position.set(side * 0.26, 0.12, 0.1);
    g.add(boot);
  });

  // backpack (life support)
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.28), suitMat);
  pack.position.set(0, 1.55, -0.52);
  g.add(pack);

  g.position.set(5, 0, -4);
  g.rotation.y = 1.2;
  g.castShadow = true;
  scene.add(g);
}
