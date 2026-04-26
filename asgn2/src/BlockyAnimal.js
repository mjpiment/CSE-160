// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// ---- WebGL globals ----------------------------------------------------------
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

// ---- Camera orbit state ------------------------------------------------------
let g_globalAngleX =  15;   // elevation  (vertical,   -85..85)  – slider + drag
let g_globalAngleY =  30;   // azimuth    (horizontal, 0..360)   – slider + drag
let g_globalAngleZ =   0;   // roll       (Alt-drag only)

const DRAG_SENSITIVITY = 0.5; // degrees per pixel

let g_isDragging  = false;
let g_lastMouseX  = 0;
let g_lastMouseY  = 0;


let g_wingAngle    =   0;  // shoulder
let g_wingMidAngle =   0;  // elbow
let g_wingTipAngle =   0;  // wrist

let g_headTurn     =   0;
let g_legSwing     =   0;
let g_kneeBend     =   0;

// ---- Animation state --------------------------------------------------------
let g_animation = false;
let g_poke      = false;
let g_pokeTime  = 0;

var g_startTime = performance.now() / 1000.0;
var g_seconds   = 0;

// ---- Palette ----------------------------------------------------------------
var C_BROWN   = [0.28, 0.16, 0.05, 1.0];
var C_DKBROWN = [0.16, 0.09, 0.02, 1.0];
var C_WHITE   = [1.00, 1.00, 1.00, 1.0];
var C_CREAM   = [0.95, 0.90, 0.80, 1.0];
var C_YELLOW  = [1.00, 0.76, 0.00, 1.0];
var C_IRIS    = [0.95, 0.82, 0.08, 1.0];
var C_PUPIL   = [0.05, 0.05, 0.05, 1.0];
var C_TAN     = [0.80, 0.70, 0.45, 1.0];
var C_TALON   = [0.18, 0.18, 0.12, 1.0];

// ---- Setup ------------------------------------------------------------------
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) { console.log('Failed to get WebGL context'); return; }
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.'); return;
  }
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) { console.log('Failed: a_Position'); return; }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) { console.log('Failed: u_FragColor'); return; }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { console.log('Failed: u_ModelMatrix'); return; }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) { console.log('Failed: u_GlobalRotateMatrix'); return; }
}

function addActionsForHtmlUI() {
  document.getElementById('animationOnButton').onclick  = function() { g_animation = true; };
  document.getElementById('animationOffButton').onclick = function() { g_animation = false; };
  document.getElementById('pokeButton').onclick         = function() { triggerPoke(); };

  // Shift+click → poke (checked before drag so we don't also start a drag)
  canvas.addEventListener('click', function(ev) { if (ev.shiftKey) triggerPoke(); });

  // ---- Mouse drag orbit -------------------------------------------------------
  canvas.addEventListener('mousedown', function(e) {
    if (e.shiftKey) return; // let the click handler above handle poke
    g_isDragging = true;
    g_lastMouseX = e.clientX;
    g_lastMouseY = e.clientY;
    e.preventDefault();
  });

  canvas.addEventListener('mousemove', function(e) {
    if (!g_isDragging) return;
    var dx = e.clientX - g_lastMouseX;
    var dy = e.clientY - g_lastMouseY;
    g_lastMouseX = e.clientX;
    g_lastMouseY = e.clientY;

    if (e.altKey || (e.buttons & 4)) {        // Alt or middle button → roll
      g_globalAngleZ += dx * DRAG_SENSITIVITY;
    } else {
      g_globalAngleY += dx * DRAG_SENSITIVITY; // horizontal → azimuth
      g_globalAngleX  = Math.max(-85, Math.min(85,
        g_globalAngleX + dy * DRAG_SENSITIVITY)); // vertical → elevation (clamped)
    }
    renderScene();
  });

  canvas.addEventListener('mouseup',    function() { g_isDragging = false; });
  canvas.addEventListener('mouseleave', function() { g_isDragging = false; });

  var bind = function(id, setter) {
    document.getElementById(id).addEventListener('input', function() {
      setter(+this.value); renderScene();
    });
  };
  bind('angleXSlide',   function(v) { g_globalAngleX  = v; });
  bind('angleYSlide',   function(v) { g_globalAngleY  = v; });
  bind('wingSlide',     function(v) { g_wingAngle     = v; });
  bind('wingMidSlide',  function(v) { g_wingMidAngle  = v; });
  bind('wingTipSlide',  function(v) { g_wingTipAngle  = v; });
  bind('headTurnSlide', function(v) { g_headTurn      = v; });
  bind('legSwingSlide', function(v) { g_legSwing      = v; });
  bind('kneeBendSlide', function(v) { g_kneeBend      = v; });
}

