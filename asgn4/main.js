let gl, canvas;
let a_Position, a_UV, a_Normal;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_BaseColor, u_texColorWeight, u_whichTexture;
let u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4, u_Sampler5, u_Sampler6;
let u_normalViz;
let u_fogOn, u_fogColor, u_fogRange;
let u_LightPos;
let u_NormalMatrix;
let u_CameraPos;
let u_LightColor;
let u_lightOn, u_pointOn, u_spotOn;
let u_spotPos, u_spotDir, u_spotColor, u_spotCutoff;

let g_lightColor  = [1, 1, 1];  // point light RGB
let g_lightingOn  = true;
let g_pointOn     = true;
let g_spotOn      = true;

// ---- Mode + game state ----
let g_mode    = 'assignment';  // 'assignment' | 'horror'
let gameState = 'pre';         // 'pre' | 'intro' | 'game' | 'caught'

// ---- Monster state ----
let monsterPos   = [9, 0, 9];
let monsterState = 'waiting';  // 'waiting' | 'lurking' | 'chasing' | 'caught'
let monsterAngle = 0;
let monsterBobT  = 0;
let monsterActivateTimer = 0;

// ---- Audio ----
let audio = null;

// Spotlight: mutable position always aimed at map center
let g_spotPos    = [52, 15, 10];
let g_spotColor  = [1, 0.85, 0.6];
const g_spotTarget  = [32, 0, 32];
const SPOT_CUTOFF   = Math.cos(20 * Math.PI / 180);
let g_spotDir = [0, 0, 0];
function recomputeSpotDir() {
  const dx = g_spotTarget[0]-g_spotPos[0], dy = g_spotTarget[1]-g_spotPos[1], dz = g_spotTarget[2]-g_spotPos[2];
  const len = Math.sqrt(dx*dx+dy*dy+dz*dz);
  g_spotDir[0]=dx/len; g_spotDir[1]=dy/len; g_spotDir[2]=dz/len;
}
recomputeSpotDir();

// Reusable temp matrix for normal-matrix computation (avoids per-frame allocation)
const _nm = new Matrix4();

// Global world-space light position + animation state
let g_lightPos   = [32, 5, 32];
let g_lightAngle = 0;           // current orbit angle in radians
let g_lightAnimate = true;

let camera, world, sphere, objModel;
const keys = {};
let pointerLocked = false;
let lastTime = 0;
let fpsSamples = [];

let normalVizOn = false;

// ---- Dog state ----
const DOG_HOME = [35, 0, 58];
let dogPos  = [DOG_HOME[0], 0, DOG_HOME[2]];
let dogFace = 270;
let dogState = 'idle';
let dogAnimTime = 0;
let dogLegPhase = 0;

