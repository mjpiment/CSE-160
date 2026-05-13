let gl, canvas;
let a_Position, a_UV;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_BaseColor, u_texColorWeight, u_whichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4, u_Sampler5;

let camera, world;
const keys = {};
let pointerLocked = false;
let lastTime = 0;
let fpsSamples = [];

// ---- Dog state ----
const DOG_HOME = [10.5, 0, 10.5];
let dogPos  = [DOG_HOME[0], 0, DOG_HOME[2]];
let dogFace = 270; // yaw the dog is facing (degrees)
// idle / chase / return / sit
let dogState = 'idle';
let dogAnimTime = 0; // counts up while running
let dogLegPhase = 0;

// ---- Ball state ----
// ready / flying / landed / carried
let ball = {
  state: 'ready',
  pos:   [0, 1, 0],
  vel:   [0, 0, 0],
};
const GRAVITY = 12;
const BALL_RADIUS = 0.2;

// ---- Game state ----
let gameWon = false;
let animalBob = 0;

function main() {
  canvas = document.getElementById('canvas');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  gl = getWebGLContext(canvas);
  if (!gl) { alert('WebGL not available'); return; }

  const vSrc = document.getElementById('vshader').text;
  const fSrc = document.getElementById('fshader').text;
  if (!initShaders(gl, vSrc, fSrc)) { alert('Shader init failed'); return; }

  a_Position         = gl.getAttribLocation(gl.program,  'a_Position');
  a_UV               = gl.getAttribLocation(gl.program,  'a_UV');
  u_ModelMatrix      = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix       = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_BaseColor        = gl.getUniformLocation(gl.program, 'u_BaseColor');
  u_texColorWeight   = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_whichTexture     = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_Sampler0         = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1         = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2         = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3         = gl.getUniformLocation(gl.program, 'u_Sampler3');
  u_Sampler4         = gl.getUniformLocation(gl.program, 'u_Sampler4');
  u_Sampler5         = gl.getUniformLocation(gl.program, 'u_Sampler5');

  gl.uniform1i(u_Sampler0, 0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);
  gl.uniform1i(u_Sampler3, 3);
  gl.uniform1i(u_Sampler4, 4);
  gl.uniform1i(u_Sampler5, 5);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  camera = new Camera();
  camera.setAspect(canvas.width / canvas.height);

  world = new World(gl);

  setupControls();

  window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    camera.setAspect(canvas.width / canvas.height);
  });

  requestAnimationFrame(tick);
}

// ---- Render loop ----

function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (pointerLocked) handleMovement(dt);
  updateBall(dt);
  updateDog(dt);
  tryCollect();
  animalBob = Math.sin(now * 0.003) * 0.08;

  draw(now);
  updateHUD(dt);
  requestAnimationFrame(tick);
}

// ---- Ball physics ----

function throwBall() {
  if (ball.state !== 'ready') return;
  const yRad   = camera.yaw   * Math.PI / 180;
  const pRad   = camera.pitch * Math.PI / 180;
  const speed  = 14;
  const cp = Math.cos(pRad);
  ball.pos = [camera.eye[0], camera.eye[1], camera.eye[2]];
  ball.vel = [
    cp * Math.cos(yRad) * speed,
    Math.sin(pRad) * speed + 2,  // always a little upward
    cp * Math.sin(yRad) * speed,
  ];
  ball.state = 'flying';
  dogState = 'idle'; // reset dog so it reacts once ball lands
}

function updateBall(dt) {
  if (ball.state === 'flying') {
    ball.vel[1] -= GRAVITY * dt;
    ball.pos[0] += ball.vel[0] * dt;
    ball.pos[1] += ball.vel[1] * dt;
    ball.pos[2] += ball.vel[2] * dt;
    if (ball.pos[1] <= BALL_RADIUS) {
      ball.pos[1] = BALL_RADIUS;
      ball.vel = [0, 0, 0];
      ball.state = 'landed';
      dogState = 'chase';
    }
  } else if (ball.state === 'carried') {
    // Ball rides on dog's nose
    ball.pos[0] = dogPos[0] + Math.cos(dogFace * Math.PI/180) * 0.5;
    ball.pos[1] = 0.6;
    ball.pos[2] = dogPos[2] + Math.sin(dogFace * Math.PI/180) * 0.5;
  }
}

// ---- Dog AI ----