function triggerPoke() {
  g_poke     = true;
  g_pokeTime = g_seconds;
}

// ---- Canvas resize ----------------------------------------------------------
function resizeCanvas(size) {
  var w = (size === 'full') ? window.innerWidth  : size;
  var h = (size === 'full') ? window.innerHeight : size;
  canvas.width  = w;
  canvas.height = h;
  gl.viewport(0, 0, w, h);
  renderScene();
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();
  gl.clearColor(0.45, 0.75, 0.95, 1.0);
  requestAnimationFrame(tick);
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_poke) {
    var dt = g_seconds - g_pokeTime;
    if (dt < 1.4) {
      var ease       = 1.0 - dt / 1.4;
      g_wingAngle    = -70 * ease;
      g_wingMidAngle = -50 * ease;
      g_wingTipAngle = -40 * ease;
      g_headTurn     = 28 * Math.sin(dt * 18) * ease;
    } else {
      g_poke = false;
      if (!g_animation) {
        g_wingAngle = g_wingMidAngle = g_wingTipAngle = g_headTurn = 0;
      }
    }
    return;
  }

  if (g_animation) {
    var s = g_seconds;
    g_wingAngle    = 38 * Math.sin(s * 2.5);
    g_wingMidAngle = 24 * Math.sin(s * 2.5 + 0.5);
    g_wingTipAngle = 18 * Math.sin(s * 2.5 + 1.0);
    g_headTurn     =  7 * Math.sin(s * 0.7);
  }
}

// ---- Convenience wrapper so we can pass Matrix4 directly to the Cube class --
function drawCube(M, color) {
  var c    = new Cube();
  c.color  = color;
  c.matrix = M;
  c.render();
}

// ---- Wing -------------------------------------------------------------------
// sign: +1 = right wing (extends in +X), -1 = left wing (extends in -X).
// Negative scale in X mirrors the cube geometry automatically.
function drawWing(sign) {
  // === SHOULDER ===
  var shoulder = new Matrix4();
  shoulder.translate(sign * 0.28, 0.0, -0.02);
  shoulder.rotate(-sign * g_wingAngle, 0, 0, 1);

  var armM = new Matrix4(shoulder);
  armM.translate(0, -0.025, -0.075);
  armM.scale(sign * 0.36, 0.05, 0.15);
  drawCube(armM, C_BROWN);

  // === ELBOW ===
  var elbow = new Matrix4(shoulder);
  elbow.translate(sign * 0.36, 0, 0);
  elbow.rotate(-sign * g_wingMidAngle, 0, 0, 1);

  var forearmM = new Matrix4(elbow);
  forearmM.translate(0, -0.02, -0.06);
  forearmM.scale(sign * 0.30, 0.04, 0.12);
  drawCube(forearmM, C_BROWN);

  // === WRIST ===
  var wrist = new Matrix4(elbow);
  wrist.translate(sign * 0.30, 0, 0);
  wrist.rotate(-sign * g_wingTipAngle, 0, 0, 1);

  var handM = new Matrix4(wrist);
  handM.translate(0, -0.015, -0.05);
  handM.scale(sign * 0.20, 0.035, 0.10);
  drawCube(handM, C_DKBROWN);

  // 5 primary feathers spread in Z at the wrist tip
  for (var f = 0; f < 5; f++) {
    var fZ   = -0.08 + f * 0.04;
    var fLen = 0.14  - f * 0.012;
    var feather = new Matrix4(wrist);
    feather.translate(sign * 0.20, -0.018, fZ);
    feather.scale(sign * fLen, 0.020, 0.022);
    drawCube(feather, C_DKBROWN);
  }
}

// ---- Leg --------------------------------------------------------------------
// sign: +1 = right, -1 = left (only the X offset differs)
function drawLeg(sign) {
  var thighH = 0.22;
  var lowerH = 0.18;

  // === THIGH ===
  // Cylinder is Y-centered; bottom sits at -thighH/2 from joint origin.
  var thigh = new Matrix4();
  thigh.translate(sign * 0.12, -0.22, 0.05);
  thigh.rotate(g_legSwing, 1, 0, 0);
  drawCylinder(new Matrix4(thigh), C_TAN, 0.045, thighH, 12);

  // === KNEE ===
  var knee = new Matrix4(thigh);
  knee.translate(0, -thighH / 2, 0);
  knee.rotate(-g_kneeBend, 1, 0, 0);
  drawCylinder(new Matrix4(knee), C_YELLOW, 0.032, lowerH, 10);

  // === ANKLE / TALONS ===
  var ankle = new Matrix4(knee);
  ankle.translate(0, -lowerH / 2, 0);

  // 4 talons: yaw angles spread them in the foot plane.
  // Cone default: base at y=0, tip at y=height (points +Y).
  // rotate(90, 1,0,0) remaps +Y → +Z so the talon points forward, then
  // rotate(yaw, 0,1,0) fans them to the correct direction.
  var yaws = [-25, 0, 25, 180];
  for (var t = 0; t < 4; t++) {
    var talon = new Matrix4(ankle);
    talon.rotate(yaws[t], 0, 1, 0);
    talon.rotate(90, 1, 0, 0);
    drawCone(talon, C_TALON, 0.018, 0.11, 8);
  }
}