// ---- Ball state ----
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
  a_Normal           = gl.getAttribLocation(gl.program,  'a_Normal');
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
  u_Sampler6         = gl.getUniformLocation(gl.program, 'u_Sampler6');
  u_normalViz        = gl.getUniformLocation(gl.program, 'u_normalViz');
  u_LightPos         = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_NormalMatrix     = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_CameraPos        = gl.getUniformLocation(gl.program, 'u_CameraPos');
  u_LightColor       = gl.getUniformLocation(gl.program, 'u_LightColor');
  u_lightOn          = gl.getUniformLocation(gl.program, 'u_lightOn');
  u_pointOn          = gl.getUniformLocation(gl.program, 'u_pointOn');
  u_spotOn           = gl.getUniformLocation(gl.program, 'u_spotOn');
  u_spotPos          = gl.getUniformLocation(gl.program, 'u_spotPos');
  u_spotDir          = gl.getUniformLocation(gl.program, 'u_spotDir');
  u_spotColor        = gl.getUniformLocation(gl.program, 'u_spotColor');
  u_spotCutoff       = gl.getUniformLocation(gl.program, 'u_spotCutoff');
  u_fogOn            = gl.getUniformLocation(gl.program, 'u_fogOn');
  u_fogColor         = gl.getUniformLocation(gl.program, 'u_fogColor');
  u_fogRange         = gl.getUniformLocation(gl.program, 'u_fogRange');

  // Fog off by default; horror mode enables it
  gl.uniform1i(u_fogOn,    0);
  gl.uniform3f(u_fogColor, 0.02, 0.02, 0.04);
  gl.uniform1f(u_fogRange, 18.0);

  audio = new HorrorAudio();

  gl.uniform1i(u_Sampler0, 0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);
  gl.uniform1i(u_Sampler3, 3);
  gl.uniform1i(u_Sampler4, 4);
  gl.uniform1i(u_Sampler5, 5);
  gl.uniform1i(u_Sampler6, 6);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  camera = new Camera();
  camera.setAspect(canvas.width / canvas.height);

  world = new World(gl);
  sphere = new Sphere(gl);
  objModel = new Model(gl);
  objModel.load('Monster/Monster.obj');

  setupControls();
  setupModeSelect();

  function togBtn(id, getState, setState) {
    const btn = document.getElementById(id);
    btn.addEventListener('click', () => {
      setState(!getState());
      btn.textContent = getState() ? 'ON' : 'OFF';
      btn.classList.toggle('off', !getState());
    });
  }
  togBtn('btn-lighting', () => g_lightingOn, v => { g_lightingOn = v; });
  togBtn('btn-point',    () => g_pointOn,    v => { g_pointOn    = v; });
  togBtn('btn-spot',     () => g_spotOn,     v => { g_spotOn     = v; });

  document.getElementById('btn-normalviz').addEventListener('click', () => {
    normalVizOn = !normalVizOn;
    document.getElementById('btn-normalviz').textContent =
      normalVizOn ? 'Normal Viz: ON' : 'Normal Viz: OFF';
  });

  function hexToRgb01(hex) {
    return [
      parseInt(hex.slice(1,3),16)/255,
      parseInt(hex.slice(3,5),16)/255,
      parseInt(hex.slice(5,7),16)/255
    ];
  }
  document.getElementById('cp-point').addEventListener('input', e => {
    const c = hexToRgb01(e.target.value);
    g_lightColor[0]=c[0]; g_lightColor[1]=c[1]; g_lightColor[2]=c[2];
  });
  document.getElementById('cp-spot').addEventListener('input', e => {
    const c = hexToRgb01(e.target.value);
    g_spotColor[0]=c[0]; g_spotColor[1]=c[1]; g_spotColor[2]=c[2];
  });

  function bindSlider(id, valId, dec, setter) {
    const el = document.getElementById(id);
    const ve = document.getElementById(valId);
    el.addEventListener('input', () => { const v=parseFloat(el.value); setter(v); ve.textContent=v.toFixed(dec); });
  }
  bindSlider('sl-lx','val-lx',1, v=>{ g_lightAnimate=false; g_lightPos[0]=v; });
  bindSlider('sl-ly','val-ly',1, v=>{ g_lightPos[1]=v; });
  bindSlider('sl-lz','val-lz',1, v=>{ g_lightAnimate=false; g_lightPos[2]=v; });
  bindSlider('sl-sx','val-sx',1, v=>{ g_spotPos[0]=v; recomputeSpotDir(); });
  bindSlider('sl-sy','val-sy',1, v=>{ g_spotPos[1]=v; recomputeSpotDir(); });
  bindSlider('sl-sz','val-sz',1, v=>{ g_spotPos[2]=v; recomputeSpotDir(); });

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
  updateMonster(dt);
  tryCollect();
  animalBob = Math.sin(now * 0.003) * 0.08;

  if (g_mode === 'horror' && gameState === 'game' && audio) {
    const mdx = camera.eye[0] - monsterPos[0];
    const mdz = camera.eye[2] - monsterPos[2];
    const mdist = Math.sqrt(mdx * mdx + mdz * mdz);
    audio.update(dt, mdist, monsterState !== 'waiting');
    updateVignette(mdist);
  }

  // Orbit the light around map center (16, y, 16) at radius 8, height 5
  if (g_lightAnimate) {
    g_lightAngle += dt * 1.0;  // ~1 radian per second
    const cx = 32, cz = 32, r = 14;
    g_lightPos[0] = cx + r * Math.cos(g_lightAngle);
    g_lightPos[1] = 5;
    g_lightPos[2] = cz + r * Math.sin(g_lightAngle);
  }

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
    Math.sin(pRad) * speed + 2,
    cp * Math.sin(yRad) * speed,
  ];
  ball.state = 'flying';
  dogState = 'idle';
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
    dogAnimTime += dt;
    if (dogAnimTime > 2) { dogState = 'idle'; dogAnimTime = 0; }
  } else {
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

// ---- Helpers ----

// Upload inverse-transpose of modelMatrix as u_NormalMatrix.
// Must be called before every lit draw call (not needed for -2 unlit objects).
function uploadNormalMatrix(modelMatrix) {
  _nm.setInverseOf(modelMatrix);
  _nm.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, _nm.elements);
}