function updateDog(dt) {
  const DOG_SPEED_CHASE  = 5.5;
  const DOG_SPEED_RETURN = 3.5;

  if (dogState === 'chase') {
    const tx = ball.pos[0], tz = ball.pos[2];
    const dx = tx - dogPos[0], dz = tz - dogPos[2];
    const dist = Math.sqrt(dx*dx + dz*dz);
    dogFace = Math.atan2(dz, dx) * 180 / Math.PI;
    if (dist < 0.5) {
      ball.state = 'carried';
      dogState = 'return';
    } else {
      const step = Math.min(DOG_SPEED_CHASE * dt, dist);
      dogPos[0] += (dx/dist) * step;
      dogPos[2] += (dz/dist) * step;
      dogAnimTime += dt;
    }
  } else if (dogState === 'return') {
    const tx = camera.eye[0], tz = camera.eye[2];
    const dx = tx - dogPos[0], dz = tz - dogPos[2];
    const dist = Math.sqrt(dx*dx + dz*dz);
    dogFace = Math.atan2(dz, dx) * 180 / Math.PI;
    if (dist < 1.5) {
      ball.state = 'ready';
      dogState = 'sit';
      dogAnimTime = 0;
      showFetchMsg('Good dog! Press G to throw again.');
    } else {
      const step = Math.min(DOG_SPEED_RETURN * dt, dist);
      dogPos[0] += (dx/dist) * step;
      dogPos[2] += (dz/dist) * step;
      dogAnimTime += dt;
    }
  } else if (dogState === 'sit') {
    // After a moment, go back to idle
    dogAnimTime += dt;
    if (dogAnimTime > 2) { dogState = 'idle'; dogAnimTime = 0; }
  } else {
    // idle — face the player occasionally
    const dx = camera.eye[0] - dogPos[0];
    const dz = camera.eye[2] - dogPos[2];
    dogFace = Math.atan2(dz, dx) * 180 / Math.PI;
    dogAnimTime = 0;
  }
}