// ---- Head -------------------------------------------------------------------
// All children (eyes, beak) are built from headJoint so they rotate with g_headTurn.
function drawHead() {
  var headJoint = new Matrix4();
  headJoint.translate(0.0, 0.36, 0.12);
  headJoint.rotate(g_headTurn, 0, 1, 0);

  // Head sphere
  drawSphere(new Matrix4(headJoint), C_WHITE, 0.14, 18, 12);

  // === EYES (mirrored) ===
  for (var side = -1; side <= 1; side += 2) {
    var eyeBase = new Matrix4(headJoint);
    eyeBase.translate(side * 0.10, 0.02, 0.08);

    // Brow ridge
    var brow = new Matrix4(eyeBase);
    brow.translate(-0.015, 0.055, -0.02);
    brow.scale(0.08, 0.022, 0.055);
    drawCube(brow, C_DKBROWN);

    // Iris
    drawSphere(new Matrix4(eyeBase), C_IRIS, 0.038, 10, 8);

    // Pupil — pushed forward onto iris surface
    var pupil = new Matrix4(eyeBase);
    pupil.translate(0, 0, 0.028);
    drawSphere(pupil, C_PUPIL, 0.024, 8, 6);
  }

  // === BEAK ===
  // rotate(90, 1,0,0) on a cone makes its tip point in +Z (forward).

  // Upper beak
  var upperBeak = new Matrix4(headJoint);
  upperBeak.translate(0, -0.035, 0.10);
  upperBeak.rotate(90, 1, 0, 0);
  drawCone(upperBeak, C_YELLOW, 0.055, 0.14, 12);

  // Hook at tip of upper beak
  var hook = new Matrix4(headJoint);
  hook.translate(-0.022, -0.072, 0.225);
  hook.scale(0.044, 0.044, 0.044);
  drawCube(hook, C_YELLOW);

  // Lower beak
  var lowerBeak = new Matrix4(headJoint);
  lowerBeak.translate(0, -0.065, 0.10);
  lowerBeak.rotate(90, 1, 0, 0);
  drawCone(lowerBeak, C_YELLOW, 0.038, 0.10, 12);
}

// ---- Main render ------------------------------------------------------------
function renderScene() {
  var startTime = performance.now();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Global rotation — rotate the world around the animal (no projection needed).
  var globalRot = new Matrix4();
  globalRot.rotate(g_globalAngleX, 1, 0, 0);
  globalRot.rotate(g_globalAngleY, 0, 1, 0);
  if (g_globalAngleZ !== 0) globalRot.rotate(g_globalAngleZ, 0, 0, 1);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRot.elements);

  // === BODY ===
  drawEllipsoid(new Matrix4(), C_BROWN, 0.28, 0.18, 0.38, 20, 14);

  var bellyM = new Matrix4();
  bellyM.translate(0, -0.06, 0.15);
  drawEllipsoid(bellyM, C_CREAM, 0.18, 0.13, 0.22, 16, 12);

  // === TAIL — 5 white flat cubes fanned at -Z ===
  for (var i = 0; i < 5; i++) {
    var fanAngle = -20 + i * 10;
    var tail = new Matrix4();
    tail.translate(-0.09 + i * 0.045, -0.12, -0.30);
    tail.rotate(fanAngle, 0, 0, 1);
    tail.scale(0.075, 0.016, 0.20);
    drawCube(tail, C_WHITE);
  }

  // === NECK ===
  var neckM = new Matrix4();
  neckM.translate(0, 0.20, 0.10);
  neckM.rotate(-12, 1, 0, 0);
  drawCylinder(neckM, C_WHITE, 0.07, 0.16, 12);

  // === HEAD ===
  drawHead();

  // === WINGS ===
  drawWing(+1);
  drawWing(-1);

  // === LEGS ===
  drawLeg(+1);
  drawLeg(-1);

  var duration = performance.now() - startTime;
  document.getElementById('numdot').innerHTML =
    'ms: ' + Math.floor(duration) + ' | fps: ' + Math.floor(1000 / duration);
}