// ---- Draw ----

function draw(now) {
  const horror = (g_mode === 'horror');
  if (horror) {
    gl.clearColor(0.02, 0.02, 0.04, 1.0);
    gl.uniform1i(u_fogOn, 1);
  } else {
    gl.clearColor(0.53, 0.81, 0.98, 1.0);
    gl.uniform1i(u_fogOn, 0);
  }
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniform1i(u_normalViz, normalVizOn ? 1 : 0);
  gl.uniform3f(u_LightPos,    g_lightPos[0],   g_lightPos[1],   g_lightPos[2]);
  gl.uniform3fv(u_CameraPos,  camera.eye);
  gl.uniform3f(u_LightColor,  g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform1i(u_lightOn,  g_lightingOn ? 1 : 0);
  gl.uniform1i(u_pointOn,  g_pointOn    ? 1 : 0);
  gl.uniform1i(u_spotOn,   g_spotOn     ? 1 : 0);
  gl.uniform3f(u_spotPos,   g_spotPos[0],   g_spotPos[1],   g_spotPos[2]);
  gl.uniform3f(u_spotDir,   g_spotDir[0],   g_spotDir[1],   g_spotDir[2]);
  gl.uniform3f(u_spotColor, g_spotColor[0], g_spotColor[1], g_spotColor[2]);
  gl.uniform1f(u_spotCutoff,  SPOT_CUTOFF);

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
  gl.uniform4f(u_BaseColor, horror ? 0.02 : 0.3, horror ? 0.02 : 0.6, horror ? 0.04 : 1.0, 1.0);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.uniform1i(u_whichTexture, -2);
  world.unitCube.bind(a_Position, a_UV, a_Normal);
  world.unitCube.draw();
  gl.depthMask(true);

  // Ground
  const groundM = new Matrix4();
  groundM.setTranslate(32, -0.005, 32);
  groundM.scale(64, 0.01, 64);
  gl.uniformMatrix4fv(u_ModelMatrix, false, groundM.elements);
  uploadNormalMatrix(groundM);
  gl.uniform4f(u_BaseColor, 0.3, 0.6, 0.2, 1.0);
  gl.uniform1f(u_texColorWeight, 1.0);
  gl.uniform1i(u_whichTexture, TEX_GRASS);
  world.unitCube.bind(a_Position, a_UV, a_Normal);
  world.unitCube.draw();

  // Walls (batched) — model matrix = identity, so normal matrix = identity too
  gl.uniform1f(u_texColorWeight, 1.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);
  uploadNormalMatrix(identity);
  world.bindWallBuffer(a_Position, a_UV, a_Normal);
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
    uploadNormalMatrix(identity);
    world.bindGoldBuffer(a_Position, a_UV, a_Normal);
    gl.drawArrays(gl.TRIANGLES, 0, world.goldVerts);
  }

  // Ball
  if (ball.state !== 'ready') {
    const ballM = new Matrix4();
    ballM.setTranslate(ball.pos[0], ball.pos[1], ball.pos[2]);
    ballM.scale(0.2, 0.2, 0.2);
    gl.uniformMatrix4fv(u_ModelMatrix, false, ballM.elements);
    uploadNormalMatrix(ballM);
    gl.uniform4f(u_BaseColor, 0.9, 0.1, 0.1, 1.0);
    gl.uniform1f(u_texColorWeight, 0.0);
    gl.uniform1i(u_whichTexture, -3);  // flat color, lit
    world.unitCube.bind(a_Position, a_UV, a_Normal);
    world.unitCube.draw();
  }

  // Point-light marker — tinted to current light color, unlit
  const markerM = new Matrix4();
  markerM.setTranslate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  markerM.scale(0.3, 0.3, 0.3);
  gl.uniformMatrix4fv(u_ModelMatrix, false, markerM.elements);
  gl.uniform4f(u_BaseColor, g_lightColor[0], g_lightColor[1], g_lightColor[2], 1.0);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.uniform1i(u_whichTexture, -2);
  world.unitCube.bind(a_Position, a_UV, a_Normal);
  world.unitCube.draw();

  // Spotlight marker — small cube at g_spotPos, unlit
  const spotMarkerM = new Matrix4();
  spotMarkerM.setTranslate(g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  spotMarkerM.scale(0.3, 0.3, 0.3);
  gl.uniformMatrix4fv(u_ModelMatrix, false, spotMarkerM.elements);
  gl.uniform4f(u_BaseColor, g_spotColor[0], g_spotColor[1], g_spotColor[2], 1.0);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.uniform1i(u_whichTexture, -2);
  world.unitCube.bind(a_Position, a_UV, a_Normal);
  world.unitCube.draw();

  // Sphere — floating near the center of the map
  const sphereM = new Matrix4();
  sphereM.setTranslate(32, 2.5, 32);
  gl.uniformMatrix4fv(u_ModelMatrix, false, sphereM.elements);
  uploadNormalMatrix(sphereM);
  gl.uniform4f(u_BaseColor, 0.5, 0.5, 1.0, 1.0);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.uniform1i(u_whichTexture, -3);  // flat color, lit
  sphere.bind(a_Position, a_UV, a_Normal);
  sphere.draw();

  // OBJ monster — in horror mode it chases; in assignment mode it stands at spawn
  if (objModel.loaded) {
    const bobY = monsterState === 'chasing' ? Math.abs(Math.sin(monsterBobT * 10)) * 0.3
               : monsterState === 'lurking' ? Math.sin(monsterBobT * 3) * 0.06 : 0;
    const modelM = new Matrix4();
    modelM.setTranslate(monsterPos[0], bobY, monsterPos[2]);
    modelM.rotate(monsterAngle, 0, 1, 0);
    modelM.scale(0.015, 0.015, 0.015);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelM.elements);
    uploadNormalMatrix(modelM);
    gl.uniform4f(u_BaseColor, 1.0, 1.0, 1.0, 1.0);
    gl.uniform1f(u_texColorWeight, 1.0);
    gl.uniform1i(u_whichTexture, TEX_MONSTER);
    objModel.bind(a_Position, a_UV, a_Normal);
    objModel.draw();
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

  const base = new Matrix4();
  base.setTranslate(dogPos[0], 0, dogPos[2]);
  base.rotate(-dogFace, 0, 1, 0);

  const W  = [0.95, 0.95, 0.95, 1];
  const WD = [0.80, 0.80, 0.80, 1];

  solidPart(base, 0, 0.45 + bob, 0, 0.7, 0.42, 0.38, W);
  solidPart(base, 0.28, 0.65 + bob, 0, 0.22, 0.32, 0.28, W);
  solidPart(base, 0.48, 0.82 + bob, 0, 0.38, 0.36, 0.34, W);
  solidPart(base, 0.72, 0.72 + bob, 0, 0.22, 0.18, 0.20, WD);
  solidPart(base, 0.86, 0.76 + bob, 0, 0.07, 0.07, 0.08, [0.1,0.1,0.1,1]);

  solidPart(base, 0.65, 0.90 + bob,  0.09, 0.06, 0.09, 0.09, [1.0,1.0,1.0,1]);
  solidPart(base, 0.65, 0.90 + bob, -0.09, 0.06, 0.09, 0.09, [1.0,1.0,1.0,1]);
  solidPart(base, 0.69, 0.90 + bob,  0.09, 0.04, 0.06, 0.06, [0.05,0.05,0.05,1]);
  solidPart(base, 0.69, 0.90 + bob, -0.09, 0.04, 0.06, 0.06, [0.05,0.05,0.05,1]);

  const earM1 = new Matrix4(base);
  earM1.translate(0.36, 1.02 + bob, 0.16);
  earM1.rotate(25, 0, 0, 1);
  earM1.scale(0.10, 0.28, 0.09);
  drawPart(earM1, WD, -3);

  const earM2 = new Matrix4(base);
  earM2.translate(0.36, 1.02 + bob, -0.16);
  earM2.rotate(-25, 0, 0, 1);
  earM2.scale(0.10, 0.28, 0.09);
  drawPart(earM2, WD, -3);

  if (sitting) {
    legPart(base,  0.28, 0.0 + bob,  0.15,  20, W);
    legPart(base,  0.28, 0.0 + bob, -0.15,  20, W);
    legPart(base, -0.28, 0.0 + bob,  0.15, -30, W);
    legPart(base, -0.28, 0.0 + bob, -0.15, -30, W);
  } else {
    legPart(base,  0.22, 0.0 + bob,  0.15,  legSwing, W);
    legPart(base,  0.22, 0.0 + bob, -0.15,  legSwing, W);
    legPart(base, -0.22, 0.0 + bob,  0.15, -legSwing, W);
    legPart(base, -0.22, 0.0 + bob, -0.15, -legSwing, W);
  }

  const wagSpeed = running ? 18 : 6;
  const wagAmp   = running ? 40 : 20;
  const tailWag  = Math.sin(performance.now() * 0.001 * wagSpeed) * wagAmp;
  const tailM = new Matrix4(base);
  tailM.translate(-0.35, 0.45 + bob, 0);
  tailM.rotate(tailWag, 0, 0, 1);
  tailM.translate(-0.15, 0, 0);
  tailM.scale(0.30, 0.10, 0.10);
  drawPart(tailM, W, -3);
}

function legPart(base, ox, oy, oz, swing, color) {
  const m = new Matrix4(base);
  m.translate(ox, oy + 0.35, oz);
  m.rotate(swing, 0, 0, 1);
  m.translate(0, -0.18, 0);
  m.scale(0.13, 0.38, 0.13);
  drawPart(m, color, -3);  // -3 = flat color, lit
}

function solidPart(base, ox, oy, oz, sx, sy, sz, color) {
  const m = new Matrix4(base);
  m.translate(ox, oy, oz);
  m.scale(sx, sy, sz);
  drawPart(m, color, -3);  // -3 = flat color, lit
}

function drawPart(m, color, tex) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, m.elements);
  uploadNormalMatrix(m);  // each dog part has its own rotation — must recompute
  gl.uniform4f(u_BaseColor, color[0], color[1], color[2], color[3]);
  gl.uniform1i(u_whichTexture, tex);
  gl.uniform1f(u_texColorWeight, tex < 0 ? 0.0 : 1.0);
  world.unitCube.bind(a_Position, a_UV, a_Normal);
  world.unitCube.draw();
}