let fetchMsgTimeout = null;
function showFetchMsg(msg) {
  let el = document.getElementById('fetch-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fetch-msg';
    el.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);' +
      'color:#fff;font:18px sans-serif;background:rgba(0,0,0,0.6);padding:10px 24px;' +
      'border-radius:8px;pointer-events:none;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(fetchMsgTimeout);
  fetchMsgTimeout = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ---- Draw ----

function draw(now) {
  gl.clearColor(0.53, 0.81, 0.98, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const V = camera.getViewMatrix();
  const P = camera.getProjMatrix();
  gl.uniformMatrix4fv(u_ViewMatrix,        false, V.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix,  false, P.elements);

  const identity = new Matrix4();

  // Skybox
  gl.depthMask(false);
  const skyM = new Matrix4();
  skyM.setTranslate(camera.eye[0], camera.eye[1], camera.eye[2]);
  skyM.scale(900, 900, 900);
  gl.uniformMatrix4fv(u_ModelMatrix, false, skyM.elements);
  gl.uniform4f(u_BaseColor, 0.3, 0.6, 1.0, 1.0);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.uniform1i(u_whichTexture, -2);
  world.unitCube.bind(a_Position, a_UV);
  world.unitCube.draw();
  gl.depthMask(true);

  // Ground
  const groundM = new Matrix4();
  groundM.setTranslate(16, -0.005, 16);
  groundM.scale(32, 0.01, 32);
  gl.uniformMatrix4fv(u_ModelMatrix, false, groundM.elements);
  gl.uniform4f(u_BaseColor, 0.3, 0.6, 0.2, 1.0);
  gl.uniform1f(u_texColorWeight, 1.0);
  gl.uniform1i(u_whichTexture, TEX_GRASS);
  world.unitCube.bind(a_Position, a_UV);
  world.unitCube.draw();

  // Walls (batched)
  gl.uniform1f(u_texColorWeight, 1.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);
  world.bindWallBuffer(a_Position, a_UV);
  for (const g of world.wallGroups) {
    gl.uniform1i(u_whichTexture, g.tex);
    gl.drawArrays(gl.TRIANGLES, g.start, g.count);
  }

  // Gold
  if (world.goldVerts > 0) {
    gl.uniform4f(u_BaseColor, 1.0, 0.85, 0.1, 1.0);
    gl.uniform1f(u_texColorWeight, 1.0);
    gl.uniform1i(u_whichTexture, TEX_GOLD);
    gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);
    world.bindGoldBuffer(a_Position, a_UV);
    gl.drawArrays(gl.TRIANGLES, 0, world.goldVerts);
  }

  // Ball
  if (ball.state !== 'ready') {
    const ballM = new Matrix4();
    ballM.setTranslate(ball.pos[0], ball.pos[1], ball.pos[2]);
    ballM.scale(0.2, 0.2, 0.2);
    gl.uniformMatrix4fv(u_ModelMatrix, false, ballM.elements);
    gl.uniform4f(u_BaseColor, 0.9, 0.1, 0.1, 1.0);
    gl.uniform1f(u_texColorWeight, 0.0);
    gl.uniform1i(u_whichTexture, -2);
    world.unitCube.bind(a_Position, a_UV);
    world.unitCube.draw();
  }

  // Dog
  drawDog(now);
}

// ---- Dog rendering ----

function drawDog(now) {
  const running = (dogState === 'chase' || dogState === 'return');
  const legSwing = running ? Math.sin(dogAnimTime * 10) * 25 : 0;
  const bob = running ? Math.abs(Math.sin(dogAnimTime * 10)) * 0.05 : animalBob;
  const sitting = dogState === 'sit';

  // Base transform: dog position + facing direction
  const base = new Matrix4();
  base.setTranslate(dogPos[0], 0, dogPos[2]);
  base.rotate(dogFace - 90, 0, 1, 0); // -90 so "forward" of model faces along +X before rotation

  const W  = [0.95, 0.95, 0.95, 1]; // white body
  const WD = [0.80, 0.80, 0.80, 1]; // slightly darker for depth

  // Body
  solidPart(base, 0, 0.45 + bob, 0, 0.7, 0.42, 0.38, W);

  // Neck
  solidPart(base, 0.28, 0.65 + bob, 0, 0.22, 0.32, 0.28, W);

  // Head
  solidPart(base, 0.48, 0.82 + bob, 0, 0.38, 0.36, 0.34, W);

  // Snout
  solidPart(base, 0.72, 0.72 + bob, 0, 0.22, 0.18, 0.20, WD);

  // Nose (black)
  solidPart(base, 0.86, 0.76 + bob, 0, 0.07, 0.07, 0.08, [0.1,0.1,0.1,1]);

  // Eyes
  solidPart(base, 0.56, 0.92 + bob,  0.12, 0.07, 0.07, 0.05, [0.15,0.08,0.0,1]);
  solidPart(base, 0.56, 0.92 + bob, -0.12, 0.07, 0.07, 0.05, [0.15,0.08,0.0,1]);

  // Ears
  const earM1 = new Matrix4(base);
  earM1.translate(0.36, 1.02 + bob, 0.16);
  earM1.rotate(25, 0, 0, 1);
  earM1.scale(0.10, 0.28, 0.09);
  drawPart(earM1, WD, -2);

  const earM2 = new Matrix4(base);
  earM2.translate(0.36, 1.02 + bob, -0.16);
  earM2.rotate(-25, 0, 0, 1);
  earM2.scale(0.10, 0.28, 0.09);
  drawPart(earM2, WD, -2);

  // Legs
  if (sitting) {
    legPart(base,  0.28, 0.0 + bob,  0.15,  20, WD);
    legPart(base,  0.28, 0.0 + bob, -0.15,  20, WD);
    legPart(base, -0.28, 0.0 + bob,  0.15, -30, WD);
    legPart(base, -0.28, 0.0 + bob, -0.15, -30, WD);
  } else {
    legPart(base,  0.22, 0.0 + bob,  0.15,  legSwing, WD);
    legPart(base,  0.22, 0.0 + bob, -0.15,  legSwing, WD);
    legPart(base, -0.22, 0.0 + bob,  0.15, -legSwing, WD);
    legPart(base, -0.22, 0.0 + bob, -0.15, -legSwing, WD);
  }

  // Tail
  const wagSpeed = running ? 18 : 6;
  const wagAmp   = running ? 40 : 20;
  const tailWag  = Math.sin(performance.now() * 0.001 * wagSpeed) * wagAmp;
  const tailM = new Matrix4(base);
  tailM.translate(-0.42, 0.55 + bob, 0);
  tailM.rotate(tailWag, 0, 0, 1);
  tailM.translate(-0.18, 0, 0);
  tailM.scale(0.30, 0.10, 0.10);
  drawPart(tailM, W, -2);
}

function legPart(base, ox, oy, oz, swing, color) {
  const m = new Matrix4(base);
  m.translate(ox, oy + 0.35, oz);
  m.rotate(swing, 0, 0, 1);
  m.translate(0, -0.18, 0);
  m.scale(0.13, 0.38, 0.13);
  drawPart(m, color, TEX_FUR);
}

function solidPart(base, ox, oy, oz, sx, sy, sz, color) {
  const m = new Matrix4(base);
  m.translate(ox, oy, oz);
  m.scale(sx, sy, sz);
  drawPart(m, color, -2);
}

function drawPart(m, color, tex) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, m.elements);
  gl.uniform4f(u_BaseColor, color[0], color[1], color[2], color[3]);
  gl.uniform1i(u_whichTexture, tex);
  gl.uniform1f(u_texColorWeight, tex === -2 ? 0.0 : 1.0);
  world.unitCube.bind(a_Position, a_UV);
  world.unitCube.draw();
}

