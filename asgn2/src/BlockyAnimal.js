// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  varying vec3 v_WorldPos;
  varying float v_Dist;
  void main() {
    vec4 worldPos = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_WorldPos = worldPos.xyz;
    // Camera is fixed at (0, 0, 3.5) after worldPos projection
    v_Dist = distance(worldPos.xyz, vec3(0.0, 0.0, 3.5));
    gl_Position = u_ProjMatrix * u_ViewMatrix * worldPos;
  }`

// Fragment shader program — uses screen-space derivatives for flat shading
var FSHADER_SOURCE = `
  #extension GL_OES_standard_derivatives : enable
  precision mediump float;
  uniform vec4 u_FragColor;
  uniform float u_LightEnabled;
  uniform vec3 u_FogColor;
  uniform float u_FogNear;
  uniform float u_FogFar;
  uniform vec3 u_SunDir;
  uniform float u_Time;
  
  varying vec3 v_WorldPos;
  varying float v_Dist;
  
  void main() {
    vec3 baseColor = u_FragColor.rgb;

    if (u_LightEnabled > 0.5) {
      // Compute flat face normal from screen-space derivatives
      vec3 dx = dFdx(v_WorldPos);
      vec3 dy = dFdy(v_WorldPos);
      vec3 normal = normalize(cross(dx, dy));
      // Moving sun direction controls the shadows
      float diff = max(dot(normal, normalize(u_SunDir)), 0.0);
      float brightness = 0.35 + 0.65 * diff;
      baseColor = baseColor * brightness;
    }

    // Apply linear fog
    float fogFactor = clamp((u_FogFar - v_Dist) / (u_FogFar - u_FogNear), 0.0, 1.0);
    vec3 finalColor = mix(u_FogColor, baseColor, fogFactor);

    gl_FragColor = vec4(finalColor, u_FragColor.a);
  }`

// ---- WebGL globals ----------------------------------------------------------
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjMatrix;
let u_LightEnabled;
let u_FogColor;
let u_FogNear;
let u_FogFar;
let u_SunDir;
let u_Time;

// ---- Camera orbit state ------------------------------------------------------
let g_globalAngleX =  15;   // elevation  (vertical,   -85..85)  – slider + drag
let g_globalAngleY = 180;   // azimuth    (horizontal, 0..360)   – slider + drag
let g_globalAngleZ =   0;   // roll       (Alt-drag only)
let g_zoom          = 2.2;   // zoom level (scroll wheel)

const DRAG_SENSITIVITY = 0.5; // degrees per pixel
const ZOOM_SENSITIVITY = 0.05; // zoom per scroll tick
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3.0;

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

// ---- Environment Data -------------------------------------------------------
let g_mtnData       = [];
let g_treePositions = [];
let g_grassPositions = [];
let g_clouds         = [];

// ---- Palette ----------------------------------------------------------------
var DARK_BROWN  = [0.18, 0.11, 0.04, 1.0];
var RICH_BROWN  = [0.28, 0.17, 0.07, 1.0];
var PURE_WHITE  = [0.97, 0.97, 0.94, 1.0];
var BEAK_GOLD   = [0.88, 0.68, 0.05, 1.0];
var EYE_YELLOW  = [0.85, 0.75, 0.12, 1.0];
var EYE_BLACK   = [0.03, 0.03, 0.03, 1.0];
var TALON_DARK  = [0.08, 0.07, 0.05, 1.0];
var LEG_YELLOW  = [0.80, 0.62, 0.08, 1.0];
var FEATHER_TIP = [0.10, 0.07, 0.02, 1.0];

// ---- Scene palette ----------------------------------------------------------
var VALLEY_GREEN  = [0.22, 0.42, 0.15, 1.0];
var VALLEY_BROWN  = [0.35, 0.25, 0.12, 1.0];
var RIVER_BLUE    = [0.15, 0.40, 0.65, 1.0];
var RIVER_LIGHT   = [0.25, 0.55, 0.80, 1.0];
var MTN_GRAY      = [0.45, 0.42, 0.40, 1.0];
var MTN_DARK      = [0.30, 0.28, 0.25, 1.0];
var MTN_BROWN     = [0.40, 0.30, 0.18, 1.0];
var SNOW_WHITE    = [0.92, 0.94, 0.96, 1.0];
var TREE_GREEN    = [0.12, 0.32, 0.10, 1.0];
var TREE_TRUNK    = [0.30, 0.18, 0.08, 1.0];

// ---- Setup ------------------------------------------------------------------
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) { console.log('Failed to get WebGL context'); return; }
  gl.enable(gl.DEPTH_TEST);
  
  // Enable flat-shading derivatives BEFORE compiling shaders
  var ext = gl.getExtension('OES_standard_derivatives');
  if (!ext) {
    console.warn("OES_standard_derivatives extension not supported.");
  }
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

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) { console.log('Failed: u_ViewMatrix'); return; }

  u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if (!u_ProjMatrix) { console.log('Failed: u_ProjMatrix'); return; }

  u_LightEnabled = gl.getUniformLocation(gl.program, 'u_LightEnabled');
  if (!u_LightEnabled) { console.log('Failed: u_LightEnabled'); }

  u_SunDir = gl.getUniformLocation(gl.program, 'u_SunDir');
  if (!u_SunDir) { console.log('Failed: u_SunDir'); }

  u_Time = gl.getUniformLocation(gl.program, 'u_Time');
  if (!u_Time) { console.log('Failed: u_Time'); }

  u_FogColor = gl.getUniformLocation(gl.program, 'u_FogColor');
  u_FogNear = gl.getUniformLocation(gl.program, 'u_FogNear');
  u_FogFar = gl.getUniformLocation(gl.program, 'u_FogFar');
  
  // Set fixed fog parameters
  gl.uniform3f(u_FogColor, 0.55, 0.78, 0.95); // match gl.clearColor
  gl.uniform1f(u_FogNear,  45.0);
  gl.uniform1f(u_FogFar,   90.0);
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
      g_globalAngleZ -= dx * DRAG_SENSITIVITY;
    } else {
      g_globalAngleY -= dx * DRAG_SENSITIVITY; // horizontal → azimuth
      g_globalAngleX  = Math.max(-85, Math.min(85,
        g_globalAngleX - dy * DRAG_SENSITIVITY)); // vertical → elevation (clamped)
    }
    renderScene();
  });

  canvas.addEventListener('mouseup',    function() { g_isDragging = false; });
  canvas.addEventListener('mouseleave', function() { g_isDragging = false; });

  // ---- Scroll wheel zoom ------------------------------------------------------
  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    if (e.deltaY < 0) {
      g_zoom = Math.min(ZOOM_MAX, g_zoom + ZOOM_SENSITIVITY);
    } else {
      g_zoom = Math.max(ZOOM_MIN, g_zoom - ZOOM_SENSITIVITY);
    }
    renderScene();
  }, { passive: false });

  var bind = function(id, setter) {
    document.getElementById(id).addEventListener('input', function() {
      setter(+this.value); renderScene();
    });
  };
  bind('angleXSlide',   function(v) { g_globalAngleX  = v; });
  bind('angleYSlide',   function(v) { g_globalAngleY  = v; });
  bind('zoomSlide',     function(v) { g_zoom = v / 100.0; });
  bind('wingSlide',     function(v) { g_wingAngle     = v; });
  bind('wingMidSlide',  function(v) { g_wingMidAngle  = v; });
  bind('wingTipSlide',  function(v) { g_wingTipAngle  = v; });
  bind('headTurnSlide', function(v) { g_headTurn      = v; });
  bind('legSwingSlide', function(v) { g_legSwing      = v; });
  bind('kneeBendSlide', function(v) { g_kneeBend      = v; });
}

// Helper curve function to give the river a natural sine-wave shape
function getRiverCurve(zNorm) {
  // zNorm is in the range [-1, 1] relative to the valley length
  return Math.sin(zNorm * Math.PI * 1.2) * 0.2 + Math.sin(zNorm * Math.PI * 2.7) * 0.05;
}

function initEnvironment() {
  g_mtnData = [
    // [x, z, baseSize, height, color]
    [-0.55, -0.50, 0.35, 0.65, MTN_GRAY],
    [-0.75, -0.15, 0.30, 0.50, MTN_DARK],
    [-0.45,  0.20, 0.28, 0.55, MTN_BROWN],
    [-0.75,  0.65, 0.42, 0.80, MTN_GRAY],
    [-0.60,  0.85, 0.35, 0.60, MTN_DARK],
    // right side
    [ 0.65, -0.45, 0.38, 0.68, MTN_DARK],
    [ 0.70,  0.00, 0.28, 0.52, MTN_GRAY],
    [ 0.50,  0.30, 0.30, 0.62, MTN_BROWN],
    [ 0.65,  0.60, 0.25, 0.45, MTN_DARK],
    [ 0.80,  0.40, 0.45, 0.75, MTN_GRAY],
    // background mountains (larger, further)
    [-0.40, -1.20, 0.50, 0.70, MTN_GRAY],
    [ 0.40, -1.20, 0.48, 0.75, MTN_DARK],
    [ 0.00, -1.30, 0.65, 0.90, MTN_BROWN],
    [ 0.00,  1.10, 0.60, 0.85, MTN_BROWN],
  ];

  // Generate a random forest of 50 trees in the valley bounds
  for (var i = 0; i < 50; i++) {
    var z = (Math.random() * 1.8) - 0.9;
    var x = (Math.random() * 1.6) - 0.8;
    // Keep them off the curvy river 
    var rCurve = getRiverCurve(z / 0.9);
    if (Math.abs(x - rCurve) < 0.15) x += (x > rCurve ? 0.15 : -0.15); // bump away
    
    g_treePositions.push({
      x: x, 
      z: z,
      tiers: 2 + Math.floor(Math.random() * 3), // 2 to 4 stacked cones
      hScale: 0.7 + Math.random() * 0.8,        // height variance (0.7 to 1.5)
      rScale: 0.6 + Math.random() * 0.6         // radius variance (0.6 to 1.2)
    });
  }

  // Generate a field of dynamic grass clusters
  for (var i = 0; i < 200; i++) {
    var z = (Math.random() * 1.8) - 0.9;
    var x = (Math.random() * 1.6) - 0.8;
    // Keep grass off the curvy river
    var rCurve = getRiverCurve(z / 0.9);
    if (Math.abs(x - rCurve) < 0.12) x += (x > rCurve ? 0.12 : -0.12);
    
    g_grassPositions.push({
      x: x, 
      z: z,
      scale: 0.6 + Math.random() * 0.8,
      angle: Math.random() * 360
    });
  }

  // Generate wandering fluffy clouds in the sky
  for (var i = 0; i < 15; i++) {
    g_clouds.push({
      x: (Math.random() * 3.0) - 1.5,
      y: 0.4 + Math.random() * 0.3,   // high above valley
      z: (Math.random() * 2.5) - 1.2,
      size: 0.1 + Math.random() * 0.15,
      speed: 0.005 + Math.random() * 0.015 // slow moving
    });
  }
}

function triggerPoke() {
  g_poke     = true;
  g_pokeTime = g_seconds;
}

// ---- Canvas resize ----------------------------------------------------------
function resizeCanvas(size) {
  if (size === 'full') {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight - 120;
    canvas.style.maxWidth = '100%';
    canvas.style.borderRadius = '0';
    canvas.style.position = '';
    canvas.style.top = '';
    canvas.style.left = '';
    canvas.style.zIndex = '';
  } else {
    canvas.width  = size;
    canvas.height = size * 0.75;
    canvas.style.maxWidth = '100%';
    canvas.style.borderRadius = '4px';
    canvas.style.position = '';
    canvas.style.top = '';
    canvas.style.left = '';
    canvas.style.zIndex = '';
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  renderScene();
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();
  initEnvironment();
  gl.clearColor(0.55, 0.78, 0.95, 1.0);
  gl.uniform1f(u_LightEnabled, 1.0);   // lighting on by default
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
    if (dt < 2.0) {
      // Startle phase
      var decay = 1.0 - dt / 2.0;
      var f = 0.12;
      g_wingAngle    += (-60 - g_wingAngle) * f;
      g_wingMidAngle += (50 - g_wingMidAngle) * f;
      g_wingTipAngle += (35 - g_wingTipAngle) * f;
      g_headTurn     = 30 * Math.sin(dt * 30) * decay;
      g_legSwing     = 0;
      g_kneeBend     = 20;
    } else if (dt < 3.5) {
      // Recovery phase — ease back to rest
      var recoveryF = 0.06;
      var target = g_animation ? 0 : 0;
      g_wingAngle    += (target - g_wingAngle) * recoveryF;
      g_wingMidAngle += (target - g_wingMidAngle) * recoveryF;
      g_wingTipAngle += (target - g_wingTipAngle) * recoveryF;
      g_headTurn     += (0 - g_headTurn) * recoveryF;
      g_kneeBend     += (0 - g_kneeBend) * recoveryF;
      // End when close enough
      if (Math.abs(g_wingAngle) < 0.5 && Math.abs(g_wingMidAngle) < 0.5) {
        g_poke = false;
        if (!g_animation) {
          g_wingAngle = g_wingMidAngle = g_wingTipAngle = g_headTurn = 0;
          g_legSwing = 0; g_kneeBend = 0;
        }
      }
    } else {
      g_poke = false;
      if (!g_animation) {
        g_wingAngle = g_wingMidAngle = g_wingTipAngle = g_headTurn = 0;
        g_legSwing = 0; g_kneeBend = 0;
      }
    }
    return;
  }

  if (g_animation) {
    var t = g_seconds;
    g_wingAngle    = 25 * Math.sin(t * 2.8);
    g_wingMidAngle = 14 * Math.sin(t * 2.8 + 0.6);
    g_wingTipAngle = 10 * Math.sin(t * 2.8 + 1.2);
    g_headTurn     =  7 * Math.sin(t * 0.6);
    g_legSwing     =  4 * Math.sin(t * 1.2);
    g_kneeBend     = 18 + 8 * Math.abs(Math.sin(t * 1.2));
  }
}

// ---- Convenience wrapper so we can pass Matrix4 directly to the Cube class --
function drawCube(M, color) {
  var c    = new Cube();
  c.color  = color;
  c.matrix = M;
  c.render();
}

// ---- Scale factor (everything in spec is ~5x bigger than clip space) --------
var S = 0.22; // uniform scale applied to the whole eagle

// ---- Wing -------------------------------------------------------------------
function drawWing(s) {
  // Reconstruct the chest's transformation so we don't need global variables!
  var shoulder = new Matrix4();
  shoulder.translate(0, 1.2 * S, -0.33); // chest position
  shoulder.rotate(15, 1, 0, 0);          // chest rotation
  
  // Shifted slightly forwards and deeper into the chest so they never float!
  shoulder.translate(s * 0.25 * S, 0.25 * S, -0.35 * S);
  
  // Apply flapping animations
  shoulder.rotate(s * g_wingAngle, 0, 0, 1); 
  shoulder.rotate(s * 3, 0, 1, 0); // slight forward sweep
  
  // ==== ARM BONE (Front of the wing) ====
  
  var innerLength = 1.0 * S;
  var midLength = 0.8 * S;
  var tipLength = 0.6 * S;

  // 1. Inner Arm Bone
  var innerBone = new Matrix4(shoulder);
  // Move outward by half the bone length so the shoulder joint stays at the inner edge
  innerBone.translate(s * (innerLength / 2.0), 0, 0); 
  innerBone.scale(innerLength, 0.12 * S, 0.24 * S);
  innerBone.translate(-0.5, -0.5, -0.5);
  drawCube(innerBone, DARK_BROWN);

  // 2. Elbow joint
  var elbow = new Matrix4(shoulder);
  elbow.translate(s * innerLength, 0, 0); 
  elbow.rotate(s * g_wingMidAngle, 0, 0, 1);
  elbow.rotate(s * 5, 0, 1, 0); // slight outward curve

  // Middle Arm Bone
  var midBone = new Matrix4(elbow);
  midBone.translate(s * (midLength / 2.0), 0, 0); 
  midBone.scale(midLength, 0.10 * S, 0.18 * S);
  midBone.translate(-0.5, -0.5, -0.5);
  drawCube(midBone, DARK_BROWN);

  // 3. Wrist Joint (Third Bone)
  var wrist = new Matrix4(elbow);
  wrist.translate(s * midLength, 0, 0);
  // Default to a slight bend if wingTipAngle is undefined in the animation
  wrist.rotate(s * ((typeof g_wingTipAngle !== 'undefined') ? g_wingTipAngle : -10), 0, 0, 1);
  wrist.rotate(s * 5, 0, 1, 0); // slight outward curve

  // Tip Arm Bone
  var tipBone = new Matrix4(wrist);
  tipBone.translate(s * (tipLength / 2.0), 0, 0);
  tipBone.scale(tipLength, 0.06 * S, 0.12 * S);
  tipBone.translate(-0.5, -0.5, -0.5);
  drawCube(tipBone, DARK_BROWN);

  // ==== SPANNING FEATHERS ====

  // -- INNER WING --
  
  // 1. Primary Inner Flight Feathers
  for (var i = 0; i < 10; i++) {
    var feather = new Matrix4(shoulder);
    feather.translate(s * (0.05 + i * 0.10) * S, -0.05 * S, 0.02 * S);
    feather.rotate(s * (i * 2), 0, 1, 0);
    feather.rotate(10, 1, 0, 0);

    feather.translate(0, 0, 0.5 * S);
    drawEllipsoid(feather, RICH_BROWN, 0.09 * S, 0.02 * S, 0.5 * S, 12, 6);
  }

  // 2. Secondary Inner Covert Feathers
  for (var i = 0; i < 9; i++) {
    var covert = new Matrix4(shoulder);
    covert.translate(s * (0.05 + i * 0.11) * S, 0.0 * S, 0.04 * S);
    covert.rotate(s * (i * 1.5), 0, 1, 0);
    covert.rotate(15, 1, 0, 0);

    covert.translate(0, 0, 0.25 * S);
    drawEllipsoid(covert, RICH_BROWN, 0.09 * S, 0.02 * S, 0.25 * S, 10, 6);
  }

  // -- MIDDLE WING --
  
  // 3. Primary Middle Flight Feathers
  for (var i = 0; i < 9; i++) {
    var feather = new Matrix4(elbow);
    feather.translate(s * (i * 0.10) * S, -0.04 * S, 0.02 * S);

    feather.rotate(s * (5 + i * 3.5), 0, 1, 0);
    feather.rotate(8, 1, 0, 0);

    var len = 1.0 * S;
    var halfLength = len / 2.0;
    feather.translate(0, 0, halfLength);
    drawEllipsoid(feather, RICH_BROWN, 0.08 * S, 0.015 * S, halfLength, 12, 6);
  }

  // 4. Secondary Middle Covert Feathers
  for (var i = 0; i < 8; i++) {
    var covert = new Matrix4(elbow);
    covert.translate(s * (i * 0.11) * S, 0.01 * S, 0.02 * S);
    covert.rotate(s * (5 + i * 3), 0, 1, 0);
    covert.rotate(12, 1, 0, 0);

    covert.translate(0, 0, 0.25 * S);
    drawEllipsoid(covert, RICH_BROWN, 0.08 * S, 0.02 * S, 0.3 * S, 10, 6);
  }

  // -- OUTER TIP WING --

  // 5. Primary Tip Flight Feathers
  for (var i = 0; i < 9; i++) {
    var feather = new Matrix4(wrist);
    feather.translate(s * (i * 0.08) * S, -0.03 * S, 0.02 * S);

    feather.rotate(s * (30 + i * 7.5), 0, 1, 0);
    feather.rotate(6, 1, 0, 0);

    var len = (1.0 + i * 0.06) * S;
    var halfLength = len / 2.0;
    feather.translate(0, 0, halfLength);
    drawEllipsoid(feather, RICH_BROWN, 0.07 * S, 0.012 * S, halfLength, 12, 6);
  }
}

// ---- Leg --------------------------------------------------------------------
function drawLeg(s) {
  // Attach legs to the bottom of the body (chest is at 0, 1.2*S, -0.26 rotated 15° on X)
  var thigh = new Matrix4();
  thigh.translate(0, 1.2 * S, -0.26);   // match chest position
  thigh.rotate(15, 1, 0, 0);            // match chest tilt
  // Position further down the body, spread left/right
  thigh.translate(s * 0.15 * S, -0.15 * S, 0.75 * S);
  thigh.rotate(-80, 1, 0, 0);             // parallel with body
  thigh.rotate(g_legSwing, 1, 0, 0);

  // Upper leg — hangs downward from the body
  var upperLegH = 0.22 * S;
  var ul = new Matrix4(thigh);
  ul.rotate(180, 0, 0, 1); // flip so frustum draws downward
  drawFrustum(ul, RICH_BROWN, 0.08 * S, 0.06 * S, upperLegH, 8);

  // KNEE joint — at bottom of upper leg
  var knee = new Matrix4(thigh);
  knee.translate(0, -upperLegH, 0);
  knee.rotate(-g_kneeBend, 1, 0, 0);

  // Lower leg — thinner
  var lowerLegH = 0.28 * S;
  var ll = new Matrix4(knee);
  ll.rotate(180, 0, 0, 1); // flip so frustum draws downward
  drawFrustum(ll, LEG_YELLOW, 0.06 * S, 0.04 * S, lowerLegH, 8);

  // ANKLE — at bottom of lower leg
  var ankle = new Matrix4(knee);
  ankle.translate(0, -lowerLegH, 0);
  ankle.rotate(180, 1, 0, 0); // rotate talons to face downward

  // Eagle fist — toes curled tightly inward gripping position
  // 3 front toes + 1 rear hallux
  var toeData = [
    { yaw: -30, pitch: 60 },
    { yaw:   0, pitch: 55 },
    { yaw:  30, pitch: 60 },
    { yaw: 180, pitch: 50 }
  ];
  for (var t = 0; t < 4; t++) {
    var toe = new Matrix4(ankle);
    toe.rotate(toeData[t].yaw, 0, 1, 0);

    // First phalanx — extends outward then curls down
    toe.translate(0, 0, 0.02 * S);
    toe.rotate(toeData[t].pitch, 1, 0, 0);
    drawFrustum(new Matrix4(toe), LEG_YELLOW, 0.03 * S, 0.022 * S, 0.12 * S, 6);

    // Second phalanx — curls further inward
    var p2 = new Matrix4(toe);
    p2.translate(0, 0.12 * S, 0);
    p2.rotate(-60, 1, 0, 0);
    drawFrustum(new Matrix4(p2), LEG_YELLOW, 0.022 * S, 0.016 * S, 0.08 * S, 6);

    // Talon — sharp hook
    var talon = new Matrix4(p2);
    talon.translate(0, 0.08 * S, 0);
    talon.rotate(-50, 1, 0, 0);
    drawCone(talon, TALON_DARK, 0.016 * S, 0.08 * S, 6);
  }
}

// ---- Head -------------------------------------------------------------------
function drawHead() {
  var hm = new Matrix4();
  hm.translate(0, 0.95 * S, -1.65 * S);
  hm.rotate(g_headTurn, 0, 1, 0);

  // Neck
  var neck = new Matrix4(hm); 
  neck.translate(0, 0.35 * S, -0.10 * S);
  neck.rotate(25, 1, 0, 0);
  drawEllipsoid(neck, PURE_WHITE, 0.28 * S, 0.28 * S, 0.48 * S, 18, 12);

  // Top of head
  var top = new Matrix4(hm);
  top.translate(0, 0.4 * S, -0.2 * S);
  top.rotate(15, 1, 0, 0);
  drawEllipsoid(top, PURE_WHITE, 0.25 * S, 0.25 * S, 0.48 * S, 18, 12);

  // face of head
  var face = new Matrix4(hm);
  face.translate(0, 0.525 * S, -0.45 * S);
  face.rotate(10, 1, 0, 0);
  drawEllipsoid(face, PURE_WHITE, 0.2 * S, 0.2 * S, 0.3 * S, 18, 12);  
  
  // top beak
  var top_beak = new Matrix4(hm);
  top_beak.translate(0, 0.525 * S, -0.68 * S);
  top_beak.rotate(250, 1, 0, 0);
  drawFrustum(top_beak, BEAK_GOLD, 0.09 * S, 0.07 * S, 0.08 * S, 12);

  // bottom beak
  var bottom_beak = new Matrix4(hm);
  bottom_beak.translate(0, 0.5 * S, -0.75 * S);
  bottom_beak.rotate(250, 1, 0, 0);
  drawFrustum(bottom_beak, BEAK_GOLD, 0.07 * S, 0.05 * S, 0.09* S, 12);

  // beak curve
  var beak_curve = new Matrix4(hm);
  beak_curve.translate(0, 0.48 * S, -0.82 * S);
  beak_curve.rotate(220, 1, 0, 0);
  drawCone(beak_curve, BEAK_GOLD, 0.05 * S, 0.2 * S, 12);



  
  // Two eyes
  for (var s = -1; s <= 1; s += 2) {
    // Iris
    var iris = new Matrix4(hm);
    iris.translate(s * 0.08 * S, 0.55 * S, -0.63 * S);
    drawSphere(iris, EYE_YELLOW, 0.08 * S, 10, 8);

    // Pupil
    var pupil = new Matrix4(hm);
    pupil.translate(s * 0.12 * S, 0.55 * S, -0.67 * S);
    drawSphere(pupil, EYE_BLACK, 0.03 * S, 8, 6);
  }

}

function drawBody() {
  // === BODY — main ellipsoid ===
  var chest = new Matrix4();
  chest.translate(0, 1.2 * S, -0.26);
  chest.rotate(15, 1, 0, 0);
  drawEllipsoid(chest, DARK_BROWN, 0.45 * S, 0.35 * S, 1 * S, 20, 14);

  // belly
  var belly = new Matrix4(chest);
  belly.translate(0, -0.15 * S, 0);
  drawEllipsoid(belly, RICH_BROWN, 0.35 * S, 0.25 * S, .8 * S, 20, 14);


  // Body feathered highlight layer
  
  return chest;
}

function drawTail(parentMatrix) {
  if (!parentMatrix) parentMatrix = new Matrix4();

  // === TAIL — 7 white feathers fanned ===
  for (var i = -3; i <= 3; i++) {
    // Attach dynamically to the parent body matrix!
    var tail = new Matrix4(parentMatrix);
    
    // The chest is scaled by 1.0*S, so its radius is 0.5*S.
    // We translate the tail directly to the back edge of the chest (+0.45 * S in local Z)
    tail.translate(i * 0.05 * S, 1 * S, -0.45 * S);
    
    // Fan them out using Y-axis rotation so they spread horizontally like a real bird
    tail.rotate(i * 9, 0, 1, 0); 
    tail.rotate(5, 1, 0, 0); // slight downward tilt
    
    // drawEllipsoid is centered, so we push it outwards by half its backwards length!
    tail.translate(0, 0, 0.4 * S);
    drawEllipsoid(tail, PURE_WHITE, 0.06 * S, 0.02 * S, 0.4 * S, 12, 6);
  }
}



// ---- Scene environment ------------------------------------------------------
const ENV_SCALE = 40.0;
const GROUND_Y = -12.0; 
const SURFACE_Y = GROUND_Y + 0.5; // Exact topological surface of the ground layer

function drawEnvironment() {
  // ---- Time Progression (Day/Night cycle) ----
  // Record universal time for shaders
  gl.uniform1f(u_Time, g_seconds);

  // Sun orbits slowly across the sky. High noon is sunY = 1.0.
  var timeSpeed = 0.01; // radians per second
  var sunAngle = g_seconds * timeSpeed;
  
  var sunX = Math.sin(sunAngle);
  var sunY = Math.cos(sunAngle);
  var sunZ = -0.5; // slight angle into the screen
  
  // Upload sun direction to shaders for dynamic lighting shadows
  var sunDirVec = new Vector3([sunX, sunY, sunZ]);
  sunDirVec.normalize();
  gl.uniform3f(u_SunDir, sunDirVec.elements[0], sunDirVec.elements[1], sunDirVec.elements[2]);

  // === DYNAMIC SUN ===
  // Draw without lighting so it stays perfectly bright yellow
  gl.uniform1f(u_LightEnabled, 0.0);
  var sun = new Matrix4();
  var sunDist = 35.0; // Distance away from center
  sun.translate(sunX * sunDist, sunY * sunDist, sunZ * sunDist);
  drawSphere(sun, [0.98, 0.95, 0.60, 1.0], 2.5, 16, 12);

  // Restore lighting for the rest of the scene
  gl.uniform1f(u_LightEnabled, 1.0);

  // === VALLEY FLOOR ===
  var floor = new Matrix4();
  floor.translate(-0.9 * ENV_SCALE, GROUND_Y, -0.9 * ENV_SCALE);
  floor.scale(1.8 * ENV_SCALE, 0.5, 1.8 * ENV_SCALE);
  drawCube(floor, VALLEY_GREEN);

  // Second layer — brown earth edges
  var dirt = new Matrix4();
  dirt.translate(-0.95 * ENV_SCALE, GROUND_Y - 0.5, -0.95 * ENV_SCALE);
  dirt.scale(1.9 * ENV_SCALE, 0.5, 1.9 * ENV_SCALE);
  drawCube(dirt, VALLEY_BROWN);

  // === CURVY RIVER ===
  // Splitting the river into multiple angled segments that snake along the curve
  var riverSegments = 50;
  var zSpan = 1.8 * ENV_SCALE;
  var segLen = zSpan / riverSegments;

  for (var i = 0; i < riverSegments; i++) {
    var z1 = -0.9 * ENV_SCALE + (i * segLen);
    var z2 = z1 + segLen;

    var n1 = (z1 / (0.9 * ENV_SCALE));
    var n2 = (z2 / (0.9 * ENV_SCALE));

    var cx1 = getRiverCurve(n1) * ENV_SCALE;
    var cx2 = getRiverCurve(n2) * ENV_SCALE;

    // Angle to rotate current segment so it connects smoothly to the next
    var dx = cx2 - cx1;
    var dz = segLen;
    var dist = Math.sqrt(dx * dx + dz * dz);
    var angle = Math.atan2(dx, dz) * (180.0 / Math.PI);

    var midX = (cx1 + cx2) * 0.5;
    var midZ = (z1 + z2) * 0.5;

    // Draw cylinder "joint" at the start of the block to make a perfectly rounded seamless river corner
    var joint = new Matrix4();
    joint.translate(cx1, SURFACE_Y + 0.012, z1);
    drawCylinder(joint, RIVER_BLUE, 0.08 * ENV_SCALE, 0.02, 10);

    // River water segment body
    var r = new Matrix4();
    r.translate(midX, SURFACE_Y + 0.01, midZ);
    r.rotate(angle, 0, 1, 0); // sweep the curve
    r.translate(-0.08 * ENV_SCALE, 0, -dist * 0.5); 
    r.scale(0.16 * ENV_SCALE, 0.02, dist); 
    drawCube(r, RIVER_BLUE);
    
    // Flat blocky shimmer strip down the center
    var s = new Matrix4();
    s.translate(midX, SURFACE_Y + 0.02, midZ);
    s.rotate(angle, 0, 1, 0);
    s.translate(-0.025 * ENV_SCALE, 0, -dist * 0.5 - 0.05);
    s.scale(0.05 * ENV_SCALE, 0.015, dist + 0.1);
    drawCube(s, RIVER_LIGHT);
  }
  
  // Cap the very end of the river with a final cylinder joint
  var finalJoint = new Matrix4();
  finalJoint.translate(getRiverCurve((zSpan) / (0.9 * ENV_SCALE)) * ENV_SCALE, SURFACE_Y + 0.012, 0.9 * ENV_SCALE);
  drawCylinder(finalJoint, RIVER_BLUE, 0.08 * ENV_SCALE, 0.02, 10);

  drawMountains();
  drawTrees();
  drawGrass();
  drawClouds();
}

function drawMountains() {
  for (var i = 0; i < g_mtnData.length; i++) {
    var m = g_mtnData[i];
    var mtn = new Matrix4();
    mtn.translate(m[0] * ENV_SCALE, SURFACE_Y, m[1] * ENV_SCALE);
    drawPyramid(mtn, m[4], m[2] * ENV_SCALE, m[3] * ENV_SCALE);

    // Snow cap (smaller pyramid on top)
    var snow = new Matrix4();
    snow.translate(m[0] * ENV_SCALE, SURFACE_Y + (m[3] * ENV_SCALE) * 0.6, m[1] * ENV_SCALE);
    drawPyramid(snow, SNOW_WHITE, (m[2] * ENV_SCALE) * 0.35, (m[3] * ENV_SCALE) * 0.45);
  }
}

function drawTrees() {
  for (var i = 0; i < g_treePositions.length; i++) {
    var tp = g_treePositions[i];
    var bx = tp.x * ENV_SCALE;
    var bz = tp.z * ENV_SCALE;

    var trunkH = 0.20 * tp.hScale * ENV_SCALE;
    var trunkR = 0.015 * tp.rScale * ENV_SCALE;

    // Shift trunk up by half its height so the bottom sits perfectly on SURFACE_Y
    var trunk = new Matrix4();
    trunk.translate(bx, SURFACE_Y + trunkH / 2.0, bz);
    drawCylinder(trunk, TREE_TRUNK, trunkR, trunkH, 6);
    
    // Draw stacked cones (tiers) for the canopy leaves
    var numTiers = tp.tiers;
    var yOffset = SURFACE_Y + trunkH * 0.8; // overlap trunk slightly

    for (var t = 0; t < numTiers; t++) {
      var tierFactor = 1.0 - (t / numTiers) * 0.4;
      var coneR = 0.07 * tp.rScale * tierFactor * ENV_SCALE;
      var coneH = 0.14 * tp.hScale * tierFactor * ENV_SCALE;

      var canopy = new Matrix4();
      canopy.translate(bx, yOffset, bz);
      drawCone(canopy, TREE_GREEN, coneR, coneH, 8);

      yOffset += coneH * 0.45;
    }
  }
}

function drawGrass() {
  var grassColor = [0.15, 0.40, 0.12, 1.0]; // Slightly more vibrant than the valley floor
  
  for (var i = 0; i < g_grassPositions.length; i++) {
    var gp = g_grassPositions[i];
    var bx = gp.x * ENV_SCALE;
    var bz = gp.z * ENV_SCALE;
    
    // Grass cluster made of 3 intersecting pyramid blades
    for(var b = 0; b < 3; b++) {
      var grass = new Matrix4();
      grass.translate(bx, SURFACE_Y, bz);
      grass.rotate(gp.angle + b * 60.0, 0, 1, 0); // rotated organically
      drawPyramid(grass, grassColor, 0.05 * gp.scale * ENV_SCALE, 0.10 * gp.scale * ENV_SCALE);
    }
  }
}

function drawClouds() {
  gl.uniform1f(u_LightEnabled, 0.0); // unlit clouds so they are perfectly bright white

  for(var i = 0; i < g_clouds.length; i++) {
    var c = g_clouds[i];
    
    // animate cloud drifting slowly on the X axis using Time (g_seconds)
    var currentX = c.x + (g_seconds * c.speed);
    // seamlessly wrap around from right side of map to left side of map
    currentX = ((currentX + 1.5) % 3.0) - 1.5;

    var bx = currentX * ENV_SCALE;
    var by = c.y * ENV_SCALE;  
    var bz = c.z * ENV_SCALE;
    var size = c.size * ENV_SCALE;

    // Center puffy cloud block
    var m = new Matrix4();
    m.translate(bx, by, bz);
    m.scale(size, size * 0.5, size * 0.8);
    drawCube(m, [0.95, 0.97, 1.0, 0.9]); // transparent white/blue tint

    // Left connecting fluff
    var m2 = new Matrix4();
    m2.translate(bx - size * 0.6, by, bz + size * 0.1);
    m2.scale(size * 0.7, size * 0.4, size * 0.6);
    drawCube(m2, [0.93, 0.95, 0.98, 0.9]);

    // Right connecting fluff
    var m3 = new Matrix4();
    m3.translate(bx + size * 0.8, by + size * 0.1, bz - size * 0.1);
    m3.scale(size * 0.6, size * 0.4, size * 0.6);
    drawCube(m3, [1.0, 1.0, 1.0, 0.9]);
  }
  
  gl.uniform1f(u_LightEnabled, 1.0); // restore scene lighting
}


// ---- Main render ------------------------------------------------------------
function renderScene() {
  var startTime = performance.now();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var globalRot = new Matrix4();
  // We no longer scale globalRot for zoom. We use Perspective FOV for zoom.
  globalRot.rotate(g_globalAngleX, 1, 0, 0);
  globalRot.rotate(g_globalAngleY, 0, 1, 0);
  if (g_globalAngleZ !== 0) globalRot.rotate(g_globalAngleZ, 0, 0, 1);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRot.elements);

  // Set up Perspective Projection with a fixed natural FOV (no distortion)
  var projMat = new Matrix4();
  projMat.setPerspective(60.0, canvas.width / canvas.height, 0.1, 1000.0);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMat.elements);

  // Set up View Matrix (Camera) — move camera closer/further based on zoom
  var viewMat = new Matrix4();
  var cameraZ = 3.5 / g_zoom;
  viewMat.setLookAt(0, 0.15, cameraZ,  0, 0.15, 0,  0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  // Draw environment first
  drawEnvironment();

  // Enable lighting for eagle
  gl.uniform1f(u_LightEnabled, 1.0);

  // === EAGLE — offset upward so it flies above the valley ===
  // We push a translate into the global matrix for the eagle parts
  var eagleGlobal = new Matrix4(globalRot);
  eagleGlobal.translate(0, 0.10, 0);  // lift eagle above ground
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, eagleGlobal.elements);

  // === EAGLE PARTS ===
  // Note: drawTail now takes the chest matrix so it mathematically connects!
  
  drawBody();
  drawTail();
  drawHead();
  
  drawWing(+1);
  drawWing(-1);
  
  drawLeg(+1);
  drawLeg(-1);

  // Restore original global matrix (for consistency)
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRot.elements);

  var duration = performance.now() - startTime;
  document.getElementById('numdot').innerHTML =
    'ms: ' + Math.floor(duration) + ' | fps: ' + Math.floor(1000 / duration);
}

// ============================================================
// FLY MODE — First-person flight through the world as the eagle
// ============================================================
var g_flyMode = false;
var g_flyPaused = false;

// Eagle state for fly mode
var g_flyPos = [0, 15, 0];      // position in world space
var g_flyYaw = 180;             // horizontal facing (degrees)
var g_flyPitch = 0;             // pitch angle (degrees, positive = nose up)
var g_flyRoll = 0;              // visual bank angle
var g_flyVelY = 0;              // vertical velocity
var g_flyForwardSpeed = 8.0;    // current forward speed
var g_flyKeys = {};             // currently held keys
var g_flyLastTime = 0;
var g_flyWingTime = 0;
var g_flyFlapping = false;      // is the player flapping right now
var g_flyMouseDX = 0;           // accumulated pointer-lock mouse deltas
var g_flyMouseDY = 0;
var g_flyDt = 1 / 60;           // last fly tick dt (seconds)
var g_flyYawRate = 0;           // smoothed yaw rate (deg/sec)
var g_flyYawVel = 0;            // integrated yaw velocity (deg/sec)
var g_flyPitchVel = 0;          // integrated pitch velocity (deg/sec)

// Flight tuning
var FLY_GRAVITY       = -9.0;   // gravity pull per second^2
var FLY_FLAP_LIFT     = 18.0;   // upward impulse per second while flapping
var FLY_FLAP_THRUST   = 2.0;    // forward acceleration while flapping
var FLY_GLIDE_SINK    = -2.0;   // sink rate while gliding (gentle)
var FLY_DIVE_ACCEL    = 8.0;    // extra forward speed gained while diving
var FLY_MIN_SPEED     = 4.0;    // minimum forward speed (stall prevention)
var FLY_MAX_SPEED     = 30.0;   // max forward speed
var FLY_DRAG          = 0.5;    // air drag deceleration per second
var FLY_TURN_RATE     = 70.0;   // degrees per second yaw from A/D
var FLY_PITCH_RATE    = 50.0;   // degrees per second pitch from mouse
var FLY_GROUND_Y      = -11.0;  // ground level (slightly above GROUND_Y)
var FLY_BANK_MAX      = 55.0;   // max visual bank angle (degrees)
var FLY_BANK_SMOOTH   = 10.0;   // bank smoothing rate (1/sec)
var FLY_CAM_ROLL_SCALE = 0.65;  // camera roll fraction of bird roll
var FLY_CAM_SIDE_SLIP  = 2.2;   // camera sideways offset at full bank
var FLY_BANK_FROM_TURN = 0.95;  // how strongly yaw rate produces bank (0..1+)
var FLY_BANKED_GLIDE_SINK = 4.0; // extra sink (units/s^2-ish) at full bank while gliding
var FLY_YAWRATE_SMOOTH = 10.0;  // yaw-rate smoothing (1/sec)
var FLY_YAWRATE_CLAMP  = 180.0; // clamp yaw rate to avoid spikes (deg/sec)
var FLY_CAM_POS_SMOOTH = 7.0;   // camera position smoothing (1/sec)
var FLY_CAM_YAW_SMOOTH = 5.0;   // camera yaw smoothing (1/sec)
var FLY_YAW_VEL_SMOOTH = 14.0;  // yaw velocity smoothing (1/sec)
var FLY_PITCH_VEL_SMOOTH = 14.0; // pitch velocity smoothing (1/sec)
var FLY_MOUSE_YAW_SENS = 0.15;  // degrees per mouse pixel
var FLY_MOUSE_PITCH_SENS = 0.15; // degrees per mouse pixel
var FLY_CAM_SPRING_K = 40.0;    // camera spring strength (higher = tighter follow)
var FLY_CAM_SPRING_D = 12.0;    // camera damping (higher = less overshoot)
var FLY_CAM_TARGET_K = 55.0;    // look-at target spring strength
var FLY_CAM_TARGET_D = 14.0;    // look-at target damping
var FLY_MODEL_PITCH_OFFSET = -10.0; // degrees: visual nose-down bias in fly mode

function flyAngleDiffDeg(a, b) {
  // returns shortest signed difference a-b in degrees, in [-180,180)
  return ((a - b + 540) % 360) - 180;
}

// Third-person camera
var FLY_CAM_DIST      = 6.0;    // distance behind eagle
var FLY_CAM_HEIGHT    = 10.0;    // height above eagle
var g_flyCamPos = [0, 16, 3];   // smoothed camera position
var g_flyCamYaw = 0;           // smoothed camera heading (degrees)
var g_flyCamVel = [0, 0, 0];   // camera velocity (spring camera)
var g_flyCamTarget = [0, 0, 0]; // smoothed look-at target
var g_flyCamTargetVel = [0, 0, 0];

// ============================================================
// FLY MODE — Procedural infinite world (chunk system)
// ============================================================
var FLY_WORLD_SEED = 1337;
var FLY_CHUNK_SIZE = 80.0;      // world units per chunk (x/z)
var FLY_CHUNK_RADIUS = 3;       // active chunk radius around player
var FLY_CHUNK_EVICT_RADIUS = 5; // eviction radius (must be >= radius)
var FLY_CHUNK_GEN_BUDGET = 2;   // max chunks generated per tick

var g_flyChunks = new Map();    // key -> chunk
var g_flyChunkGenQueue = [];    // keys to generate (ordered)
var g_flyChunkQueued = new Set();
var g_flyCurrentChunk = [0, 0]; // [cx, cz]

function flyChunkKey(cx, cz) { return cx + ',' + cz; }

function flyHash2i(x, y, seed) {
  // small integer hash to seed PRNGs per chunk
  var h = seed | 0;
  h ^= (x | 0) * 374761393;
  h = (h << 13) | (h >>> 19);
  h ^= (y | 0) * 668265263;
  h = (h << 15) | (h >>> 17);
  h = Math.imul(h, 1274126177);
  return h | 0;
}

function flyMulberry32(seed) {
  var t = seed | 0;
  return function() {
    t |= 0;
    t = (t + 0x6D2B79F5) | 0;
    var r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function flyWorldToChunkCoord(v) {
  return Math.floor(v / FLY_CHUNK_SIZE);
}

function flyMakeChunk(cx, cz) {
  var seed = flyHash2i(cx, cz, FLY_WORLD_SEED);
  var rand = flyMulberry32(seed);

  var baseX = cx * FLY_CHUNK_SIZE;
  var baseZ = cz * FLY_CHUNK_SIZE;

  // Density is intentionally low; perf/LOD can tune this later.
  var treeCount = 8 + Math.floor(rand() * 10);
  var grassCount = 18 + Math.floor(rand() * 20);
  var mtnCount = 2 + Math.floor(rand() * 3);

  var trees = [];
  for (var i = 0; i < treeCount; i++) {
    trees.push({
      x: baseX + (rand() * FLY_CHUNK_SIZE),
      z: baseZ + (rand() * FLY_CHUNK_SIZE),
      tiers: 2 + Math.floor(rand() * 3),
      hScale: 0.7 + rand() * 0.9,
      rScale: 0.6 + rand() * 0.7
    });
  }

  var grass = [];
  for (var g = 0; g < grassCount; g++) {
    grass.push({
      x: baseX + (rand() * FLY_CHUNK_SIZE),
      z: baseZ + (rand() * FLY_CHUNK_SIZE),
      scale: 0.5 + rand() * 1.0,
      angle: rand() * 360
    });
  }

  var mountains = [];
  for (var m = 0; m < mtnCount; m++) {
    // keep mountains toward the edges of the chunk so the center is more flyable
    var edge = rand() < 0.5;
    var px = edge ? (rand() < 0.5 ? 0.05 : 0.95) : rand();
    var pz = edge ? rand() : (rand() < 0.5 ? 0.05 : 0.95);
    mountains.push({
      x: baseX + px * FLY_CHUNK_SIZE,
      z: baseZ + pz * FLY_CHUNK_SIZE,
      baseSize: 6 + rand() * 10,
      height: 12 + rand() * 22,
      colorIndex: Math.floor(rand() * 3) // pick from existing mountain palette
    });
  }

  return {
    cx: cx,
    cz: cz,
    baseX: baseX,
    baseZ: baseZ,
    seed: seed,
    trees: trees,
    grass: grass,
    mountains: mountains,
    lastTouchedSec: g_seconds
  };
}

function flyQueueChunk(cx, cz) {
  var key = flyChunkKey(cx, cz);
  if (g_flyChunks.has(key)) return;
  if (g_flyChunkQueued.has(key)) return;
  g_flyChunkQueued.add(key);
  g_flyChunkGenQueue.push(key);
}

function flyEnsureChunksAroundPlayer() {
  var pcx = flyWorldToChunkCoord(g_flyPos[0]);
  var pcz = flyWorldToChunkCoord(g_flyPos[2]);
  g_flyCurrentChunk[0] = pcx;
  g_flyCurrentChunk[1] = pcz;

  // queue missing chunks within radius (near-first rings)
  for (var r = 0; r <= FLY_CHUNK_RADIUS; r++) {
    for (var dz = -r; dz <= r; dz++) {
      for (var dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        flyQueueChunk(pcx + dx, pcz + dz);
      }
    }
  }

  // generate up to budget
  var made = 0;
  while (made < FLY_CHUNK_GEN_BUDGET && g_flyChunkGenQueue.length > 0) {
    var key = g_flyChunkGenQueue.shift();
    if (g_flyChunks.has(key)) continue;
    g_flyChunkQueued.delete(key);
    var parts = key.split(',');
    var cx = parseInt(parts[0], 10);
    var cz = parseInt(parts[1], 10);
    g_flyChunks.set(key, flyMakeChunk(cx, cz));
    made++;
  }

  // evict far chunks
  g_flyChunks.forEach(function(chunk, key) {
    var dx = chunk.cx - pcx;
    var dz = chunk.cz - pcz;
    if (Math.abs(dx) > FLY_CHUNK_EVICT_RADIUS || Math.abs(dz) > FLY_CHUNK_EVICT_RADIUS) {
      g_flyChunks.delete(key);
    } else {
      chunk.lastTouchedSec = g_seconds;
    }
  });
}

function drawFlyChunkGround(chunk) {
  // Simple repeating ground tile per chunk (infinite world).
  var floor = new Matrix4();
  floor.translate(chunk.baseX, GROUND_Y, chunk.baseZ);
  floor.scale(FLY_CHUNK_SIZE, 0.5, FLY_CHUNK_SIZE);
  drawCube(floor, VALLEY_GREEN);

  var dirt = new Matrix4();
  dirt.translate(chunk.baseX, GROUND_Y - 0.5, chunk.baseZ);
  dirt.scale(FLY_CHUNK_SIZE, 0.5, FLY_CHUNK_SIZE);
  drawCube(dirt, VALLEY_BROWN);
}

function drawFlyChunkProps(chunk) {
  var pcx = g_flyCurrentChunk[0];
  var pcz = g_flyCurrentChunk[1];
  var dist = Math.max(Math.abs(chunk.cx - pcx), Math.abs(chunk.cz - pcz));
  var drawTrees = dist <= 2;
  var drawGrass = dist <= 1;

  // Mountains
  for (var i = 0; i < chunk.mountains.length; i++) {
    var m = chunk.mountains[i];
    var mtn = new Matrix4();
    mtn.translate(m.x, SURFACE_Y, m.z);
    var c = (m.colorIndex === 0) ? MTN_GRAY : (m.colorIndex === 1) ? MTN_DARK : MTN_BROWN;
    drawPyramid(mtn, c, m.baseSize, m.height);

    // Snow cap
    var snow = new Matrix4();
    snow.translate(m.x, SURFACE_Y + (m.height) * 0.6, m.z);
    drawPyramid(snow, SNOW_WHITE, m.baseSize * 0.35, m.height * 0.45);
  }

  // Trees
  if (drawTrees) {
  for (var t = 0; t < chunk.trees.length; t++) {
    // simple far-LOD: skip some trees in distance 2 chunks
    if (dist === 2 && (t % 2) === 1) continue;
    var tp = chunk.trees[t];
    var trunkH = 6.0 * tp.hScale;
    var trunkR = 0.55 * tp.rScale;

    var trunk = new Matrix4();
    trunk.translate(tp.x, SURFACE_Y + trunkH / 2.0, tp.z);
    drawCylinder(trunk, TREE_TRUNK, trunkR, trunkH, 6);

    var numTiers = tp.tiers;
    var yOffset = SURFACE_Y + trunkH * 0.8;
    for (var k = 0; k < numTiers; k++) {
      var tierFactor = 1.0 - (k / numTiers) * 0.4;
      var coneR = 3.2 * tp.rScale * tierFactor;
      var coneH = 6.0 * tp.hScale * tierFactor;

      var canopy = new Matrix4();
      canopy.translate(tp.x, yOffset, tp.z);
      drawCone(canopy, TREE_GREEN, coneR, coneH, 8);
      yOffset += coneH * 0.45;
    }
  }
  }

  // Grass
  if (drawGrass) {
  var grassColor = [0.15, 0.40, 0.12, 1.0];
  for (var g = 0; g < chunk.grass.length; g++) {
    // light subsampling for performance
    if ((g % 2) === 1) continue;
    var gp = chunk.grass[g];
    for (var b = 0; b < 3; b++) {
      var grass = new Matrix4();
      grass.translate(gp.x, SURFACE_Y, gp.z);
      grass.rotate(gp.angle + b * 60.0, 0, 1, 0);
      drawPyramid(grass, grassColor, 1.8 * gp.scale, 3.4 * gp.scale);
    }
  }
  }
}

function drawFlyEnvironment() {
  // Draw only chunks in a render radius (use chunk radius for now).
  var pcx = g_flyCurrentChunk[0];
  var pcz = g_flyCurrentChunk[1];
  g_flyChunks.forEach(function(chunk) {
    var dx = chunk.cx - pcx;
    var dz = chunk.cz - pcz;
    if (Math.abs(dx) > FLY_CHUNK_RADIUS || Math.abs(dz) > FLY_CHUNK_RADIUS) return;
    drawFlyChunkGround(chunk);
    drawFlyChunkProps(chunk);
  });
}

// ============================================================
// FLY MODE — Mission/waypoint game loop
// ============================================================
var FLY_MISSION_ENABLED = true;
var FLY_WAYPOINT_RADIUS = 8.0;
var FLY_WAYPOINT_MIN_DIST = 140.0;
var FLY_WAYPOINT_MAX_DIST = 220.0;
var FLY_WAYPOINT_MIN_Y = 10.0;
var FLY_WAYPOINT_MAX_Y = 55.0;
var FLY_WAYPOINT_TIME_LIMIT = 35.0; // seconds per waypoint
var FLY_LOW_ALT_GRACE = 2.0;        // seconds allowed too low

var g_flyMission = null; // {active, score, index, timeLeft, waypointPos:[x,y,z], failReason}
var g_flyMissionSeed = 9001;
var g_flyLowAltTime = 0;

function flySetMissionFailOverlay(visible, reason) {
  var overlay = document.getElementById('missionFailOverlay');
  if (!overlay) return;
  if (visible) {
    overlay.classList.add('visible');
    var r = document.getElementById('missionFailReason');
    if (r) r.textContent = reason || 'Failed';
    document.exitPointerLock();
  } else {
    overlay.classList.remove('visible');
  }
}

function flyResetMission() {
  g_flyMission = {
    active: true,
    score: 0,
    index: 0,
    timeLeft: FLY_WAYPOINT_TIME_LIMIT,
    waypointPos: [g_flyPos[0], g_flyPos[1], g_flyPos[2]],
    failReason: ''
  };
  g_flyMissionSeed = flyHash2i(0, 0, FLY_WORLD_SEED ^ 0x9e3779b9);
  g_flyLowAltTime = 0;
  flySetMissionFailOverlay(false, '');
  flySpawnNextWaypoint();
}

function flySpawnNextWaypoint() {
  if (!g_flyMission) return;
  g_flyMission.index += 1;
  g_flyMission.timeLeft = FLY_WAYPOINT_TIME_LIMIT;

  var pcx = g_flyCurrentChunk[0];
  var pcz = g_flyCurrentChunk[1];
  g_flyMissionSeed = (g_flyMissionSeed + 1) | 0;
  var seed = flyHash2i(pcx, pcz, g_flyMissionSeed);
  var rand = flyMulberry32(seed);

  var dist = FLY_WAYPOINT_MIN_DIST + rand() * (FLY_WAYPOINT_MAX_DIST - FLY_WAYPOINT_MIN_DIST);
  var ang = rand() * Math.PI * 2.0;
  var dx = Math.cos(ang) * dist;
  var dz = Math.sin(ang) * dist;
  var y = FLY_WAYPOINT_MIN_Y + rand() * (FLY_WAYPOINT_MAX_Y - FLY_WAYPOINT_MIN_Y);

  g_flyMission.waypointPos = [g_flyPos[0] + dx, y, g_flyPos[2] + dz];
}

function flyFailMission(reason) {
  if (!g_flyMission) return;
  g_flyMission.active = false;
  g_flyMission.failReason = reason || 'Failed';
  flySetMissionFailOverlay(true, g_flyMission.failReason);
}

function flyUpdateMission(dt) {
  if (!FLY_MISSION_ENABLED || !g_flyMission) return;
  if (!g_flyMission.active) return;

  g_flyMission.timeLeft -= dt;
  if (g_flyMission.timeLeft <= 0) {
    flyFailMission('Time up');
    return;
  }

  // low altitude fail (encourages staying airborne)
  if (g_flyPos[1] <= FLY_GROUND_Y + 0.4) {
    g_flyLowAltTime += dt;
    if (g_flyLowAltTime > FLY_LOW_ALT_GRACE) {
      flyFailMission('Too low');
      return;
    }
  } else {
    g_flyLowAltTime = 0;
  }

  // waypoint completion
  var wp = g_flyMission.waypointPos;
  var dx = g_flyPos[0] - wp[0];
  var dy = g_flyPos[1] - wp[1];
  var dz = g_flyPos[2] - wp[2];
  var d2 = dx*dx + dy*dy + dz*dz;
  if (d2 <= FLY_WAYPOINT_RADIUS * FLY_WAYPOINT_RADIUS) {
    // score: base + time bonus
    var bonus = Math.max(0, Math.floor(g_flyMission.timeLeft));
    g_flyMission.score += 100 + bonus * 5;
    flySpawnNextWaypoint();
  }
}

function drawFlyWaypoint() {
  if (!FLY_MISSION_ENABLED || !g_flyMission) return;
  var wp = g_flyMission.waypointPos;

  // If failed, keep showing the last waypoint but dim it
  var ringColor = g_flyMission.active ? [0.95, 0.85, 0.25, 1.0] : [0.5, 0.5, 0.5, 0.8];
  var r = FLY_WAYPOINT_RADIUS;
  var segments = 18;

  for (var i = 0; i < segments; i++) {
    var a = (i / segments) * Math.PI * 2.0;
    var x = wp[0] + Math.cos(a) * r;
    var z = wp[2] + Math.sin(a) * r;

    var m = new Matrix4();
    m.translate(x, wp[1], z);
    // little blocks around a circle
    m.scale(1.1, 1.1, 1.1);
    drawCube(m, ringColor);
  }
}

function updateFlyHUD() {
  var hud = document.getElementById('flyHudMission');
  if (!hud) return;
  if (!FLY_MISSION_ENABLED || !g_flyMission) {
    hud.textContent = '';
    return;
  }
  var wp = g_flyMission.waypointPos;
  var dx = g_flyPos[0] - wp[0];
  var dy = g_flyPos[1] - wp[1];
  var dz = g_flyPos[2] - wp[2];
  var dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  var time = Math.max(0, g_flyMission.timeLeft);
  hud.textContent =
    'Score: ' + g_flyMission.score +
    ' | WP: ' + g_flyMission.index +
    ' | Time: ' + time.toFixed(1) + 's' +
    ' | Dist: ' + Math.floor(dist);
}

function enterFlyMode() {
  // Show the start screen first — don't actually start flying yet
  document.getElementById('flyStartOverlay').classList.add('visible');
}

function startFlying() {
  document.getElementById('flyStartOverlay').classList.remove('visible');

  g_flyMode = true;
  g_flyPaused = false;
  g_flyPos = [0, 15, 0];
  g_flyYaw = 0;                  // Start facing North (-Z)
  g_flyPitch = 0;
  g_flyRoll = 0;
  g_flyVelY = 0;
  g_flyForwardSpeed = 12.0;
  g_flyKeys = {};
  g_flyLastTime = performance.now() / 1000.0;
  g_flyWingTime = 0;
  g_flyFlapping = false;
  g_flyCamPos = [0, 16, FLY_CAM_DIST];
  g_flyCamYaw = g_flyYaw;
  g_flyCamVel = [0, 0, 0];
  g_flyCamTarget = [g_flyPos[0], g_flyPos[1] + 1.0, g_flyPos[2]];
  g_flyCamTargetVel = [0, 0, 0];
  g_flyMouseDX = 0;
  g_flyMouseDY = 0;
  g_flyYawRate = 0;
  g_flyYawVel = 0;
  g_flyPitchVel = 0;

  // Reset procedural world streaming
  g_flyChunks = new Map();
  g_flyChunkGenQueue = [];
  g_flyChunkQueued = new Set();
  flyEnsureChunksAroundPlayer();

  if (FLY_MISSION_ENABLED) {
    flyResetMission();
  } else {
    g_flyMission = null;
  }

  // Move canvas out of the container to body so hiding container doesn't hide it
  document.body.appendChild(canvas);
  document.querySelector('.container').style.display = 'none';

  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.zIndex = '500';
  canvas.style.borderRadius = '0';
  canvas.style.border = 'none';
  canvas.style.maxWidth = 'none';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  document.getElementById('flyHUD').style.display = 'block';
  canvas.requestPointerLock();
}

function exitFlyMode() {
  g_flyMode = false;
  g_flyPaused = false;
  g_flyKeys = {};

  // Restore normal fog distances
  gl.uniform1f(u_FogNear, 45.0);
  gl.uniform1f(u_FogFar,  90.0);

  document.exitPointerLock();
  document.getElementById('pauseOverlay').classList.remove('visible');
  document.getElementById('flyHUD').style.display = 'none';

  // Move canvas back into the container and restore normal UI
  var container = document.querySelector('.container');
  var canvasNextSibling = document.querySelector('.controls');
  container.insertBefore(canvas, canvasNextSibling);
  container.style.display = '';
  canvas.style.position = '';
  canvas.style.top = '';
  canvas.style.left = '';
  canvas.style.zIndex = '';
  canvas.style.border = '3px solid #8b1a1a';
  canvas.style.borderRadius = '4px';
  canvas.style.maxWidth = '100%';
  canvas.width = 650;
  canvas.height = 500;
  gl.viewport(0, 0, canvas.width, canvas.height);
  renderScene();
}

function toggleFlyPause() {
  g_flyPaused = !g_flyPaused;
  var overlay = document.getElementById('pauseOverlay');
  if (g_flyPaused) {
    overlay.classList.add('visible');
    document.exitPointerLock();
  } else {
    overlay.classList.remove('visible');
    canvas.requestPointerLock();
    g_flyLastTime = performance.now() / 1000.0;
  }
}

function flyModeTick() {
  if (!g_flyMode || g_flyPaused) return;

  var now = performance.now() / 1000.0;
  var dt = Math.min(now - g_flyLastTime, 0.1);
  g_flyLastTime = now;
  g_flyDt = dt;
  g_flyWingTime += dt;

  // Stream/generate procedural chunks around player
  flyEnsureChunksAroundPlayer();

  // --- Turning (normal, direct) ---
  var turnInput = 0;
  if (g_flyKeys['a'] || g_flyKeys['arrowleft'])  turnInput -= 1;
  if (g_flyKeys['d'] || g_flyKeys['arrowright']) turnInput += 1;

  // Keyboard yaw: A=left, D=right
  g_flyYaw -= turnInput * FLY_TURN_RATE * dt;

  // Mouse look (direct)
  var mdx = g_flyMouseDX;
  var mdy = g_flyMouseDY;
  g_flyMouseDX = 0;
  g_flyMouseDY = 0;

  g_flyYaw   -= mdx * FLY_MOUSE_YAW_SENS;
  g_flyPitch  = Math.max(-85, Math.min(85, g_flyPitch - mdy * FLY_MOUSE_PITCH_SENS));

  // Reset integrated velocities (not used in "normal" mode)
  g_flyYawVel = 0;
  g_flyPitchVel = 0;

  // --- Visual banking (smooth, driven by actual yaw rate) ---
  // Normal banking: follows A/D input (turn left -> left wing dips).
  var targetRoll = turnInput * FLY_BANK_MAX;
  var bankAlpha = 1 - Math.exp(-FLY_BANK_SMOOTH * dt);
  g_flyRoll += (targetRoll - g_flyRoll) * bankAlpha;

  // --- Flapping (W or Space) ---
  g_flyFlapping = !!(g_flyKeys['w'] || g_flyKeys[' '] || g_flyKeys['arrowup']);
  if (g_flyFlapping) {
    g_flyForwardSpeed += FLY_FLAP_THRUST * dt;
  } else {
    // Gliding — gentle sink, convert pitch into speed
    if (g_flyPitch < -5) {
      // Diving — gain speed from gravity
      var diveFactor = Math.min(1, (-g_flyPitch - 5) / 40);
      g_flyForwardSpeed += FLY_DIVE_ACCEL * diveFactor * dt;
      g_flyVelY += FLY_GRAVITY * 0.3 * dt; // reduced gravity while diving (trading height for speed)
    } else {
      // Level or climbing glide — normal sink
      g_flyVelY += FLY_GLIDE_SINK * dt;
      // Banked turns bleed lift: add extra sink when gliding and banked.
      var bankT = Math.max(-1, Math.min(1, g_flyRoll / FLY_BANK_MAX));
      g_flyVelY += -Math.abs(bankT) * FLY_BANKED_GLIDE_SINK * dt;
      // Climbing costs speed
      if (g_flyPitch > 5) {
        var climbCost = (g_flyPitch - 5) / 30;
        g_flyForwardSpeed -= climbCost * 4.0 * dt;
      }
    }
  }

  // --- Dive tuck (S or Shift) — fold wings, dive fast ---
  var diving = !!(g_flyKeys['s'] || g_flyKeys['shift'] || g_flyKeys['arrowdown']);
  if (diving) {
    g_flyVelY += FLY_GRAVITY * 0.8 * dt;
    g_flyForwardSpeed += FLY_DIVE_ACCEL * 0.5 * dt;
    g_flyFlapping = false; // can't flap while tucked
  }

  // --- Air drag ---
  g_flyForwardSpeed -= FLY_DRAG * dt;
  g_flyForwardSpeed = Math.max(FLY_MIN_SPEED, Math.min(FLY_MAX_SPEED, g_flyForwardSpeed));

  // --- Clamp vertical velocity ---
  g_flyVelY = Math.max(-25, Math.min(15, g_flyVelY));
  // Dampen vertical velocity (air resistance)
  g_flyVelY *= (1 - 1.5 * dt);

  // --- Move eagle forward along its facing direction ---
  // IMPORTANT: the eagle model faces toward -Z at yaw=0, so forward is (-sin(yaw), -cos(yaw)).
  var yawRad = g_flyYaw * Math.PI / 180;
  var pitchRad = g_flyPitch * Math.PI / 180;
  var cosPitch = Math.cos(pitchRad);
  var sinPitch = Math.sin(pitchRad);
  var forwardX = -Math.sin(yawRad) * cosPitch;
  var forwardZ = -Math.cos(yawRad) * cosPitch;
  var forwardY = sinPitch;

  g_flyPos[0] += forwardX * g_flyForwardSpeed * dt;
  g_flyPos[2] += forwardZ * g_flyForwardSpeed * dt;
  g_flyPos[1] += (forwardY * g_flyForwardSpeed + g_flyVelY) * dt;

  // --- Auto-pitch based on vertical velocity (visual only) ---
  // DISABLED: It fights the mouse input. User wants to "tilt the model" themselves.
  // var targetPitch = Math.atan2(g_flyVelY, g_flyForwardSpeed) * (180 / Math.PI);
  // g_flyPitch += (targetPitch - g_flyPitch) * Math.min(1, 3 * dt);

  // --- Ground collision ---
  if (g_flyPos[1] < FLY_GROUND_Y) {
    g_flyPos[1] = FLY_GROUND_Y;
    g_flyVelY = Math.max(g_flyVelY, 2.0); // bounce up slightly
    g_flyPitch = Math.max(g_flyPitch, 0);
  }

  // Mission/waypoint update (after physics integration)
  flyUpdateMission(dt);
  updateFlyHUD();

  renderFlyScene();
}

function renderFlyScene() {
  var frameStart = performance.now();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Push fog far out so the world is visible in fly mode
  gl.uniform1f(u_FogNear, 200.0);
  gl.uniform1f(u_FogFar,  400.0);

  // Perspective projection
  var projMat = new Matrix4();
  projMat.setPerspective(60.0, canvas.width / canvas.height, 0.1, 1000.0);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMat.elements);

  // --- Soaring 3rd-person chase camera (moves with bird heading) ---
  // Use a smoothed camera yaw so it "soars with" the bird instead of snapping.
  var camDist = 12.0;
  var camHeight = 6.0;

  // Smooth camera heading toward bird yaw (wrap-safe)
  var yawDiff = flyAngleDiffDeg(g_flyYaw, g_flyCamYaw);
  var camYawAlpha = 1 - Math.exp(-FLY_CAM_YAW_SMOOTH * g_flyDt);
  g_flyCamYaw += yawDiff * camYawAlpha;
  var camYawRad = g_flyCamYaw * Math.PI / 180;

  // Forward vector for yaw-only camera (keeps horizon stable; avoids extreme pitch bob)
  var camForwardX = -Math.sin(camYawRad);
  var camForwardZ = -Math.cos(camYawRad);

  // Right vector in XZ plane (perpendicular to forward)
  var camRightX = camForwardZ;
  var camRightZ = -camForwardX;

  // Slide camera slightly toward the *outside* of the turn to follow the carve.
  var bankT = Math.max(-1, Math.min(1, g_flyRoll / FLY_BANK_MAX));
  var sideOffset = -bankT * FLY_CAM_SIDE_SLIP;

  var idealCamX = g_flyPos[0] - camForwardX * camDist + camRightX * sideOffset;
  var idealCamY = g_flyPos[1] + camHeight;
  var idealCamZ = g_flyPos[2] - camForwardZ * camDist + camRightZ * sideOffset;

  // Spring camera follow: camera has its own velocity/path (stable, fewer jerks).
  // Semi-implicit Euler integration.
  var dt = Math.max(1e-4, g_flyDt);
  var ax = (idealCamX - g_flyCamPos[0]) * FLY_CAM_SPRING_K - g_flyCamVel[0] * FLY_CAM_SPRING_D;
  var ay = (idealCamY - g_flyCamPos[1]) * FLY_CAM_SPRING_K - g_flyCamVel[1] * FLY_CAM_SPRING_D;
  var az = (idealCamZ - g_flyCamPos[2]) * FLY_CAM_SPRING_K - g_flyCamVel[2] * FLY_CAM_SPRING_D;
  g_flyCamVel[0] += ax * dt;
  g_flyCamVel[1] += ay * dt;
  g_flyCamVel[2] += az * dt;
  g_flyCamPos[0] += g_flyCamVel[0] * dt;
  g_flyCamPos[1] += g_flyCamVel[1] * dt;
  g_flyCamPos[2] += g_flyCamVel[2] * dt;

  var viewMat = new Matrix4();
  // Camera roll: tilt slightly into turns so it feels like "curving" with the bird.
  // We roll the camera's up vector around its forward axis.
  // Smooth look-at target so the camera doesn't whip when the bird moves sharply.
  var idealTargetX = g_flyPos[0];
  var idealTargetY = g_flyPos[1] + 1.0;
  var idealTargetZ = g_flyPos[2];

  var tax = (idealTargetX - g_flyCamTarget[0]) * FLY_CAM_TARGET_K - g_flyCamTargetVel[0] * FLY_CAM_TARGET_D;
  var tay = (idealTargetY - g_flyCamTarget[1]) * FLY_CAM_TARGET_K - g_flyCamTargetVel[1] * FLY_CAM_TARGET_D;
  var taz = (idealTargetZ - g_flyCamTarget[2]) * FLY_CAM_TARGET_K - g_flyCamTargetVel[2] * FLY_CAM_TARGET_D;
  g_flyCamTargetVel[0] += tax * dt;
  g_flyCamTargetVel[1] += tay * dt;
  g_flyCamTargetVel[2] += taz * dt;
  g_flyCamTarget[0] += g_flyCamTargetVel[0] * dt;
  g_flyCamTarget[1] += g_flyCamTargetVel[1] * dt;
  g_flyCamTarget[2] += g_flyCamTargetVel[2] * dt;

  var targetX = g_flyCamTarget[0];
  var targetY = g_flyCamTarget[1];
  var targetZ = g_flyCamTarget[2];

  // Build forward/right/up basis
  var fx = targetX - g_flyCamPos[0];
  var fy = targetY - g_flyCamPos[1];
  var fz = targetZ - g_flyCamPos[2];
  var fLen = Math.sqrt(fx*fx + fy*fy + fz*fz) || 1;
  fx /= fLen; fy /= fLen; fz /= fLen;

  // right = forward x worldUp
  var wx = 0, wy = 1, wz = 0;
  var rx = fy*wz - fz*wy;
  var ry = fz*wx - fx*wz;
  var rz = fx*wy - fy*wx;
  var rLen = Math.sqrt(rx*rx + ry*ry + rz*rz) || 1;
  rx /= rLen; ry /= rLen; rz /= rLen;

  // up = right x forward
  var ux = ry*fz - rz*fy;
  var uy = rz*fx - rx*fz;
  var uz = rx*fy - ry*fx;
  var uLen = Math.sqrt(ux*ux + uy*uy + uz*uz) || 1;
  ux /= uLen; uy /= uLen; uz /= uLen;

  // Rodrigues rotate up around forward by roll
  var rollRad = (g_flyRoll * FLY_CAM_ROLL_SCALE) * Math.PI / 180;
  var cosR = Math.cos(rollRad);
  var sinR = Math.sin(rollRad);
  var dotUF = ux*fx + uy*fy + uz*fz;
  var cx = fy*uz - fz*uy;
  var cy = fz*ux - fx*uz;
  var cz = fx*uy - fy*ux;
  var upx = ux*cosR + cx*sinR + fx*dotUF*(1 - cosR);
  var upy = uy*cosR + cy*sinR + fy*dotUF*(1 - cosR);
  var upz = uz*cosR + cz*sinR + fz*dotUF*(1 - cosR);

  viewMat.setLookAt(
    g_flyCamPos[0], g_flyCamPos[1], g_flyCamPos[2],
    targetX, targetY, targetZ,
    upx, upy, upz
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  // Identity global rotation for fly mode
  var identity = new Matrix4();
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, identity.elements);

  // Draw procedural fly environment (chunked infinite world)
  drawFlyEnvironment();
  gl.uniform1f(u_LightEnabled, 1.0);

  // Draw mission waypoint marker (ring)
  drawFlyWaypoint();

  // --- Draw the eagle at its world position ---
  var eagleMat = new Matrix4();
  eagleMat.translate(g_flyPos[0], g_flyPos[1], g_flyPos[2]);
  // Keep model yaw sign consistent with physics forward vector.
  eagleMat.rotate(g_flyYaw, 0, 1, 0);
  // Visual bias so "level flight" doesn't look nose-up.
  eagleMat.rotate(g_flyPitch + FLY_MODEL_PITCH_OFFSET, 1, 0, 0);
  eagleMat.rotate(g_flyRoll, 0, 0, 1);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, eagleMat.elements);

  // Animate wings based on flight state
  var t = g_flyWingTime;
  if (g_flyFlapping) {
    // Fast powerful flapping
    g_wingAngle    = 40 * Math.sin(t * 6.0);
    g_wingMidAngle = 25 * Math.sin(t * 6.0 + 0.6);
    g_wingTipAngle = 18 * Math.sin(t * 6.0 + 1.2);
  } else if (g_flyKeys['s'] || g_flyKeys['shift'] || g_flyKeys['arrowdown']) {
    // Tucked wings for diving
    g_wingAngle    = 50;
    g_wingMidAngle = 40;
    g_wingTipAngle = 20;
  } else {
    // Gliding — wings spread with gentle wobble
    g_wingAngle    = -15 + 3 * Math.sin(t * 1.2);
    g_wingMidAngle = 5 + 2 * Math.sin(t * 1.5);
    g_wingTipAngle = 3 * Math.sin(t * 1.8);
  }
  g_headTurn     = g_flyRoll * -0.3;
  g_legSwing     = 0;
  g_kneeBend     = 50;

  drawBody();
  drawTail();
  drawHead();
  drawWing(+1);
  drawWing(-1);
  drawLeg(+1);
  drawLeg(-1);

  // Restore identity
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, identity.elements);

  var duration = performance.now() - frameStart;
  document.getElementById('numdot').innerHTML =
    'ms: ' + Math.floor(duration) + ' | fps: ' + Math.floor(1000 / Math.max(1, duration));
}

// Hook into the existing tick loop
var _originalTick = tick;
tick = function() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  if (g_flyMode) {
    flyModeTick();
    requestAnimationFrame(tick);
  } else {
    updateAnimationAngles();
    renderScene();
    requestAnimationFrame(tick);
  }
};

// Event listeners for fly mode
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('flyModeButton').onclick = enterFlyMode;
  document.getElementById('flyStartBtn').onclick = startFlying;
  document.getElementById('flyBackBtn').onclick = function() {
    document.getElementById('flyStartOverlay').classList.remove('visible');
  };
  document.getElementById('pauseContinueBtn').onclick = function() { toggleFlyPause(); };
  document.getElementById('pauseLeaveBtn').onclick = function() { exitFlyMode(); };

  var restartBtn = document.getElementById('missionRestartBtn');
  if (restartBtn) restartBtn.onclick = function() { flyResetMission(); };
  var leaveBtn = document.getElementById('missionLeaveBtn');
  if (leaveBtn) leaveBtn.onclick = function() { exitFlyMode(); };

  document.addEventListener('keydown', function(e) {
    if (g_flyMode) {
      var key = e.key.toLowerCase();
      if (key === 'escape') {
        e.preventDefault();
        toggleFlyPause();
        return;
      }
      if (key === 'r') {
        e.preventDefault();
        if (FLY_MISSION_ENABLED) flyResetMission();
        return;
      }
      if (!g_flyPaused) {
        g_flyKeys[key] = true;
        // Prevent page scroll on space/arrows
        if (key === ' ' || key.startsWith('arrow')) e.preventDefault();
      }
    }
  });

  document.addEventListener('keyup', function(e) {
    if (g_flyMode) {
      g_flyKeys[e.key.toLowerCase()] = false;
    }
  });

  document.addEventListener('mousemove', function(e) {
    if (g_flyMode && !g_flyPaused && document.pointerLockElement === canvas) {
      // Accumulate deltas; consumed in flyModeTick for smoother feel.
      g_flyMouseDX += e.movementX;
      g_flyMouseDY += e.movementY;
    }
  });

  // Handle pointer lock loss (e.g. browser ESC) — treat as pause
  document.addEventListener('pointerlockchange', function() {
    if (g_flyMode && !g_flyPaused && document.pointerLockElement !== canvas) {
      toggleFlyPause();
    }
  });

  // Resize canvas in fly mode when window resizes
  window.addEventListener('resize', function() {
    if (g_flyMode && !g_flyPaused) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  });
});