// ---- Mode select ----

function setupModeSelect() {
  document.getElementById('btn-assignment').addEventListener('click', () => {
    g_mode = 'assignment';
    document.getElementById('mode-select').style.display = 'none';
    document.getElementById('controls').style.display = 'flex';
    canvas.requestPointerLock();
  });
  document.getElementById('btn-horror').addEventListener('click', () => {
    g_mode = 'horror';
    audio.init();  // must call inside user gesture
    document.getElementById('mode-select').style.display = 'none';
    document.getElementById('controls').style.display = 'none';
    canvas.requestPointerLock();
  });
}

// ---- Horror intro / game flow ----

function showIntro() {
  gameState = 'intro';
  const el = document.getElementById('intro-overlay');
  el.style.display = 'flex';
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => { document.getElementById('intro-sub').style.opacity = '1'; }, 1600);
  setTimeout(endIntro, 4400);
}

function endIntro() {
  const el = document.getElementById('intro-overlay');
  el.style.transition = 'opacity 1.6s';
  el.style.opacity = '0';
  setTimeout(() => {
    el.style.display = 'none';
    gameState = 'game';
  }, 1700);
}

function catchPlayer() {
  if (gameState === 'caught') return;
  gameState = 'caught';
  monsterState = 'caught';
  audio.playJumpScare();
  document.getElementById('caught').style.display = 'block';
  document.exitPointerLock();
}