// ---- Controls ----

function setupControls() {
  document.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === 'q') camera.panLeft(5);
    if (e.key.toLowerCase() === 'e') camera.panRight(5);
    if (e.key.toLowerCase() === 'f') {
      const f = camera._fwd();
      world.removeBlock(camera.eye[0], camera.eye[2], f[0], f[2]);
    }
    if (e.key.toLowerCase() === 'g') throwBall();
  });

  document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  canvas.addEventListener('click', () => canvas.requestPointerLock());

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas;
    document.getElementById('click-to-play').style.display = pointerLocked ? 'none' : 'block';
  });

  document.addEventListener('mousemove', e => {
    if (!pointerLocked) return;
    camera.panMouse(e.movementX, e.movementY);
  });

  canvas.addEventListener('mousedown', e => {
    if (!pointerLocked) return;
    if (e.button === 0) {
      const f = camera._fwd();
      world.addBlock(camera.eye[0], camera.eye[2], f[0], f[2]);
    } else if (e.button === 2) {
      const f = camera._fwd();
      world.removeBlock(camera.eye[0], camera.eye[2], f[0], f[2]);
    }
  });

  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

function handleMovement(dt) {
  const speed = 5;
  const f = camera._fwd();
  const r = camera._right();

  let dx = 0, dz = 0;
  if (keys['w']) { dx += f[0]; dz += f[2]; }
  if (keys['s']) { dx -= f[0]; dz -= f[2]; }
  if (keys['a']) { dx -= r[0]; dz -= r[2]; }
  if (keys['d']) { dx += r[0]; dz += r[2]; }
  if (dx === 0 && dz === 0) return;

  const len = Math.sqrt(dx*dx + dz*dz);
  dx = dx/len * speed * dt;
  dz = dz/len * speed * dt;

  const nx = camera.eye[0] + dx;
  const nz = camera.eye[2] + dz;

  if (!world.isBlocked(nx, camera.eye[2])) {
    camera.eye[0] = nx; camera.at[0] += dx;
    camera._dirty = true;
  }
  if (!world.isBlocked(camera.eye[0], nz)) {
    camera.eye[2] = nz; camera.at[2] += dz;
    camera._dirty = true;
  }
}

function tryCollect() {
  if (gameWon) return;
  if (world.tryCollect(camera.eye[0], camera.eye[2])) {
    if (world.collected >= world.total) {
      gameWon = true;
      document.getElementById('win').style.display = 'block';
    }
  }
}

function updateHUD(dt) {
  fpsSamples.push(dt);
  if (fpsSamples.length > 30) fpsSamples.shift();
  const avg = fpsSamples.reduce((a,b)=>a+b,0) / fpsSamples.length;
  document.getElementById('fps').textContent =
    `FPS: ${Math.round(1/avg)}`;
  document.getElementById('pos').textContent =
    `Pos: (${camera.eye[0].toFixed(1)}, ${camera.eye[1].toFixed(1)}, ${camera.eye[2].toFixed(1)})`;
  document.getElementById('collected').textContent =
    `Gold: ${world.collected} / ${world.total}`;

  const fetchEl = document.getElementById('fetch-status');
  if (fetchEl) {
    fetchEl.textContent = ball.state === 'ready'
      ? (dogState === 'idle' ? 'G = throw ball' : '')
      : `Dog: ${dogState}`;
  }
}

window.onload = main;