function updateVignette(dist) {
  const vignette = document.getElementById('vignette');
  if (!vignette) return;
  const t = Math.max(0, 1 - dist / 14);
  const a = (t * t * 0.72).toFixed(3);
  vignette.style.background =
    `radial-gradient(ellipse at center, transparent 40%, rgba(90,0,0,${a}) 100%)`;
}

// ---- Monster AI ----

function updateMonster(dt) {
  if (g_mode !== 'horror') return;
  if (gameState !== 'game') return;
  if (gameWon) return;

  const dx = camera.eye[0] - monsterPos[0];
  const dz = camera.eye[2] - monsterPos[2];
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist > 0.1) monsterAngle = Math.atan2(dz, dx) * 180 / Math.PI + 90;

  monsterActivateTimer += dt;

  if (monsterState === 'waiting') {
    if (monsterActivateTimer > 5 || dist < 12) {
      monsterState = 'lurking';
      audio.playGrowl();
    }
  } else if (monsterState === 'lurking') {
    if (dist < 9) monsterState = 'chasing';
  } else if (monsterState === 'chasing') {
    if (dist > 13) monsterState = 'lurking';
  }

  const speed = monsterState === 'chasing' ? 4.2
              : monsterState === 'lurking'  ? 1.8 : 0;
  if (speed > 0 && dist > 1.2) {
    monsterPos[0] += (dx / dist) * speed * dt;
    monsterPos[2] += (dz / dist) * speed * dt;
    monsterBobT   += dt;
  }

  if (dist < 1.2 && (monsterState === 'lurking' || monsterState === 'chasing')) {
    catchPlayer();
  }
}

// ---- Controls ----

function setupControls() {
  document.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === 'q') camera.panLeft(5);
    if (e.key.toLowerCase() === 'e') camera.panRight(5);
    if (e.key.toLowerCase() === 'g') throwBall();
  });

  document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  canvas.addEventListener('click', () => canvas.requestPointerLock());

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas;
    if (pointerLocked) {
      document.getElementById('click-to-play').style.display = 'none';
      if (gameState === 'pre') gameState = 'game';
    } else {
      if (gameState !== 'caught') {
        document.getElementById('click-to-play').style.display = 'block';
      }
    }
  });

  document.addEventListener('mousemove', e => {
    if (!pointerLocked) return;
    camera.panMouse(e.movementX, e.movementY);
  });

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

// ---- Procedural horror audio (Web Audio API) ----

class HorrorAudio {
  constructor() {
    this.ctx      = null;
    this.master   = null;
    this._hbTimer   = 999;   // large so heartbeat doesn't fire immediately
    this._hbPeriod  = 2.0;
    this._footTimer = 0;
    this._growlDone = false;
  }

  init() {
    if (this.ctx) return;
    this.ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this._drone();
  }

  _drone() {
    const ctx = this.ctx;
    // Three detuned oscillators: deep sub rumble + mid ominous hum
    [[40, 0.055], [43, 0.045], [110, 0.025]].forEach(([freq, amp]) => {
      const osc = ctx.createOscillator();
      const f   = ctx.createBiquadFilter();
      const g   = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      f.type = 'lowpass';
      f.frequency.value = freq < 80 ? 120 : 320;
      g.gain.value = amp;
      osc.connect(f); f.connect(g); g.connect(this.master);
      osc.start();
    });
    // Breathy atmospheric noise
    const len  = ctx.sampleRate * 2;
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const ns = ctx.createBufferSource();
    ns.buffer = buf; ns.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 280; bp.Q.value = 0.4;
    const ng = ctx.createGain(); ng.gain.value = 0.012;
    ns.connect(bp); bp.connect(ng); ng.connect(this.master);
    ns.start();
  }

  // Guttural monster growl — FM noise + low-pass sweep
  playGrowl() {
    if (!this.ctx) return;
    const ctx = this.ctx, dur = 1.8;
    const len  = Math.floor(ctx.sampleRate * dur);
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const d    = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      d[i] = Math.sin(2 * Math.PI * 75 * t + 3 * Math.sin(2 * Math.PI * 6 * t))
             * (0.4 + 0.6 * (Math.random() - 0.5));
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(600, ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
  }

  // Lub-dub heartbeat
  playHeartbeat() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    [0, 0.21].forEach(delay => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + delay + 0.32);
      g.gain.setValueAtTime(0,    ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.6, ctx.currentTime + delay + 0.014);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.36);
      osc.connect(g); g.connect(this.master);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.42);
    });
  }

  // Low thud footstep
  _footstep(vol) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 52;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
    osc.connect(g); g.connect(this.master);
    osc.start(); osc.stop(ctx.currentTime + 0.13);
  }

  // High screech + sub thud jump scare
  playJumpScare() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 1.1);
    g.gain.setValueAtTime(0.75, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
    osc.connect(g); g.connect(this.master);
    osc.start(); osc.stop(ctx.currentTime + 1.2);

    const sub = ctx.createOscillator(); const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, ctx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(18, ctx.currentTime + 0.6);
    sg.gain.setValueAtTime(0.9, ctx.currentTime);
    sg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    sub.connect(sg); sg.connect(this.master);
    sub.start(); sub.stop(ctx.currentTime + 0.7);
  }

  // Called every tick when in horror game mode
  update(dt, monsterDist, monsterMoving) {
    if (!this.ctx) return;

    // Heartbeat: kicks in within 20 units, speeds up to 0.4s period up close
    if (monsterDist < 20) {
      const t = 1 - monsterDist / 20;
      this._hbPeriod = 1.9 - t * 1.5;
      this._hbTimer += dt;
      if (this._hbTimer >= this._hbPeriod) {
        this.playHeartbeat();
        this._hbTimer = 0;
      }
    } else {
      this._hbTimer = 0;
    }

    // Footsteps when monster is moving and within earshot
    if (monsterMoving && monsterDist < 28) {
      const vol    = 0.04 + 0.38 * Math.max(0, 1 - monsterDist / 28);
      const period = monsterDist < 9 ? 0.27 : 0.46;
      this._footTimer += dt;
      if (this._footTimer >= period) {
        this._footstep(vol);
        this._footTimer = 0;
      }
    } else {
      this._footTimer = 0;
    }
  }
}

window.onload = main;
